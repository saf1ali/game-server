#include "ChatRoom.hpp"
#include "../utils/Logger.hpp"
#include <chrono>
#include <iomanip>
#include <sstream>

ChatRoom::ChatRoom() {}

void ChatRoom::start() {
    started_ = true;
    Logger::game("Chat room opened!");
}

std::string ChatRoom::getTimestamp() const {
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&time), "%H:%M:%S");
    return ss.str();
}

void ChatRoom::onPlayerJoin(int playerId, const std::string& username) {
    if (playerId >= static_cast<int>(users_.size())) {
        users_.resize(playerId + 1);
    }
    users_[playerId] = username.empty() ? "User" + std::to_string(playerId) : username;

    messages_.push_back({users_[playerId], "joined the chat", getTimestamp(), "join"});
    if (messages_.size() > MAX_HISTORY) {
        messages_.erase(messages_.begin());
    }
}

void ChatRoom::onPlayerLeave(int playerId) {
    if (playerId < static_cast<int>(users_.size())) {
        messages_.push_back({users_[playerId], "left the chat", getTimestamp(), "leave"});
        if (messages_.size() > MAX_HISTORY) {
            messages_.erase(messages_.begin());
        }
    }
}

void ChatRoom::update(float deltaTime) {
    // Chat doesn't need per-frame updates
}

void ChatRoom::handleInput(int playerId, const json& input) {
    std::string text = input.value("message", "");
    if (text.empty() || playerId >= static_cast<int>(users_.size())) return;

    // Limit message length
    if (text.length() > 500) {
        text = text.substr(0, 500);
    }

    messages_.push_back({users_[playerId], text, getTimestamp(), "message"});
    if (messages_.size() > MAX_HISTORY) {
        messages_.erase(messages_.begin());
    }

    Logger::game("[Chat] {}: {}", users_[playerId], text);
}

json ChatRoom::getState() const {
    json messagesJson = json::array();
    for (const auto& msg : messages_) {
        messagesJson.push_back({
            {"from", msg.from},
            {"text", msg.text},
            {"timestamp", msg.timestamp},
            {"type", msg.type}
        });
    }

    json usersJson = json::array();
    for (const auto& user : users_) {
        if (!user.empty()) {
            usersJson.push_back(user);
        }
    }

    return {
        {"messages", messagesJson},
        {"users", usersJson},
        {"gameOver", false}
    };
}
