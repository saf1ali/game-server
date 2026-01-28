#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include "Room.hpp"

class Server;
class Connection;

/**
 * Manages the game lobby and all active rooms.
 */
class Lobby {
public:
    explicit Lobby(Server& server);

    // Player management
    void addPlayer(Connection* conn);
    void removePlayer(Connection* conn);
    int getPlayerCount() const { return static_cast<int>(players_.size()); }

    // Room management
    Room* createRoom(Connection* conn, const std::string& gameType, const std::string& name);
    bool joinRoom(Connection* conn, const std::string& roomId);
    void leaveRoom(Connection* conn);
    Room* getRoom(const std::string& roomId);
    void startGame(Connection* conn);

    // Update all active rooms
    void update(float deltaTime);

    // Get lobby state for broadcasting
    json getLobbyState() const;

private:
    // Generate unique room ID
    std::string generateRoomId();

    // Broadcast lobby state to all players in lobby
    void broadcastLobbyState();

    // Clean up empty rooms
    void cleanupEmptyRooms();

    Server& server_;
    std::vector<Connection*> players_;
    std::unordered_map<std::string, std::unique_ptr<Room>> rooms_;
    uint64_t nextRoomId_ = 1;
};
