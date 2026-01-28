#include "Game.hpp"
#include "PongGame.hpp"
#include "SnakeGame.hpp"
#include "ChatRoom.hpp"
#include "TetrisGame.hpp"
#include "CheckersGame.hpp"

std::unique_ptr<Game> Game::create(const std::string& type) {
    if (type == "pong") {
        return std::make_unique<PongGame>();
    } else if (type == "snake") {
        return std::make_unique<SnakeGame>();
    } else if (type == "chat") {
        return std::make_unique<ChatRoom>();
    } else if (type == "tetris") {
        return std::make_unique<TetrisGame>();
    } else if (type == "checkers") {
        return std::make_unique<CheckersGame>();
    }
    // Add new game types here!
    return nullptr;
}
