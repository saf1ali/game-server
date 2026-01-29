#include "SlitherGame.hpp"
#include "../utils/Logger.hpp"
#include <cmath>
#include <algorithm>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

SlitherGame::SlitherGame()
    : rng_(std::random_device{}())
{
}

void SlitherGame::start() {
    started_ = true;
    gameOver_ = false;
    winner_ = -1;
    currentRound_ = 1;
    roundInProgress_ = true;

    // Spawn all snakes
    for (int i = 0; i < static_cast<int>(snakes_.size()); i++) {
        spawnSnake(i);
    }

    // Spawn initial pellets
    pellets_.clear();
    for (int i = 0; i < INITIAL_PELLETS; i++) {
        spawnPellet();
    }

    Logger::game("Slither Battle started with {} players!", snakes_.size());
}

void SlitherGame::update(float deltaTime) {
    if (!started_ || gameOver_) return;

    // Move all alive snakes
    for (int i = 0; i < static_cast<int>(snakes_.size()); i++) {
        if (snakes_[i].alive) {
            moveSnake(i, deltaTime);
        }
    }

    // Check collisions for all snakes
    for (int i = 0; i < static_cast<int>(snakes_.size()); i++) {
        if (snakes_[i].alive) {
            checkFoodCollision(i);
            checkWallCollision(i);
            checkSnakeCollision(i);
        }
    }

    // Maintain pellet count
    while (pellets_.size() < static_cast<size_t>(INITIAL_PELLETS)) {
        spawnPellet();
    }

    // Check if round ended
    checkRoundEnd();
}

void SlitherGame::handleInput(int playerId, const json& input) {
    if (playerId < 0 || playerId >= static_cast<int>(snakes_.size())) return;

    Snake& s = snakes_[playerId];
    if (!s.alive) return;

    // Get mouse position from input
    float mouseX = input.value("mouseX", 0.0f);
    float mouseY = input.value("mouseY", 0.0f);
    bool boost = input.value("boost", false);

    // Calculate direction toward mouse from head position
    if (!s.body.empty()) {
        Vector2 head = s.body.front();
        Vector2 toMouse(mouseX - head.x, mouseY - head.y);
        float len = toMouse.length();
        if (len > 0.1f) {
            s.targetDir = toMouse.normalized();
        }
    }

    s.boosting = boost;
}

void SlitherGame::moveSnake(int playerId, float dt) {
    Snake& s = snakes_[playerId];
    if (!s.alive || s.body.empty()) return;

    // Smooth rotation toward target direction
    float currentAngle = std::atan2(s.direction.y, s.direction.x);
    float targetAngle = std::atan2(s.targetDir.y, s.targetDir.x);
    float angleDiff = targetAngle - currentAngle;

    // Normalize angle difference to [-PI, PI]
    while (angleDiff > M_PI) angleDiff -= 2.0f * static_cast<float>(M_PI);
    while (angleDiff < -M_PI) angleDiff += 2.0f * static_cast<float>(M_PI);

    // Apply turn with max turn speed
    float maxTurn = TURN_SPEED * dt;
    float actualTurn = std::clamp(angleDiff, -maxTurn, maxTurn);
    float newAngle = currentAngle + actualTurn;

    s.direction = Vector2(std::cos(newAngle), std::sin(newAngle));

    // Move head
    float speed = s.boosting ? BOOST_SPEED : BASE_SPEED;
    Vector2 newHead = s.body.front() + s.direction * speed * dt;

    // Add new head position
    s.body.push_front(newHead);

    // Calculate target length
    size_t targetLength = static_cast<size_t>(START_LENGTH + s.score);

    // Remove tail segments to maintain length
    while (s.body.size() > targetLength) {
        s.body.pop_back();
    }

    // Handle boost cost - lose segments while boosting
    if (s.boosting && s.body.size() > static_cast<size_t>(START_LENGTH)) {
        s.boostTimer += dt;
        if (s.boostTimer >= BOOST_COST_INTERVAL) {
            s.boostTimer = 0;
            if (s.score > 0) {
                s.score--;
                // Spawn a pellet where we lost mass
                if (!s.body.empty()) {
                    Pellet p;
                    p.pos = s.body.back();
                    p.color = s.color;
                    p.value = 1;
                    pellets_.push_back(p);
                }
            }
        }
    }
}

void SlitherGame::checkFoodCollision(int playerId) {
    Snake& s = snakes_[playerId];
    if (!s.alive || s.body.empty()) return;

    Vector2 head = s.body.front();

    for (auto it = pellets_.begin(); it != pellets_.end(); ) {
        float dist = (head - it->pos).length();
        if (dist < HEAD_RADIUS + PELLET_RADIUS) {
            s.score += it->value;
            it = pellets_.erase(it);
        } else {
            ++it;
        }
    }
}

void SlitherGame::checkWallCollision(int playerId) {
    Snake& s = snakes_[playerId];
    if (!s.alive || s.body.empty()) return;

    Vector2 head = s.body.front();

    if (head.x - HEAD_RADIUS < 0 || head.x + HEAD_RADIUS > ARENA_WIDTH ||
        head.y - HEAD_RADIUS < 0 || head.y + HEAD_RADIUS > ARENA_HEIGHT) {
        killSnake(playerId);
    }
}

void SlitherGame::checkSnakeCollision(int playerId) {
    Snake& s = snakes_[playerId];
    if (!s.alive || s.body.empty()) return;

    Vector2 head = s.body.front();

    // Check collision with other snakes' bodies
    for (int i = 0; i < static_cast<int>(snakes_.size()); i++) {
        if (i == playerId) continue;

        Snake& other = snakes_[i];
        if (!other.alive) continue;

        // Check head vs all body segments of other snake
        for (const Vector2& seg : other.body) {
            float dist = (head - seg).length();
            if (dist < HEAD_RADIUS + BODY_RADIUS) {
                killSnake(playerId);
                return;
            }
        }
    }

    // Check self-collision (skip first few segments to avoid immediate death)
    for (size_t i = 15; i < s.body.size(); i++) {
        float dist = (head - s.body[i]).length();
        if (dist < HEAD_RADIUS + BODY_RADIUS) {
            killSnake(playerId);
            return;
        }
    }
}

void SlitherGame::killSnake(int playerId) {
    Snake& s = snakes_[playerId];
    if (!s.alive) return;

    s.alive = false;

    // Spawn death pellets
    spawnDeathPellets(s);

    // Clear the body
    s.body.clear();

    Logger::game("Player {} ({}) died in Slither!", playerId, s.username);
}

void SlitherGame::spawnDeathPellets(const Snake& snake) {
    // Spawn pellets along the snake's body
    int pelletsToSpawn = std::min(static_cast<int>(snake.body.size()), 20 + snake.score / 2);

    for (int i = 0; i < pelletsToSpawn && i < static_cast<int>(snake.body.size()); i++) {
        size_t idx = (i * snake.body.size()) / pelletsToSpawn;
        if (idx < snake.body.size()) {
            Pellet p;
            p.pos = snake.body[idx];
            // Add slight random offset
            std::uniform_real_distribution<float> offset(-10.0f, 10.0f);
            p.pos.x += offset(rng_);
            p.pos.y += offset(rng_);
            p.color = snake.color;
            p.value = 1;
            pellets_.push_back(p);
        }
    }
}

void SlitherGame::spawnSnake(int playerId) {
    if (playerId < 0 || playerId >= static_cast<int>(snakes_.size())) return;

    Snake& s = snakes_[playerId];
    s.alive = true;
    s.score = 0;
    s.boosting = false;
    s.boostTimer = 0.0f;
    s.body.clear();

    // Get random spawn position
    Vector2 spawnPos = getRandomSpawnPos();

    // Random initial direction
    std::uniform_real_distribution<float> angleDist(0.0f, 2.0f * static_cast<float>(M_PI));
    float angle = angleDist(rng_);
    s.direction = Vector2(std::cos(angle), std::sin(angle));
    s.targetDir = s.direction;

    // Create initial body segments
    for (int i = 0; i < START_LENGTH; i++) {
        Vector2 segPos = spawnPos - s.direction * static_cast<float>(i * 5);
        s.body.push_back(segPos);
    }
}

void SlitherGame::spawnPellet() {
    if (pellets_.size() >= MAX_PELLETS) return;

    std::uniform_real_distribution<float> xDist(PELLET_RADIUS + 20, ARENA_WIDTH - PELLET_RADIUS - 20);
    std::uniform_real_distribution<float> yDist(PELLET_RADIUS + 20, ARENA_HEIGHT - PELLET_RADIUS - 20);

    Pellet p;
    p.pos = Vector2(xDist(rng_), yDist(rng_));
    p.color = getRandomPelletColor();
    p.value = 1;

    pellets_.push_back(p);
}

Vector2 SlitherGame::getRandomSpawnPos() {
    // Spawn away from walls and other snakes
    std::uniform_real_distribution<float> xDist(100.0f, ARENA_WIDTH - 100.0f);
    std::uniform_real_distribution<float> yDist(100.0f, ARENA_HEIGHT - 100.0f);

    for (int attempts = 0; attempts < 50; attempts++) {
        Vector2 pos(xDist(rng_), yDist(rng_));

        bool tooClose = false;
        for (const Snake& other : snakes_) {
            if (!other.alive || other.body.empty()) continue;
            float dist = (pos - other.body.front()).length();
            if (dist < 150.0f) {
                tooClose = true;
                break;
            }
        }

        if (!tooClose) return pos;
    }

    // Fallback
    return Vector2(xDist(rng_), yDist(rng_));
}

std::string SlitherGame::getRandomPelletColor() {
    std::uniform_int_distribution<size_t> dist(0, PELLET_COLORS.size() - 1);
    return PELLET_COLORS[dist(rng_)];
}

void SlitherGame::checkRoundEnd() {
    if (!roundInProgress_) return;

    // Count alive snakes
    int aliveCount = 0;
    int lastAlive = -1;

    for (int i = 0; i < static_cast<int>(snakes_.size()); i++) {
        if (snakes_[i].alive) {
            aliveCount++;
            lastAlive = i;
        }
    }

    // Round ends when 1 or 0 snakes remain
    if (aliveCount <= 1 && snakes_.size() > 1) {
        roundInProgress_ = false;

        if (lastAlive >= 0) {
            snakes_[lastAlive].roundWins++;
            Logger::game("Player {} ({}) wins round {}!", lastAlive, snakes_[lastAlive].username, currentRound_);

            // Check for game winner
            if (snakes_[lastAlive].roundWins >= ROUNDS_TO_WIN) {
                gameOver_ = true;
                winner_ = lastAlive;
                Logger::game("Player {} ({}) wins the game!", lastAlive, snakes_[lastAlive].username);
                return;
            }
        }

        // Start new round after a brief delay (handled by next update cycle)
        startNewRound();
    }
}

void SlitherGame::startNewRound() {
    currentRound_++;
    roundInProgress_ = true;

    // Respawn all snakes
    for (int i = 0; i < static_cast<int>(snakes_.size()); i++) {
        spawnSnake(i);
    }

    // Reset pellets
    pellets_.clear();
    for (int i = 0; i < INITIAL_PELLETS; i++) {
        spawnPellet();
    }

    Logger::game("Starting round {} of Slither Battle!", currentRound_);
}

void SlitherGame::onPlayerJoin(int playerId) {
    // Ensure snakes vector is large enough
    while (snakes_.size() <= static_cast<size_t>(playerId)) {
        snakes_.push_back(Snake());
    }

    Snake& s = snakes_[playerId];
    s.color = PLAYER_COLORS[playerId % PLAYER_COLORS.size()];
    s.username = "Player" + std::to_string(playerId + 1);
    s.roundWins = 0;
    s.score = 0;
    s.alive = false;

    numPlayers_++;
    Logger::game("Player {} joined Slither", playerId);
}

void SlitherGame::onPlayerLeave(int playerId) {
    if (playerId >= 0 && playerId < static_cast<int>(snakes_.size())) {
        killSnake(playerId);
    }
    numPlayers_--;

    // Check if game should end due to too few players
    if (started_ && !gameOver_) {
        int remaining = 0;
        int lastPlayer = -1;
        for (int i = 0; i < static_cast<int>(snakes_.size()); i++) {
            if (snakes_[i].alive || snakes_[i].roundWins > 0) {
                remaining++;
                lastPlayer = i;
            }
        }
        if (remaining <= 1 && lastPlayer >= 0) {
            gameOver_ = true;
            winner_ = lastPlayer;
        }
    }
}

json SlitherGame::getState() const {
    json state;

    // Players array
    json playersJson = json::array();
    for (size_t i = 0; i < snakes_.size(); i++) {
        const Snake& s = snakes_[i];

        json bodyJson = json::array();
        for (const Vector2& seg : s.body) {
            bodyJson.push_back({{"x", seg.x}, {"y", seg.y}});
        }

        playersJson.push_back({
            {"username", s.username},
            {"body", bodyJson},
            {"direction", {{"x", s.direction.x}, {"y", s.direction.y}}},
            {"color", s.color},
            {"alive", s.alive},
            {"boosting", s.boosting},
            {"score", s.score},
            {"roundWins", s.roundWins}
        });
    }
    state["players"] = playersJson;

    // Pellets array
    json pelletsJson = json::array();
    for (const Pellet& p : pellets_) {
        pelletsJson.push_back({
            {"x", p.pos.x},
            {"y", p.pos.y},
            {"color", p.color}
        });
    }
    state["pellets"] = pelletsJson;

    state["gameOver"] = gameOver_;
    state["winner"] = winner_;
    state["currentRound"] = currentRound_;
    state["roundsToWin"] = ROUNDS_TO_WIN;

    state["config"] = {
        {"arenaWidth", ARENA_WIDTH},
        {"arenaHeight", ARENA_HEIGHT}
    };

    return state;
}
