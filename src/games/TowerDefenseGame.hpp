#pragma once

#include "Game.hpp"
#include <vector>
#include <array>
#include <cmath>
#include <string>

/**
 * Tower Defense game - Single player medieval kingdom defense.
 * Defend against 50 waves of enemies using 8 tower types.
 * BTD-style branching upgrade system with two paths per tower.
 */
class TowerDefenseGame : public Game {
public:
    TowerDefenseGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;
    bool isOver() const override;
    std::string getType() const override { return "towerdefense"; }
    int getMinPlayers() const override { return 1; }
    int getMaxPlayers() const override { return 1; }
    void onPlayerJoin(int playerId, const std::string& username = "") override;
    void onPlayerLeave(int playerId) override;

private:
    // Grid and map constants
    static constexpr int GRID_WIDTH = 20;
    static constexpr int GRID_HEIGHT = 15;
    static constexpr int CELL_SIZE = 48;
    static constexpr int CANVAS_WIDTH = GRID_WIDTH * CELL_SIZE;   // 960
    static constexpr int CANVAS_HEIGHT = GRID_HEIGHT * CELL_SIZE; // 720

    // Game balance constants
    static constexpr int STARTING_GOLD = 650;
    static constexpr int STARTING_LIVES = 20;
    static constexpr int MAX_WAVES = 50;
    static constexpr float INTEREST_RATE = 0.05f;
    static constexpr int MAX_INTEREST = 200;
    static constexpr float SELL_REFUND_RATE = 0.75f;

    // Enums
    enum class CellType { EMPTY, PATH, BLOCKED };

    enum class TowerType {
        ARCHER,      // Fast single-target
        CANNON,      // Slow AOE splash
        MAGE,        // Magic damage (ignores armor)
        FROST,       // Slows enemies
        POISON,      // DOT stacking
        LIGHTNING,   // Chain damage
        BARRACKS,    // Spawns melee units
        ULTIMATE     // High damage, unlocked wave 40
    };

    enum class EnemyType {
        GOBLIN,        // Fast, weak, swarm
        ORC,           // Standard infantry
        ORC_BRUTE,     // Heavy armor
        WOLF_RIDER,    // Very fast
        TROLL,         // Regenerates HP
        DARK_MAGE,     // Shields nearby allies
        BAT_SWARM,     // Flying
        WYVERN,        // Flying, stronger
        GOLEM,         // Magic immune
        ASSASSIN,      // Camo (invisible)
        NECROMANCER,   // Resurrects dead
        DRAGON,        // Flying boss
        GIANT,         // Mini-boss
        DEMON_KNIGHT,  // Boss
        DEMON_KING     // Final boss
    };

    enum class TargetPriority {
        FIRST,     // Furthest along path
        LAST,      // Least progress
        STRONGEST, // Highest HP
        WEAKEST,   // Lowest HP
        CLOSEST    // Nearest to tower
    };

    enum class ProjectileType {
        ARROW,
        CANNONBALL,
        MAGIC_BOLT,
        ICE_SHARD,
        POISON_DART,
        LIGHTNING_BOLT,
        FIRE_ARROW,
        ICE_ARROW
    };

    enum class EffectType {
        SLOW,
        POISON,
        BURN,
        SHIELD,
        STUN,
        ARMOR_BREAK
    };

    // BTD-style upgrade enums
    enum class UpgradePath { PATH_A, PATH_B };
    enum class Tier3Choice { NONE, CHOICE_A, CHOICE_B };

    // Structs
    struct Point {
        int x, y;
        bool operator==(const Point& o) const { return x == o.x && y == o.y; }
    };

    struct FloatPoint {
        float x, y;
    };

    struct Effect {
        EffectType type;
        float duration;
        float strength;  // slow %, poison dps, etc.
        int sourceId;
    };

    // BTD-style upgrade state for each tower
    struct UpgradeState {
        int pathATier = 0;          // 0-3
        int pathBTier = 0;          // 0-3
        Tier3Choice pathATier3 = Tier3Choice::NONE;
        Tier3Choice pathBTier3 = Tier3Choice::NONE;

        bool isPathLocked(UpgradePath path) const {
            if (path == UpgradePath::PATH_A) return pathBTier >= 3;
            return pathATier >= 3;
        }

        int getMaxTier(UpgradePath path) const {
            if (isPathLocked(path)) return 2;
            return 3;
        }

        std::string getNotation() const {
            std::string a = std::to_string(pathATier);
            std::string b = std::to_string(pathBTier);
            if (pathATier == 3 && pathATier3 != Tier3Choice::NONE) {
                a = "3" + std::string(pathATier3 == Tier3Choice::CHOICE_A ? "A" : "B");
            }
            if (pathBTier == 3 && pathBTier3 != Tier3Choice::NONE) {
                b = "3" + std::string(pathBTier3 == Tier3Choice::CHOICE_A ? "A" : "B");
            }
            return a + "-" + b;
        }
    };

    struct Tower {
        int id;
        TowerType type;
        int x, y;              // Grid position
        UpgradeState upgrades; // BTD-style branching upgrades
        TargetPriority targeting;
        float cooldown;        // Time until next shot
        int targetId;          // Current target enemy (-1 if none)
        int totalInvested;     // For sell calculation

        // Computed stats (recalculated when upgrades change)
        int damage;
        float range;
        float attackSpeed;     // Attacks per second
        int pierce;            // Number of enemies arrow can hit
        int chainTargets;      // Lightning chain count
        float slowStrength;    // Frost slow %
        float dotDamage;       // Poison/burn DPS
        float splashRadius;    // AOE radius
        float stunDuration;    // Stun time
        bool canHitFlying;
        bool canHitCamo;

        // Special ability tracking
        float abilityTimer;    // For periodic abilities
        int attackCounter;     // For "every Nth attack" abilities
    };

    struct Enemy {
        int id;
        EnemyType type;
        float x, y;            // Pixel position
        int pathIndex;         // Current waypoint index
        float pathProgress;    // Progress between waypoints (0-1)
        int hp;
        int maxHp;
        int armor;
        int baseArmor;         // Original armor (for armor break effects)
        float speed;           // Pixels per second
        float baseSpeed;       // Original speed (for slow effects)
        bool flying;
        bool camo;
        bool active;           // False when dead or reached end
        int engagedBySoldierId; // Soldier blocking this enemy (-1 if none)
        std::vector<Effect> effects;
    };

    struct Projectile {
        int id;
        ProjectileType type;
        float x, y;
        float vx, vy;
        int targetId;
        int damage;
        int sourceId;          // Tower that fired
        float splashRadius;    // For AOE (0 = single target)
        int pierce;            // Remaining enemies to hit
        float slowStrength;    // For frost projectiles
        float slowDuration;
        float dotDamage;       // For poison/burn
        float dotDuration;
        float stunDuration;    // For stun effects
        bool active;
    };

    struct WaveEnemy {
        EnemyType type;
        int count;
        float spawnDelay;      // Seconds between spawns
    };

    struct Soldier {
        int id;
        int barracksId;        // Which barracks spawned this
        float x, y;            // Position on path
        int hp;
        int maxHp;
        int damage;            // Damage per attack
        int engagedEnemyId;    // Enemy currently fighting (-1 if none)
        int blockCount;        // How many enemies can block (default 1)
        float attackSpeed;     // Attacks per second
        float attackCooldown;  // Time until next attack
        bool active;
    };

    struct Wave {
        std::vector<WaveEnemy> enemies;
        int bonusGold;
    };

    struct TowerStats {
        int cost;
        int damage;
        float range;           // Pixels
        float cooldown;        // Seconds
        float projectileSpeed; // Pixels per second
        bool canHitFlying;
        bool canHitCamo;
    };

    struct EnemyStats {
        int hp;
        int armor;
        float speed;           // Pixels per second
        int goldReward;
        bool flying;
        bool camo;
    };

    // Upgrade definition for a single tier
    struct UpgradeDef {
        std::string name;
        int cost;
        std::string description;
    };

    // Game state
    std::array<std::array<CellType, GRID_WIDTH>, GRID_HEIGHT> map_;
    std::vector<Point> path_;              // Waypoints
    std::vector<Tower> towers_;
    std::vector<Enemy> enemies_;
    std::vector<Projectile> projectiles_;
    std::vector<Soldier> soldiers_;        // Barracks soldiers

    int gold_;
    int lives_;
    int wave_;                             // Current wave (0-indexed)
    int score_;
    bool waveActive_;
    bool gameOver_;
    bool victory_;
    bool fastForward_;
    float waveTimer_;                      // Time until next spawn
    int enemiesSpawned_;                   // Count in current wave
    int enemiesRemaining_;                 // Alive + to spawn
    int nextTowerId_;
    int nextEnemyId_;
    int nextProjectileId_;
    int nextSoldierId_;

    // Static data
    static const std::vector<Wave> WAVES;
    static const std::array<TowerStats, 8> TOWER_STATS;
    static const std::array<EnemyStats, 15> ENEMY_STATS;

    // Upgrade definitions: [towerType][path][tier] -> UpgradeDef
    // Path A = index 0, Path B = index 1
    // Tier 1,2,3A,3B = indices 0,1,2,3
    static const std::array<std::array<std::array<UpgradeDef, 4>, 2>, 8> UPGRADE_DEFS;

    // Methods - Map
    void initMap();
    bool canPlaceTower(int x, int y) const;
    FloatPoint getPositionOnPath(int pathIndex, float progress) const;

    // Methods - Towers
    bool placeTower(TowerType type, int x, int y);
    bool sellTower(int towerId);
    bool purchaseUpgrade(int towerId, UpgradePath path, int tier, Tier3Choice choice = Tier3Choice::NONE);
    bool canPurchaseUpgrade(const Tower& tower, UpgradePath path, int tier, Tier3Choice choice = Tier3Choice::NONE) const;
    int getUpgradeCost(TowerType type, UpgradePath path, int tier, Tier3Choice choice = Tier3Choice::NONE) const;
    void recalculateTowerStats(Tower& tower);
    void setTargeting(int towerId, TargetPriority priority);
    void updateTowers(float dt);
    int findTarget(const Tower& tower) const;
    void fireTower(Tower& tower, Enemy& target);
    const TowerStats& getBaseStats(TowerType type) const;

    // Methods - Enemies
    void spawnEnemy(EnemyType type);
    void updateEnemies(float dt);
    void damageEnemy(Enemy& enemy, int damage, bool isMagic = false, bool ignoreSlow = false);
    void killEnemy(Enemy& enemy);
    void applyEffect(Enemy& enemy, EffectType type, float duration, float strength, int sourceId);
    const EnemyStats& getEnemyStats(EnemyType type) const;
    int getEnemyDamage(EnemyType type) const;

    // Methods - Soldiers (Barracks)
    void spawnSoldiersForBarracks(Tower& barracks);
    void respawnAllSoldiers();
    void updateSoldiers(float dt);
    void killSoldier(Soldier& soldier);
    int getSoldierCount(const Tower& barracks) const;
    int getSoldierMaxHp(const Tower& barracks) const;
    int getSoldierDamage(const Tower& barracks) const;
    int getSoldierBlockCount(const Tower& barracks) const;
    FloatPoint getSoldierSpawnPosition(const Tower& barracks, int soldierIndex) const;

    // Methods - Projectiles
    void createProjectile(Tower& tower, Enemy& target);
    void updateProjectiles(float dt);

    // Methods - Waves
    void startWave();
    void updateWaveSpawning(float dt);
    void checkWaveComplete();
    void applyInterest();

    // Methods - Utility
    float distance(float x1, float y1, float x2, float y2) const;
    std::string towerTypeToString(TowerType type) const;
    std::string enemyTypeToString(EnemyType type) const;
    TowerType stringToTowerType(const std::string& str) const;
    TargetPriority stringToTargetPriority(const std::string& str) const;
    json upgradeStateToJson(const UpgradeState& state) const;
};
