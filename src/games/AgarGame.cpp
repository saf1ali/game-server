#include "AgarGame.hpp"
#include "../utils/Logger.hpp"
#include <algorithm>
#include <cmath>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

AgarGame::AgarGame() : rng_(std::random_device{}()) {
}

void AgarGame::onPlayerJoin(int playerId, const std::string& username) {
    while (players_.size() <= static_cast<size_t>(playerId)) {
        players_.push_back(Player{});
    }

    Player& player = players_[playerId];
    player.username = username.empty() ? "Player" + std::to_string(playerId + 1) : username;
    player.color = PLAYER_COLORS[playerId % PLAYER_COLORS.size()];
    player.connected = true;
    player.score = 0;
    player.respawnTimer = 0.0f;
    player.cells.clear();

    // Spawn initial cell
    Cell cell;
    cell.pos = getRandomPos();
    cell.mass = START_MASS;
    cell.alive = true;
    cell.velocity = Vector2::zero();
    cell.mergeTimer = 0.0f;
    player.cells.push_back(cell);
    player.targetPos = cell.pos;

    Logger::game("Player '{}' joined agar game", player.username);
}

void AgarGame::onPlayerLeave(int playerId) {
    if (playerId < 0 || playerId >= static_cast<int>(players_.size())) return;

    players_[playerId].connected = false;
    players_[playerId].cells.clear();

    Logger::game("Player '{}' left agar game", players_[playerId].username);
}

void AgarGame::start() {
    gameOver_ = false;
    winner_ = -1;
    gameTimer_ = GAME_DURATION;

    // Spawn initial pellets
    pellets_.clear();
    for (int i = 0; i < INITIAL_PELLETS; i++) {
        spawnPellet();
    }

    // Respawn all players
    for (size_t i = 0; i < players_.size(); i++) {
        if (players_[i].connected) {
            respawnPlayer(static_cast<int>(i));
        }
    }

    Logger::game("Agar.io started with {} players!", players_.size());

    // Set started_ LAST to avoid race condition
    started_ = true;
}

void AgarGame::update(float deltaTime) {
    if (!started_ || gameOver_) return;

    // Update game timer
    gameTimer_ -= deltaTime;
    if (gameTimer_ <= 0) {
        gameTimer_ = 0;
        checkWinCondition();
        return;
    }

    // Update ejected pellets
    for (auto& pellet : pellets_) {
        if (pellet.isEjected && pellet.velocity.lengthSquared() > 1.0f) {
            pellet.pos = pellet.pos + pellet.velocity * deltaTime;
            pellet.velocity = pellet.velocity * 0.92f;

            // Clamp to arena
            pellet.pos.x = std::clamp(pellet.pos.x, 5.0f, ARENA_WIDTH - 5.0f);
            pellet.pos.y = std::clamp(pellet.pos.y, 5.0f, ARENA_HEIGHT - 5.0f);

            if (pellet.velocity.lengthSquared() < 1.0f) {
                pellet.isEjected = false;
            }
        }
    }

    // Update each player
    for (size_t p = 0; p < players_.size(); p++) {
        Player& player = players_[p];
        if (!player.connected) continue;

        // Handle respawn timer
        if (player.respawnTimer > 0) {
            player.respawnTimer -= deltaTime;
            if (player.respawnTimer <= 0) {
                respawnPlayer(static_cast<int>(p));
            }
            continue;
        }

        // Update merge timers and move cells
        for (size_t c = 0; c < player.cells.size(); c++) {
            Cell& cell = player.cells[c];
            if (!cell.alive) continue;

            if (cell.mergeTimer > 0) {
                cell.mergeTimer -= deltaTime;
            }

            moveCell(cell, player.targetPos, deltaTime);
        }

        // Check collisions
        for (size_t c = 0; c < player.cells.size(); c++) {
            if (!player.cells[c].alive) continue;
            checkPelletCollision(static_cast<int>(p), c);
            checkCellCollision(static_cast<int>(p), c);
        }

        // Check merges
        checkMerge(static_cast<int>(p));

        // Apply decay
        applyDecay(static_cast<int>(p), deltaTime);

        // Remove dead cells
        player.cells.erase(
            std::remove_if(player.cells.begin(), player.cells.end(),
                [](const Cell& c) { return !c.alive; }),
            player.cells.end()
        );

        // Check if player needs respawn
        if (player.cells.empty() && player.respawnTimer <= 0) {
            player.respawnTimer = 3.0f;
        }
    }

    // Maintain pellet count
    while (pellets_.size() < static_cast<size_t>(MAX_PELLETS)) {
        spawnPellet();
    }

    // Check win condition
    checkWinCondition();
}

void AgarGame::handleInput(int playerId, const json& input) {
    if (!started_ || gameOver_) return;
    if (playerId < 0 || playerId >= static_cast<int>(players_.size())) return;

    Player& player = players_[playerId];
    if (!player.connected) return;

    // Update target position
    if (input.contains("targetX") && input.contains("targetY")) {
        player.targetPos.x = input["targetX"].get<float>();
        player.targetPos.y = input["targetY"].get<float>();

        // Clamp to arena
        player.targetPos.x = std::clamp(player.targetPos.x, 0.0f, ARENA_WIDTH);
        player.targetPos.y = std::clamp(player.targetPos.y, 0.0f, ARENA_HEIGHT);
    }

    // Handle actions
    if (input.contains("action")) {
        std::string action = input["action"].get<std::string>();
        if (action == "split") {
            splitPlayer(playerId);
        } else if (action == "eject") {
            ejectMass(playerId);
        }
    }
}

json AgarGame::getState() const {
    json state;
    state["gameOver"] = gameOver_;
    state["winner"] = winner_;
    state["timeRemaining"] = gameTimer_;

    state["config"] = {
        {"arenaWidth", ARENA_WIDTH},
        {"arenaHeight", ARENA_HEIGHT}
    };

    // Players
    state["players"] = json::array();
    for (size_t p = 0; p < players_.size(); p++) {
        const Player& player = players_[p];

        json playerJson;
        playerJson["username"] = player.username;
        playerJson["color"] = player.color;
        playerJson["score"] = player.score;
        playerJson["connected"] = player.connected;
        playerJson["totalMass"] = getTotalMass(static_cast<int>(p));
        playerJson["respawnTimer"] = player.respawnTimer;

        playerJson["cells"] = json::array();
        for (const Cell& cell : player.cells) {
            if (!cell.alive) continue;
            playerJson["cells"].push_back({
                {"x", cell.pos.x},
                {"y", cell.pos.y},
                {"mass", cell.mass},
                {"alive", cell.alive}
            });
        }

        state["players"].push_back(playerJson);
    }

    // Pellets
    state["pellets"] = json::array();
    for (const Pellet& pellet : pellets_) {
        state["pellets"].push_back({
            {"x", pellet.pos.x},
            {"y", pellet.pos.y},
            {"color", pellet.color},
            {"mass", pellet.mass}
        });
    }

    return state;
}

float AgarGame::massToRadius(float mass) const {
    return std::sqrt(mass / static_cast<float>(M_PI)) * 4.0f;
}

float AgarGame::getSpeed(float mass) const {
    return BASE_SPEED / std::sqrt(mass / START_MASS);
}

void AgarGame::moveCell(Cell& cell, const Vector2& target, float dt) {
    // Apply velocity from split/eject
    if (cell.velocity.lengthSquared() > 1.0f) {
        cell.pos = cell.pos + cell.velocity * dt;
        cell.velocity = cell.velocity * 0.92f;
    }

    // Move toward target
    Vector2 direction = target - cell.pos;
    float distance = direction.length();

    if (distance > 5.0f) {
        direction = direction.normalized();
        float speed = getSpeed(cell.mass);
        float moveDistance = std::min(speed * dt, distance);
        cell.pos = cell.pos + direction * moveDistance;
    }

    // Clamp to arena bounds
    float radius = massToRadius(cell.mass);
    cell.pos.x = std::clamp(cell.pos.x, radius, ARENA_WIDTH - radius);
    cell.pos.y = std::clamp(cell.pos.y, radius, ARENA_HEIGHT - radius);
}

void AgarGame::checkPelletCollision(int playerId, size_t cellIndex) {
    Player& player = players_[playerId];
    Cell& cell = player.cells[cellIndex];
    float radius = massToRadius(cell.mass);

    for (auto it = pellets_.begin(); it != pellets_.end(); ) {
        float dist = (cell.pos - it->pos).length();
        if (dist < radius) {
            cell.mass += it->mass;
            player.score += static_cast<int>(it->mass);
            it = pellets_.erase(it);
        } else {
            ++it;
        }
    }
}

void AgarGame::checkCellCollision(int playerId, size_t cellIndex) {
    Player& player = players_[playerId];
    Cell& myCell = player.cells[cellIndex];
    if (!myCell.alive) return;

    float myRadius = massToRadius(myCell.mass);

    // Check against other players' cells
    for (size_t p = 0; p < players_.size(); p++) {
        if (static_cast<int>(p) == playerId) continue;

        Player& other = players_[p];
        if (!other.connected) continue;

        for (size_t c = 0; c < other.cells.size(); c++) {
            Cell& otherCell = other.cells[c];
            if (!otherCell.alive) continue;

            float otherRadius = massToRadius(otherCell.mass);
            float dist = (myCell.pos - otherCell.pos).length();

            // Must overlap significantly
            if (dist < myRadius - otherRadius * 0.4f) {
                // Must be 10% larger to eat
                if (myCell.mass > otherCell.mass * EAT_RATIO) {
                    myCell.mass += otherCell.mass;
                    player.score += static_cast<int>(otherCell.mass);
                    otherCell.alive = false;
                    Logger::game("Player '{}' ate a cell from '{}'",
                        player.username, other.username);
                }
            }
        }
    }
}

void AgarGame::checkMerge(int playerId) {
    Player& player = players_[playerId];
    if (player.cells.size() < 2) return;

    for (size_t i = 0; i < player.cells.size(); i++) {
        Cell& cellA = player.cells[i];
        if (!cellA.alive || cellA.mergeTimer > 0) continue;

        for (size_t j = i + 1; j < player.cells.size(); j++) {
            Cell& cellB = player.cells[j];
            if (!cellB.alive || cellB.mergeTimer > 0) continue;

            float radiusA = massToRadius(cellA.mass);
            float radiusB = massToRadius(cellB.mass);
            float dist = (cellA.pos - cellB.pos).length();

            // Cells overlap enough to merge
            if (dist < (radiusA + radiusB) * 0.5f) {
                // Merge into larger cell
                if (cellA.mass >= cellB.mass) {
                    cellA.mass += cellB.mass;
                    cellB.alive = false;
                } else {
                    cellB.mass += cellA.mass;
                    cellA.alive = false;
                }
                return; // Only one merge per frame
            }
        }
    }
}

void AgarGame::splitPlayer(int playerId) {
    Player& player = players_[playerId];

    int aliveCells = 0;
    for (const auto& c : player.cells) {
        if (c.alive) aliveCells++;
    }

    if (aliveCells >= MAX_CELLS_PER_PLAYER) return;

    std::vector<Cell> newCells;

    for (auto& cell : player.cells) {
        if (!cell.alive) continue;
        if (cell.mass < MIN_SPLIT_MASS) continue;
        if (aliveCells + static_cast<int>(newCells.size()) >= MAX_CELLS_PER_PLAYER) break;

        float newMass = cell.mass / 2.0f;
        cell.mass = newMass;

        Vector2 dir = (player.targetPos - cell.pos);
        if (dir.lengthSquared() > 0.1f) {
            dir = dir.normalized();
        } else {
            dir = Vector2(1.0f, 0.0f);
        }

        Cell newCell;
        newCell.pos = cell.pos + dir * massToRadius(cell.mass);
        newCell.velocity = dir * SPLIT_VELOCITY;
        newCell.mass = newMass;
        newCell.mergeTimer = MERGE_COOLDOWN;
        newCell.alive = true;

        cell.mergeTimer = MERGE_COOLDOWN;
        newCells.push_back(newCell);
    }

    for (auto& c : newCells) {
        player.cells.push_back(c);
    }
}

void AgarGame::ejectMass(int playerId) {
    Player& player = players_[playerId];

    for (auto& cell : player.cells) {
        if (!cell.alive) continue;
        if (cell.mass < EJECT_MASS_COST + MIN_MASS) continue;

        cell.mass -= EJECT_MASS_COST;

        Vector2 dir = (player.targetPos - cell.pos);
        if (dir.lengthSquared() > 0.1f) {
            dir = dir.normalized();
        } else {
            dir = Vector2(1.0f, 0.0f);
        }

        Pellet pellet;
        pellet.pos = cell.pos + dir * (massToRadius(cell.mass) + 10.0f);
        pellet.velocity = dir * EJECT_VELOCITY;
        pellet.mass = EJECTED_MASS;
        pellet.color = player.color;
        pellet.isEjected = true;

        pellets_.push_back(pellet);
    }
}

void AgarGame::applyDecay(int playerId, float dt) {
    Player& player = players_[playerId];

    for (auto& cell : player.cells) {
        if (!cell.alive) continue;
        if (cell.mass > DECAY_THRESHOLD) {
            float decayAmount = cell.mass * DECAY_RATE * dt;
            cell.mass -= decayAmount;
            if (cell.mass < DECAY_THRESHOLD) {
                cell.mass = DECAY_THRESHOLD;
            }
        }
    }
}

void AgarGame::respawnPlayer(int playerId) {
    if (playerId < 0 || playerId >= static_cast<int>(players_.size())) return;

    Player& player = players_[playerId];
    player.cells.clear();
    player.respawnTimer = 0.0f;

    Cell cell;
    cell.pos = getRandomPos();
    cell.mass = START_MASS;
    cell.alive = true;
    cell.velocity = Vector2::zero();
    cell.mergeTimer = 0.0f;

    player.cells.push_back(cell);
    player.targetPos = cell.pos;
}

void AgarGame::spawnPellet() {
    Pellet pellet;
    pellet.pos = getRandomPos();
    pellet.mass = PELLET_MASS;
    pellet.color = PELLET_COLORS[rng_() % PELLET_COLORS.size()];
    pellet.isEjected = false;
    pellet.velocity = Vector2::zero();

    pellets_.push_back(pellet);
}

Vector2 AgarGame::getRandomPos() {
    std::uniform_real_distribution<float> distX(50.0f, ARENA_WIDTH - 50.0f);
    std::uniform_real_distribution<float> distY(50.0f, ARENA_HEIGHT - 50.0f);
    return Vector2(distX(rng_), distY(rng_));
}

float AgarGame::getTotalMass(int playerId) const {
    if (playerId < 0 || playerId >= static_cast<int>(players_.size())) return 0.0f;

    float total = 0.0f;
    for (const Cell& cell : players_[playerId].cells) {
        if (cell.alive) {
            total += cell.mass;
        }
    }
    return total;
}

bool AgarGame::hasAliveCells(int playerId) const {
    if (playerId < 0 || playerId >= static_cast<int>(players_.size())) return false;

    for (const Cell& cell : players_[playerId].cells) {
        if (cell.alive) return true;
    }
    return false;
}

void AgarGame::checkWinCondition() {
    // Check if someone reached max mass
    for (size_t p = 0; p < players_.size(); p++) {
        if (!players_[p].connected) continue;
        if (getTotalMass(static_cast<int>(p)) >= MAX_MASS) {
            gameOver_ = true;
            winner_ = static_cast<int>(p);
            Logger::game("Player '{}' wins by reaching {} mass!",
                players_[p].username, MAX_MASS);
            return;
        }
    }

    // Check if time ran out
    if (gameTimer_ <= 0) {
        float maxMass = 0.0f;
        int maxPlayer = -1;

        for (size_t p = 0; p < players_.size(); p++) {
            if (!players_[p].connected) continue;
            float mass = getTotalMass(static_cast<int>(p));
            if (mass > maxMass) {
                maxMass = mass;
                maxPlayer = static_cast<int>(p);
            }
        }

        if (maxPlayer >= 0) {
            gameOver_ = true;
            winner_ = maxPlayer;
            Logger::game("Player '{}' wins with {} mass (time expired)!",
                players_[maxPlayer].username, maxMass);
        }
    }

    // Check if only one player left with cells
    int playersWithCells = 0;
    int lastPlayerWithCells = -1;

    for (size_t p = 0; p < players_.size(); p++) {
        if (players_[p].connected && hasAliveCells(static_cast<int>(p))) {
            playersWithCells++;
            lastPlayerWithCells = static_cast<int>(p);
        }
    }

    if (playersWithCells == 1 && players_.size() > 1) {
        // Give other players a chance to respawn
        bool othersRespawning = false;
        for (size_t p = 0; p < players_.size(); p++) {
            if (static_cast<int>(p) != lastPlayerWithCells &&
                players_[p].connected && players_[p].respawnTimer > 0) {
                othersRespawning = true;
                break;
            }
        }

        if (!othersRespawning) {
            gameOver_ = true;
            winner_ = lastPlayerWithCells;
            Logger::game("Player '{}' wins as last survivor!",
                players_[lastPlayerWithCells].username);
        }
    }
}
