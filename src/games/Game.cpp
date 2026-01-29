#include "Game.hpp"
#include "PongGame.hpp"
#include "SnakeGame.hpp"
#include "ChatRoom.hpp"
#include "TetrisGame.hpp"
#include "CheckersGame.hpp"
#include "ConnectFourGame.hpp"
#include "SlitherGame.hpp"
#include "TowerDefenseGame.hpp"
#include "AgarGame.hpp"

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
    } else if (type == "connect4") {
        return std::make_unique<ConnectFourGame>();
    } else if (type == "slither") {
        return std::make_unique<SlitherGame>();
    } else if (type == "towerdefense") {
        return std::make_unique<TowerDefenseGame>();
    } else if (type == "agar") {
        return std::make_unique<AgarGame>();
    }
    // Add new game types here!
    return nullptr;
}
