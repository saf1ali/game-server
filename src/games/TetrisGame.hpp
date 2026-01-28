#pragma once

#include "Game.hpp"
#include <vector>
#include <array>

/**
 * Tetris game for 1-2 players.
 * Classic falling block puzzle game.
 */
class TetrisGame : public Game {
public:
    TetrisGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;
    bool isOver() const override;
    std::string getType() const override { return "tetris"; }
    int getMinPlayers() const override { return 1; }
    int getMaxPlayers() const override { return 2; }
    void onPlayerJoin(int playerId) override;
    void onPlayerLeave(int playerId) override;

private:
    static constexpr int BOARD_WIDTH = 10;
    static constexpr int BOARD_HEIGHT = 20;
    static constexpr float BASE_DROP_INTERVAL = 0.8f;
    static constexpr float SOFT_DROP_INTERVAL = 0.05f;

    // Tetromino shapes (4 rotations each)
    struct Tetromino {
        std::array<std::array<int, 4>, 4> shape;
        std::string color;
        int size;
    };

    struct PlayerState {
        std::vector<std::vector<int>> board;
        int currentPiece;
        int currentRotation;
        int pieceX, pieceY;
        int nextPiece;
        int score;
        int lines;
        int level;
        bool alive;
        bool softDrop;
        float dropTimer;
    };

    void spawnPiece(int playerId);
    bool canMove(int playerId, int dx, int dy, int rotation);
    void lockPiece(int playerId);
    void clearLines(int playerId);
    void rotatePiece(int playerId, int direction);
    void movePiece(int playerId, int dx);
    void hardDrop(int playerId);
    int getRandomPiece();
    const Tetromino& getTetromino(int type) const;

    std::vector<PlayerState> players_;
    int numPlayers_;
    bool gameOver_;
    int winner_;

    static const std::vector<Tetromino> TETROMINOES;
};
