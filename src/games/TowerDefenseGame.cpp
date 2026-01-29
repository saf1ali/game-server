#include "TowerDefenseGame.hpp"
#include "../utils/Logger.hpp"
#include <random>
#include <algorithm>

// Tower stats: cost, damage, range, cooldown, projectileSpeed, canHitFlying, canHitCamo
const std::array<TowerDefenseGame::TowerStats, 8> TowerDefenseGame::TOWER_STATS = {{
    {100, 15, 150.0f, 0.5f, 400.0f, true, false},   // ARCHER
    {200, 50, 120.0f, 1.5f, 250.0f, false, false},  // CANNON (AOE)
    {250, 25, 140.0f, 0.8f, 350.0f, true, true},    // MAGE (ignores armor)
    {200, 10, 130.0f, 0.6f, 300.0f, true, false},   // FROST (slows)
    {175, 5, 120.0f, 0.7f, 280.0f, true, false},    // POISON (DOT)
    {300, 35, 160.0f, 1.0f, 500.0f, true, false},   // LIGHTNING (chains)
    {250, 20, 80.0f, 2.0f, 0.0f, false, false},     // BARRACKS (melee)
    {1000, 100, 200.0f, 0.4f, 600.0f, true, true}   // ULTIMATE
}};

// Enemy stats: hp, armor, speed, goldReward, flying, camo
const std::array<TowerDefenseGame::EnemyStats, 15> TowerDefenseGame::ENEMY_STATS = {{
    {30, 0, 80.0f, 5, false, false},      // GOBLIN
    {100, 10, 50.0f, 15, false, false},   // ORC
    {250, 30, 35.0f, 30, false, false},   // ORC_BRUTE
    {80, 5, 100.0f, 20, false, false},    // WOLF_RIDER
    {500, 20, 30.0f, 50, false, false},   // TROLL (regens)
    {120, 0, 45.0f, 35, false, false},    // DARK_MAGE
    {40, 0, 90.0f, 15, true, false},      // BAT_SWARM
    {200, 15, 70.0f, 40, true, false},    // WYVERN
    {1000, 50, 25.0f, 100, false, false}, // GOLEM (magic immune)
    {60, 0, 120.0f, 25, false, true},     // ASSASSIN (camo)
    {150, 0, 40.0f, 45, false, false},    // NECROMANCER
    {2000, 35, 50.0f, 200, true, false},  // DRAGON
    {3000, 45, 20.0f, 300, false, false}, // GIANT
    {1500, 40, 45.0f, 250, false, false}, // DEMON_KNIGHT
    {15000, 60, 35.0f, 1000, false, false} // DEMON_KING
}};

// Upgrade multipliers per level (0=base, 1-3=upgrades)
const std::array<std::array<float, 4>, 8> TowerDefenseGame::UPGRADE_MULTIPLIERS = {{
    {1.0f, 1.4f, 1.9f, 2.5f},  // ARCHER
    {1.0f, 1.5f, 2.0f, 3.0f},  // CANNON
    {1.0f, 1.4f, 2.0f, 2.8f},  // MAGE
    {1.0f, 1.3f, 1.7f, 2.2f},  // FROST
    {1.0f, 1.5f, 2.2f, 3.0f},  // POISON
    {1.0f, 1.4f, 1.9f, 2.6f},  // LIGHTNING
    {1.0f, 1.5f, 2.0f, 2.8f},  // BARRACKS
    {1.0f, 1.3f, 1.6f, 2.0f}   // ULTIMATE
}};

// Wave definitions - 50 waves
const std::vector<TowerDefenseGame::Wave> TowerDefenseGame::WAVES = {
    // Wave 1-10: Tutorial
    {{{EnemyType::GOBLIN, 5, 1.0f}}, 50},
    {{{EnemyType::GOBLIN, 8, 0.9f}}, 55},
    {{{EnemyType::GOBLIN, 6, 0.8f}, {EnemyType::ORC, 2, 1.5f}}, 60},
    {{{EnemyType::ORC, 5, 1.2f}}, 65},
    {{{EnemyType::GOBLIN, 10, 0.6f}, {EnemyType::ORC, 3, 1.5f}}, 70},
    {{{EnemyType::ORC, 6, 1.0f}, {EnemyType::ORC_BRUTE, 1, 2.0f}}, 80},
    {{{EnemyType::WOLF_RIDER, 4, 1.0f}}, 85},
    {{{EnemyType::GOBLIN, 12, 0.5f}, {EnemyType::ORC, 5, 1.2f}}, 90},
    {{{EnemyType::ORC, 8, 0.8f}, {EnemyType::ORC_BRUTE, 2, 1.8f}}, 100},
    // Wave 10: First boss
    {{{EnemyType::ORC, 10, 0.6f}, {EnemyType::GIANT, 1, 3.0f}}, 200},

    // Wave 11-20: Flying + variety
    {{{EnemyType::BAT_SWARM, 8, 0.7f}}, 110},
    {{{EnemyType::GOBLIN, 15, 0.4f}, {EnemyType::BAT_SWARM, 5, 1.0f}}, 120},
    {{{EnemyType::ORC, 10, 0.7f}, {EnemyType::WOLF_RIDER, 5, 1.0f}}, 130},
    {{{EnemyType::TROLL, 3, 2.0f}}, 150},
    {{{EnemyType::BAT_SWARM, 10, 0.6f}, {EnemyType::WYVERN, 2, 2.0f}}, 160},
    {{{EnemyType::ORC_BRUTE, 6, 1.0f}, {EnemyType::DARK_MAGE, 2, 2.0f}}, 170},
    {{{EnemyType::WOLF_RIDER, 8, 0.8f}, {EnemyType::TROLL, 2, 2.5f}}, 180},
    {{{EnemyType::WYVERN, 5, 1.2f}}, 190},
    {{{EnemyType::ORC, 15, 0.5f}, {EnemyType::ORC_BRUTE, 5, 1.5f}, {EnemyType::TROLL, 2, 2.0f}}, 200},
    // Wave 20: Dragon boss
    {{{EnemyType::WYVERN, 6, 1.0f}, {EnemyType::DRAGON, 1, 4.0f}}, 350},

    // Wave 21-30: Camo + harder mixes
    {{{EnemyType::ASSASSIN, 6, 1.0f}}, 220},
    {{{EnemyType::GOBLIN, 20, 0.3f}, {EnemyType::ASSASSIN, 4, 1.5f}}, 230},
    {{{EnemyType::GOLEM, 2, 3.0f}}, 250},
    {{{EnemyType::TROLL, 5, 1.5f}, {EnemyType::DARK_MAGE, 3, 2.0f}}, 260},
    {{{EnemyType::ORC_BRUTE, 10, 0.8f}, {EnemyType::GOLEM, 2, 2.5f}}, 280},
    {{{EnemyType::WYVERN, 8, 0.9f}, {EnemyType::ASSASSIN, 5, 1.2f}}, 300},
    {{{EnemyType::NECROMANCER, 3, 2.0f}, {EnemyType::ORC, 15, 0.5f}}, 320},
    {{{EnemyType::TROLL, 6, 1.2f}, {EnemyType::GOLEM, 3, 2.0f}}, 340},
    {{{EnemyType::DRAGON, 2, 3.0f}, {EnemyType::WYVERN, 8, 0.8f}}, 360},
    // Wave 30: Giant + Dragon
    {{{EnemyType::GIANT, 2, 3.0f}, {EnemyType::DRAGON, 1, 4.0f}, {EnemyType::ORC_BRUTE, 10, 0.7f}}, 500},

    // Wave 31-40: Challenge phase
    {{{EnemyType::WOLF_RIDER, 15, 0.5f}, {EnemyType::ASSASSIN, 8, 0.8f}}, 380},
    {{{EnemyType::GOLEM, 4, 2.0f}, {EnemyType::DARK_MAGE, 5, 1.5f}}, 400},
    {{{EnemyType::TROLL, 8, 1.0f}, {EnemyType::NECROMANCER, 4, 1.8f}}, 420},
    {{{EnemyType::DRAGON, 3, 2.5f}, {EnemyType::BAT_SWARM, 15, 0.4f}}, 450},
    {{{EnemyType::ORC_BRUTE, 15, 0.6f}, {EnemyType::GOLEM, 5, 1.5f}}, 480},
    {{{EnemyType::GIANT, 3, 2.0f}, {EnemyType::TROLL, 6, 1.2f}}, 500},
    {{{EnemyType::ASSASSIN, 12, 0.6f}, {EnemyType::WYVERN, 10, 0.7f}}, 530},
    {{{EnemyType::NECROMANCER, 5, 1.5f}, {EnemyType::GOLEM, 4, 2.0f}}, 560},
    {{{EnemyType::DRAGON, 4, 2.0f}, {EnemyType::GIANT, 2, 2.5f}}, 600},
    // Wave 40: Demon Knight boss
    {{{EnemyType::DEMON_KNIGHT, 1, 5.0f}, {EnemyType::ORC_BRUTE, 20, 0.5f}, {EnemyType::DRAGON, 2, 3.0f}}, 800},

    // Wave 41-50: Endgame
    {{{EnemyType::GOLEM, 6, 1.5f}, {EnemyType::DRAGON, 3, 2.0f}}, 650},
    {{{EnemyType::TROLL, 10, 0.8f}, {EnemyType::GIANT, 3, 2.0f}}, 700},
    {{{EnemyType::ASSASSIN, 15, 0.5f}, {EnemyType::DEMON_KNIGHT, 1, 4.0f}}, 750},
    {{{EnemyType::NECROMANCER, 6, 1.2f}, {EnemyType::DRAGON, 4, 1.8f}}, 800},
    {{{EnemyType::GIANT, 4, 1.5f}, {EnemyType::GOLEM, 6, 1.2f}}, 850},
    {{{EnemyType::DRAGON, 5, 1.5f}, {EnemyType::WYVERN, 15, 0.5f}}, 900},
    {{{EnemyType::DEMON_KNIGHT, 2, 3.0f}, {EnemyType::TROLL, 10, 0.7f}}, 950},
    {{{EnemyType::GOLEM, 8, 1.0f}, {EnemyType::GIANT, 4, 1.5f}}, 1000},
    {{{EnemyType::DRAGON, 6, 1.2f}, {EnemyType::DEMON_KNIGHT, 2, 2.5f}}, 1100},
    // Wave 50: Final boss - Demon King
    {{{EnemyType::DEMON_KING, 1, 6.0f}, {EnemyType::DEMON_KNIGHT, 3, 2.0f}, {EnemyType::DRAGON, 4, 1.5f}}, 2000}
};

TowerDefenseGame::TowerDefenseGame()
    : gold_(STARTING_GOLD), lives_(STARTING_LIVES), wave_(0), score_(0),
      waveActive_(false), gameOver_(false), victory_(false), fastForward_(false),
      waveTimer_(0), enemiesSpawned_(0), enemiesRemaining_(0),
      nextTowerId_(1), nextEnemyId_(1), nextProjectileId_(1) {
    initMap();
}

void TowerDefenseGame::initMap() {
    // Initialize all cells as empty (buildable)
    for (int y = 0; y < GRID_HEIGHT; ++y) {
        for (int x = 0; x < GRID_WIDTH; ++x) {
            map_[y][x] = CellType::EMPTY;
        }
    }

    // Define the path waypoints (enemies follow this)
    path_ = {
        {0, 7},   // Start (left edge)
        {4, 7},
        {4, 2},
        {10, 2},
        {10, 12},
        {16, 12},
        {16, 7},
        {19, 7}   // End (right edge - castle)
    };

    // Mark path cells
    for (size_t i = 0; i < path_.size() - 1; ++i) {
        int x1 = path_[i].x, y1 = path_[i].y;
        int x2 = path_[i + 1].x, y2 = path_[i + 1].y;

        // Draw line between waypoints
        if (x1 == x2) {
            int minY = std::min(y1, y2);
            int maxY = std::max(y1, y2);
            for (int y = minY; y <= maxY; ++y) {
                map_[y][x1] = CellType::PATH;
            }
        } else {
            int minX = std::min(x1, x2);
            int maxX = std::max(x1, x2);
            for (int x = minX; x <= maxX; ++x) {
                map_[y1][x] = CellType::PATH;
            }
        }
    }

    // Add some blocked decorative areas
    for (int x = 7; x <= 8; ++x) {
        for (int y = 5; y <= 9; ++y) {
            if (map_[y][x] != CellType::PATH) {
                map_[y][x] = CellType::BLOCKED;
            }
        }
    }
    for (int x = 12; x <= 14; ++x) {
        for (int y = 5; y <= 7; ++y) {
            if (map_[y][x] != CellType::PATH) {
                map_[y][x] = CellType::BLOCKED;
            }
        }
    }
}

void TowerDefenseGame::start() {
    started_ = true;
    // Player manually starts first wave via input
    Logger::game("Tower Defense game started!");
}

void TowerDefenseGame::onPlayerJoin(int playerId, const std::string& /*username*/) {
    Logger::game("Player {} joined Tower Defense", playerId);
}

void TowerDefenseGame::onPlayerLeave(int playerId) {
    Logger::game("Player {} left Tower Defense", playerId);
}

void TowerDefenseGame::update(float deltaTime) {
    if (!started_ || gameOver_ || victory_) return;

    float dt = fastForward_ ? deltaTime * 2.0f : deltaTime;

    if (waveActive_) {
        updateWaveSpawning(dt);
    }

    updateEnemies(dt);
    updateTowers(dt);
    updateProjectiles(dt);

    if (waveActive_) {
        checkWaveComplete();
    }

    // Check victory
    if (wave_ >= MAX_WAVES && enemies_.empty() && !waveActive_) {
        victory_ = true;
        Logger::game("Victory! All 50 waves completed!");
    }
}

void TowerDefenseGame::handleInput(int /*playerId*/, const json& input) {
    if (gameOver_ || victory_) return;

    std::string action = input.value("action", "");

    if (action == "place_tower") {
        std::string typeStr = input.value("type", "archer");
        int x = input.value("x", -1);
        int y = input.value("y", -1);
        TowerType type = stringToTowerType(typeStr);
        placeTower(type, x, y);
    }
    else if (action == "sell_tower") {
        int towerId = input.value("towerId", -1);
        sellTower(towerId);
    }
    else if (action == "upgrade_tower") {
        int towerId = input.value("towerId", -1);
        upgradeTower(towerId);
    }
    else if (action == "set_targeting") {
        int towerId = input.value("towerId", -1);
        std::string priorityStr = input.value("priority", "first");
        setTargeting(towerId, stringToTargetPriority(priorityStr));
    }
    else if (action == "start_wave") {
        if (!waveActive_ && wave_ < MAX_WAVES) {
            startWave();
        }
    }
    else if (action == "fast_forward") {
        fastForward_ = input.value("enabled", false);
    }
}

json TowerDefenseGame::getState() const {
    // Build tower JSON
    json towersJson = json::array();
    for (const auto& t : towers_) {
        towersJson.push_back({
            {"id", t.id},
            {"type", towerTypeToString(t.type)},
            {"x", t.x},
            {"y", t.y},
            {"level", t.level},
            {"targeting", static_cast<int>(t.targeting)},
            {"cooldown", t.cooldown},
            {"targetId", t.targetId},
            {"range", getTowerRange(towers_[&t - &towers_[0]])}
        });
    }

    // Build enemy JSON
    json enemiesJson = json::array();
    for (const auto& e : enemies_) {
        if (!e.active) continue;
        json effectsJson = json::array();
        for (const auto& eff : e.effects) {
            effectsJson.push_back(static_cast<int>(eff.type));
        }
        enemiesJson.push_back({
            {"id", e.id},
            {"type", enemyTypeToString(e.type)},
            {"x", e.x},
            {"y", e.y},
            {"hp", e.hp},
            {"maxHp", e.maxHp},
            {"flying", e.flying},
            {"camo", e.camo},
            {"effects", effectsJson}
        });
    }

    // Build projectile JSON
    json projectilesJson = json::array();
    for (const auto& p : projectiles_) {
        if (!p.active) continue;
        projectilesJson.push_back({
            {"id", p.id},
            {"type", static_cast<int>(p.type)},
            {"x", p.x},
            {"y", p.y},
            {"targetId", p.targetId}
        });
    }

    // Build map data (only once needed, but included for simplicity)
    json mapJson = json::array();
    for (int y = 0; y < GRID_HEIGHT; ++y) {
        json row = json::array();
        for (int x = 0; x < GRID_WIDTH; ++x) {
            row.push_back(static_cast<int>(map_[y][x]));
        }
        mapJson.push_back(row);
    }

    // Path waypoints
    json pathJson = json::array();
    for (const auto& p : path_) {
        pathJson.push_back({{"x", p.x}, {"y", p.y}});
    }

    // Wave preview (next 3 waves)
    json wavePreviewJson = json::array();
    for (int i = wave_; i < std::min(wave_ + 3, MAX_WAVES); ++i) {
        json waveInfo = json::array();
        for (const auto& we : WAVES[i].enemies) {
            waveInfo.push_back({
                {"type", enemyTypeToString(we.type)},
                {"count", we.count}
            });
        }
        wavePreviewJson.push_back(waveInfo);
    }

    return {
        {"gold", gold_},
        {"lives", lives_},
        {"wave", wave_ + 1},  // 1-indexed for display
        {"maxWaves", MAX_WAVES},
        {"score", score_},
        {"waveActive", waveActive_},
        {"gameOver", gameOver_},
        {"victory", victory_},
        {"fastForward", fastForward_},
        {"towers", towersJson},
        {"enemies", enemiesJson},
        {"projectiles", projectilesJson},
        {"map", mapJson},
        {"path", pathJson},
        {"wavePreview", wavePreviewJson},
        {"config", {
            {"gridWidth", GRID_WIDTH},
            {"gridHeight", GRID_HEIGHT},
            {"cellSize", CELL_SIZE}
        }}
    };
}

bool TowerDefenseGame::isOver() const {
    return gameOver_ || victory_;
}

// ==================== Map Methods ====================

bool TowerDefenseGame::canPlaceTower(int x, int y) const {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
    if (map_[y][x] != CellType::EMPTY) return false;

    // Check if another tower exists here
    for (const auto& t : towers_) {
        if (t.x == x && t.y == y) return false;
    }
    return true;
}

TowerDefenseGame::FloatPoint TowerDefenseGame::getPositionOnPath(int pathIndex, float progress) const {
    if (pathIndex < 0 || pathIndex >= static_cast<int>(path_.size()) - 1) {
        return {static_cast<float>(path_.back().x * CELL_SIZE + CELL_SIZE / 2),
                static_cast<float>(path_.back().y * CELL_SIZE + CELL_SIZE / 2)};
    }

    float x1 = path_[pathIndex].x * CELL_SIZE + CELL_SIZE / 2.0f;
    float y1 = path_[pathIndex].y * CELL_SIZE + CELL_SIZE / 2.0f;
    float x2 = path_[pathIndex + 1].x * CELL_SIZE + CELL_SIZE / 2.0f;
    float y2 = path_[pathIndex + 1].y * CELL_SIZE + CELL_SIZE / 2.0f;

    return {x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress};
}

// ==================== Tower Methods ====================

bool TowerDefenseGame::placeTower(TowerType type, int x, int y) {
    if (!canPlaceTower(x, y)) return false;

    // Check if ultimate tower is unlocked (wave 40+)
    if (type == TowerType::ULTIMATE && wave_ < 39) return false;

    int cost = getTowerCost(type, 0);
    if (gold_ < cost) return false;

    gold_ -= cost;

    Tower tower;
    tower.id = nextTowerId_++;
    tower.type = type;
    tower.x = x;
    tower.y = y;
    tower.level = 0;
    tower.targeting = TargetPriority::FIRST;
    tower.cooldown = 0;
    tower.targetId = -1;
    tower.totalInvested = cost;

    towers_.push_back(tower);
    Logger::game("Placed {} tower at ({}, {})", towerTypeToString(type), x, y);
    return true;
}

bool TowerDefenseGame::sellTower(int towerId) {
    auto it = std::find_if(towers_.begin(), towers_.end(),
        [towerId](const Tower& t) { return t.id == towerId; });

    if (it == towers_.end()) return false;

    int refund = static_cast<int>(it->totalInvested * SELL_REFUND_RATE);
    gold_ += refund;
    towers_.erase(it);
    Logger::game("Sold tower {} for {} gold", towerId, refund);
    return true;
}

bool TowerDefenseGame::upgradeTower(int towerId) {
    auto it = std::find_if(towers_.begin(), towers_.end(),
        [towerId](const Tower& t) { return t.id == towerId; });

    if (it == towers_.end()) return false;
    if (it->level >= 3) return false;  // Max level

    int upgradeCost = getTowerCost(it->type, it->level + 1);
    if (gold_ < upgradeCost) return false;

    gold_ -= upgradeCost;
    it->totalInvested += upgradeCost;
    it->level++;

    Logger::game("Upgraded tower {} to level {}", towerId, it->level);
    return true;
}

void TowerDefenseGame::setTargeting(int towerId, TargetPriority priority) {
    auto it = std::find_if(towers_.begin(), towers_.end(),
        [towerId](const Tower& t) { return t.id == towerId; });

    if (it != towers_.end()) {
        it->targeting = priority;
    }
}

void TowerDefenseGame::updateTowers(float dt) {
    for (auto& tower : towers_) {
        // Reduce cooldown
        if (tower.cooldown > 0) {
            tower.cooldown -= dt;
        }

        // Find target if ready to fire
        if (tower.cooldown <= 0) {
            int targetId = findTarget(tower);
            tower.targetId = targetId;

            if (targetId >= 0) {
                auto enemyIt = std::find_if(enemies_.begin(), enemies_.end(),
                    [targetId](const Enemy& e) { return e.id == targetId && e.active; });

                if (enemyIt != enemies_.end()) {
                    fireTower(tower, *enemyIt);
                }
            }
        }
    }
}

int TowerDefenseGame::findTarget(const Tower& tower) const {
    const TowerStats& stats = getTowerStats(tower.type);
    float range = getTowerRange(tower);
    float towerX = tower.x * CELL_SIZE + CELL_SIZE / 2.0f;
    float towerY = tower.y * CELL_SIZE + CELL_SIZE / 2.0f;

    const Enemy* bestTarget = nullptr;
    float bestScore = -1;

    for (const auto& enemy : enemies_) {
        if (!enemy.active) continue;
        if (enemy.flying && !stats.canHitFlying) continue;
        if (enemy.camo && !stats.canHitCamo) continue;

        float dist = distance(towerX, towerY, enemy.x, enemy.y);
        if (dist > range) continue;

        float score = 0;
        switch (tower.targeting) {
            case TargetPriority::FIRST:
                score = enemy.pathIndex * 1000 + enemy.pathProgress;
                break;
            case TargetPriority::LAST:
                score = -(enemy.pathIndex * 1000 + enemy.pathProgress);
                break;
            case TargetPriority::STRONGEST:
                score = static_cast<float>(enemy.hp);
                break;
            case TargetPriority::WEAKEST:
                score = -static_cast<float>(enemy.hp);
                break;
            case TargetPriority::CLOSEST:
                score = -dist;
                break;
        }

        if (!bestTarget || score > bestScore) {
            bestTarget = &enemy;
            bestScore = score;
        }
    }

    return bestTarget ? bestTarget->id : -1;
}

void TowerDefenseGame::fireTower(Tower& tower, Enemy& target) {
    const TowerStats& stats = getTowerStats(tower.type);
    tower.cooldown = stats.cooldown;

    // Special case: Barracks doesn't fire projectiles (direct damage to adjacent)
    if (tower.type == TowerType::BARRACKS) {
        damageEnemy(target, getTowerDamage(tower), false);
        return;
    }

    createProjectile(tower, target);
}

const TowerDefenseGame::TowerStats& TowerDefenseGame::getTowerStats(TowerType type) const {
    return TOWER_STATS[static_cast<int>(type)];
}

int TowerDefenseGame::getTowerCost(TowerType type, int level) const {
    int baseCost = TOWER_STATS[static_cast<int>(type)].cost;
    if (level == 0) return baseCost;
    // Upgrades cost: 50%, 100%, 200% of base
    float mult[] = {0.5f, 1.0f, 2.0f};
    return static_cast<int>(baseCost * mult[level - 1]);
}

int TowerDefenseGame::getTowerDamage(const Tower& tower) const {
    int baseDamage = TOWER_STATS[static_cast<int>(tower.type)].damage;
    float mult = UPGRADE_MULTIPLIERS[static_cast<int>(tower.type)][tower.level];
    return static_cast<int>(baseDamage * mult);
}

float TowerDefenseGame::getTowerRange(const Tower& tower) const {
    float baseRange = TOWER_STATS[static_cast<int>(tower.type)].range;
    // Small range increase per level
    return baseRange * (1.0f + tower.level * 0.1f);
}

// ==================== Enemy Methods ====================

void TowerDefenseGame::spawnEnemy(EnemyType type) {
    const EnemyStats& stats = getEnemyStats(type);

    Enemy enemy;
    enemy.id = nextEnemyId_++;
    enemy.type = type;
    enemy.pathIndex = 0;
    enemy.pathProgress = 0;
    enemy.hp = stats.hp;
    enemy.maxHp = stats.hp;
    enemy.armor = stats.armor;
    enemy.speed = stats.speed;
    enemy.baseSpeed = stats.speed;
    enemy.flying = stats.flying;
    enemy.camo = stats.camo;
    enemy.active = true;

    FloatPoint pos = getPositionOnPath(0, 0);
    enemy.x = pos.x;
    enemy.y = pos.y;

    enemies_.push_back(enemy);
}

void TowerDefenseGame::updateEnemies(float dt) {
    for (auto& enemy : enemies_) {
        if (!enemy.active) continue;

        // Update effects
        float slowMult = 1.0f;
        int poisonDamage = 0;

        for (auto it = enemy.effects.begin(); it != enemy.effects.end();) {
            it->duration -= dt;
            if (it->duration <= 0) {
                it = enemy.effects.erase(it);
            } else {
                if (it->type == EffectType::SLOW) {
                    slowMult = std::min(slowMult, 1.0f - it->strength);
                } else if (it->type == EffectType::POISON) {
                    poisonDamage += static_cast<int>(it->strength * dt);
                }
                ++it;
            }
        }

        // Apply poison damage
        if (poisonDamage > 0) {
            enemy.hp -= poisonDamage;
            if (enemy.hp <= 0) {
                killEnemy(enemy);
                continue;
            }
        }

        // Troll regeneration
        if (enemy.type == EnemyType::TROLL && enemy.hp < enemy.maxHp) {
            enemy.hp += static_cast<int>(enemy.maxHp * 0.01f * dt);  // 1% per second
            enemy.hp = std::min(enemy.hp, enemy.maxHp);
        }

        // Move along path
        float moveSpeed = enemy.baseSpeed * slowMult;
        float moveDistance = moveSpeed * dt;

        while (moveDistance > 0 && enemy.pathIndex < static_cast<int>(path_.size()) - 1) {
            FloatPoint current = getPositionOnPath(enemy.pathIndex, enemy.pathProgress);
            FloatPoint next = getPositionOnPath(enemy.pathIndex + 1, 0);

            float segmentDist = distance(current.x, current.y, next.x, next.y);
            float remainingInSegment = segmentDist * (1.0f - enemy.pathProgress);

            if (moveDistance >= remainingInSegment) {
                moveDistance -= remainingInSegment;
                enemy.pathIndex++;
                enemy.pathProgress = 0;
            } else {
                enemy.pathProgress += moveDistance / segmentDist;
                moveDistance = 0;
            }
        }

        // Update position
        FloatPoint pos = getPositionOnPath(enemy.pathIndex, enemy.pathProgress);
        enemy.x = pos.x;
        enemy.y = pos.y;

        // Check if reached end
        if (enemy.pathIndex >= static_cast<int>(path_.size()) - 1 && enemy.pathProgress >= 0.99f) {
            enemy.active = false;
            lives_--;
            enemiesRemaining_--;
            Logger::game("Enemy reached castle! Lives: {}", lives_);

            if (lives_ <= 0) {
                gameOver_ = true;
                Logger::game("Game Over! Final score: {}", score_);
            }
        }
    }

    // Remove inactive enemies
    enemies_.erase(
        std::remove_if(enemies_.begin(), enemies_.end(),
            [](const Enemy& e) { return !e.active; }),
        enemies_.end());
}

void TowerDefenseGame::damageEnemy(Enemy& enemy, int damage, bool isMagic) {
    int finalDamage = damage;

    // Apply armor reduction (except for magic damage)
    if (!isMagic && enemy.armor > 0) {
        // Armor reduces damage by percentage: 100 armor = 50% reduction
        float reduction = enemy.armor / (100.0f + enemy.armor);
        finalDamage = static_cast<int>(damage * (1.0f - reduction));
        finalDamage = std::max(1, finalDamage);  // Minimum 1 damage
    }

    // Golem is immune to magic
    if (isMagic && enemy.type == EnemyType::GOLEM) {
        finalDamage = 0;
    }

    enemy.hp -= finalDamage;

    if (enemy.hp <= 0) {
        killEnemy(enemy);
    }
}

void TowerDefenseGame::killEnemy(Enemy& enemy) {
    if (!enemy.active) return;

    enemy.active = false;
    enemiesRemaining_--;

    const EnemyStats& stats = getEnemyStats(enemy.type);
    gold_ += stats.goldReward;
    score_ += stats.goldReward * 10;

    Logger::game("Enemy killed! +{} gold, {} remaining", stats.goldReward, enemiesRemaining_);
}

void TowerDefenseGame::applyEffect(Enemy& enemy, EffectType type, float duration, float strength, int sourceId) {
    // Check if effect already exists from this source
    for (auto& eff : enemy.effects) {
        if (eff.type == type && eff.sourceId == sourceId) {
            eff.duration = std::max(eff.duration, duration);
            eff.strength = std::max(eff.strength, strength);
            return;
        }
    }

    enemy.effects.push_back({type, duration, strength, sourceId});
}

const TowerDefenseGame::EnemyStats& TowerDefenseGame::getEnemyStats(EnemyType type) const {
    return ENEMY_STATS[static_cast<int>(type)];
}

// ==================== Projectile Methods ====================

void TowerDefenseGame::createProjectile(const Tower& tower, const Enemy& target) {
    const TowerStats& stats = getTowerStats(tower.type);

    Projectile proj;
    proj.id = nextProjectileId_++;
    proj.x = tower.x * CELL_SIZE + CELL_SIZE / 2.0f;
    proj.y = tower.y * CELL_SIZE + CELL_SIZE / 2.0f;
    proj.targetId = target.id;
    proj.damage = getTowerDamage(tower);
    proj.sourceId = tower.id;
    proj.active = true;
    proj.splashRadius = 0;

    // Set projectile type and properties based on tower
    switch (tower.type) {
        case TowerType::ARCHER:
            proj.type = ProjectileType::ARROW;
            break;
        case TowerType::CANNON:
            proj.type = ProjectileType::CANNONBALL;
            proj.splashRadius = 60.0f + tower.level * 10.0f;  // AOE increases with level
            break;
        case TowerType::MAGE:
            proj.type = ProjectileType::MAGIC_BOLT;
            break;
        case TowerType::FROST:
            proj.type = ProjectileType::ICE_SHARD;
            break;
        case TowerType::POISON:
            proj.type = ProjectileType::POISON_DART;
            break;
        case TowerType::LIGHTNING:
            proj.type = ProjectileType::LIGHTNING_BOLT;
            break;
        default:
            proj.type = ProjectileType::ARROW;
    }

    // Calculate velocity toward target
    float dx = target.x - proj.x;
    float dy = target.y - proj.y;
    float dist = std::sqrt(dx * dx + dy * dy);
    if (dist > 0) {
        proj.vx = (dx / dist) * stats.projectileSpeed;
        proj.vy = (dy / dist) * stats.projectileSpeed;
    }

    projectiles_.push_back(proj);
}

void TowerDefenseGame::updateProjectiles(float dt) {
    for (auto& proj : projectiles_) {
        if (!proj.active) continue;

        // Move projectile
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        // Find target
        auto targetIt = std::find_if(enemies_.begin(), enemies_.end(),
            [&proj](const Enemy& e) { return e.id == proj.targetId && e.active; });

        // Re-aim at target (homing)
        if (targetIt != enemies_.end()) {
            float dx = targetIt->x - proj.x;
            float dy = targetIt->y - proj.y;
            float dist = std::sqrt(dx * dx + dy * dy);

            // Check for hit
            if (dist < 15.0f) {
                proj.active = false;

                // Apply damage based on projectile type
                bool isMagic = (proj.type == ProjectileType::MAGIC_BOLT);

                if (proj.splashRadius > 0) {
                    // AOE damage
                    for (auto& enemy : enemies_) {
                        if (!enemy.active) continue;
                        float splashDist = distance(proj.x, proj.y, enemy.x, enemy.y);
                        if (splashDist <= proj.splashRadius) {
                            // Damage falls off with distance
                            float falloff = 1.0f - (splashDist / proj.splashRadius) * 0.5f;
                            int splashDamage = static_cast<int>(proj.damage * falloff);
                            damageEnemy(enemy, splashDamage, isMagic);
                        }
                    }
                } else {
                    damageEnemy(*targetIt, proj.damage, isMagic);
                }

                // Apply special effects
                if (proj.type == ProjectileType::ICE_SHARD) {
                    applyEffect(*targetIt, EffectType::SLOW, 2.0f, 0.4f, proj.sourceId);  // 40% slow
                }
                else if (proj.type == ProjectileType::POISON_DART) {
                    applyEffect(*targetIt, EffectType::POISON, 4.0f, 8.0f, proj.sourceId);  // 8 dps
                }
                else if (proj.type == ProjectileType::LIGHTNING_BOLT) {
                    // Chain to nearby enemies
                    int chainCount = 2 + (proj.damage / 35);  // More chains with upgrades
                    float chainRange = 80.0f;
                    std::vector<int> hitIds = {targetIt->id};

                    for (int c = 0; c < chainCount; ++c) {
                        float nearestDist = chainRange;
                        Enemy* nearestEnemy = nullptr;

                        for (auto& enemy : enemies_) {
                            if (!enemy.active) continue;
                            if (std::find(hitIds.begin(), hitIds.end(), enemy.id) != hitIds.end()) continue;

                            float d = distance(proj.x, proj.y, enemy.x, enemy.y);
                            if (d < nearestDist) {
                                nearestDist = d;
                                nearestEnemy = &enemy;
                            }
                        }

                        if (nearestEnemy) {
                            hitIds.push_back(nearestEnemy->id);
                            damageEnemy(*nearestEnemy, proj.damage / 2, false);
                            proj.x = nearestEnemy->x;
                            proj.y = nearestEnemy->y;
                        }
                    }
                }

                continue;
            }

            // Update velocity toward target (homing)
            if (dist > 0) {
                float speed = std::sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
                proj.vx = (dx / dist) * speed;
                proj.vy = (dy / dist) * speed;
            }
        } else {
            // Target lost, deactivate projectile
            proj.active = false;
        }

        // Remove if out of bounds
        if (proj.x < -50 || proj.x > CANVAS_WIDTH + 50 ||
            proj.y < -50 || proj.y > CANVAS_HEIGHT + 50) {
            proj.active = false;
        }
    }

    // Remove inactive projectiles
    projectiles_.erase(
        std::remove_if(projectiles_.begin(), projectiles_.end(),
            [](const Projectile& p) { return !p.active; }),
        projectiles_.end());
}

// ==================== Wave Methods ====================

void TowerDefenseGame::startWave() {
    if (wave_ >= MAX_WAVES) return;

    waveActive_ = true;
    waveTimer_ = 0;
    enemiesSpawned_ = 0;

    // Count total enemies in wave
    enemiesRemaining_ = 0;
    for (const auto& we : WAVES[wave_].enemies) {
        enemiesRemaining_ += we.count;
    }

    Logger::game("Starting wave {}!", wave_ + 1);
}

void TowerDefenseGame::updateWaveSpawning(float dt) {
    waveTimer_ += dt;

    const Wave& currentWave = WAVES[wave_];
    int spawnIndex = 0;
    int totalBefore = 0;

    for (const auto& we : currentWave.enemies) {
        if (enemiesSpawned_ < totalBefore + we.count) {
            int localIndex = enemiesSpawned_ - totalBefore;
            float spawnTime = localIndex * we.spawnDelay;

            if (waveTimer_ >= spawnTime && localIndex < we.count) {
                spawnEnemy(we.type);
                enemiesSpawned_++;
                return;  // One spawn per frame
            }
            break;
        }
        totalBefore += we.count;
        spawnIndex++;
    }
}

void TowerDefenseGame::checkWaveComplete() {
    // All enemies spawned and none remaining
    bool allSpawned = true;
    int totalInWave = 0;
    for (const auto& we : WAVES[wave_].enemies) {
        totalInWave += we.count;
    }
    allSpawned = (enemiesSpawned_ >= totalInWave);

    if (allSpawned && enemiesRemaining_ <= 0) {
        waveActive_ = false;

        // Award bonus gold
        int bonus = WAVES[wave_].bonusGold;
        gold_ += bonus;
        score_ += bonus * 5;

        // Apply interest
        applyInterest();

        wave_++;
        Logger::game("Wave {} complete! Bonus: {} gold, Interest applied", wave_, bonus);
    }
}

void TowerDefenseGame::applyInterest() {
    int interest = static_cast<int>(gold_ * INTEREST_RATE);
    interest = std::min(interest, MAX_INTEREST);
    gold_ += interest;
    Logger::game("Interest earned: {} gold", interest);
}

// ==================== Utility Methods ====================

float TowerDefenseGame::distance(float x1, float y1, float x2, float y2) const {
    float dx = x2 - x1;
    float dy = y2 - y1;
    return std::sqrt(dx * dx + dy * dy);
}

std::string TowerDefenseGame::towerTypeToString(TowerType type) const {
    switch (type) {
        case TowerType::ARCHER: return "archer";
        case TowerType::CANNON: return "cannon";
        case TowerType::MAGE: return "mage";
        case TowerType::FROST: return "frost";
        case TowerType::POISON: return "poison";
        case TowerType::LIGHTNING: return "lightning";
        case TowerType::BARRACKS: return "barracks";
        case TowerType::ULTIMATE: return "ultimate";
        default: return "unknown";
    }
}

std::string TowerDefenseGame::enemyTypeToString(EnemyType type) const {
    switch (type) {
        case EnemyType::GOBLIN: return "goblin";
        case EnemyType::ORC: return "orc";
        case EnemyType::ORC_BRUTE: return "orc_brute";
        case EnemyType::WOLF_RIDER: return "wolf_rider";
        case EnemyType::TROLL: return "troll";
        case EnemyType::DARK_MAGE: return "dark_mage";
        case EnemyType::BAT_SWARM: return "bat";
        case EnemyType::WYVERN: return "wyvern";
        case EnemyType::GOLEM: return "golem";
        case EnemyType::ASSASSIN: return "assassin";
        case EnemyType::NECROMANCER: return "necromancer";
        case EnemyType::DRAGON: return "dragon";
        case EnemyType::GIANT: return "giant";
        case EnemyType::DEMON_KNIGHT: return "demon_knight";
        case EnemyType::DEMON_KING: return "demon_king";
        default: return "unknown";
    }
}

TowerDefenseGame::TowerType TowerDefenseGame::stringToTowerType(const std::string& str) const {
    if (str == "archer") return TowerType::ARCHER;
    if (str == "cannon") return TowerType::CANNON;
    if (str == "mage") return TowerType::MAGE;
    if (str == "frost") return TowerType::FROST;
    if (str == "poison") return TowerType::POISON;
    if (str == "lightning") return TowerType::LIGHTNING;
    if (str == "barracks") return TowerType::BARRACKS;
    if (str == "ultimate") return TowerType::ULTIMATE;
    return TowerType::ARCHER;  // Default
}

TowerDefenseGame::TargetPriority TowerDefenseGame::stringToTargetPriority(const std::string& str) const {
    if (str == "first") return TargetPriority::FIRST;
    if (str == "last") return TargetPriority::LAST;
    if (str == "strongest") return TargetPriority::STRONGEST;
    if (str == "weakest") return TargetPriority::WEAKEST;
    if (str == "closest") return TargetPriority::CLOSEST;
    return TargetPriority::FIRST;  // Default
}
