#include "TowerDefenseGame.hpp"
#include "../utils/Logger.hpp"
#include <random>
#include <algorithm>

// Tower base stats: cost, damage, range, cooldown, projectileSpeed, canHitFlying, canHitCamo
const std::array<TowerDefenseGame::TowerStats, 8> TowerDefenseGame::TOWER_STATS = {{
    {100, 15, 150.0f, 0.5f, 400.0f, true, false},   // ARCHER
    {200, 50, 120.0f, 1.5f, 250.0f, false, false},  // CANNON (AOE)
    {250, 25, 140.0f, 0.8f, 350.0f, true, true},    // MAGE (ignores armor)
    {200, 0, 130.0f, 0.6f, 300.0f, true, false},    // FROST (slows, no damage base)
    {175, 8, 120.0f, 0.7f, 280.0f, true, false},    // POISON (DOT)
    {300, 35, 160.0f, 1.0f, 500.0f, true, false},   // LIGHTNING (chains)
    {250, 0, 80.0f, 2.0f, 0.0f, false, false},      // BARRACKS (soldiers)
    {1000, 100, 200.0f, 0.4f, 600.0f, true, true}   // ULTIMATE
}};

// Enemy stats: hp, armor, speed, goldReward, flying, camo
const std::array<TowerDefenseGame::EnemyStats, 15> TowerDefenseGame::ENEMY_STATS = {{
    {30, 0, 80.0f, 6, false, false},       // GOBLIN
    {100, 10, 50.0f, 15, false, false},    // ORC
    {250, 30, 35.0f, 30, false, false},    // ORC_BRUTE
    {60, 5, 110.0f, 20, false, false},     // WOLF_RIDER
    {400, 15, 30.0f, 50, false, false},    // TROLL (regens)
    {100, 0, 45.0f, 30, false, false},     // DARK_MAGE
    {40, 0, 90.0f, 12, true, false},       // BAT_SWARM
    {200, 15, 70.0f, 40, true, false},     // WYVERN
    {800, 50, 25.0f, 100, false, false},   // GOLEM (magic immune)
    {50, 0, 130.0f, 20, false, true},      // ASSASSIN (camo)
    {120, 5, 40.0f, 40, false, false},     // NECROMANCER
    {1500, 35, 50.0f, 200, true, false},   // DRAGON
    {2500, 45, 20.0f, 300, false, false},  // GIANT
    {1200, 40, 45.0f, 250, false, false},  // DEMON_KNIGHT
    {10000, 60, 35.0f, 1000, false, false} // DEMON_KING
}};

// BTD-style upgrade definitions: [towerType][path][tier]
// Path 0 = A, Path 1 = B
// Tier indices: 0=T1, 1=T2, 2=T3A, 3=T3B
const std::array<std::array<std::array<TowerDefenseGame::UpgradeDef, 4>, 2>, 8> TowerDefenseGame::UPGRADE_DEFS = {{
    // ARCHER
    {{
        // Path A (Damage)
        {{
            {"Sharp Arrows", 75, "+50% damage"},
            {"Piercing Shot", 150, "Arrows pierce 2 enemies"},
            {"Fire Arrows", 300, "Burn enemies for 8 DPS over 3s"},
            {"Ice Arrows", 300, "40% slow for 2s on hit"}
        }},
        // Path B (Speed)
        {{
            {"Quick Draw", 75, "+30% attack speed"},
            {"Eagle Eye", 150, "+40% range"},
            {"Rapid Fire", 350, "+100% attack speed"},
            {"Sniper", 350, "+100% range, 2x damage to first target"}
        }}
    }},
    // CANNON
    {{
        // Path A (Explosion)
        {{
            {"Bigger Bombs", 100, "+25% explosion radius"},
            {"Heavy Ordnance", 200, "+50% damage"},
            {"Napalm Shells", 400, "Fire patches burn for 4s"},
            {"Concussion Blast", 400, "Stun enemies for 1.5s"}
        }},
        // Path B (Fire Rate)
        {{
            {"Faster Reload", 100, "+25% attack speed"},
            {"Double Barrel", 225, "Fire 2 cannonballs per shot"},
            {"Cluster Bombs", 450, "Shells split into 4 mini-bombs"},
            {"Artillery", 450, "+150% range, slower fire rate"}
        }}
    }},
    // MAGE
    {{
        // Path A (Power)
        {{
            {"Arcane Mastery", 100, "+40% damage"},
            {"Spell Surge", 200, "Every 5th attack deals 3x damage"},
            {"Archmage", 500, "Bolts chain to 3 enemies"},
            {"Void Mage", 500, "True damage ignores all armor"}
        }},
        // Path B (Utility)
        {{
            {"Mystic Reach", 100, "+35% range"},
            {"Enchantment", 225, "20% chance to remove enemy buffs"},
            {"Necromancer", 550, "30% kill chance spawns skeleton"},
            {"Time Mage", 550, "Slow enemy attack speed 50% for 3s"}
        }}
    }},
    // FROST
    {{
        // Path A (Freeze)
        {{
            {"Deeper Freeze", 100, "50% slow (up from 40%)"},
            {"Permafrost", 200, "Slow persists 2s after leaving"},
            {"Absolute Zero", 450, "Freeze enemies solid for 2s"},
            {"Frost Nova", 450, "Every 8s, slow all enemies 30%"}
        }},
        // Path B (Damage)
        {{
            {"Ice Shards", 100, "Attacks deal 15 damage"},
            {"Brittle", 225, "Slowed enemies take +25% damage"},
            {"Cryo Cannon", 500, "Heavy single-target ice damage"},
            {"Blizzard", 500, "Constant AOE damage in range"}
        }}
    }},
    // POISON
    {{
        // Path A (Potency)
        {{
            {"Concentrated Venom", 75, "+50% DoT damage"},
            {"Corrosive Acid", 175, "DoT reduces armor by 20%"},
            {"Plague", 400, "DoT spreads to nearby enemies"},
            {"Neurotoxin", 400, "Poisoned enemies 40% slower"}
        }},
        // Path B (Application)
        {{
            {"Wider Spray", 75, "+30% range"},
            {"Rapid Injection", 175, "+40% attack speed"},
            {"Gas Cloud", 425, "Leave poison clouds for 4s"},
            {"Venomous Burst", 425, "Poisoned death = AOE poison"}
        }}
    }},
    // LIGHTNING
    {{
        // Path A (Chain)
        {{
            {"Conductivity", 125, "Chain to 4 targets (up from 3)"},
            {"High Voltage", 250, "+60% chain damage"},
            {"Storm Caller", 550, "Every 10s, hit 10 random enemies"},
            {"Tesla Coil", 550, "Constant passive damage, no cooldown"}
        }},
        // Path B (Single Target)
        {{
            {"Focused Bolt", 125, "+50% primary damage"},
            {"Overcharge", 250, "Stun primary target 0.5s"},
            {"Thunderstrike", 600, "Massive single hit, 3s cooldown"},
            {"EMP", 600, "Disable enemy abilities for 5s"}
        }}
    }},
    // BARRACKS
    {{
        // Path A (Strength)
        {{
            {"Combat Training", 125, "+50% soldier HP and damage"},
            {"Veteran Soldiers", 275, "+30% soldier attack speed"},
            {"Knights", 500, "Soldiers block 2 enemies each"},
            {"Berserkers", 500, "+100% dmg, -25% HP, +50% speed"}
        }},
        // Path B (Count)
        {{
            {"Reinforcements", 150, "Spawn 2 soldiers"},
            {"Battalion", 300, "Spawn 3 soldiers"},
            {"Army", 550, "Spawn 5 soldiers"},
            {"Elite Guard", 550, "3 elite soldiers, mid-wave respawn"}
        }}
    }},
    // ULTIMATE
    {{
        // Path A (Destruction)
        {{
            {"Empowered", 250, "+30% damage"},
            {"Devastation", 500, "+50% AOE radius"},
            {"Apocalypse", 1000, "Screen-wide pulse every 15s"},
            {"Godslayer", 1000, "+500% damage to bosses only"}
        }},
        // Path B (Support)
        {{
            {"Inspiring Presence", 250, "Nearby towers +10% damage"},
            {"War Banner", 500, "Nearby towers +15% attack speed"},
            {"Fortress", 1000, "Nearby towers +25% range"},
            {"Command Center", 1000, "All towers +10% dmg/speed"}
        }}
    }}
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
      nextTowerId_(1), nextEnemyId_(1), nextProjectileId_(1), nextSoldierId_(1), nextSkeletonId_(1) {
    initMap();
}

void TowerDefenseGame::initMap() {
    for (int y = 0; y < GRID_HEIGHT; ++y) {
        for (int x = 0; x < GRID_WIDTH; ++x) {
            map_[y][x] = CellType::EMPTY;
        }
    }

    path_ = {
        {0, 7}, {4, 7}, {4, 2}, {10, 2},
        {10, 12}, {16, 12}, {16, 7}, {19, 7}
    };

    for (size_t i = 0; i < path_.size() - 1; ++i) {
        int x1 = path_[i].x, y1 = path_[i].y;
        int x2 = path_[i + 1].x, y2 = path_[i + 1].y;

        if (x1 == x2) {
            int minY = std::min(y1, y2), maxY = std::max(y1, y2);
            for (int y = minY; y <= maxY; ++y) map_[y][x1] = CellType::PATH;
        } else {
            int minX = std::min(x1, x2), maxX = std::max(x1, x2);
            for (int x = minX; x <= maxX; ++x) map_[y1][x] = CellType::PATH;
        }
    }

    // Decorative blocked areas
    for (int x = 7; x <= 8; ++x)
        for (int y = 5; y <= 9; ++y)
            if (map_[y][x] != CellType::PATH) map_[y][x] = CellType::BLOCKED;
    for (int x = 12; x <= 14; ++x)
        for (int y = 5; y <= 7; ++y)
            if (map_[y][x] != CellType::PATH) map_[y][x] = CellType::BLOCKED;
}

void TowerDefenseGame::start() {
    started_ = true;
    Logger::game("Tower Defense game started!");
}

void TowerDefenseGame::onPlayerJoin(int playerId, const std::string&) {
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

    updateTowers(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateSoldiers(dt);
    updateSkeletons(dt);
    checkWaveComplete();
}

// ============================================================================
// TOWER PLACEMENT & UPGRADES
// ============================================================================

bool TowerDefenseGame::canPlaceTower(int x, int y) const {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
    if (map_[y][x] != CellType::EMPTY) return false;
    for (const auto& t : towers_) {
        if (t.x == x && t.y == y) return false;
    }
    return true;
}

bool TowerDefenseGame::placeTower(TowerType type, int x, int y) {
    if (!canPlaceTower(x, y)) return false;

    const auto& baseStats = getBaseStats(type);
    if (gold_ < baseStats.cost) return false;

    // Barracks must be adjacent to path
    if (type == TowerType::BARRACKS) {
        bool adjacentToPath = false;
        const int dx[] = {-1, 1, 0, 0};
        const int dy[] = {0, 0, -1, 1};
        for (int i = 0; i < 4; i++) {
            int nx = x + dx[i], ny = y + dy[i];
            if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
                if (map_[ny][nx] == CellType::PATH) {
                    adjacentToPath = true;
                    break;
                }
            }
        }
        if (!adjacentToPath) return false;
    }

    // Ultimate tower only after wave 40
    if (type == TowerType::ULTIMATE && wave_ < 40) return false;

    gold_ -= baseStats.cost;

    Tower tower;
    tower.id = nextTowerId_++;
    tower.type = type;
    tower.x = x;
    tower.y = y;
    tower.upgrades = UpgradeState();
    tower.targeting = TargetPriority::FIRST;
    tower.cooldown = 0;
    tower.targetId = -1;
    tower.totalInvested = baseStats.cost;
    tower.abilityTimer = 0;
    tower.attackCounter = 0;

    recalculateTowerStats(tower);
    towers_.push_back(tower);

    // Spawn soldiers for barracks
    if (type == TowerType::BARRACKS && waveActive_) {
        spawnSoldiersForBarracks(towers_.back());
    }

    return true;
}

bool TowerDefenseGame::sellTower(int towerId) {
    auto it = std::find_if(towers_.begin(), towers_.end(),
        [towerId](const Tower& t) { return t.id == towerId; });
    if (it == towers_.end()) return false;

    int refund = static_cast<int>(it->totalInvested * SELL_REFUND_RATE);
    gold_ += refund;

    // Remove soldiers from this barracks
    if (it->type == TowerType::BARRACKS) {
        for (auto& soldier : soldiers_) {
            if (soldier.barracksId == towerId) {
                soldier.active = false;
                // Disengage any enemies
                for (auto& enemy : enemies_) {
                    if (enemy.engagedBySoldierId == soldier.id) {
                        enemy.engagedBySoldierId = -1;
                    }
                }
            }
        }
    }

    towers_.erase(it);
    return true;
}

int TowerDefenseGame::getUpgradeCost(TowerType type, UpgradePath path, int tier, Tier3Choice choice) const {
    int typeIdx = static_cast<int>(type);
    int pathIdx = (path == UpgradePath::PATH_A) ? 0 : 1;
    int tierIdx = (tier == 3) ? (choice == Tier3Choice::CHOICE_B ? 3 : 2) : (tier - 1);

    if (tierIdx < 0 || tierIdx > 3) return 0;
    return UPGRADE_DEFS[typeIdx][pathIdx][tierIdx].cost;
}

bool TowerDefenseGame::canPurchaseUpgrade(const Tower& tower, UpgradePath path, int tier, Tier3Choice choice) const {
    const auto& ups = tower.upgrades;
    int currentTier = (path == UpgradePath::PATH_A) ? ups.pathATier : ups.pathBTier;

    // Must purchase tiers in order
    if (tier != currentTier + 1) return false;

    // Check path locking
    if (tier > 2 && ups.isPathLocked(path)) return false;

    // Tier 3 requires a choice
    if (tier == 3 && choice == Tier3Choice::NONE) return false;

    // Check if already has tier 3 choice
    if (tier == 3) {
        Tier3Choice existing = (path == UpgradePath::PATH_A) ? ups.pathATier3 : ups.pathBTier3;
        if (existing != Tier3Choice::NONE) return false;
    }

    int cost = getUpgradeCost(tower.type, path, tier, choice);
    return gold_ >= cost;
}

bool TowerDefenseGame::purchaseUpgrade(int towerId, UpgradePath path, int tier, Tier3Choice choice) {
    auto it = std::find_if(towers_.begin(), towers_.end(),
        [towerId](const Tower& t) { return t.id == towerId; });
    if (it == towers_.end()) return false;

    if (!canPurchaseUpgrade(*it, path, tier, choice)) return false;

    int cost = getUpgradeCost(it->type, path, tier, choice);
    gold_ -= cost;
    it->totalInvested += cost;

    if (path == UpgradePath::PATH_A) {
        it->upgrades.pathATier = tier;
        if (tier == 3) it->upgrades.pathATier3 = choice;
    } else {
        it->upgrades.pathBTier = tier;
        if (tier == 3) it->upgrades.pathBTier3 = choice;
    }

    recalculateTowerStats(*it);

    // Update soldiers if barracks
    if (it->type == TowerType::BARRACKS) {
        // Remove old soldiers and respawn with new stats
        for (auto& soldier : soldiers_) {
            if (soldier.barracksId == towerId) {
                soldier.active = false;
                for (auto& enemy : enemies_) {
                    if (enemy.engagedBySoldierId == soldier.id) {
                        enemy.engagedBySoldierId = -1;
                    }
                }
            }
        }
        if (waveActive_) {
            spawnSoldiersForBarracks(*it);
        }
    }

    return true;
}

void TowerDefenseGame::recalculateTowerStats(Tower& tower) {
    const auto& base = getBaseStats(tower.type);
    const auto& ups = tower.upgrades;

    // Start with base stats
    tower.damage = base.damage;
    tower.range = base.range;
    tower.attackSpeed = 1.0f / base.cooldown;
    tower.pierce = 1;
    tower.chainTargets = 3;
    tower.slowStrength = 0.4f;
    tower.dotDamage = 0;
    tower.splashRadius = (tower.type == TowerType::CANNON) ? 60.0f : 0;
    tower.stunDuration = 0;
    tower.canHitFlying = base.canHitFlying;
    tower.canHitCamo = base.canHitCamo;

    int typeIdx = static_cast<int>(tower.type);

    // Apply Path A upgrades
    for (int t = 1; t <= ups.pathATier; ++t) {
        switch (tower.type) {
            case TowerType::ARCHER:
                if (t == 1) tower.damage = static_cast<int>(tower.damage * 1.5f);
                if (t == 2) tower.pierce = 3;
                if (t == 3) {
                    if (ups.pathATier3 == Tier3Choice::CHOICE_A) tower.dotDamage = 8.0f; // Fire
                    else tower.slowStrength = 0.4f; // Ice (used on hit)
                }
                break;
            case TowerType::CANNON:
                if (t == 1) tower.splashRadius *= 1.25f;
                if (t == 2) tower.damage = static_cast<int>(tower.damage * 1.5f);
                if (t == 3) {
                    if (ups.pathATier3 == Tier3Choice::CHOICE_A) tower.dotDamage = 15.0f; // Napalm
                    else tower.stunDuration = 1.5f; // Concussion
                }
                break;
            case TowerType::MAGE:
                if (t == 1) tower.damage = static_cast<int>(tower.damage * 1.4f);
                // t == 2: Spell Surge handled in attack logic
                if (t == 3) {
                    if (ups.pathATier3 == Tier3Choice::CHOICE_A) tower.chainTargets = 4; // Archmage chains
                    // CHOICE_B = Void Mage (true damage, handled in damage calc)
                }
                break;
            case TowerType::FROST:
                if (t == 1) tower.slowStrength = 0.5f;
                // t == 2: Permafrost (slow persists) handled in effect logic
                if (t == 3) {
                    if (ups.pathATier3 == Tier3Choice::CHOICE_A) tower.stunDuration = 2.0f; // Absolute Zero
                    // CHOICE_B = Frost Nova (periodic ability)
                }
                break;
            case TowerType::POISON:
                if (t == 1) tower.dotDamage = 12.0f; // +50% from base 8
                if (t == 2) { /* Corrosive - armor break handled in effect */ }
                if (t == 3) {
                    // CHOICE_A = Plague (spread), CHOICE_B = Neurotoxin (slow)
                }
                break;
            case TowerType::LIGHTNING:
                if (t == 1) tower.chainTargets = 4;
                if (t == 2) { /* High Voltage - chain damage bonus handled in attack */ }
                if (t == 3) {
                    // CHOICE_A = Storm Caller (periodic), CHOICE_B = Tesla Coil (no cooldown)
                    if (ups.pathATier3 == Tier3Choice::CHOICE_B) tower.attackSpeed = 10.0f;
                }
                break;
            case TowerType::BARRACKS:
                // Soldier stats handled in getSoldier* functions
                break;
            case TowerType::ULTIMATE:
                if (t == 1) tower.damage = static_cast<int>(tower.damage * 1.3f);
                if (t == 2) tower.splashRadius = 100.0f;
                // t == 3: Apocalypse/Godslayer handled specially
                break;
        }
    }

    // Apply Path B upgrades
    for (int t = 1; t <= ups.pathBTier; ++t) {
        switch (tower.type) {
            case TowerType::ARCHER:
                if (t == 1) tower.attackSpeed *= 1.3f;
                if (t == 2) tower.range *= 1.4f;
                if (t == 3) {
                    if (ups.pathBTier3 == Tier3Choice::CHOICE_A) tower.attackSpeed *= 2.0f; // Rapid Fire
                    else { tower.range *= 2.0f; tower.damage *= 2; } // Sniper
                }
                break;
            case TowerType::CANNON:
                if (t == 1) tower.attackSpeed *= 1.25f;
                // t == 2: Double Barrel handled in attack
                if (t == 3) {
                    // CHOICE_A = Cluster (handled in projectile), CHOICE_B = Artillery
                    if (ups.pathBTier3 == Tier3Choice::CHOICE_B) {
                        tower.range *= 2.5f;
                        tower.attackSpeed *= 0.5f;
                    }
                }
                break;
            case TowerType::MAGE:
                if (t == 1) tower.range *= 1.35f;
                // t == 2: Enchantment (debuff) handled in attack
                if (t == 3) {
                    // CHOICE_A = Necromancer (spawn), CHOICE_B = Time Mage (slow attack speed)
                }
                break;
            case TowerType::FROST:
                if (t == 1) tower.damage = 15;
                if (t == 2) { /* Brittle - damage amp handled in damage calc */ }
                if (t == 3) {
                    if (ups.pathBTier3 == Tier3Choice::CHOICE_A) tower.damage = 50; // Cryo Cannon
                    // CHOICE_B = Blizzard (constant AOE)
                }
                break;
            case TowerType::POISON:
                if (t == 1) tower.range *= 1.3f;
                if (t == 2) tower.attackSpeed *= 1.4f;
                // t == 3: Gas Cloud / Venomous Burst handled in attack/death
                break;
            case TowerType::LIGHTNING:
                if (t == 1) tower.damage = static_cast<int>(tower.damage * 1.5f);
                if (t == 2) tower.stunDuration = 0.5f; // Overcharge
                if (t == 3) {
                    if (ups.pathBTier3 == Tier3Choice::CHOICE_A) {
                        tower.damage *= 5; // Thunderstrike
                        tower.attackSpeed = 1.0f / 3.0f;
                    }
                    // CHOICE_B = EMP (disable abilities)
                }
                break;
            case TowerType::BARRACKS:
                // Soldier count handled in getSoldierCount
                break;
            case TowerType::ULTIMATE:
                // Support auras handled in tower update
                break;
        }
    }
}

const TowerDefenseGame::TowerStats& TowerDefenseGame::getBaseStats(TowerType type) const {
    return TOWER_STATS[static_cast<int>(type)];
}

void TowerDefenseGame::setTargeting(int towerId, TargetPriority priority) {
    auto it = std::find_if(towers_.begin(), towers_.end(),
        [towerId](const Tower& t) { return t.id == towerId; });
    if (it != towers_.end()) {
        it->targeting = priority;
    }
}

// ============================================================================
// TOWER UPDATE & ATTACK
// ============================================================================

void TowerDefenseGame::updateTowers(float dt) {
    for (auto& tower : towers_) {
        tower.cooldown -= dt;
        tower.abilityTimer += dt;

        if (tower.type == TowerType::BARRACKS) continue;

        // Handle periodic abilities
        const auto& ups = tower.upgrades;

        // Frost Nova (Path A T3B)
        if (tower.type == TowerType::FROST && ups.pathATier == 3 &&
            ups.pathATier3 == Tier3Choice::CHOICE_B && tower.abilityTimer >= 8.0f) {
            tower.abilityTimer = 0;
            for (auto& enemy : enemies_) {
                if (enemy.active) {
                    applyEffect(enemy, EffectType::SLOW, 3.0f, 0.3f, tower.id);
                }
            }
        }

        // Storm Caller (Path A T3A)
        if (tower.type == TowerType::LIGHTNING && ups.pathATier == 3 &&
            ups.pathATier3 == Tier3Choice::CHOICE_A && tower.abilityTimer >= 10.0f) {
            tower.abilityTimer = 0;
            std::vector<Enemy*> activeEnemies;
            for (auto& e : enemies_) if (e.active) activeEnemies.push_back(&e);
            std::shuffle(activeEnemies.begin(), activeEnemies.end(),
                std::mt19937(std::random_device()()));
            int hits = std::min(10, (int)activeEnemies.size());
            for (int i = 0; i < hits; i++) {
                damageEnemy(*activeEnemies[i], tower.damage, false);
            }
        }

        // Apocalypse (Path A T3A)
        if (tower.type == TowerType::ULTIMATE && ups.pathATier == 3 &&
            ups.pathATier3 == Tier3Choice::CHOICE_A && tower.abilityTimer >= 15.0f) {
            tower.abilityTimer = 0;
            for (auto& enemy : enemies_) {
                if (enemy.active) {
                    damageEnemy(enemy, tower.damage / 2, true);
                }
            }
        }

        // Blizzard constant damage (Path B T3B)
        if (tower.type == TowerType::FROST && ups.pathBTier == 3 &&
            ups.pathBTier3 == Tier3Choice::CHOICE_B) {
            float towerX = tower.x * CELL_SIZE + CELL_SIZE / 2.0f;
            float towerY = tower.y * CELL_SIZE + CELL_SIZE / 2.0f;
            for (auto& enemy : enemies_) {
                if (!enemy.active) continue;
                float dist = distance(towerX, towerY, enemy.x, enemy.y);
                if (dist <= tower.range) {
                    damageEnemy(enemy, static_cast<int>(10 * dt), false);
                    applyEffect(enemy, EffectType::SLOW, 0.5f, tower.slowStrength, tower.id);
                }
            }
        }

        // Tesla Coil constant damage (Path A T3B)
        if (tower.type == TowerType::LIGHTNING && ups.pathATier == 3 &&
            ups.pathATier3 == Tier3Choice::CHOICE_B) {
            float towerX = tower.x * CELL_SIZE + CELL_SIZE / 2.0f;
            float towerY = tower.y * CELL_SIZE + CELL_SIZE / 2.0f;
            for (auto& enemy : enemies_) {
                if (!enemy.active) continue;
                float dist = distance(towerX, towerY, enemy.x, enemy.y);
                if (dist <= tower.range) {
                    damageEnemy(enemy, static_cast<int>(20 * dt), false);
                }
            }
            continue; // Skip normal attack
        }

        if (tower.cooldown > 0) continue;

        int targetId = findTarget(tower);
        if (targetId < 0) continue;

        auto enemyIt = std::find_if(enemies_.begin(), enemies_.end(),
            [targetId](const Enemy& e) { return e.id == targetId && e.active; });
        if (enemyIt == enemies_.end()) continue;

        tower.targetId = targetId;
        tower.attackCounter++;

        fireTower(tower, *enemyIt);
        tower.cooldown = 1.0f / tower.attackSpeed;

        // Double Barrel (fires twice)
        if (tower.type == TowerType::CANNON && ups.pathBTier >= 2) {
            fireTower(tower, *enemyIt);
        }
    }
}

int TowerDefenseGame::findTarget(const Tower& tower) const {
    float towerX = tower.x * CELL_SIZE + CELL_SIZE / 2.0f;
    float towerY = tower.y * CELL_SIZE + CELL_SIZE / 2.0f;

    int bestId = -1;
    float bestScore = -1e9f;

    for (const auto& enemy : enemies_) {
        if (!enemy.active) continue;
        if (enemy.flying && !tower.canHitFlying) continue;
        if (enemy.camo && !tower.canHitCamo) continue;

        float dist = distance(towerX, towerY, enemy.x, enemy.y);
        if (dist > tower.range) continue;

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

        if (score > bestScore) {
            bestScore = score;
            bestId = enemy.id;
        }
    }

    return bestId;
}

void TowerDefenseGame::fireTower(Tower& tower, Enemy& target) {
    createProjectile(tower, target);
}

void TowerDefenseGame::createProjectile(Tower& tower, Enemy& target) {
    const auto& base = getBaseStats(tower.type);
    const auto& ups = tower.upgrades;

    Projectile proj;
    proj.id = nextProjectileId_++;
    proj.x = tower.x * CELL_SIZE + CELL_SIZE / 2.0f;
    proj.y = tower.y * CELL_SIZE + CELL_SIZE / 2.0f;
    proj.targetId = target.id;
    proj.sourceId = tower.id;
    proj.damage = tower.damage;
    proj.splashRadius = tower.splashRadius;
    proj.pierce = tower.pierce;
    proj.slowStrength = 0;
    proj.slowDuration = 0;
    proj.dotDamage = tower.dotDamage;
    proj.dotDuration = 3.0f;
    proj.stunDuration = tower.stunDuration;
    proj.active = true;

    // Determine projectile type and special effects
    switch (tower.type) {
        case TowerType::ARCHER:
            if (ups.pathATier == 3 && ups.pathATier3 == Tier3Choice::CHOICE_A) {
                proj.type = ProjectileType::FIRE_ARROW;
            } else if (ups.pathATier == 3 && ups.pathATier3 == Tier3Choice::CHOICE_B) {
                proj.type = ProjectileType::ICE_ARROW;
                proj.slowStrength = 0.4f;
                proj.slowDuration = 2.0f;
            } else {
                proj.type = ProjectileType::ARROW;
            }
            break;
        case TowerType::CANNON:
            proj.type = ProjectileType::CANNONBALL;
            break;
        case TowerType::MAGE:
            proj.type = ProjectileType::MAGIC_BOLT;
            // Spell Surge: every 5th attack = 3x damage
            if (ups.pathATier >= 2 && tower.attackCounter % 5 == 0) {
                proj.damage *= 3;
            }
            break;
        case TowerType::FROST:
            proj.type = ProjectileType::ICE_SHARD;
            proj.slowStrength = tower.slowStrength;
            proj.slowDuration = (ups.pathATier >= 2) ? 4.0f : 2.0f; // Permafrost
            break;
        case TowerType::POISON:
            proj.type = ProjectileType::POISON_DART;
            proj.dotDamage = (ups.pathATier >= 1) ? 12.0f : 8.0f;
            break;
        case TowerType::LIGHTNING:
            proj.type = ProjectileType::LIGHTNING_BOLT;
            break;
        case TowerType::ULTIMATE:
            proj.type = ProjectileType::MAGIC_BOLT;
            // Godslayer: +500% damage to bosses
            if (ups.pathATier == 3 && ups.pathATier3 == Tier3Choice::CHOICE_B) {
                if (target.type == EnemyType::DRAGON || target.type == EnemyType::GIANT ||
                    target.type == EnemyType::DEMON_KNIGHT || target.type == EnemyType::DEMON_KING) {
                    proj.damage *= 6;
                }
            }
            break;
        default:
            proj.type = ProjectileType::ARROW;
    }

    // Calculate velocity
    float dx = target.x - proj.x;
    float dy = target.y - proj.y;
    float dist = std::sqrt(dx * dx + dy * dy);
    if (dist > 0) {
        float speed = base.projectileSpeed;
        proj.vx = (dx / dist) * speed;
        proj.vy = (dy / dist) * speed;
    }

    projectiles_.push_back(proj);
}

// ============================================================================
// PROJECTILE UPDATE
// ============================================================================

void TowerDefenseGame::updateProjectiles(float dt) {
    for (auto& proj : projectiles_) {
        if (!proj.active) continue;

        // Find target
        auto targetIt = std::find_if(enemies_.begin(), enemies_.end(),
            [&proj](const Enemy& e) { return e.id == proj.targetId && e.active; });

        if (targetIt == enemies_.end()) {
            proj.active = false;
            continue;
        }

        // Homing: recalculate velocity to track target
        float dx = targetIt->x - proj.x;
        float dy = targetIt->y - proj.y;
        float dist = std::sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            float speed = std::sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
            proj.vx = (dx / dist) * speed;
            proj.vy = (dy / dist) * speed;
        }

        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;

        // Check hit
        float hitDist = distance(proj.x, proj.y, targetIt->x, targetIt->y);
        if (hitDist < 20.0f) {
            // Find source tower for special effects
            auto towerIt = std::find_if(towers_.begin(), towers_.end(),
                [&proj](const Tower& t) { return t.id == proj.sourceId; });

            bool isMagic = (proj.type == ProjectileType::MAGIC_BOLT);

            // Check for Void Mage (true damage)
            bool trueDamage = false;
            if (towerIt != towers_.end() && towerIt->type == TowerType::MAGE) {
                if (towerIt->upgrades.pathATier == 3 &&
                    towerIt->upgrades.pathATier3 == Tier3Choice::CHOICE_B) {
                    trueDamage = true;
                }
            }

            if (proj.splashRadius > 0) {
                // AOE damage
                for (auto& enemy : enemies_) {
                    if (!enemy.active) continue;
                    float d = distance(proj.x, proj.y, enemy.x, enemy.y);
                    if (d <= proj.splashRadius) {
                        int dmg = proj.damage;
                        if (d > proj.splashRadius * 0.5f) dmg /= 2; // Falloff
                        damageEnemy(enemy, dmg, isMagic || trueDamage);

                        if (proj.stunDuration > 0) {
                            applyEffect(enemy, EffectType::STUN, proj.stunDuration, 1.0f, proj.sourceId);
                        }
                        if (proj.dotDamage > 0) {
                            applyEffect(enemy, EffectType::BURN, proj.dotDuration, proj.dotDamage, proj.sourceId);
                        }
                    }
                }
            } else {
                // Single target
                damageEnemy(*targetIt, proj.damage, isMagic || trueDamage);

                // Apply effects
                if (proj.slowStrength > 0) {
                    applyEffect(*targetIt, EffectType::SLOW, proj.slowDuration, proj.slowStrength, proj.sourceId);
                }
                if (proj.stunDuration > 0) {
                    applyEffect(*targetIt, EffectType::STUN, proj.stunDuration, 1.0f, proj.sourceId);
                }
                if (proj.dotDamage > 0) {
                    EffectType dotType = (proj.type == ProjectileType::POISON_DART) ? EffectType::POISON : EffectType::BURN;
                    applyEffect(*targetIt, dotType, proj.dotDuration, proj.dotDamage, proj.sourceId);
                }

                // Pierce
                proj.pierce--;
                if (proj.pierce > 0 && targetIt->active) {
                    // Find next target
                    float bestDist = 1e9f;
                    int nextTarget = -1;
                    for (const auto& e : enemies_) {
                        if (!e.active || e.id == targetIt->id) continue;
                        float d = distance(proj.x, proj.y, e.x, e.y);
                        if (d < bestDist && d < 100.0f) {
                            bestDist = d;
                            nextTarget = e.id;
                        }
                    }
                    if (nextTarget >= 0) {
                        proj.targetId = nextTarget;
                        auto nextIt = std::find_if(enemies_.begin(), enemies_.end(),
                            [nextTarget](const Enemy& e) { return e.id == nextTarget; });
                        if (nextIt != enemies_.end()) {
                            float dx = nextIt->x - proj.x;
                            float dy = nextIt->y - proj.y;
                            float d = std::sqrt(dx*dx + dy*dy);
                            float speed = std::sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
                            proj.vx = (dx/d) * speed;
                            proj.vy = (dy/d) * speed;
                        }
                    } else {
                        proj.active = false;
                    }
                } else {
                    proj.active = false;
                }
            }

            // Lightning chain
            if (proj.type == ProjectileType::LIGHTNING_BOLT && towerIt != towers_.end()) {
                int chains = towerIt->chainTargets - 1;
                float chainDamage = proj.damage;

                // High Voltage bonus
                if (towerIt->upgrades.pathATier >= 2) {
                    chainDamage = static_cast<int>(chainDamage * 1.6f);
                }

                int lastId = proj.targetId;
                float lastX = targetIt->x, lastY = targetIt->y;

                for (int c = 0; c < chains; c++) {
                    float bestDist = 1e9f;
                    Enemy* next = nullptr;
                    for (auto& e : enemies_) {
                        if (!e.active || e.id == lastId) continue;
                        float d = distance(lastX, lastY, e.x, e.y);
                        if (d < bestDist && d < 150.0f) {
                            bestDist = d;
                            next = &e;
                        }
                    }
                    if (!next) break;

                    damageEnemy(*next, static_cast<int>(chainDamage), false);
                    chainDamage *= 0.8f; // Diminishing returns
                    lastId = next->id;
                    lastX = next->x;
                    lastY = next->y;
                }
                proj.active = false;
            }
        }

        // Out of bounds
        if (proj.x < -50 || proj.x > CANVAS_WIDTH + 50 ||
            proj.y < -50 || proj.y > CANVAS_HEIGHT + 50) {
            proj.active = false;
        }
    }

    // Remove inactive
    projectiles_.erase(
        std::remove_if(projectiles_.begin(), projectiles_.end(),
            [](const Projectile& p) { return !p.active; }),
        projectiles_.end());
}

// ============================================================================
// ENEMIES
// ============================================================================

void TowerDefenseGame::spawnEnemy(EnemyType type) {
    const auto& stats = getEnemyStats(type);

    // Wave-based scaling: enemies get stronger each wave
    // Wave 1-10: 1.0x to 1.5x HP
    // Wave 11-25: 1.5x to 3.0x HP
    // Wave 26-40: 3.0x to 6.0x HP
    // Wave 41-50: 6.0x to 10.0x HP
    float hpMultiplier = 1.0f;
    float armorMultiplier = 1.0f;
    float speedMultiplier = 1.0f;

    int w = wave_ + 1;  // 1-indexed wave
    if (w <= 10) {
        hpMultiplier = 1.0f + (w - 1) * 0.055f;
    } else if (w <= 25) {
        hpMultiplier = 1.5f + (w - 10) * 0.1f;
    } else if (w <= 40) {
        hpMultiplier = 3.0f + (w - 25) * 0.2f;
    } else {
        hpMultiplier = 6.0f + (w - 40) * 0.4f;
    }

    armorMultiplier = 1.0f + (w - 1) * 0.03f;
    if (w > 30) {
        speedMultiplier = 1.0f + (w - 30) * 0.01f;
    }

    Enemy enemy;
    enemy.id = nextEnemyId_++;
    enemy.type = type;
    enemy.pathIndex = 0;
    enemy.pathProgress = 0;
    enemy.hp = static_cast<int>(stats.hp * hpMultiplier);
    enemy.maxHp = enemy.hp;
    enemy.armor = static_cast<int>(stats.armor * armorMultiplier);
    enemy.baseArmor = enemy.armor;
    enemy.speed = stats.speed * speedMultiplier;
    enemy.baseSpeed = enemy.speed;
    enemy.flying = stats.flying;
    enemy.camo = stats.camo;
    enemy.active = true;
    enemy.engagedBySoldierId = -1;

    auto pos = getPositionOnPath(0, 0);
    enemy.x = pos.x;
    enemy.y = pos.y;

    enemies_.push_back(enemy);
}

void TowerDefenseGame::updateEnemies(float dt) {
    for (auto& enemy : enemies_) {
        if (!enemy.active) continue;

        // Update effects
        float slowMult = 1.0f;
        bool stunned = false;

        for (auto it = enemy.effects.begin(); it != enemy.effects.end();) {
            it->duration -= dt;

            switch (it->type) {
                case EffectType::SLOW:
                    slowMult = std::min(slowMult, 1.0f - it->strength);
                    break;
                case EffectType::POISON:
                case EffectType::BURN:
                    damageEnemy(enemy, static_cast<int>(it->strength * dt), true);
                    break;
                case EffectType::STUN:
                    stunned = true;
                    break;
                case EffectType::ARMOR_BREAK:
                    enemy.armor = static_cast<int>(enemy.baseArmor * (1.0f - it->strength));
                    break;
                default:
                    break;
            }

            if (it->duration <= 0) {
                if (it->type == EffectType::ARMOR_BREAK) {
                    enemy.armor = enemy.baseArmor;
                }
                it = enemy.effects.erase(it);
            } else {
                ++it;
            }
        }

        if (!enemy.active) continue;

        // Troll regeneration
        if (enemy.type == EnemyType::TROLL) {
            enemy.hp = std::min(enemy.maxHp, enemy.hp + static_cast<int>(20 * dt));
        }

        // Skip movement if engaged by soldier or stunned
        if ((enemy.engagedBySoldierId >= 0 && !enemy.flying) || stunned) {
            continue;
        }

        // Movement
        enemy.speed = enemy.baseSpeed * slowMult;
        float moveAmount = enemy.speed * dt;

        while (moveAmount > 0 && enemy.pathIndex < static_cast<int>(path_.size()) - 1) {
            auto currentPos = getPositionOnPath(enemy.pathIndex, enemy.pathProgress);
            auto nextPos = getPositionOnPath(enemy.pathIndex + 1, 0);

            float dx = nextPos.x - currentPos.x;
            float dy = nextPos.y - currentPos.y;
            float segmentLength = std::sqrt(dx * dx + dy * dy);
            float remaining = segmentLength * (1.0f - enemy.pathProgress);

            if (moveAmount >= remaining) {
                moveAmount -= remaining;
                enemy.pathIndex++;
                enemy.pathProgress = 0;
            } else {
                enemy.pathProgress += moveAmount / segmentLength;
                moveAmount = 0;
            }
        }

        auto pos = getPositionOnPath(enemy.pathIndex, enemy.pathProgress);
        enemy.x = pos.x;
        enemy.y = pos.y;

        // Reached end
        if (enemy.pathIndex >= static_cast<int>(path_.size()) - 1) {
            enemy.active = false;
            lives_--;
            enemiesRemaining_--;
            if (lives_ <= 0) {
                gameOver_ = true;
            }
        }
    }
}

void TowerDefenseGame::damageEnemy(Enemy& enemy, int damage, bool isMagic, bool) {
    if (!enemy.active || damage <= 0) return;

    // Check for Brittle (slowed enemies take +25% damage)
    for (const auto& tower : towers_) {
        if (tower.type == TowerType::FROST && tower.upgrades.pathBTier >= 2) {
            for (const auto& eff : enemy.effects) {
                if (eff.type == EffectType::SLOW) {
                    damage = static_cast<int>(damage * 1.25f);
                    break;
                }
            }
            break;
        }
    }

    // Apply armor (magic ignores armor, Golem immune to magic)
    if (!isMagic && enemy.armor > 0) {
        float reduction = enemy.armor / (enemy.armor + 100.0f);
        damage = static_cast<int>(damage * (1.0f - reduction));
    }
    if (isMagic && enemy.type == EnemyType::GOLEM) {
        damage = 0;
    }

    enemy.hp -= std::max(1, damage);

    if (enemy.hp <= 0) {
        killEnemy(enemy);
    }
}

void TowerDefenseGame::killEnemy(Enemy& enemy) {
    if (!enemy.active) return;

    enemy.active = false;
    enemiesRemaining_--;

    const auto& stats = getEnemyStats(enemy.type);
    gold_ += stats.goldReward;
    score_ += stats.goldReward;

    // Disengage soldier
    if (enemy.engagedBySoldierId >= 0) {
        for (auto& soldier : soldiers_) {
            if (soldier.id == enemy.engagedBySoldierId) {
                soldier.engagedEnemyId = -1;
                break;
            }
        }
    }

    // Venomous Burst: poisoned death = AOE poison
    bool hadPoison = false;
    for (const auto& eff : enemy.effects) {
        if (eff.type == EffectType::POISON) {
            hadPoison = true;
            break;
        }
    }
    if (hadPoison) {
        for (const auto& tower : towers_) {
            if (tower.type == TowerType::POISON && tower.upgrades.pathBTier == 3 &&
                tower.upgrades.pathBTier3 == Tier3Choice::CHOICE_B) {
                for (auto& e : enemies_) {
                    if (!e.active || e.id == enemy.id) continue;
                    float d = distance(enemy.x, enemy.y, e.x, e.y);
                    if (d < 80.0f) {
                        applyEffect(e, EffectType::POISON, 3.0f, 12.0f, tower.id);
                    }
                }
                break;
            }
        }
    }

    // Necromancer (Mage Path B tier 3+): chance to spawn skeleton on kill
    for (const auto& tower : towers_) {
        if (tower.type == TowerType::MAGE && tower.upgrades.pathBTier >= 3) {
            // Check if enemy died in range of this mage
            float px = tower.x * 48 + 24;  // CELL_SIZE = 48
            float py = tower.y * 48 + 24;
            float d = distance(px, py, enemy.x, enemy.y);

            if (d <= tower.range) {
                // Tier 3 (CHOICE_A) = 30% chance, Tier 4 (CHOICE_B) = 50% chance
                bool isLichLord = (tower.upgrades.pathBTier == 3 &&
                                   tower.upgrades.pathBTier3 == Tier3Choice::CHOICE_B);
                float spawnChance = isLichLord ? 0.5f : 0.3f;

                float roll = static_cast<float>(rand()) / RAND_MAX;
                if (roll < spawnChance) {
                    spawnSkeleton(enemy.x, enemy.y, tower.id, isLichLord);
                }
                break;  // Only one mage can spawn per kill
            }
        }
    }
}

void TowerDefenseGame::applyEffect(Enemy& enemy, EffectType type, float duration, float strength, int sourceId) {
    // Check for existing effect and refresh
    for (auto& eff : enemy.effects) {
        if (eff.type == type && eff.sourceId == sourceId) {
            eff.duration = std::max(eff.duration, duration);
            eff.strength = std::max(eff.strength, strength);
            return;
        }
    }

    // Apply corrosive acid armor break
    if (type == EffectType::POISON) {
        for (const auto& tower : towers_) {
            if (tower.type == TowerType::POISON && tower.upgrades.pathATier >= 2) {
                applyEffect(enemy, EffectType::ARMOR_BREAK, duration, 0.2f, sourceId);
                break;
            }
        }

        // Plague spread
        for (const auto& tower : towers_) {
            if (tower.type == TowerType::POISON && tower.upgrades.pathATier == 3 &&
                tower.upgrades.pathATier3 == Tier3Choice::CHOICE_A) {
                for (auto& e : enemies_) {
                    if (!e.active || e.id == enemy.id) continue;
                    float d = distance(enemy.x, enemy.y, e.x, e.y);
                    if (d < 60.0f) {
                        // Check if already has poison from this source
                        bool has = false;
                        for (const auto& eff : e.effects) {
                            if (eff.type == EffectType::POISON) { has = true; break; }
                        }
                        if (!has) {
                            Effect spread;
                            spread.type = EffectType::POISON;
                            spread.duration = duration * 0.5f;
                            spread.strength = strength * 0.5f;
                            spread.sourceId = sourceId;
                            e.effects.push_back(spread);
                        }
                    }
                }
                break;
            }
        }

        // Neurotoxin slow
        for (const auto& tower : towers_) {
            if (tower.type == TowerType::POISON && tower.upgrades.pathATier == 3 &&
                tower.upgrades.pathATier3 == Tier3Choice::CHOICE_B) {
                applyEffect(enemy, EffectType::SLOW, duration, 0.4f, sourceId);
                break;
            }
        }
    }

    Effect effect;
    effect.type = type;
    effect.duration = duration;
    effect.strength = strength;
    effect.sourceId = sourceId;
    enemy.effects.push_back(effect);
}

const TowerDefenseGame::EnemyStats& TowerDefenseGame::getEnemyStats(EnemyType type) const {
    return ENEMY_STATS[static_cast<int>(type)];
}

int TowerDefenseGame::getEnemyDamage(EnemyType type) const {
    const EnemyStats& stats = getEnemyStats(type);
    int baseDamage = std::max(5, stats.hp / 15);
    if (type == EnemyType::DRAGON || type == EnemyType::GIANT ||
        type == EnemyType::DEMON_KNIGHT || type == EnemyType::DEMON_KING) {
        baseDamage *= 2;
    }
    return baseDamage;
}

TowerDefenseGame::FloatPoint TowerDefenseGame::getPositionOnPath(int pathIndex, float progress) const {
    if (pathIndex >= static_cast<int>(path_.size()) - 1) {
        const auto& last = path_.back();
        return {last.x * CELL_SIZE + CELL_SIZE / 2.0f, last.y * CELL_SIZE + CELL_SIZE / 2.0f};
    }

    const auto& p1 = path_[pathIndex];
    const auto& p2 = path_[pathIndex + 1];

    float x1 = p1.x * CELL_SIZE + CELL_SIZE / 2.0f;
    float y1 = p1.y * CELL_SIZE + CELL_SIZE / 2.0f;
    float x2 = p2.x * CELL_SIZE + CELL_SIZE / 2.0f;
    float y2 = p2.y * CELL_SIZE + CELL_SIZE / 2.0f;

    return {x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress};
}

// ============================================================================
// SOLDIERS (BARRACKS)
// ============================================================================

int TowerDefenseGame::getSoldierCount(const Tower& barracks) const {
    int base = 1;
    const auto& ups = barracks.upgrades;

    if (ups.pathBTier >= 1) base = 2;
    if (ups.pathBTier >= 2) base = 3;
    if (ups.pathBTier == 3) {
        if (ups.pathBTier3 == Tier3Choice::CHOICE_A) base = 5; // Army
        else base = 3; // Elite Guard
    }

    return base;
}

int TowerDefenseGame::getSoldierMaxHp(const Tower& barracks) const {
    int base = 25;
    const auto& ups = barracks.upgrades;

    if (ups.pathATier >= 1) base = static_cast<int>(base * 1.5f); // Combat Training
    if (ups.pathATier == 3 && ups.pathATier3 == Tier3Choice::CHOICE_B) {
        base = static_cast<int>(base * 0.75f); // Berserker -25% HP
    }
    if (ups.pathBTier == 3 && ups.pathBTier3 == Tier3Choice::CHOICE_B) {
        base = static_cast<int>(base * 2.0f); // Elite Guard +100%
    }

    return base;
}

int TowerDefenseGame::getSoldierDamage(const Tower& barracks) const {
    int base = 12;
    const auto& ups = barracks.upgrades;

    if (ups.pathATier >= 1) base = static_cast<int>(base * 1.5f); // Combat Training
    if (ups.pathATier == 3 && ups.pathATier3 == Tier3Choice::CHOICE_B) {
        base = static_cast<int>(base * 2.0f); // Berserker +100%
    }
    if (ups.pathBTier == 3 && ups.pathBTier3 == Tier3Choice::CHOICE_B) {
        base = static_cast<int>(base * 2.0f); // Elite Guard +100%
    }

    return base;
}

int TowerDefenseGame::getSoldierBlockCount(const Tower& barracks) const {
    const auto& ups = barracks.upgrades;
    if (ups.pathATier == 3 && ups.pathATier3 == Tier3Choice::CHOICE_A) {
        return 2; // Knights block 2
    }
    return 1;
}

TowerDefenseGame::FloatPoint TowerDefenseGame::getSoldierSpawnPosition(const Tower& barracks, int soldierIndex) const {
    float barracksX = barracks.x * CELL_SIZE + CELL_SIZE / 2.0f;
    float barracksY = barracks.y * CELL_SIZE + CELL_SIZE / 2.0f;

    const int dx[] = {-1, 1, 0, 0};
    const int dy[] = {0, 0, -1, 1};
    int pathX = barracks.x, pathY = barracks.y;

    for (int i = 0; i < 4; i++) {
        int nx = barracks.x + dx[i];
        int ny = barracks.y + dy[i];
        if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
            if (map_[ny][nx] == CellType::PATH) {
                pathX = nx;
                pathY = ny;
                break;
            }
        }
    }

    float pathCenterX = pathX * CELL_SIZE + CELL_SIZE / 2.0f;
    float pathCenterY = pathY * CELL_SIZE + CELL_SIZE / 2.0f;

    float offset = (soldierIndex - 1) * 16.0f;
    return {pathCenterX + offset, pathCenterY};
}

void TowerDefenseGame::spawnSoldiersForBarracks(Tower& barracks) {
    int count = getSoldierCount(barracks);
    int hp = getSoldierMaxHp(barracks);
    int dmg = getSoldierDamage(barracks);
    int blockCount = getSoldierBlockCount(barracks);

    for (int i = 0; i < count; i++) {
        Soldier soldier;
        soldier.id = nextSoldierId_++;
        soldier.barracksId = barracks.id;
        soldier.hp = hp;
        soldier.maxHp = hp;
        soldier.damage = dmg;
        soldier.engagedEnemyId = -1;
        soldier.blockCount = blockCount;
        soldier.attackSpeed = 1.0f;
        soldier.attackCooldown = 0.0f;
        soldier.active = true;

        // Veteran Soldiers +30% attack speed
        if (barracks.upgrades.pathATier >= 2) {
            soldier.attackSpeed *= 1.3f;
        }
        // Berserker +50% speed
        if (barracks.upgrades.pathATier == 3 &&
            barracks.upgrades.pathATier3 == Tier3Choice::CHOICE_B) {
            soldier.attackSpeed *= 1.5f;
        }

        auto pos = getSoldierSpawnPosition(barracks, i);
        soldier.x = pos.x;
        soldier.y = pos.y;

        soldiers_.push_back(soldier);
    }
}

void TowerDefenseGame::respawnAllSoldiers() {
    soldiers_.clear();
    for (auto& tower : towers_) {
        if (tower.type == TowerType::BARRACKS) {
            spawnSoldiersForBarracks(tower);
        }
    }
}

void TowerDefenseGame::updateSoldiers(float dt) {
    for (auto& soldier : soldiers_) {
        if (!soldier.active) continue;

        // Find barracks for this soldier
        auto barracksIt = std::find_if(towers_.begin(), towers_.end(),
            [&soldier](const Tower& t) { return t.id == soldier.barracksId; });
        if (barracksIt == towers_.end()) {
            soldier.active = false;
            continue;
        }

        // Reduce attack cooldown
        if (soldier.attackCooldown > 0) {
            soldier.attackCooldown -= dt;
        }

        if (soldier.engagedEnemyId >= 0) {
            auto enemyIt = std::find_if(enemies_.begin(), enemies_.end(),
                [&soldier](const Enemy& e) { return e.id == soldier.engagedEnemyId; });

            if (enemyIt == enemies_.end() || !enemyIt->active) {
                soldier.engagedEnemyId = -1;
            } else {
                // Both soldier and enemy attack when cooldown ready
                if (soldier.attackCooldown <= 0) {
                    // Soldier attacks enemy
                    damageEnemy(*enemyIt, soldier.damage, false);

                    // Enemy attacks soldier (enemies attack at ~1 attack/sec)
                    int enemyDmg = getEnemyDamage(enemyIt->type);
                    soldier.hp -= enemyDmg;

                    // Reset cooldown (attackSpeed = attacks per second)
                    soldier.attackCooldown = 1.0f / soldier.attackSpeed;

                    if (soldier.hp <= 0) {
                        killSoldier(soldier);
                    }
                }
            }
        } else {
            // Look for enemy to engage
            for (auto& enemy : enemies_) {
                if (!enemy.active || enemy.flying) continue;
                if (enemy.engagedBySoldierId >= 0) continue;

                float dist = distance(soldier.x, soldier.y, enemy.x, enemy.y);
                if (dist < 40.0f) {
                    soldier.engagedEnemyId = enemy.id;
                    enemy.engagedBySoldierId = soldier.id;
                    soldier.attackCooldown = 0; // Attack immediately on engage
                    break;
                }
            }
        }
    }

    // Remove dead soldiers
    soldiers_.erase(
        std::remove_if(soldiers_.begin(), soldiers_.end(),
            [](const Soldier& s) { return !s.active; }),
        soldiers_.end());
}

void TowerDefenseGame::killSoldier(Soldier& soldier) {
    soldier.active = false;

    if (soldier.engagedEnemyId >= 0) {
        for (auto& enemy : enemies_) {
            if (enemy.id == soldier.engagedEnemyId) {
                enemy.engagedBySoldierId = -1;
                break;
            }
        }
    }
}

// ============================================================================
// SKELETONS (Mage Necromancer upgrade)
// ============================================================================

void TowerDefenseGame::spawnSkeleton(float x, float y, int mageId, bool isStrong) {
    Skeleton skel;
    skel.id = nextSkeletonId_++;
    skel.mageId = mageId;
    skel.x = x;
    skel.y = y;
    skel.isStrong = isStrong;

    // Base stats for normal skeleton
    skel.hp = isStrong ? 80 : 40;
    skel.maxHp = skel.hp;
    skel.damage = isStrong ? 20 : 10;
    skel.attackSpeed = isStrong ? 1.5f : 1.0f;
    skel.attackCooldown = 0;
    skel.lifetime = isStrong ? 20.0f : 12.0f;  // Stronger skeletons last longer
    skel.engagedEnemyId = -1;
    skel.active = true;

    skeletons_.push_back(skel);
}

void TowerDefenseGame::updateSkeletons(float dt) {
    for (auto& skel : skeletons_) {
        if (!skel.active) continue;

        // Decrease lifetime
        skel.lifetime -= dt;
        if (skel.lifetime <= 0) {
            skel.active = false;
            continue;
        }

        // Decrease attack cooldown
        if (skel.attackCooldown > 0) {
            skel.attackCooldown -= dt;
        }

        // Find nearest enemy to engage
        if (skel.engagedEnemyId < 0) {
            float minDist = 50.0f;  // Skeleton engagement range
            int targetId = -1;

            for (auto& enemy : enemies_) {
                if (!enemy.active || enemy.flying) continue;

                float dx = enemy.x - skel.x;
                float dy = enemy.y - skel.y;
                float dist = std::sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    minDist = dist;
                    targetId = enemy.id;
                }
            }

            if (targetId >= 0) {
                skel.engagedEnemyId = targetId;
            }
        }

        // Attack engaged enemy
        if (skel.engagedEnemyId >= 0) {
            auto enemyIt = std::find_if(enemies_.begin(), enemies_.end(),
                [&](const Enemy& e) { return e.id == skel.engagedEnemyId && e.active; });

            if (enemyIt == enemies_.end()) {
                skel.engagedEnemyId = -1;
            } else {
                // Move toward enemy
                float dx = enemyIt->x - skel.x;
                float dy = enemyIt->y - skel.y;
                float dist = std::sqrt(dx * dx + dy * dy);

                if (dist > 20.0f) {
                    float speed = 60.0f;  // Skeleton move speed
                    skel.x += (dx / dist) * speed * dt;
                    skel.y += (dy / dist) * speed * dt;
                } else if (skel.attackCooldown <= 0) {
                    // Attack!
                    damageEnemy(*enemyIt, skel.damage, false);
                    skel.attackCooldown = 1.0f / skel.attackSpeed;

                    // Check if enemy died
                    if (enemyIt->hp <= 0) {
                        skel.engagedEnemyId = -1;
                    }
                }

                // Skeleton takes damage from enemy (slower than soldiers)
                skel.hp -= static_cast<int>(5 * dt);  // 5 DPS from being in combat
                if (skel.hp <= 0) {
                    skel.active = false;
                }
            }
        }
    }

    // Remove inactive skeletons
    skeletons_.erase(
        std::remove_if(skeletons_.begin(), skeletons_.end(),
            [](const Skeleton& s) { return !s.active; }),
        skeletons_.end());
}

// ============================================================================
// WAVES
// ============================================================================

void TowerDefenseGame::startWave() {
    if (wave_ >= MAX_WAVES || waveActive_) return;

    waveActive_ = true;
    waveTimer_ = 0;
    enemiesSpawned_ = 0;

    const auto& waveData = WAVES[wave_];
    enemiesRemaining_ = 0;
    for (const auto& we : waveData.enemies) {
        enemiesRemaining_ += we.count;
    }

    respawnAllSoldiers();
    Logger::game("Starting wave {}!", wave_ + 1);
}

void TowerDefenseGame::updateWaveSpawning(float dt) {
    if (!waveActive_ || wave_ >= MAX_WAVES) return;

    waveTimer_ -= dt;
    if (waveTimer_ > 0) return;

    const auto& waveData = WAVES[wave_];

    int spawnIndex = 0;
    int totalCount = 0;
    for (const auto& we : waveData.enemies) {
        if (enemiesSpawned_ < totalCount + we.count) {
            spawnIndex = enemiesSpawned_ - totalCount;
            spawnEnemy(we.type);
            enemiesSpawned_++;
            waveTimer_ = we.spawnDelay;
            return;
        }
        totalCount += we.count;
    }
}

void TowerDefenseGame::checkWaveComplete() {
    if (!waveActive_) return;

    bool allSpawned = true;
    const auto& waveData = WAVES[wave_];
    int totalToSpawn = 0;
    for (const auto& we : waveData.enemies) {
        totalToSpawn += we.count;
    }
    allSpawned = (enemiesSpawned_ >= totalToSpawn);

    if (allSpawned && enemiesRemaining_ <= 0) {
        waveActive_ = false;
        gold_ += waveData.bonusGold;
        applyInterest();
        wave_++;

        if (wave_ >= MAX_WAVES) {
            victory_ = true;
        }
    }
}

void TowerDefenseGame::applyInterest() {
    int interest = static_cast<int>(gold_ * INTEREST_RATE);
    interest = std::min(interest, MAX_INTEREST);
    gold_ += interest;
}

// ============================================================================
// INPUT HANDLING
// ============================================================================

void TowerDefenseGame::handleInput(int, const json& input) {
    if (!started_ || gameOver_ || victory_) return;

    std::string action = input.value("action", "");

    if (action == "placeTower") {
        std::string typeStr = input.value("towerType", "");
        int x = input.value("x", -1);
        int y = input.value("y", -1);
        TowerType type = stringToTowerType(typeStr);
        placeTower(type, x, y);
    }
    else if (action == "sellTower") {
        int towerId = input.value("towerId", -1);
        sellTower(towerId);
    }
    else if (action == "upgrade") {
        int towerId = input.value("towerId", -1);
        std::string pathStr = input.value("path", "");
        int tier = input.value("tier", 0);

        UpgradePath path = (pathStr == "B") ? UpgradePath::PATH_B : UpgradePath::PATH_A;

        // Convert 4-tier system to internal representation:
        // Client sends tier 1,2,3,4 - we map tier 3->CHOICE_A, tier 4->CHOICE_B
        Tier3Choice choice = Tier3Choice::NONE;
        int internalTier = tier;
        if (tier == 3) {
            choice = Tier3Choice::CHOICE_A;
        } else if (tier == 4) {
            internalTier = 3;  // Tier 4 is actually tier 3 with CHOICE_B
            choice = Tier3Choice::CHOICE_B;
        }

        purchaseUpgrade(towerId, path, internalTier, choice);
    }
    else if (action == "setTargeting") {
        int towerId = input.value("towerId", -1);
        std::string priorityStr = input.value("priority", "first");
        setTargeting(towerId, stringToTargetPriority(priorityStr));
    }
    else if (action == "startWave") {
        startWave();
    }
    else if (action == "toggleFastForward") {
        fastForward_ = !fastForward_;
    }
}

// ============================================================================
// STATE SERIALIZATION
// ============================================================================

json TowerDefenseGame::getState() const {
    json state;

    state["gold"] = gold_;
    state["lives"] = lives_;
    state["wave"] = wave_ + 1;
    state["maxWaves"] = MAX_WAVES;
    state["score"] = score_;
    state["waveActive"] = waveActive_;
    state["gameOver"] = gameOver_;
    state["victory"] = victory_;
    state["fastForward"] = fastForward_;

    // Map
    json mapJson = json::array();
    for (int y = 0; y < GRID_HEIGHT; ++y) {
        json row = json::array();
        for (int x = 0; x < GRID_WIDTH; ++x) {
            row.push_back(static_cast<int>(map_[y][x]));
        }
        mapJson.push_back(row);
    }
    state["map"] = mapJson;

    // Path
    json pathJson = json::array();
    for (const auto& p : path_) {
        pathJson.push_back({{"x", p.x}, {"y", p.y}});
    }
    state["path"] = pathJson;

    // Towers with upgrade info
    json towersJson = json::array();
    for (const auto& t : towers_) {
        json tj;
        tj["id"] = t.id;
        tj["type"] = towerTypeToString(t.type);
        tj["x"] = t.x;
        tj["y"] = t.y;
        tj["upgrades"] = upgradeStateToJson(t.upgrades);
        tj["targeting"] = static_cast<int>(t.targeting);
        tj["targetId"] = t.targetId;
        tj["totalInvested"] = t.totalInvested;
        tj["damage"] = t.damage;
        tj["range"] = t.range;
        tj["attackSpeed"] = t.attackSpeed;
        tj["sellValue"] = static_cast<int>(t.totalInvested * SELL_REFUND_RATE);
        towersJson.push_back(tj);
    }
    state["towers"] = towersJson;

    // Enemies
    json enemiesJson = json::array();
    for (const auto& e : enemies_) {
        if (!e.active) continue;
        json ej;
        ej["id"] = e.id;
        ej["type"] = enemyTypeToString(e.type);
        ej["x"] = e.x;
        ej["y"] = e.y;
        ej["hp"] = e.hp;
        ej["maxHp"] = e.maxHp;
        ej["flying"] = e.flying;
        ej["camo"] = e.camo;
        ej["engaged"] = e.engagedBySoldierId >= 0;

        json effects = json::array();
        for (const auto& eff : e.effects) {
            effects.push_back({
                {"type", static_cast<int>(eff.type)},
                {"duration", eff.duration}
            });
        }
        ej["effects"] = effects;
        enemiesJson.push_back(ej);
    }
    state["enemies"] = enemiesJson;

    // Projectiles
    json projectilesJson = json::array();
    for (const auto& p : projectiles_) {
        if (!p.active) continue;
        projectilesJson.push_back({
            {"id", p.id},
            {"type", static_cast<int>(p.type)},
            {"x", p.x},
            {"y", p.y}
        });
    }
    state["projectiles"] = projectilesJson;

    // Soldiers
    json soldiersJson = json::array();
    for (const auto& s : soldiers_) {
        if (!s.active) continue;
        soldiersJson.push_back({
            {"id", s.id},
            {"x", s.x},
            {"y", s.y},
            {"hp", s.hp},
            {"maxHp", s.maxHp},
            {"engaged", s.engagedEnemyId >= 0}
        });
    }
    state["soldiers"] = soldiersJson;

    // Skeletons (mage-spawned units)
    json skeletonsJson = json::array();
    for (const auto& sk : skeletons_) {
        if (!sk.active) continue;
        skeletonsJson.push_back({
            {"id", sk.id},
            {"x", sk.x},
            {"y", sk.y},
            {"hp", sk.hp},
            {"maxHp", sk.maxHp},
            {"engaged", sk.engagedEnemyId >= 0},
            {"isStrong", sk.isStrong},
            {"lifetime", sk.lifetime}
        });
    }
    state["skeletons"] = skeletonsJson;

    // Grid config
    state["config"] = {
        {"gridWidth", GRID_WIDTH},
        {"gridHeight", GRID_HEIGHT},
        {"cellSize", CELL_SIZE}
    };

    return state;
}

json TowerDefenseGame::upgradeStateToJson(const UpgradeState& state) const {
    json j;

    // Convert internal tier + choice to client's 4-tier format
    // Internal: pathATier 0-3, pathATier3 = NONE/A/B
    // Client: pathA 0-4 where tier 3 with CHOICE_B = 4
    int clientPathA = state.pathATier;
    int clientPathB = state.pathBTier;

    if (state.pathATier == 3 && state.pathATier3 == Tier3Choice::CHOICE_B) {
        clientPathA = 4;
    }
    if (state.pathBTier == 3 && state.pathBTier3 == Tier3Choice::CHOICE_B) {
        clientPathB = 4;
    }

    j["pathA"] = clientPathA;
    j["pathB"] = clientPathB;
    j["notation"] = std::to_string(clientPathA) + "-" + std::to_string(clientPathB);

    // Path locking: if one path is at tier 3+, the other is locked at tier 2
    bool pathALocked = clientPathB >= 3;
    bool pathBLocked = clientPathA >= 3;

    j["pathALocked"] = pathALocked;
    j["pathBLocked"] = pathBLocked;
    j["pathAMax"] = pathALocked ? 2 : 4;
    j["pathBMax"] = pathBLocked ? 2 : 4;

    return j;
}

// ============================================================================
// UTILITY
// ============================================================================

bool TowerDefenseGame::isOver() const {
    return gameOver_ || victory_;
}

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
    return TowerType::ARCHER;
}

TowerDefenseGame::TargetPriority TowerDefenseGame::stringToTargetPriority(const std::string& str) const {
    if (str == "first") return TargetPriority::FIRST;
    if (str == "last") return TargetPriority::LAST;
    if (str == "strongest") return TargetPriority::STRONGEST;
    if (str == "weakest") return TargetPriority::WEAKEST;
    if (str == "closest") return TargetPriority::CLOSEST;
    return TargetPriority::FIRST;
}
