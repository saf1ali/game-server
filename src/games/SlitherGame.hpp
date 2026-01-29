#pragma once

#include "Game.hpp"
#include "../physics/Vector2.hpp"
#include <deque>
#include <vector>
#include <random>

/**
 * Slither Battle - 2-6 player snake battle game
 * Eat pellets to grow, eliminate opponents by making them hit your body
 * Last snake standing wins the round, first to 3 round wins = game winner
 */
class SlitherGame : public Game {
public:
    // Arena size (larger to fit 6 players comfortably)
    static constexpr float ARENA_WIDTH = 1600.0f;
    static constexpr float ARENA_HEIGHT = 900.0f;

    // Snake properties
    static constexpr float BASE_SPEED = 150.0f;      // pixels/sec
    static constexpr float BOOST_SPEED = 300.0f;     // pixels/sec when boosting
    static constexpr float HEAD_RADIUS = 10.0f;
    static constexpr float BODY_RADIUS = 8.0f;
    static constexpr int   START_LENGTH = 10;
    static constexpr float TURN_SPEED = 5.0f;        // radians per second

    // Pellet properties
    static constexpr float PELLET_RADIUS = 5.0f;
    static constexpr int   INITIAL_PELLETS = 80;
    static constexpr int   MAX_PELLETS = 150;

    // Boost cost
    static constexpr float BOOST_COST_INTERVAL = 0.5f;  // lose segment every 0.5s

    // Win condition
    static constexpr int ROUNDS_TO_WIN = 3;

    SlitherGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;

    bool isOver() const override { return gameOver_; }
    std::string getType() const override { return "slither"; }
    int getMinPlayers() const override { return 2; }
    int getMaxPlayers() const override { return 6; }

    void onPlayerJoin(int playerId) override;
    void onPlayerLeave(int playerId) override;

private:
    struct Snake {
        std::deque<Vector2> body;  // body[0] = head
        Vector2 direction;         // normalized direction vector
        Vector2 targetDir;         // direction toward mouse
        bool alive = true;
        bool boosting = false;
        float boostTimer = 0.0f;
        int score = 0;
        int roundWins = 0;
        std::string username;
        std::string color;
    };

    struct Pellet {
        Vector2 pos;
        std::string color;
        int value = 1;  // 1 for normal, more for death drops
    };

    std::vector<Snake> snakes_;
    std::vector<Pellet> pellets_;

    int numPlayers_ = 0;
    bool gameOver_ = false;
    int winner_ = -1;
    int currentRound_ = 1;
    bool roundInProgress_ = false;

    // Random number generation
    std::mt19937 rng_;

    // 6 distinct colors for players
    const std::vector<std::string> PLAYER_COLORS = {
        "#ff2a6d",  // Pink/Red
        "#05d9e8",  // Cyan
        "#05ffa1",  // Green
        "#f9f002",  // Yellow
        "#ff6b35",  // Orange
        "#d557ff"   // Purple
    };

    // Pellet colors for variety
    const std::vector<std::string> PELLET_COLORS = {
        "#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3", "#f38181", "#aa96da"
    };

    void moveSnake(int playerId, float deltaTime);
    void checkFoodCollision(int playerId);
    void checkSnakeCollision(int playerId);
    void checkWallCollision(int playerId);
    void killSnake(int playerId);
    void spawnSnake(int playerId);
    void spawnPellet();
    void spawnDeathPellets(const Snake& snake);
    void checkRoundEnd();
    void startNewRound();
    Vector2 getRandomSpawnPos();
    std::string getRandomPelletColor();
};
