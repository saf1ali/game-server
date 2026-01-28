#include "Lobby.hpp"
#include "../server/Server.hpp"
#include "../utils/Logger.hpp"
#include <algorithm>
#include <sstream>
#include <iomanip>

Lobby::Lobby(Server& server)
    : server_(server)
{
}

void Lobby::addPlayer(Connection* conn) {
    conn->setInLobby(true);
    players_.push_back(conn);

    // Send current lobby state to new player
    conn->send(getLobbyState());

    // Broadcast updated player count
    broadcastLobbyState();
}

void Lobby::removePlayer(Connection* conn) {
    auto it = std::find(players_.begin(), players_.end(), conn);
    if (it != players_.end()) {
        players_.erase(it);
        conn->setInLobby(false);
        broadcastLobbyState();
    }
}

Room* Lobby::createRoom(Connection* conn, const std::string& gameType, const std::string& name) {
    // Validate game type
    auto types = Game::getAvailableTypes();
    if (std::find(types.begin(), types.end(), gameType) == types.end()) {
        conn->send({{"type", "error"}, {"message", "Invalid game type"}});
        return nullptr;
    }

    // Remove from lobby
    removePlayer(conn);

    // Create room
    std::string roomId = generateRoomId();
    auto room = std::make_unique<Room>(roomId, name, gameType);

    Room* roomPtr = room.get();
    rooms_[roomId] = std::move(room);

    // Add creator to room
    roomPtr->addPlayer(conn);

    Logger::info("Room '{}' created (type: {}, id: {})", name, gameType, roomId);

    // Broadcast updated room list
    broadcastLobbyState();

    return roomPtr;
}

bool Lobby::joinRoom(Connection* conn, const std::string& roomId) {
    auto it = rooms_.find(roomId);
    if (it == rooms_.end()) {
        conn->send({{"type", "error"}, {"message", "Room not found"}});
        return false;
    }

    Room* room = it->second.get();

    // Remove from lobby
    removePlayer(conn);

    // Add to room
    if (!room->addPlayer(conn)) {
        // Failed to join, add back to lobby
        addPlayer(conn);
        return false;
    }

    // Broadcast updated room list
    broadcastLobbyState();

    return true;
}

void Lobby::leaveRoom(Connection* conn) {
    Room* room = getRoom(conn->getRoomId());
    if (!room) return;

    room->removePlayer(conn);

    // Add back to lobby
    addPlayer(conn);

    // Clean up empty rooms
    cleanupEmptyRooms();

    // Broadcast updated room list
    broadcastLobbyState();
}

Room* Lobby::getRoom(const std::string& roomId) {
    auto it = rooms_.find(roomId);
    return it != rooms_.end() ? it->second.get() : nullptr;
}

void Lobby::startGame(Connection* conn) {
    Room* room = getRoom(conn->getRoomId());
    if (!room) return;

    // Only room creator (player 0) can start
    if (conn->getPlayerIndex() != 0) {
        conn->send({{"type", "error"}, {"message", "Only room creator can start"}});
        return;
    }

    room->start();
    broadcastLobbyState();
}

void Lobby::update(float deltaTime) {
    for (auto& [id, room] : rooms_) {
        room->update(deltaTime);
    }

    // Periodically clean up
    cleanupEmptyRooms();
}

json Lobby::getLobbyState() const {
    json roomList = json::array();
    for (const auto& [id, room] : rooms_) {
        roomList.push_back(room->getInfo());
    }

    return {
        {"type", "lobby_state"},
        {"rooms", roomList},
        {"playerCount", getPlayerCount()},
        {"games", Game::getAvailableTypes()}
    };
}

std::string Lobby::generateRoomId() {
    std::stringstream ss;
    ss << std::hex << std::setw(8) << std::setfill('0') << nextRoomId_++;
    return ss.str();
}

void Lobby::broadcastLobbyState() {
    json state = getLobbyState();
    std::string msg = state.dump();

    for (auto* player : players_) {
        player->send(msg);
    }
}

void Lobby::cleanupEmptyRooms() {
    std::vector<std::string> toRemove;

    for (const auto& [id, room] : rooms_) {
        if (room->getPlayerCount() == 0) {
            toRemove.push_back(id);
        }
    }

    for (const auto& id : toRemove) {
        Logger::info("Removing empty room: {}", id);
        rooms_.erase(id);
    }
}
