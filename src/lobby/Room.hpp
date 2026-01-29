#pragma once

#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <nlohmann/json.hpp>
#include "../games/Game.hpp"
#include "../server/Connection.hpp"

using json = nlohmann::json;

/**
 * Represents a game room that players can join.
 */
class Room {
public:
    Room(const std::string& id, const std::string& name, const std::string& gameType);

    // Getters
    const std::string& getId() const { return id_; }
    const std::string& getName() const { return name_; }
    const std::string& getGameType() const { return gameType_; }
    int getPlayerCount() const { return static_cast<int>(players_.size()); }
    int getMaxPlayers() const { return game_ ? game_->getMaxPlayers() : 0; }
    bool isFull() const { return getPlayerCount() >= getMaxPlayers(); }
    bool hasStarted() const { return game_ && game_->hasStarted(); }
    bool isOver() const { return game_ && game_->isOver(); }

    // Player management
    bool addPlayer(Connection* conn);
    void removePlayer(Connection* conn);
    Connection* getPlayer(int index);
    const std::vector<Connection*>& getPlayers() const { return players_; }

    // Game control
    bool canStart() const;
    void start();
    void update(float deltaTime);
    void handleInput(int playerId, const json& input);

    // Broadcasting
    void broadcast(const json& message);
    void broadcastState();

    // Get room info for lobby
    json getInfo() const;

    // Get players as JSON array
    json getPlayersJson() const;

private:
    std::string id_;
    std::string name_;
    std::string gameType_;
    std::unique_ptr<Game> game_;
    std::vector<Connection*> players_;
    mutable std::recursive_mutex gameMutex_;  // Protects game_ access between threads
};
