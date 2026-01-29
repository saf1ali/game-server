#include "Server.hpp"
#include "../utils/Logger.hpp"
#include <uwebsockets/App.h>

Server::Server(int port)
    : port_(port)
    , lobby_(*this)
    , lastUpdateTime_(std::chrono::high_resolution_clock::now())
{
}

Server::~Server() {
    stop();
}

void Server::run() {
    running_ = true;

    Logger::info("Starting server on port {}...", port_);

    // Create the app
    auto app = uWS::App();

    // Setup WebSocket handlers
    app.ws<void*>("/*", {
        .compression = uWS::SHARED_COMPRESSOR,
        .maxPayloadLength = 16 * 1024,
        .idleTimeout = 120,
        .maxBackpressure = 1 * 1024 * 1024,

        .open = [this](auto* ws) {
            onOpen(ws);
        },

        .message = [this](auto* ws, std::string_view message, uWS::OpCode opCode) {
            if (opCode == uWS::OpCode::TEXT) {
                onMessage(ws, message);
            }
        },

        .close = [this](auto* ws, int code, std::string_view message) {
            onClose(ws);
        }
    });

    // Listen on port
    app.listen(port_, [this](auto* listenSocket) {
        if (listenSocket) {
            Logger::info("Server listening on ws://localhost:{}", port_);
            Logger::info("Open client/index.html in your browser to play!");
        } else {
            Logger::error("Failed to listen on port {}", port_);
            running_ = false;
        }
    });

    // Create a timer for the game loop using low-level uSockets API
    // This runs on the same thread as WebSocket events for thread safety
    struct us_loop_t* loop = reinterpret_cast<struct us_loop_t*>(uWS::Loop::get());

    // Create timer with space for Server pointer
    struct us_timer_t* gameTimer = us_create_timer(loop, 0, sizeof(Server*));
    *static_cast<Server**>(us_timer_ext(gameTimer)) = this;

    // Set timer callback - runs every 16ms (~60 FPS)
    us_timer_set(gameTimer, [](struct us_timer_t* timer) {
        Server* server = *static_cast<Server**>(us_timer_ext(timer));

        auto now = std::chrono::high_resolution_clock::now();
        float deltaTime = std::chrono::duration<float>(now - server->lastUpdateTime_).count();
        server->lastUpdateTime_ = now;

        // Update all game rooms
        server->lobby_.update(deltaTime);
    }, TICK_RATE_MS, TICK_RATE_MS);

    // Run the event loop
    app.run();

    running_ = false;
}

void Server::stop() {
    running_ = false;
}

Connection* Server::getConnection(uint64_t id) {
    auto it = connections_.find(id);
    return it != connections_.end() ? it->second.get() : nullptr;
}

void Server::onOpen(WebSocket* ws) {
    uint64_t id = nextConnectionId_++;
    auto conn = std::make_unique<Connection>(ws, id);

    // Store the connection ID in the WebSocket's user data
    *static_cast<void**>(ws->getUserData()) = reinterpret_cast<void*>(id);

    wsToId_[ws] = id;
    connections_[id] = std::move(conn);

    Logger::info("Client connected (id: {})", id);

    // Send welcome message
    json welcome = {
        {"type", "welcome"},
        {"id", id},
        {"games", Game::getAvailableTypes()}
    };
    connections_[id]->send(welcome);
}

void Server::onClose(WebSocket* ws) {
    auto it = wsToId_.find(ws);
    if (it == wsToId_.end()) return;

    uint64_t id = it->second;
    auto conn = getConnection(id);

    if (conn) {
        // Remove from room if in one
        if (!conn->getRoomId().empty()) {
            lobby_.leaveRoom(conn);
        }

        // Remove from lobby
        if (conn->isInLobby()) {
            lobby_.removePlayer(conn);
        }

        Logger::info("Client disconnected (id: {}, user: {})", id, conn->getUsername());
    }

    wsToId_.erase(it);
    connections_.erase(id);
}

void Server::onMessage(WebSocket* ws, std::string_view message) {
    auto it = wsToId_.find(ws);
    if (it == wsToId_.end()) return;

    Connection* conn = getConnection(it->second);
    if (!conn) return;

    try {
        json data = json::parse(message);
        std::string type = data.value("type", "");

        if (type == "join_lobby") {
            handleJoinLobby(conn, data);
        } else if (type == "create_room") {
            handleCreateRoom(conn, data);
        } else if (type == "join_room") {
            handleJoinRoom(conn, data);
        } else if (type == "leave_room") {
            handleLeaveRoom(conn, data);
        } else if (type == "input") {
            handleInput(conn, data);
        } else if (type == "chat") {
            handleChat(conn, data);
        } else if (type == "start_game") {
            lobby_.startGame(conn);
        } else {
            Logger::warn("Unknown message type: {}", type);
        }
    } catch (const json::parse_error& e) {
        Logger::error("JSON parse error: {}", e.what());
    }
}

void Server::handleJoinLobby(Connection* conn, const json& data) {
    std::string username = data.value("username", "Player");

    // Validate username
    if (username.empty() || username.length() > 20) {
        username = "Player" + std::to_string(conn->getId());
    }

    conn->setUsername(username);
    lobby_.addPlayer(conn);

    Logger::info("Player '{}' joined lobby", username);
}

void Server::handleCreateRoom(Connection* conn, const json& data) {
    std::string gameType = data.value("game", "pong");
    std::string roomName = data.value("name", conn->getUsername() + "'s Room");

    lobby_.createRoom(conn, gameType, roomName);
}

void Server::handleJoinRoom(Connection* conn, const json& data) {
    std::string roomId = data.value("roomId", "");

    if (roomId.empty()) {
        conn->send({{"type", "error"}, {"message", "Room ID required"}});
        return;
    }

    lobby_.joinRoom(conn, roomId);
}

void Server::handleLeaveRoom(Connection* conn, const json& data) {
    lobby_.leaveRoom(conn);
}

void Server::handleInput(Connection* conn, const json& data) {
    Room* room = lobby_.getRoom(conn->getRoomId());
    if (room && room->hasStarted()) {
        room->handleInput(conn->getPlayerIndex(), data);
    }
}

void Server::handleChat(Connection* conn, const json& data) {
    std::string message = data.value("message", "");
    if (message.empty()) return;

    Room* room = lobby_.getRoom(conn->getRoomId());
    if (room) {
        room->broadcast({
            {"type", "chat"},
            {"from", conn->getUsername()},
            {"message", message}
        });
    }
}

