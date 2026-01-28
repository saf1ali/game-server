#pragma once

#include <string>
#include <cstdint>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Forward declaration for uWebSockets
namespace uWS {
    template<bool SSL, bool isServer, typename USERDATA>
    struct WebSocket;
}

using WebSocket = uWS::WebSocket<false, true, void*>;

/**
 * Represents a connected client.
 */
class Connection {
public:
    Connection(WebSocket* ws, uint64_t id);

    // Getters
    uint64_t getId() const { return id_; }
    const std::string& getUsername() const { return username_; }
    const std::string& getRoomId() const { return roomId_; }
    bool isInLobby() const { return inLobby_; }
    int getPlayerIndex() const { return playerIndex_; }

    // Setters
    void setUsername(const std::string& name) { username_ = name; }
    void setRoomId(const std::string& id) { roomId_ = id; }
    void setInLobby(bool value) { inLobby_ = value; }
    void setPlayerIndex(int index) { playerIndex_ = index; }

    // Send message to this client
    void send(const json& message);
    void send(const std::string& message);

    // Close connection
    void close();

    // Get the underlying WebSocket
    WebSocket* getSocket() { return ws_; }

private:
    WebSocket* ws_;
    uint64_t id_;
    std::string username_;
    std::string roomId_;
    bool inLobby_ = false;
    int playerIndex_ = -1;
};
