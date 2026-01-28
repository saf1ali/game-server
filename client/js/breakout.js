// Breakout - Single Player (Pure JavaScript, no server needed)
const BreakoutGame = {
    canvas: null,
    ctx: null,
    running: false,
    paused: false,
    gameOver: false,
    won: false,

    // Game config
    config: {
        width: 800,
        height: 600,
        paddleWidth: 100,
        paddleHeight: 15,
        paddleSpeed: 8,
        ballRadius: 8,
        ballSpeed: 5,
        brickRows: 5,
        brickCols: 10,
        brickWidth: 70,
        brickHeight: 25,
        brickPadding: 8,
        brickOffsetTop: 60,
        brickOffsetLeft: 35
    },

    // Game state
    paddle: { x: 0, y: 0 },
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    bricks: [],
    score: 0,
    lives: 3,
    level: 1,
    highScore: 0,

    // Input
    keys: { left: false, right: false },
    mouseX: null,

    // Colors for brick rows
    brickColors: ['#ff2a6d', '#ff6b35', '#f9f002', '#05ffa1', '#05d9e8'],

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;

        this.loadHighScore();
        this.setupInput();
        this.reset();
        this.running = true;
        this.gameLoop();
    },

    loadHighScore() {
        const saves = JSON.parse(localStorage.getItem('gameSaves') || '{}');
        this.highScore = saves.breakout?.highScore || 0;
    },

    saveHighScore() {
        const saves = JSON.parse(localStorage.getItem('gameSaves') || '{}');
        saves.breakout = { highScore: this.highScore, timestamp: Date.now() };
        localStorage.setItem('gameSaves', JSON.stringify(saves));
    },

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
            if (e.key === 'Escape' || e.key === 'p') this.togglePause();
            if (e.key === ' ' && (this.gameOver || this.won)) this.reset();
            e.preventDefault();
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        });

        this.canvas.addEventListener('click', () => {
            if (this.gameOver || this.won) this.reset();
        });
    },

    togglePause() {
        if (!this.gameOver && !this.won) {
            this.paused = !this.paused;
        }
    },

    reset() {
        const cfg = this.config;

        // Reset paddle
        this.paddle.x = (cfg.width - cfg.paddleWidth) / 2;
        this.paddle.y = cfg.height - 40;

        // Reset ball
        this.resetBall();

        // Create bricks
        this.createBricks();

        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.won = false;
        this.paused = false;
    },

    resetBall() {
        const cfg = this.config;
        this.ball.x = cfg.width / 2;
        this.ball.y = cfg.height - 60;

        // Random angle between -45 and 45 degrees, going up
        const angle = (Math.random() - 0.5) * Math.PI / 2 - Math.PI / 2;
        this.ball.vx = Math.cos(angle) * cfg.ballSpeed;
        this.ball.vy = Math.sin(angle) * cfg.ballSpeed;
    },

    createBricks() {
        const cfg = this.config;
        this.bricks = [];

        for (let row = 0; row < cfg.brickRows; row++) {
            for (let col = 0; col < cfg.brickCols; col++) {
                this.bricks.push({
                    x: col * (cfg.brickWidth + cfg.brickPadding) + cfg.brickOffsetLeft,
                    y: row * (cfg.brickHeight + cfg.brickPadding) + cfg.brickOffsetTop,
                    width: cfg.brickWidth,
                    height: cfg.brickHeight,
                    color: this.brickColors[row % this.brickColors.length],
                    alive: true,
                    points: (cfg.brickRows - row) * 10
                });
            }
        }
    },

    update() {
        if (this.paused || this.gameOver || this.won) return;

        const cfg = this.config;

        // Move paddle with keyboard
        if (this.keys.left) {
            this.paddle.x -= cfg.paddleSpeed;
        }
        if (this.keys.right) {
            this.paddle.x += cfg.paddleSpeed;
        }

        // Move paddle with mouse
        if (this.mouseX !== null) {
            this.paddle.x = this.mouseX - cfg.paddleWidth / 2;
        }

        // Clamp paddle position
        this.paddle.x = Math.max(0, Math.min(cfg.width - cfg.paddleWidth, this.paddle.x));

        // Move ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Ball wall collision
        if (this.ball.x - cfg.ballRadius < 0 || this.ball.x + cfg.ballRadius > cfg.width) {
            this.ball.vx *= -1;
            this.ball.x = Math.max(cfg.ballRadius, Math.min(cfg.width - cfg.ballRadius, this.ball.x));
        }

        // Ball ceiling collision
        if (this.ball.y - cfg.ballRadius < 0) {
            this.ball.vy *= -1;
            this.ball.y = cfg.ballRadius;
        }

        // Ball floor - lose life
        if (this.ball.y + cfg.ballRadius > cfg.height) {
            this.lives--;
            if (this.lives <= 0) {
                this.gameOver = true;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveHighScore();
                }
            } else {
                this.resetBall();
            }
        }

        // Ball paddle collision
        if (this.ball.y + cfg.ballRadius > this.paddle.y &&
            this.ball.y - cfg.ballRadius < this.paddle.y + cfg.paddleHeight &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + cfg.paddleWidth) {

            // Calculate hit position (-1 to 1)
            const hitPos = (this.ball.x - this.paddle.x - cfg.paddleWidth / 2) / (cfg.paddleWidth / 2);

            // Reflect with angle based on hit position
            const angle = hitPos * Math.PI / 3; // Max 60 degree angle
            const speed = Math.sqrt(this.ball.vx * this.ball.vx + this.ball.vy * this.ball.vy);

            this.ball.vx = Math.sin(angle) * speed;
            this.ball.vy = -Math.abs(Math.cos(angle) * speed);
            this.ball.y = this.paddle.y - cfg.ballRadius;
        }

        // Ball brick collision
        for (const brick of this.bricks) {
            if (!brick.alive) continue;

            if (this.ball.x + cfg.ballRadius > brick.x &&
                this.ball.x - cfg.ballRadius < brick.x + brick.width &&
                this.ball.y + cfg.ballRadius > brick.y &&
                this.ball.y - cfg.ballRadius < brick.y + brick.height) {

                brick.alive = false;
                this.score += brick.points;

                // Determine collision side
                const overlapLeft = this.ball.x + cfg.ballRadius - brick.x;
                const overlapRight = brick.x + brick.width - (this.ball.x - cfg.ballRadius);
                const overlapTop = this.ball.y + cfg.ballRadius - brick.y;
                const overlapBottom = brick.y + brick.height - (this.ball.y - cfg.ballRadius);

                const minOverlapX = Math.min(overlapLeft, overlapRight);
                const minOverlapY = Math.min(overlapTop, overlapBottom);

                if (minOverlapX < minOverlapY) {
                    this.ball.vx *= -1;
                } else {
                    this.ball.vy *= -1;
                }

                break; // Only hit one brick per frame
            }
        }

        // Check win condition
        if (this.bricks.every(b => !b.alive)) {
            this.won = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveHighScore();
            }
        }
    },

    render() {
        const ctx = this.ctx;
        const cfg = this.config;

        // Background
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, cfg.width, cfg.height);

        // Draw bricks
        for (const brick of this.bricks) {
            if (!brick.alive) continue;

            // Brick with glow
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = brick.color;
            ctx.fillRect(brick.x, brick.y, brick.width, brick.height);

            // Brick highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(brick.x, brick.y, brick.width, 4);
        }

        ctx.shadowBlur = 0;

        // Draw paddle
        const paddleGradient = ctx.createLinearGradient(
            this.paddle.x, 0, this.paddle.x + cfg.paddleWidth, 0
        );
        paddleGradient.addColorStop(0, '#05d9e8');
        paddleGradient.addColorStop(1, '#d300c5');
        ctx.fillStyle = paddleGradient;
        ctx.fillRect(this.paddle.x, this.paddle.y, cfg.paddleWidth, cfg.paddleHeight);

        // Draw ball with glow
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, cfg.ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw UI
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.fillStyle = '#05d9e8';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 20, 30);

        ctx.textAlign = 'center';
        ctx.fillText(`HIGH: ${this.highScore}`, cfg.width / 2, 30);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ff2a6d';
        ctx.fillText(`LIVES: ${'●'.repeat(this.lives)}`, cfg.width - 20, 30);

        // Pause overlay
        if (this.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, cfg.width, cfg.height);

            ctx.fillStyle = '#05d9e8';
            ctx.font = 'bold 48px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', cfg.width / 2, cfg.height / 2);

            ctx.font = '20px Rajdhani, sans-serif';
            ctx.fillStyle = '#8a8a8a';
            ctx.fillText('Press ESC or P to resume', cfg.width / 2, cfg.height / 2 + 40);
        }

        // Game over overlay
        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, cfg.width, cfg.height);

            ctx.fillStyle = '#ff2a6d';
            ctx.font = 'bold 48px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', cfg.width / 2, cfg.height / 2 - 30);

            ctx.fillStyle = '#05d9e8';
            ctx.font = '28px Rajdhani, sans-serif';
            ctx.fillText(`Final Score: ${this.score}`, cfg.width / 2, cfg.height / 2 + 20);

            ctx.font = '20px Rajdhani, sans-serif';
            ctx.fillStyle = '#8a8a8a';
            ctx.fillText('Click or press SPACE to play again', cfg.width / 2, cfg.height / 2 + 60);
        }

        // Win overlay
        if (this.won) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, cfg.width, cfg.height);

            ctx.fillStyle = '#05ffa1';
            ctx.font = 'bold 48px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOU WIN!', cfg.width / 2, cfg.height / 2 - 30);

            ctx.fillStyle = '#05d9e8';
            ctx.font = '28px Rajdhani, sans-serif';
            ctx.fillText(`Score: ${this.score}`, cfg.width / 2, cfg.height / 2 + 20);

            ctx.font = '20px Rajdhani, sans-serif';
            ctx.fillStyle = '#8a8a8a';
            ctx.fillText('Click or press SPACE to play again', cfg.width / 2, cfg.height / 2 + 60);
        }
    },

    gameLoop() {
        if (!this.running) return;

        this.update();
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    },

    cleanup() {
        this.running = false;
        this.keys = { left: false, right: false };
        this.mouseX = null;
        this.gameOver = false;
        this.won = false;
        this.paused = false;

        // Clear the canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};
