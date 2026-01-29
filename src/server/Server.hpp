#pragma once

#include <memory>
#include <unordered_map>
#include <atomic>
#include <chrono>
#include "Connection.hpp"
#include "../lobby/Lobby.hpp"

/**
 * Main WebSocket server class.
 * Handles connections, message routing, and the game loop.
 * All operations run on a single thread for thread safety with uWebSockets.
 */
class Server {
public:
    explicit Server(int port);
    ~Server();

    // Start the server (blocking)
    void run();

    // Stop the server
    void stop();

    // Get connection by ID
    Connection* getConnection(uint64_t id);

    // Get lobby reference
    Lobby& getLobby() { return lobby_; }

private:
    // WebSocket event handlers
    void onOpen(WebSocket* ws);
    void onClose(WebSocket* ws);
    void onMessage(WebSocket* ws, std::string_view message);

    // Message handlers
    void handleJoinLobby(Connection* conn, const json& data);
    void handleCreateRoom(Connection* conn, const json& data);
    void handleJoinRoom(Connection* conn, const json& data);
    void handleLeaveRoom(Connection* conn, const json& data);
    void handleInput(Connection* conn, const json& data);
    void handleChat(Connection* conn, const json& data);

    int port_;
    std::atomic<bool> running_{false};
    std::atomic<uint64_t> nextConnectionId_{1};

    std::unordered_map<uint64_t, std::unique_ptr<Connection>> connections_;
    std::unordered_map<WebSocket*, uint64_t> wsToId_;

    Lobby lobby_;

    // Game loop timing
    static constexpr int TICK_RATE_MS = 16;  // ~60 FPS
    std::chrono::high_resolution_clock::time_point lastUpdateTime_;
};
