#include "PongGame.hpp"
#include "../utils/Logger.hpp"
#include <cmath>
#include <random>

PongGame::PongGame()
    : gameOver_(false)
    , winner_(-1)
    , currentBallSpeed_(BALL_SPEED)
{
    float centerY = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    paddles_[0] = {centerY, 0};
    paddles_[1] = {centerY, 0};
    scores_[0] = 0;
    scores_[1] = 0;
    resetBall();
}

void PongGame::start() {
    started_ = true;
    Logger::game("Pong game started!");
}

void PongGame::resetBall() {
    ballPos_ = Vector2(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    static std::random_device rd;
    static std::mt19937 gen(rd());
    std::uniform_real_distribution<float> angleDist(-0.5f, 0.5f);
    std::uniform_int_distribution<int> dirDist(0, 1);

    float angle = angleDist(gen);
    float direction = dirDist(gen) == 0 ? -1.0f : 1.0f;

    ballVel_ = Vector2(direction * std::cos(angle), std::sin(angle)).normalized() * currentBallSpeed_;
    currentBallSpeed_ = BALL_SPEED;
}

void PongGame::update(float deltaTime) {
    if (!started_ || gameOver_) return;

    // Update paddles
    for (int i = 0; i < 2; ++i) {
        if (paddles_[i].direction != 0) {
            paddles_[i].y += paddles_[i].direction * PADDLE_SPEED * deltaTime;
            paddles_[i].y = std::max(0.0f, std::min(CANVAS_HEIGHT - PADDLE_HEIGHT, paddles_[i].y));
        }
    }

    // Update ball
    ballPos_ += ballVel_ * deltaTime;

    checkWallCollision();
    checkPaddleCollision();

    // Scoring
    if (ballPos_.x < 0) {
        scorePoint(1);
    } else if (ballPos_.x > CANVAS_WIDTH) {
        scorePoint(0);
    }
}

void PongGame::checkWallCollision() {
    if (ballPos_.y - BALL_RADIUS < 0) {
        ballPos_.y = BALL_RADIUS;
        ballVel_.y = std::abs(ballVel_.y);
    }
    if (ballPos_.y + BALL_RADIUS > CANVAS_HEIGHT) {
        ballPos_.y = CANVAS_HEIGHT - BALL_RADIUS;
        ballVel_.y = -std::abs(ballVel_.y);
    }
}

void PongGame::checkPaddleCollision() {
    Rectangle leftPaddle(PADDLE_MARGIN, paddles_[0].y, PADDLE_WIDTH, PADDLE_HEIGHT);
    Circle ball(ballPos_, BALL_RADIUS);

    if (ballVel_.x < 0 && Collision::circleRect(ball, leftPaddle)) {
        float paddleCenter = paddles_[0].y + PADDLE_HEIGHT / 2;
        float hitOffset = (ballPos_.y - paddleCenter) / (PADDLE_HEIGHT / 2);
        float bounceAngle = hitOffset * 0.75f;

        ballPos_.x = PADDLE_MARGIN + PADDLE_WIDTH + BALL_RADIUS;
        currentBallSpeed_ *= BALL_SPEED_INCREASE;
        ballVel_ = Vector2(std::cos(bounceAngle), std::sin(bounceAngle)).normalized() * currentBallSpeed_;
        ballVel_.x = std::abs(ballVel_.x);
    }

    Rectangle rightPaddle(CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH, paddles_[1].y, PADDLE_WIDTH, PADDLE_HEIGHT);

    if (ballVel_.x > 0 && Collision::circleRect(ball, rightPaddle)) {
        float paddleCenter = paddles_[1].y + PADDLE_HEIGHT / 2;
        float hitOffset = (ballPos_.y - paddleCenter) / (PADDLE_HEIGHT / 2);
        float bounceAngle = hitOffset * 0.75f;

        ballPos_.x = CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH - BALL_RADIUS;
        currentBallSpeed_ *= BALL_SPEED_INCREASE;
        ballVel_ = Vector2(std::cos(bounceAngle), std::sin(bounceAngle)).normalized() * currentBallSpeed_;
        ballVel_.x = -std::abs(ballVel_.x);
    }
}

void PongGame::scorePoint(int player) {
    scores_[player]++;
    Logger::game("Player {} scores! ({} - {})", player + 1, scores_[0], scores_[1]);

    if (scores_[player] >= WINNING_SCORE) {
        gameOver_ = true;
        winner_ = player;
        Logger::game("Player {} wins!", player + 1);
    } else {
        resetBall();
    }
}

void PongGame::handleInput(int playerId, const json& input) {
    if (playerId < 0 || playerId > 1) return;

    std::string direction = input.value("direction", "");

    if (direction == "up") {
        paddles_[playerId].direction = -1;
    } else if (direction == "down") {
        paddles_[playerId].direction = 1;
    } else if (direction == "stop") {
        paddles_[playerId].direction = 0;
    }
}

json PongGame::getState() const {
    return {
        {"ball", {{"x", ballPos_.x}, {"y", ballPos_.y}}},
        {"paddles", {{{"y", paddles_[0].y}}, {{"y", paddles_[1].y}}}},
        {"scores", {scores_[0], scores_[1]}},
        {"gameOver", gameOver_},
        {"winner", winner_},
        {"config", {
            {"canvasWidth", CANVAS_WIDTH},
            {"canvasHeight", CANVAS_HEIGHT},
            {"paddleWidth", PADDLE_WIDTH},
            {"paddleHeight", PADDLE_HEIGHT},
            {"paddleMargin", PADDLE_MARGIN},
            {"ballRadius", BALL_RADIUS}
        }}
    };
}

bool PongGame::isOver() const {
    return gameOver_;
}
