#pragma once

#include "Game.hpp"
#include "../physics/Vector2.hpp"
#include <vector>
#include <random>

class AgarGame : public Game {
public:
    // Arena size
    static constexpr float ARENA_WIDTH = 2000.0f;
    static constexpr float ARENA_HEIGHT = 2000.0f;

    // Cell properties
    static constexpr float START_MASS = 10.0f;
    static constexpr float MIN_MASS = 10.0f;
    static constexpr float MAX_MASS = 500.0f;
    static constexpr float BASE_SPEED = 200.0f;
    static constexpr float EAT_RATIO = 1.1f;

    // Pellet properties
    static constexpr float PELLET_MASS = 1.0f;
    static constexpr int INITIAL_PELLETS = 200;
    static constexpr int MAX_PELLETS = 300;

    // Split mechanics
    static constexpr float MIN_SPLIT_MASS = 35.0f;
    static constexpr float SPLIT_VELOCITY = 400.0f;
    static constexpr int MAX_CELLS_PER_PLAYER = 8;
    static constexpr float MERGE_COOLDOWN = 15.0f;

    // Eject mechanics
    static constexpr float EJECT_MASS_COST = 16.0f;
    static constexpr float EJECTED_MASS = 14.0f;
    static constexpr float EJECT_VELOCITY = 500.0f;

    // Decay
    static constexpr float DECAY_THRESHOLD = 100.0f;
    static constexpr float DECAY_RATE = 0.002f;

    // Game timing
    static constexpr float GAME_DURATION = 300.0f;

    AgarGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;

    bool isOver() const override { return gameOver_; }
    std::string getType() const override { return "agar"; }
    int getMinPlayers() const override { return 2; }
    int getMaxPlayers() const override { return 8; }

    void onPlayerJoin(int playerId, const std::string& username = "") override;
    void onPlayerLeave(int playerId) override;

private:
    struct Cell {
        Vector2 pos;
        Vector2 velocity;
        float mass = START_MASS;
        float mergeTimer = 0.0f;
        bool alive = true;
    };

    struct Player {
        std::vector<Cell> cells;
        Vector2 targetPos;
        std::string username;
        std::string color;
        int score = 0;
        float respawnTimer = 0.0f;
        bool connected = true;
    };

    struct Pellet {
        Vector2 pos;
        std::string color;
        float mass = PELLET_MASS;
        bool isEjected = false;
        Vector2 velocity;
    };

    std::vector<Player> players_;
    std::vector<Pellet> pellets_;

    bool gameOver_ = false;
    int winner_ = -1;
    float gameTimer_ = GAME_DURATION;

    std::mt19937 rng_;

    const std::vector<std::string> PLAYER_COLORS = {
        "#ff2a6d", "#05d9e8", "#05ffa1", "#f9f002",
        "#ff6b35", "#d557ff", "#00ff88", "#ff8800"
    };

    const std::vector<std::string> PELLET_COLORS = {
        "#ff0055", "#00ffaa", "#ffaa00", "#aa00ff",
        "#00aaff", "#ff5500", "#55ff00", "#ff00aa"
    };

    float massToRadius(float mass) const;
    float getSpeed(float mass) const;
    void moveCell(Cell& cell, const Vector2& target, float dt);
    void checkPelletCollision(int playerId, size_t cellIndex);
    void checkCellCollision(int playerId, size_t cellIndex);
    void checkMerge(int playerId);
    void splitPlayer(int playerId);
    void ejectMass(int playerId);
    void applyDecay(int playerId, float dt);
    void respawnPlayer(int playerId);
    void spawnPellet();
    Vector2 getRandomPos();
    float getTotalMass(int playerId) const;
    void checkWinCondition();
    bool hasAliveCells(int playerId) const;
};
