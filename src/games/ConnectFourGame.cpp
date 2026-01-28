#include "ConnectFourGame.hpp"
#include "../utils/Logger.hpp"

ConnectFourGame::ConnectFourGame()
    : currentPlayer_(0)
    , winner_(-1)
    , gameOver_(false)
    , numPlayers_(0)
    , lastCol_(-1)
    , lastRow_(-1)
{
    // Initialize empty board
    for (auto& row : board_) {
        row.fill(0);
    }
}

void ConnectFourGame::start() {
    started_ = true;
    currentPlayer_ = 0; // Red goes first
    Logger::game("Connect Four started!");
}

void ConnectFourGame::update(float deltaTime) {
    // Turn-based game, no continuous updates needed
}

void ConnectFourGame::onPlayerJoin(int playerId) {
    numPlayers_++;
    Logger::game("Player {} joined Connect Four", playerId);
}

void ConnectFourGame::onPlayerLeave(int playerId) {
    numPlayers_--;
    if (started_ && !gameOver_) {
        // Other player wins by forfeit
        winner_ = (playerId == 0) ? 1 : 0;
        gameOver_ = true;
        Logger::game("Player {} left, player {} wins by forfeit", playerId, winner_);
    }
}

void ConnectFourGame::handleInput(int playerId, const json& input) {
    if (gameOver_ || !started_) return;
    if (playerId != currentPlayer_) return;

    if (input.contains("col")) {
        int col = input["col"].get<int>();

        if (col >= 0 && col < COLS) {
            if (dropDisc(col, playerId + 1)) { // +1 because 0 means empty
                // Check for win
                if (checkWin(lastRow_, lastCol_, playerId + 1)) {
                    winner_ = playerId;
                    gameOver_ = true;
                    Logger::game("Player {} wins Connect Four!", playerId);
                } else if (isBoardFull()) {
                    winner_ = -1; // Draw
                    gameOver_ = true;
                    Logger::game("Connect Four ended in a draw!");
                } else {
                    // Switch turns
                    currentPlayer_ = 1 - currentPlayer_;
                }
            }
        }
    }
}

bool ConnectFourGame::dropDisc(int col, int player) {
    int row = getLowestEmptyRow(col);
    if (row == -1) return false; // Column full

    board_[row][col] = player;
    lastCol_ = col;
    lastRow_ = row;
    return true;
}

int ConnectFourGame::getLowestEmptyRow(int col) const {
    for (int row = ROWS - 1; row >= 0; row--) {
        if (board_[row][col] == 0) {
            return row;
        }
    }
    return -1; // Column full
}

bool ConnectFourGame::checkWin(int row, int col, int player) {
    // Check all 4 directions: horizontal, vertical, diagonal down-right, diagonal up-right

    // Direction vectors: (dr, dc)
    const int dirs[4][2] = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};

    for (const auto& dir : dirs) {
        int count = 1; // Count the placed disc

        // Check positive direction
        for (int i = 1; i < 4; i++) {
            int r = row + dir[0] * i;
            int c = col + dir[1] * i;
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board_[r][c] == player) {
                count++;
            } else {
                break;
            }
        }

        // Check negative direction
        for (int i = 1; i < 4; i++) {
            int r = row - dir[0] * i;
            int c = col - dir[1] * i;
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board_[r][c] == player) {
                count++;
            } else {
                break;
            }
        }

        if (count >= 4) return true;
    }

    return false;
}

bool ConnectFourGame::isBoardFull() const {
    for (int col = 0; col < COLS; col++) {
        if (board_[0][col] == 0) return false;
    }
    return true;
}

json ConnectFourGame::getState() const {
    json state;

    // Convert board to JSON
    json boardJson = json::array();
    for (const auto& row : board_) {
        json rowJson = json::array();
        for (int cell : row) {
            rowJson.push_back(cell);
        }
        boardJson.push_back(rowJson);
    }
    state["board"] = boardJson;
    state["currentPlayer"] = currentPlayer_;
    state["gameOver"] = gameOver_;
    state["winner"] = winner_;
    state["lastCol"] = lastCol_;
    state["lastRow"] = lastRow_;

    state["config"] = {
        {"cols", COLS},
        {"rows", ROWS}
    };

    return state;
}
