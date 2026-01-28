#include "SnakeGame.hpp"
#include "../utils/Logger.hpp"
#include <random>
#include <algorithm>

SnakeGame::SnakeGame() : numPlayers_(0), gameOver_(false), winner_(-1), moveTimer_(0) {}

void SnakeGame::start() {
    started_ = true;
    spawnFood();
    Logger::game("Snake game started with {} players!", numPlayers_);
}

void SnakeGame::onPlayerJoin(int playerId) {
    if (playerId >= static_cast<int>(snakes_.size())) {
        snakes_.resize(playerId + 1);
    }

    Snake& s = snakes_[playerId];
    s.body.clear();
    s.dir = Direction::Right;
    s.nextDir = Direction::Right;
    s.alive = true;
    s.score = 0;
    s.color = COLORS[playerId % COLORS.size()];

    Point spawn = getSpawnPoint(playerId);
    for (int i = 0; i < 3; ++i) {
        s.body.push_back({spawn.x - i, spawn.y});
    }
    numPlayers_++;
}

void SnakeGame::onPlayerLeave(int playerId) {
    if (playerId < static_cast<int>(snakes_.size())) {
        snakes_[playerId].alive = false;
        numPlayers_--;
    }
}

SnakeGame::Point SnakeGame::getSpawnPoint(int id) {
    switch (id % 4) {
        case 0: return {GRID_W / 4, GRID_H / 4};
        case 1: return {3 * GRID_W / 4, GRID_H / 4};
        case 2: return {GRID_W / 4, 3 * GRID_H / 4};
        default: return {3 * GRID_W / 4, 3 * GRID_H / 4};
    }
}

void SnakeGame::spawnFood() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    std::uniform_int_distribution<int> xDist(0, GRID_W - 1);
    std::uniform_int_distribution<int> yDist(0, GRID_H - 1);

    for (int attempts = 0; attempts < 100; ++attempts) {
        Point p = {xDist(gen), yDist(gen)};
        bool valid = true;

        for (const auto& snake : snakes_) {
            if (!snake.alive) continue;
            for (const auto& seg : snake.body) {
                if (seg == p) { valid = false; break; }
            }
            if (!valid) break;
        }

        for (const auto& f : food_) {
            if (f == p) { valid = false; break; }
        }

        if (valid) {
            food_.push_back(p);
            return;
        }
    }
}

void SnakeGame::update(float deltaTime) {
    if (!started_ || gameOver_) return;

    moveTimer_ += deltaTime;
    if (moveTimer_ < MOVE_INTERVAL) return;
    moveTimer_ = 0;

    int aliveCount = 0;
    int lastAlive = -1;

    for (size_t i = 0; i < snakes_.size(); ++i) {
        if (snakes_[i].alive) {
            moveSnake(static_cast<int>(i));
            if (snakes_[i].alive) {
                aliveCount++;
                lastAlive = static_cast<int>(i);
            }
        }
    }

    if (numPlayers_ > 1 && aliveCount <= 1) {
        gameOver_ = true;
        winner_ = lastAlive;
    } else if (numPlayers_ == 1 && aliveCount == 0) {
        gameOver_ = true;
        winner_ = -1;
    }

    while (food_.size() < static_cast<size_t>(std::max(1, numPlayers_))) {
        spawnFood();
    }
}

void SnakeGame::moveSnake(int id) {
    Snake& s = snakes_[id];
    if (!s.alive || s.body.empty()) return;

    s.dir = s.nextDir;

    Point head = s.body.front();
    switch (s.dir) {
        case Direction::Up:    head.y--; break;
        case Direction::Down:  head.y++; break;
        case Direction::Left:  head.x--; break;
        case Direction::Right: head.x++; break;
    }

    if (checkCollision(id, head)) {
        s.alive = false;
        return;
    }

    s.body.push_front(head);

    bool ate = false;
    for (auto it = food_.begin(); it != food_.end(); ++it) {
        if (*it == head) {
            ate = true;
            s.score += 10;
            food_.erase(it);
            spawnFood();
            break;
        }
    }

    if (!ate) s.body.pop_back();
}

bool SnakeGame::checkCollision(int id, const Point& head) {
    if (head.x < 0 || head.x >= GRID_W || head.y < 0 || head.y >= GRID_H) return true;

    for (size_t i = 0; i < snakes_.size(); ++i) {
        const Snake& s = snakes_[i];
        if (!s.alive) continue;
        for (size_t j = 0; j < s.body.size(); ++j) {
            if (static_cast<int>(i) == id && j == 0) continue;
            if (s.body[j] == head) return true;
        }
    }
    return false;
}

void SnakeGame::handleInput(int playerId, const json& input) {
    if (playerId < 0 || playerId >= static_cast<int>(snakes_.size())) return;

    Snake& s = snakes_[playerId];
    if (!s.alive) return;

    std::string dir = input.value("direction", "");

    if (dir == "up" && s.dir != Direction::Down) s.nextDir = Direction::Up;
    else if (dir == "down" && s.dir != Direction::Up) s.nextDir = Direction::Down;
    else if (dir == "left" && s.dir != Direction::Right) s.nextDir = Direction::Left;
    else if (dir == "right" && s.dir != Direction::Left) s.nextDir = Direction::Right;
}

json SnakeGame::getState() const {
    json snakesJson = json::array();
    for (const auto& s : snakes_) {
        json bodyJson = json::array();
        for (const auto& seg : s.body) {
            bodyJson.push_back({{"x", seg.x}, {"y", seg.y}});
        }
        snakesJson.push_back({{"body", bodyJson}, {"alive", s.alive}, {"score", s.score}, {"color", s.color}});
    }

    json foodJson = json::array();
    for (const auto& f : food_) {
        foodJson.push_back({{"x", f.x}, {"y", f.y}});
    }

    return {
        {"snakes", snakesJson},
        {"food", foodJson},
        {"gameOver", gameOver_},
        {"winner", winner_},
        {"config", {{"gridWidth", GRID_W}, {"gridHeight", GRID_H}, {"cellSize", CELL_SIZE}}}
    };
}

bool SnakeGame::isOver() const { return gameOver_; }
