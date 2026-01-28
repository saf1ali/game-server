#pragma once

#include "Game.hpp"
#include "../physics/Vector2.hpp"
#include "../physics/Collision.hpp"

/**
 * Classic Pong game for 2 players.
 * First to 10 points wins.
 */
class PongGame : public Game {
public:
    PongGame();

    void start() override;
    void update(float deltaTime) override;
    void handleInput(int playerId, const json& input) override;
    json getState() const override;
    bool isOver() const override;
    std::string getType() const override { return "pong"; }
    int getMinPlayers() const override { return 2; }
    int getMaxPlayers() const override { return 2; }

private:
    void resetBall();
    void checkPaddleCollision();
    void checkWallCollision();
    void scorePoint(int player);

    // Game constants
    static constexpr float CANVAS_WIDTH = 800.0f;
    static constexpr float CANVAS_HEIGHT = 600.0f;
    static constexpr float PADDLE_WIDTH = 15.0f;
    static constexpr float PADDLE_HEIGHT = 100.0f;
    static constexpr float PADDLE_MARGIN = 30.0f;
    static constexpr float PADDLE_SPEED = 400.0f;
    static constexpr float BALL_RADIUS = 10.0f;
    static constexpr float BALL_SPEED = 400.0f;
    static constexpr float BALL_SPEED_INCREASE = 1.05f;
    static constexpr int WINNING_SCORE = 10;

    struct Paddle {
        float y;
        int direction;
    };

    Paddle paddles_[2];
    int scores_[2];
    Vector2 ballPos_;
    Vector2 ballVel_;
    float currentBallSpeed_;
    bool gameOver_;
    int winner_;
};
