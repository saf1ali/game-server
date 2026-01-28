#pragma once

#include "Game.hpp"
#include <vector>

/**
 * Checkers (Draughts) game for 2 players.
 * Standard 8x8 board with kings and captures.
 */
class CheckersGame : public Game {
public:
    CheckersGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;
    bool isOver() const override;
    std::string getType() const override { return "checkers"; }
    int getMinPlayers() const override { return 2; }
    int getMaxPlayers() const override { return 2; }

private:
    static constexpr int BOARD_SIZE = 8;

    enum class Piece : int {
        Empty = 0,
        Red = 1,
        RedKing = 2,
        Black = 3,
        BlackKing = 4
    };

    struct Move {
        int fromX, fromY;
        int toX, toY;
        bool isCapture;
        int captureX, captureY;
    };

    bool isValidMove(int playerId, const Move& move) const;
    bool canCapture(int playerId) const;
    std::vector<Move> getValidMoves(int playerId) const;
    std::vector<Move> getValidMovesForPiece(int x, int y) const;
    void makeMove(const Move& move);
    bool isPlayerPiece(int playerId, Piece piece) const;
    bool isKing(Piece piece) const;
    int getPieceOwner(Piece piece) const;
    void checkForKing(int x, int y);
    bool hasValidMoves(int playerId) const;
    int countPieces(int playerId) const;

    std::vector<std::vector<Piece>> board_;
    int currentPlayer_;
    int selectedX_, selectedY_;
    bool mustContinueCapture_;
    bool gameOver_;
    int winner_;
};
