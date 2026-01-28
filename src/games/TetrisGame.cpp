#include "TetrisGame.hpp"
#include "../utils/Logger.hpp"
#include <random>
#include <algorithm>

// I=0, O=1, T=2, S=3, Z=4, J=5, L=6
const std::vector<TetrisGame::Tetromino> TetrisGame::TETROMINOES = {
    // I piece (cyan)
    {{{
        {0,0,0,0},
        {1,1,1,1},
        {0,0,0,0},
        {0,0,0,0}
    }}, "#00f5ff", 4},
    // O piece (yellow)
    {{{
        {1,1,0,0},
        {1,1,0,0},
        {0,0,0,0},
        {0,0,0,0}
    }}, "#ffff00", 2},
    // T piece (purple)
    {{{
        {0,1,0,0},
        {1,1,1,0},
        {0,0,0,0},
        {0,0,0,0}
    }}, "#a000f0", 3},
    // S piece (green)
    {{{
        {0,1,1,0},
        {1,1,0,0},
        {0,0,0,0},
        {0,0,0,0}
    }}, "#00f000", 3},
    // Z piece (red)
    {{{
        {1,1,0,0},
        {0,1,1,0},
        {0,0,0,0},
        {0,0,0,0}
    }}, "#f00000", 3},
    // J piece (blue)
    {{{
        {1,0,0,0},
        {1,1,1,0},
        {0,0,0,0},
        {0,0,0,0}
    }}, "#0000f0", 3},
    // L piece (orange)
    {{{
        {0,0,1,0},
        {1,1,1,0},
        {0,0,0,0},
        {0,0,0,0}
    }}, "#f0a000", 3}
};

TetrisGame::TetrisGame() : numPlayers_(0), gameOver_(false), winner_(-1) {}

void TetrisGame::start() {
    started_ = true;
    for (int i = 0; i < numPlayers_; ++i) {
        spawnPiece(i);
    }
    Logger::game("Tetris started with {} player(s)!", numPlayers_);
}

void TetrisGame::onPlayerJoin(int playerId) {
    if (playerId >= static_cast<int>(players_.size())) {
        players_.resize(playerId + 1);
    }

    auto& p = players_[playerId];
    p.board.assign(BOARD_HEIGHT, std::vector<int>(BOARD_WIDTH, 0));
    p.currentPiece = -1;
    p.currentRotation = 0;
    p.pieceX = 0;
    p.pieceY = 0;
    p.nextPiece = getRandomPiece();
    p.score = 0;
    p.lines = 0;
    p.level = 1;
    p.alive = true;
    p.softDrop = false;
    p.dropTimer = 0;

    numPlayers_++;
}

void TetrisGame::onPlayerLeave(int playerId) {
    if (playerId < static_cast<int>(players_.size())) {
        players_[playerId].alive = false;
        numPlayers_--;
    }
}

int TetrisGame::getRandomPiece() {
    static std::random_device rd;
    static std::mt19937 gen(rd());
    std::uniform_int_distribution<int> dist(0, 6);
    return dist(gen);
}

const TetrisGame::Tetromino& TetrisGame::getTetromino(int type) const {
    return TETROMINOES[type % TETROMINOES.size()];
}

void TetrisGame::spawnPiece(int playerId) {
    auto& p = players_[playerId];
    p.currentPiece = p.nextPiece;
    p.nextPiece = getRandomPiece();
    p.currentRotation = 0;
    p.pieceX = BOARD_WIDTH / 2 - 2;
    p.pieceY = 0;

    if (!canMove(playerId, 0, 0, 0)) {
        p.alive = false;
        Logger::game("Player {} game over! Score: {}", playerId, p.score);
    }
}

bool TetrisGame::canMove(int playerId, int dx, int dy, int rotation) {
    const auto& p = players_[playerId];
    const auto& tetro = getTetromino(p.currentPiece);
    int newX = p.pieceX + dx;
    int newY = p.pieceY + dy;
    int rot = (p.currentRotation + rotation + 4) % 4;

    for (int py = 0; py < 4; ++py) {
        for (int px = 0; px < 4; ++px) {
            // Apply rotation
            int rx, ry;
            switch (rot) {
                case 0: rx = px; ry = py; break;
                case 1: rx = 3 - py; ry = px; break;
                case 2: rx = 3 - px; ry = 3 - py; break;
                case 3: rx = py; ry = 3 - px; break;
                default: rx = px; ry = py;
            }

            if (tetro.shape[ry][rx] == 0) continue;

            int boardX = newX + px;
            int boardY = newY + py;

            if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                return false;
            }
            if (boardY >= 0 && p.board[boardY][boardX] != 0) {
                return false;
            }
        }
    }
    return true;
}

void TetrisGame::lockPiece(int playerId) {
    auto& p = players_[playerId];
    const auto& tetro = getTetromino(p.currentPiece);

    for (int py = 0; py < 4; ++py) {
        for (int px = 0; px < 4; ++px) {
            int rx, ry;
            switch (p.currentRotation) {
                case 0: rx = px; ry = py; break;
                case 1: rx = 3 - py; ry = px; break;
                case 2: rx = 3 - px; ry = 3 - py; break;
                case 3: rx = py; ry = 3 - px; break;
                default: rx = px; ry = py;
            }

            if (tetro.shape[ry][rx] == 0) continue;

            int boardX = p.pieceX + px;
            int boardY = p.pieceY + py;

            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                p.board[boardY][boardX] = p.currentPiece + 1;
            }
        }
    }

    clearLines(playerId);
    spawnPiece(playerId);
}

void TetrisGame::clearLines(int playerId) {
    auto& p = players_[playerId];
    int linesCleared = 0;

    for (int y = BOARD_HEIGHT - 1; y >= 0; --y) {
        bool full = true;
        for (int x = 0; x < BOARD_WIDTH; ++x) {
            if (p.board[y][x] == 0) {
                full = false;
                break;
            }
        }

        if (full) {
            linesCleared++;
            for (int row = y; row > 0; --row) {
                p.board[row] = p.board[row - 1];
            }
            p.board[0].assign(BOARD_WIDTH, 0);
            y++; // Check same row again
        }
    }

    if (linesCleared > 0) {
        // Scoring: 100, 300, 500, 800 for 1-4 lines
        int points[] = {0, 100, 300, 500, 800};
        p.score += points[std::min(linesCleared, 4)] * p.level;
        p.lines += linesCleared;
        p.level = 1 + p.lines / 10;
    }
}

void TetrisGame::rotatePiece(int playerId, int direction) {
    if (canMove(playerId, 0, 0, direction)) {
        players_[playerId].currentRotation = (players_[playerId].currentRotation + direction + 4) % 4;
    }
    // Wall kick attempts
    else if (canMove(playerId, 1, 0, direction)) {
        players_[playerId].pieceX++;
        players_[playerId].currentRotation = (players_[playerId].currentRotation + direction + 4) % 4;
    }
    else if (canMove(playerId, -1, 0, direction)) {
        players_[playerId].pieceX--;
        players_[playerId].currentRotation = (players_[playerId].currentRotation + direction + 4) % 4;
    }
}

void TetrisGame::movePiece(int playerId, int dx) {
    if (canMove(playerId, dx, 0, 0)) {
        players_[playerId].pieceX += dx;
    }
}

void TetrisGame::hardDrop(int playerId) {
    auto& p = players_[playerId];
    while (canMove(playerId, 0, 1, 0)) {
        p.pieceY++;
        p.score += 2;
    }
    lockPiece(playerId);
}

void TetrisGame::update(float deltaTime) {
    if (!started_ || gameOver_) return;

    int aliveCount = 0;
    int lastAlive = -1;

    for (size_t i = 0; i < players_.size(); ++i) {
        auto& p = players_[i];
        if (!p.alive) continue;

        aliveCount++;
        lastAlive = static_cast<int>(i);

        float dropInterval = p.softDrop ? SOFT_DROP_INTERVAL : (BASE_DROP_INTERVAL / p.level);
        p.dropTimer += deltaTime;

        if (p.dropTimer >= dropInterval) {
            p.dropTimer = 0;

            if (canMove(i, 0, 1, 0)) {
                p.pieceY++;
                if (p.softDrop) p.score++;
            } else {
                lockPiece(i);
            }
        }
    }

    if (aliveCount == 0 || (numPlayers_ > 1 && aliveCount <= 1)) {
        gameOver_ = true;
        winner_ = lastAlive;
    }
}

void TetrisGame::handleInput(int playerId, const json& input) {
    if (playerId < 0 || playerId >= static_cast<int>(players_.size())) return;
    if (!players_[playerId].alive) return;

    std::string action = input.value("action", "");

    if (action == "left") {
        movePiece(playerId, -1);
    } else if (action == "right") {
        movePiece(playerId, 1);
    } else if (action == "rotate_cw") {
        rotatePiece(playerId, 1);
    } else if (action == "rotate_ccw") {
        rotatePiece(playerId, -1);
    } else if (action == "soft_drop_start") {
        players_[playerId].softDrop = true;
    } else if (action == "soft_drop_end") {
        players_[playerId].softDrop = false;
    } else if (action == "hard_drop") {
        hardDrop(playerId);
    }
}

json TetrisGame::getState() const {
    json playersJson = json::array();

    for (size_t i = 0; i < players_.size(); ++i) {
        const auto& p = players_[i];

        json boardJson = json::array();
        for (const auto& row : p.board) {
            json rowJson = json::array();
            for (int cell : row) {
                rowJson.push_back(cell);
            }
            boardJson.push_back(rowJson);
        }

        // Get current piece shape with rotation
        json pieceJson = json::array();
        if (p.currentPiece >= 0) {
            const auto& tetro = getTetromino(p.currentPiece);
            for (int py = 0; py < 4; ++py) {
                json rowJson = json::array();
                for (int px = 0; px < 4; ++px) {
                    int rx, ry;
                    switch (p.currentRotation) {
                        case 0: rx = px; ry = py; break;
                        case 1: rx = 3 - py; ry = px; break;
                        case 2: rx = 3 - px; ry = 3 - py; break;
                        case 3: rx = py; ry = 3 - px; break;
                        default: rx = px; ry = py;
                    }
                    rowJson.push_back(tetro.shape[ry][rx] ? p.currentPiece + 1 : 0);
                }
                pieceJson.push_back(rowJson);
            }
        }

        playersJson.push_back({
            {"board", boardJson},
            {"piece", pieceJson},
            {"pieceX", p.pieceX},
            {"pieceY", p.pieceY},
            {"nextPiece", p.nextPiece},
            {"score", p.score},
            {"lines", p.lines},
            {"level", p.level},
            {"alive", p.alive}
        });
    }

    // Color palette
    json colors = json::array();
    for (const auto& t : TETROMINOES) {
        colors.push_back(t.color);
    }

    return {
        {"players", playersJson},
        {"colors", colors},
        {"gameOver", gameOver_},
        {"winner", winner_},
        {"config", {
            {"boardWidth", BOARD_WIDTH},
            {"boardHeight", BOARD_HEIGHT},
            {"cellSize", 30}
        }}
    };
}

bool TetrisGame::isOver() const {
    return gameOver_;
}
