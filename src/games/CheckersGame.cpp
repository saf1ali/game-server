#include "CheckersGame.hpp"
#include "../utils/Logger.hpp"

CheckersGame::CheckersGame()
    : currentPlayer_(0)
    , selectedX_(-1)
    , selectedY_(-1)
    , mustContinueCapture_(false)
    , gameOver_(false)
    , winner_(-1)
{
    // Initialize board
    board_.assign(BOARD_SIZE, std::vector<Piece>(BOARD_SIZE, Piece::Empty));

    // Place black pieces (player 1) at top
    for (int y = 0; y < 3; ++y) {
        for (int x = 0; x < BOARD_SIZE; ++x) {
            if ((x + y) % 2 == 1) {
                board_[y][x] = Piece::Black;
            }
        }
    }

    // Place red pieces (player 0) at bottom
    for (int y = 5; y < BOARD_SIZE; ++y) {
        for (int x = 0; x < BOARD_SIZE; ++x) {
            if ((x + y) % 2 == 1) {
                board_[y][x] = Piece::Red;
            }
        }
    }
}

void CheckersGame::start() {
    started_ = true;
    currentPlayer_ = 0; // Red goes first
    Logger::game("Checkers started!");
}

void CheckersGame::update(float deltaTime) {
    // Turn-based game, no continuous updates needed
}

bool CheckersGame::isPlayerPiece(int playerId, Piece piece) const {
    if (playerId == 0) {
        return piece == Piece::Red || piece == Piece::RedKing;
    }
    return piece == Piece::Black || piece == Piece::BlackKing;
}

bool CheckersGame::isKing(Piece piece) const {
    return piece == Piece::RedKing || piece == Piece::BlackKing;
}

int CheckersGame::getPieceOwner(Piece piece) const {
    if (piece == Piece::Red || piece == Piece::RedKing) return 0;
    if (piece == Piece::Black || piece == Piece::BlackKing) return 1;
    return -1;
}

std::vector<CheckersGame::Move> CheckersGame::getValidMovesForPiece(int x, int y) const {
    std::vector<Move> moves;
    Piece piece = board_[y][x];
    if (piece == Piece::Empty) return moves;

    int owner = getPieceOwner(piece);
    bool king = isKing(piece);

    // Direction: Red moves up (-1), Black moves down (+1), Kings can move both
    std::vector<int> directions;
    if (king) {
        directions = {-1, 1};
    } else {
        directions = {owner == 0 ? -1 : 1};
    }

    // Check captures first
    for (int dy : directions) {
        for (int dx : {-1, 1}) {
            int jumpX = x + dx * 2;
            int jumpY = y + dy * 2;
            int midX = x + dx;
            int midY = y + dy;

            if (jumpX >= 0 && jumpX < BOARD_SIZE && jumpY >= 0 && jumpY < BOARD_SIZE) {
                Piece midPiece = board_[midY][midX];
                if (midPiece != Piece::Empty && getPieceOwner(midPiece) != owner &&
                    board_[jumpY][jumpX] == Piece::Empty) {
                    moves.push_back({x, y, jumpX, jumpY, true, midX, midY});
                }
            }
        }
    }

    // If captures available, only allow captures
    if (!moves.empty()) return moves;

    // Regular moves
    for (int dy : directions) {
        for (int dx : {-1, 1}) {
            int newX = x + dx;
            int newY = y + dy;

            if (newX >= 0 && newX < BOARD_SIZE && newY >= 0 && newY < BOARD_SIZE) {
                if (board_[newY][newX] == Piece::Empty) {
                    moves.push_back({x, y, newX, newY, false, -1, -1});
                }
            }
        }
    }

    return moves;
}

std::vector<CheckersGame::Move> CheckersGame::getValidMoves(int playerId) const {
    std::vector<Move> allMoves;
    std::vector<Move> captures;

    for (int y = 0; y < BOARD_SIZE; ++y) {
        for (int x = 0; x < BOARD_SIZE; ++x) {
            if (isPlayerPiece(playerId, board_[y][x])) {
                auto moves = getValidMovesForPiece(x, y);
                for (const auto& move : moves) {
                    if (move.isCapture) {
                        captures.push_back(move);
                    } else {
                        allMoves.push_back(move);
                    }
                }
            }
        }
    }

    // Must capture if possible
    return captures.empty() ? allMoves : captures;
}

bool CheckersGame::canCapture(int playerId) const {
    for (int y = 0; y < BOARD_SIZE; ++y) {
        for (int x = 0; x < BOARD_SIZE; ++x) {
            if (isPlayerPiece(playerId, board_[y][x])) {
                auto moves = getValidMovesForPiece(x, y);
                for (const auto& move : moves) {
                    if (move.isCapture) return true;
                }
            }
        }
    }
    return false;
}

bool CheckersGame::isValidMove(int playerId, const Move& move) const {
    if (playerId != currentPlayer_) return false;

    auto validMoves = getValidMoves(playerId);
    for (const auto& m : validMoves) {
        if (m.fromX == move.fromX && m.fromY == move.fromY &&
            m.toX == move.toX && m.toY == move.toY) {
            return true;
        }
    }
    return false;
}

void CheckersGame::makeMove(const Move& move) {
    Piece piece = board_[move.fromY][move.fromX];
    board_[move.fromY][move.fromX] = Piece::Empty;
    board_[move.toY][move.toX] = piece;

    if (move.isCapture) {
        board_[move.captureY][move.captureX] = Piece::Empty;
    }

    checkForKing(move.toX, move.toY);

    // Check for multi-capture
    if (move.isCapture) {
        selectedX_ = move.toX;
        selectedY_ = move.toY;

        // Check if more captures available from this position
        auto moreMoves = getValidMovesForPiece(move.toX, move.toY);
        bool hasMoreCaptures = false;
        for (const auto& m : moreMoves) {
            if (m.isCapture) {
                hasMoreCaptures = true;
                break;
            }
        }

        if (hasMoreCaptures) {
            mustContinueCapture_ = true;
            return; // Don't switch turns
        }
    }

    mustContinueCapture_ = false;
    selectedX_ = -1;
    selectedY_ = -1;

    // Switch turns
    currentPlayer_ = 1 - currentPlayer_;

    // Check win conditions
    if (!hasValidMoves(currentPlayer_)) {
        gameOver_ = true;
        winner_ = 1 - currentPlayer_;
        Logger::game("Checkers: Player {} wins!", winner_);
    }
}

void CheckersGame::checkForKing(int x, int y) {
    Piece piece = board_[y][x];
    if (piece == Piece::Red && y == 0) {
        board_[y][x] = Piece::RedKing;
    } else if (piece == Piece::Black && y == BOARD_SIZE - 1) {
        board_[y][x] = Piece::BlackKing;
    }
}

bool CheckersGame::hasValidMoves(int playerId) const {
    return !getValidMoves(playerId).empty();
}

int CheckersGame::countPieces(int playerId) const {
    int count = 0;
    for (int y = 0; y < BOARD_SIZE; ++y) {
        for (int x = 0; x < BOARD_SIZE; ++x) {
            if (isPlayerPiece(playerId, board_[y][x])) {
                count++;
            }
        }
    }
    return count;
}

void CheckersGame::handleInput(int playerId, const json& input) {
    if (gameOver_ || playerId != currentPlayer_) return;

    std::string action = input.value("action", "");

    if (action == "select") {
        int x = input.value("x", -1);
        int y = input.value("y", -1);

        if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return;

        // If must continue capture, can only select the capturing piece
        if (mustContinueCapture_) {
            if (x == selectedX_ && y == selectedY_) {
                return; // Already selected
            }
            return; // Can't select other pieces
        }

        if (isPlayerPiece(playerId, board_[y][x])) {
            selectedX_ = x;
            selectedY_ = y;
        }
    }
    else if (action == "move") {
        int toX = input.value("x", -1);
        int toY = input.value("y", -1);

        if (selectedX_ < 0 || toX < 0 || toX >= BOARD_SIZE || toY < 0 || toY >= BOARD_SIZE) return;

        Move move = {selectedX_, selectedY_, toX, toY, false, -1, -1};

        // Check if it's a capture
        int dx = toX - selectedX_;
        int dy = toY - selectedY_;
        if (std::abs(dx) == 2 && std::abs(dy) == 2) {
            move.isCapture = true;
            move.captureX = selectedX_ + dx / 2;
            move.captureY = selectedY_ + dy / 2;
        }

        if (isValidMove(playerId, move)) {
            makeMove(move);
        }
    }
}

json CheckersGame::getState() const {
    json boardJson = json::array();
    for (int y = 0; y < BOARD_SIZE; ++y) {
        json rowJson = json::array();
        for (int x = 0; x < BOARD_SIZE; ++x) {
            rowJson.push_back(static_cast<int>(board_[y][x]));
        }
        boardJson.push_back(rowJson);
    }

    // Get valid moves for current player
    json validMovesJson = json::array();
    if (!gameOver_) {
        std::vector<Move> moves;
        if (mustContinueCapture_ && selectedX_ >= 0) {
            moves = getValidMovesForPiece(selectedX_, selectedY_);
        } else {
            moves = getValidMoves(currentPlayer_);
        }

        for (const auto& m : moves) {
            if (mustContinueCapture_ && !m.isCapture) continue;
            validMovesJson.push_back({
                {"fromX", m.fromX}, {"fromY", m.fromY},
                {"toX", m.toX}, {"toY", m.toY},
                {"isCapture", m.isCapture}
            });
        }
    }

    return {
        {"board", boardJson},
        {"currentPlayer", currentPlayer_},
        {"selectedX", selectedX_},
        {"selectedY", selectedY_},
        {"validMoves", validMovesJson},
        {"pieces", {countPieces(0), countPieces(1)}},
        {"gameOver", gameOver_},
        {"winner", winner_},
        {"config", {
            {"boardSize", BOARD_SIZE},
            {"cellSize", 60}
        }}
    };
}

bool CheckersGame::isOver() const {
    return gameOver_;
}
