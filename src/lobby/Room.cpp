#include "Room.hpp"
#include "../utils/Logger.hpp"

Room::Room(const std::string& id, const std::string& name, const std::string& gameType)
    : id_(id)
    , name_(name)
    , gameType_(gameType)
{
    game_ = Game::create(gameType);
    if (!game_) {
        Logger::error("Failed to create game of type: {}", gameType);
    }
}

bool Room::addPlayer(Connection* conn) {
    if (isFull()) {
        conn->send({{"type", "error"}, {"message", "Room is full"}});
        return false;
    }

    if (hasStarted() && gameType_ != "chat") {
        conn->send({{"type", "error"}, {"message", "Game already in progress"}});
        return false;
    }

    int playerIndex = static_cast<int>(players_.size());
    conn->setPlayerIndex(playerIndex);
    conn->setRoomId(id_);
    players_.push_back(conn);

    // Notify the player they joined
    conn->send({
        {"type", "room_joined"},
        {"roomId", id_},
        {"roomName", name_},
        {"game", gameType_},
        {"playerIndex", playerIndex},
        {"players", getPlayersJson()}
    });

    // Notify others
    json joinMsg = {
        {"type", "player_joined"},
        {"username", conn->getUsername()},
        {"playerIndex", playerIndex}
    };
    for (auto* player : players_) {
        if (player != conn) {
            player->send(joinMsg);
        }
    }

    {
        std::lock_guard<std::recursive_mutex> lock(gameMutex_);
        if (game_) {
            game_->onPlayerJoin(playerIndex, conn->getUsername());
        }
    }

    Logger::game("Player '{}' joined room '{}' ({})", conn->getUsername(), name_, gameType_);
    return true;
}

void Room::removePlayer(Connection* conn) {
    auto it = std::find(players_.begin(), players_.end(), conn);
    if (it == players_.end()) return;

    int playerIndex = conn->getPlayerIndex();
    players_.erase(it);

    // Update player indices
    for (size_t i = 0; i < players_.size(); ++i) {
        players_[i]->setPlayerIndex(static_cast<int>(i));
    }

    conn->setRoomId("");
    conn->setPlayerIndex(-1);

    // Notify others
    broadcast({
        {"type", "player_left"},
        {"username", conn->getUsername()},
        {"playerIndex", playerIndex}
    });

    {
        std::lock_guard<std::recursive_mutex> lock(gameMutex_);
        if (game_) {
            game_->onPlayerLeave(playerIndex);
        }
    }

    Logger::game("Player '{}' left room '{}'", conn->getUsername(), name_);
}

Connection* Room::getPlayer(int index) {
    if (index >= 0 && index < static_cast<int>(players_.size())) {
        return players_[index];
    }
    return nullptr;
}

bool Room::canStart() const {
    std::lock_guard<std::recursive_mutex> lock(gameMutex_);
    if (!game_) return false;
    return getPlayerCount() >= game_->getMinPlayers();
}

void Room::start() {
    std::lock_guard<std::recursive_mutex> lock(gameMutex_);

    if (!game_) return;

    // If game is already started but not over, don't allow restart
    if (game_->hasStarted() && !game_->isOver()) return;

    if (!canStart()) {
        broadcast({
            {"type", "error"},
            {"message", "Not enough players to start"}
        });
        return;
    }

    // If game is over, recreate it for restart
    if (game_->isOver()) {
        game_ = Game::create(gameType_);
        if (!game_) {
            Logger::error("Failed to recreate game for restart");
            return;
        }
        // Re-register all players with new game
        for (size_t i = 0; i < players_.size(); ++i) {
            game_->onPlayerJoin(static_cast<int>(i), players_[i]->getUsername());
        }
        Logger::game("Game restarted in room '{}' ({})", name_, gameType_);
    }

    game_->start();

    broadcast({
        {"type", "game_started"},
        {"game", gameType_}
    });

    // Broadcast initial game state immediately (inline to keep lock)
    json state = {
        {"type", "game_state"},
        {"state", game_->getState()}
    };
    broadcast(state);

    Logger::game("Game started in room '{}' ({}) with {} players",
                 name_, gameType_, getPlayerCount());
}

void Room::update(float deltaTime) {
    std::lock_guard<std::recursive_mutex> lock(gameMutex_);

    if (!game_ || !game_->isRunning()) return;

    game_->update(deltaTime);

    // Broadcast state inline to keep lock
    json state = {
        {"type", "game_state"},
        {"state", game_->getState()}
    };
    broadcast(state);

    if (game_->isOver()) {
        broadcast({
            {"type", "game_over"},
            {"state", game_->getState()}
        });
        Logger::game("Game ended in room '{}'", name_);
    }
}

void Room::handleInput(int playerId, const json& input) {
    std::lock_guard<std::recursive_mutex> lock(gameMutex_);

    if (!game_ || !game_->hasStarted() || game_->isOver()) return;

    game_->handleInput(playerId, input);

    // Broadcast updated state after input (important for turn-based games)
    json state = {
        {"type", "game_state"},
        {"state", game_->getState()}
    };
    broadcast(state);

    // Check if game just ended
    if (game_->isOver()) {
        broadcast({
            {"type", "game_over"},
            {"state", game_->getState()}
        });
        Logger::game("Game ended in room '{}'", name_);
    }
}

void Room::broadcast(const json& message) {
    std::string msg = message.dump();
    for (auto* player : players_) {
        player->send(msg);
    }
}

void Room::broadcastState() {
    std::lock_guard<std::recursive_mutex> lock(gameMutex_);

    if (!game_) return;

    json state = {
        {"type", "game_state"},
        {"state", game_->getState()}
    };
    broadcast(state);
}

json Room::getInfo() const {
    json playerList = json::array();
    for (const auto* player : players_) {
        playerList.push_back(player->getUsername());
    }

    return {
        {"id", id_},
        {"name", name_},
        {"game", gameType_},
        {"players", playerList},
        {"playerCount", getPlayerCount()},
        {"maxPlayers", getMaxPlayers()},
        {"inProgress", hasStarted()}
    };
}

json Room::getPlayersJson() const {
    json playerList = json::array();
    for (const auto* player : players_) {
        playerList.push_back({
            {"username", player->getUsername()},
            {"index", player->getPlayerIndex()}
        });
    }
    return playerList;
}
