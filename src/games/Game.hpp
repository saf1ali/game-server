#pragma once

#include <string>
#include <memory>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Forward declaration
class Connection;

/**
 * Abstract base class for all game types.
 * To add a new game, inherit from this class and implement all pure virtual methods.
 *
 * Example for adding a new game (e.g., Tetris):
 * 1. Create TetrisGame.hpp and TetrisGame.cpp
 * 2. Inherit from Game class
 * 3. Implement all virtual methods
 * 4. Register in Game::create() factory method
 */
class Game {
public:
    virtual ~Game() = default;

    /**
     * Called when the game starts (enough players joined).
     * Initialize game state here.
     */
    virtual void start() = 0;

    /**
     * Called every frame (60 times per second).
     * @param deltaTime Time since last update in seconds
     */
    virtual void update(float deltaTime) = 0;

    /**
     * Handle player input.
     * @param playerId The player's index (0-based)
     * @param input JSON object containing the input data
     */
    virtual void handleInput(int playerId, const json& input) = 0;

    /**
     * Get current game state for broadcasting to clients.
     * @return JSON object containing full game state
     */
    virtual json getState() const = 0;

    /**
     * Check if the game has ended.
     * @return true if game is over
     */
    virtual bool isOver() const = 0;

    /**
     * Get the game type identifier.
     * @return String like "pong", "snake", "chat"
     */
    virtual std::string getType() const = 0;

    /**
     * Get minimum players required to start.
     * @return Minimum player count
     */
    virtual int getMinPlayers() const = 0;

    /**
     * Get maximum players allowed.
     * @return Maximum player count
     */
    virtual int getMaxPlayers() const = 0;

    /**
     * Called when a player joins mid-game (if allowed).
     * @param playerId The new player's index
     */
    virtual void onPlayerJoin(int playerId) {}

    /**
     * Called when a player leaves.
     * @param playerId The leaving player's index
     */
    virtual void onPlayerLeave(int playerId) {}

    /**
     * Check if the game is currently running (started but not over).
     */
    bool isRunning() const { return started_ && !isOver(); }

    /**
     * Check if the game has been started.
     */
    bool hasStarted() const { return started_; }

    /**
     * Factory method to create games by type.
     * Add new game types here!
     * @param type Game type string ("pong", "snake", "chat")
     * @return Unique pointer to new game instance
     */
    static std::unique_ptr<Game> create(const std::string& type);

    /**
     * Get list of all available game types.
     */
    static std::vector<std::string> getAvailableTypes() {
        return {"pong", "snake", "chat", "tetris", "checkers", "connect4", "slither"};
    }

protected:
    bool started_ = false;
};
