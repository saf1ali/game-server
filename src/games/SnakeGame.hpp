#pragma once

#include "Game.hpp"
#include <vector>
#include <deque>

/**
 * Snake game supporting 1-4 players.
 * Eat food to grow, avoid walls and other snakes!
 */
class SnakeGame : public Game {
public:
    SnakeGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;
    bool isOver() const override;
    std::string getType() const override { return "snake"; }
    int getMinPlayers() const override { return 1; }
    int getMaxPlayers() const override { return 4; }
    void onPlayerJoin(int playerId) override;
    void onPlayerLeave(int playerId) override;

private:
    struct Point {
        int x, y;
        bool operator==(const Point& o) const { return x == o.x && y == o.y; }
    };

    enum class Direction { Up, Down, Left, Right };

    struct Snake {
        std::deque<Point> body;
        Direction dir;
        Direction nextDir;
        bool alive;
        int score;
        std::string color;
    };

    void spawnFood();
    void moveSnake(int id);
    bool checkCollision(int id, const Point& head);
    Point getSpawnPoint(int id);

    static constexpr int GRID_W = 40;
    static constexpr int GRID_H = 30;
    static constexpr int CELL_SIZE = 20;
    static constexpr float MOVE_INTERVAL = 0.1f;

    std::vector<Snake> snakes_;
    std::vector<Point> food_;
    int numPlayers_;
    bool gameOver_;
    int winner_;
    float moveTimer_;

    const std::vector<std::string> COLORS = {"#4CAF50", "#2196F3", "#FF9800", "#E91E63"};
};
