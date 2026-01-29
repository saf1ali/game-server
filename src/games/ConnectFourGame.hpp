#pragma once

#include "Game.hpp"
#include <array>

/**
 * Connect Four - 2 player game
 * Drop discs, get 4 in a row to win
 */
class ConnectFourGame : public Game {
public:
    static constexpr int COLS = 7;
    static constexpr int ROWS = 6;

    ConnectFourGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;

    bool isOver() const override { return gameOver_; }

    std::string getType() const override { return "connect4"; }
    int getMinPlayers() const override { return 2; }
    int getMaxPlayers() const override { return 2; }

    void onPlayerJoin(int playerId, const std::string& username = "") override;
    void onPlayerLeave(int playerId) override;

private:
    // 0 = empty, 1 = player 1 (red), 2 = player 2 (yellow)
    std::array<std::array<int, COLS>, ROWS> board_;
    int currentPlayer_;
    int winner_;
    bool gameOver_;
    // Note: started_ is inherited from base Game class
    int numPlayers_;

    // Last move for animation
    int lastCol_;
    int lastRow_;

    bool dropDisc(int col, int player);
    bool checkWin(int row, int col, int player);
    bool isBoardFull() const;
    int getLowestEmptyRow(int col) const;
};
