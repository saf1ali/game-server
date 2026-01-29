#pragma once

#include "Game.hpp"
#include <vector>
#include <string>

/**
 * Chat room - uses the game interface for messaging.
 */
class ChatRoom : public Game {
public:
    ChatRoom();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;
    bool isOver() const override { return false; }
    std::string getType() const override { return "chat"; }
    int getMinPlayers() const override { return 1; }
    int getMaxPlayers() const override { return 100; }
    void onPlayerJoin(int playerId, const std::string& username = "") override;
    void onPlayerLeave(int playerId) override;

private:
    struct Message {
        std::string from;
        std::string text;
        std::string timestamp;
        std::string type;
    };

    std::string getTimestamp() const;

    std::vector<Message> messages_;
    std::vector<std::string> users_;
    static constexpr size_t MAX_HISTORY = 50;
};
