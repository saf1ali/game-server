// Breakout Arcade - Enhanced Single Player Game
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
        brickOffsetLeft: 35,
        maxLives: 5,
        dropSpeed: 3,
        bricksPerNewRow: 6,
        dangerZoneRows: 2,
        dropChances: {
            multiball: 0.12,
            extraLife: 0.06,
            bomb: 0.10
        }
    },

    // Game state
    paddle: { x: 0, y: 0 },
    balls: [],
    bricks: [],
    drops: [],
    particles: [],
    score: 0,
    lives: 3,
    level: 1,
    highScore: 0,
    paddleHits: 0,
    rowColorIndex: 0,
    bombActive: false,
    dangerFlash: 0,

    // Input
    keys: { left: false, right: false },
    mouseX: null,

    // Colors for brick rows
    brickColors: ['#ff2a6d', '#ff6b35', '#f9f002', '#05ffa1', '#05d9e8', '#d300c5', '#7b2cbf'],

    // Drop type definitions
    dropTypes: {
        multiball: { color: '#00ffff', symbol: '⚪', name: 'MULTI' },
        extraLife: { color: '#ff2a6d', symbol: '❤', name: '+LIFE' },
        bomb: { color: '#ffa500', symbol: '💣', name: 'BOMB' }
    },

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
        this.keydownHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = true;
            if (e.key === 'Escape' || e.key === 'p') this.togglePause();
            if (e.key === ' ' && (this.gameOver || this.won)) this.reset();
            e.preventDefault();
        };

        this.keyupHandler = (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'a') this.keys.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') this.keys.right = false;
        };

        this.mousemoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
        };

        this.clickHandler = () => {
            if (this.gameOver || this.won) this.reset();
        };

        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
        this.canvas.addEventListener('mousemove', this.mousemoveHandler);
        this.canvas.addEventListener('click', this.clickHandler);
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

        // Reset balls
        this.balls = [];
        this.resetBall();

        // Reset drops and particles
        this.drops = [];
        this.particles = [];

        // Create bricks
        this.rowColorIndex = 0;
        this.createBricks();

        this.score = 0;
        this.lives = 3;
        this.paddleHits = 0;
        this.bombActive = false;
        this.dangerFlash = 0;
        this.gameOver = false;
        this.won = false;
        this.paused = false;
    },

    resetBall() {
        const cfg = this.config;

        // Random angle between -45 and 45 degrees, going up
        const angle = (Math.random() - 0.5) * Math.PI / 2 - Math.PI / 2;

        this.balls.push({
            x: cfg.width / 2,
            y: cfg.height - 60,
            vx: Math.cos(angle) * cfg.ballSpeed,
            vy: Math.sin(angle) * cfg.ballSpeed,
            active: true
        });
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
                    points: (cfg.brickRows - row) * 10,
                    destroying: false,
                    destroyTimer: 0
                });
            }
        }
        this.rowColorIndex = cfg.brickRows;
    },

    addBrickRowFromTop() {
        const cfg = this.config;

        // Shift all existing bricks down
        const shiftAmount = cfg.brickHeight + cfg.brickPadding;
        for (const brick of this.bricks) {
            brick.y += shiftAmount;
        }

        // Add new row at top
        const color = this.brickColors[this.rowColorIndex % this.brickColors.length];
        this.rowColorIndex++;

        for (let col = 0; col < cfg.brickCols; col++) {
            this.bricks.push({
                x: col * (cfg.brickWidth + cfg.brickPadding) + cfg.brickOffsetLeft,
                y: cfg.brickOffsetTop,
                width: cfg.brickWidth,
                height: cfg.brickHeight,
                color: color,
                alive: true,
                points: 50,
                destroying: false,
                destroyTimer: 0
            });
        }
    },

    deleteBottomBrickRow() {
        // Find the lowest Y position of alive bricks
        const aliveBricks = this.bricks.filter(b => b.alive && !b.destroying);
        if (aliveBricks.length === 0) return;

        const maxY = Math.max(...aliveBricks.map(b => b.y));

        // Mark bottom row for animated destruction
        for (const brick of this.bricks) {
            if (brick.alive && !brick.destroying && brick.y === maxY) {
                brick.destroying = true;
                brick.destroyTimer = 15;
                this.spawnParticles(brick);
            }
        }
    },

    checkDangerZone() {
        const cfg = this.config;
        const dangerY = this.paddle.y - (cfg.brickHeight * cfg.dangerZoneRows);

        const aliveBricks = this.bricks.filter(b => b.alive && !b.destroying);
        if (aliveBricks.length === 0) return;

        const lowestBrickBottom = Math.max(...aliveBricks.map(b => b.y + b.height));

        if (lowestBrickBottom > dangerY) {
            this.lives--;
            this.dangerFlash = 20;
            this.deleteBottomBrickRow();

            if (this.lives <= 0) {
                this.gameOver = true;
                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    this.saveHighScore();
                }
            }
        }
    },

    spawnDrop(brick) {
        const cfg = this.config;
        const rand = Math.random();

        let type = null;
        let cumulative = 0;

        cumulative += cfg.dropChances.multiball;
        if (rand < cumulative) type = 'multiball';

        cumulative += cfg.dropChances.extraLife;
        if (!type && rand < cumulative) type = 'extraLife';

        cumulative += cfg.dropChances.bomb;
        if (!type && rand < cumulative) type = 'bomb';

        if (type) {
            this.drops.push({
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                type: type,
                active: true
            });
        }
    },

    collectDrop(drop) {
        const cfg = this.config;

        switch (drop.type) {
            case 'multiball':
                this.addMultiBalls();
                break;
            case 'extraLife':
                if (this.lives < cfg.maxLives) {
                    this.lives++;
                }
                break;
            case 'bomb':
                this.bombActive = true;
                break;
        }
    },

    addMultiBalls() {
        const cfg = this.config;

        // Spawn 3 new balls from paddle center
        for (let i = 0; i < 3; i++) {
            const angle = (Math.random() - 0.5) * Math.PI / 2 - Math.PI / 2;
            this.balls.push({
                x: this.paddle.x + cfg.paddleWidth / 2,
                y: this.paddle.y - cfg.ballRadius - 5,
                vx: Math.cos(angle) * cfg.ballSpeed,
                vy: Math.sin(angle) * cfg.ballSpeed,
                active: true
            });
        }
    },

    detonateBomb(hitBrick) {
        // Find distance helper
        const distance = (b1, b2) => {
            const dx = (b1.x + b1.width / 2) - (b2.x + b2.width / 2);
            const dy = (b1.y + b1.height / 2) - (b2.y + b2.height / 2);
            return Math.sqrt(dx * dx + dy * dy);
        };

        // Find up to 5 closest alive bricks
        const adjacent = this.bricks
            .filter(b => b.alive && !b.destroying && b !== hitBrick)
            .map(b => ({ brick: b, dist: distance(hitBrick, b) }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 5);

        // Destroy them
        for (const { brick } of adjacent) {
            brick.alive = false;
            this.spawnParticles(brick);
            this.score += brick.points;
        }

        this.bombActive = false;
    },

    spawnParticles(brick) {
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                color: brick.color,
                life: 25 + Math.random() * 10,
                size: 3 + Math.random() * 4
            });
        }
    },

    updateParticles() {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life--;
            p.size *= 0.95;
        }

        // Remove dead particles
        this.particles = this.particles.filter(p => p.life > 0 && p.size > 0.5);
    },

    updateDrops() {
        const cfg = this.config;

        for (const drop of this.drops) {
            if (!drop.active) continue;

            drop.y += cfg.dropSpeed;

            // Check paddle collision
            if (drop.y > this.paddle.y &&
                drop.y < this.paddle.y + cfg.paddleHeight &&
                drop.x > this.paddle.x &&
                drop.x < this.paddle.x + cfg.paddleWidth) {
                this.collectDrop(drop);
                drop.active = false;
            }

            // Remove if off screen
            if (drop.y > cfg.height) {
                drop.active = false;
            }
        }

        // Remove inactive drops
        this.drops = this.drops.filter(d => d.active);
    },

    updateBricks() {
        // Update destroying bricks
        for (const brick of this.bricks) {
            if (brick.destroying) {
                brick.destroyTimer--;
                if (brick.destroyTimer <= 0) {
                    brick.alive = false;
                    brick.destroying = false;
                }
            }
        }
    },

    update() {
        if (this.paused || this.gameOver || this.won) return;

        const cfg = this.config;

        // Decrease danger flash
        if (this.dangerFlash > 0) this.dangerFlash--;

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

        // Update all balls
        for (const ball of this.balls) {
            if (!ball.active) continue;

            // Move ball
            ball.x += ball.vx;
            ball.y += ball.vy;

            // Ball wall collision
            if (ball.x - cfg.ballRadius < 0 || ball.x + cfg.ballRadius > cfg.width) {
                ball.vx *= -1;
                ball.x = Math.max(cfg.ballRadius, Math.min(cfg.width - cfg.ballRadius, ball.x));
            }

            // Ball ceiling collision
            if (ball.y - cfg.ballRadius < 0) {
                ball.vy *= -1;
                ball.y = cfg.ballRadius;
            }

            // Ball floor - deactivate ball
            if (ball.y + cfg.ballRadius > cfg.height) {
                ball.active = false;
            }

            // Ball paddle collision
            if (ball.y + cfg.ballRadius > this.paddle.y &&
                ball.y - cfg.ballRadius < this.paddle.y + cfg.paddleHeight &&
                ball.x > this.paddle.x &&
                ball.x < this.paddle.x + cfg.paddleWidth &&
                ball.vy > 0) {  // Only count if ball is moving down

                // Calculate hit position (-1 to 1)
                const hitPos = (ball.x - this.paddle.x - cfg.paddleWidth / 2) / (cfg.paddleWidth / 2);

                // Reflect with angle based on hit position
                const angle = hitPos * Math.PI / 3; // Max 60 degree angle
                const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

                ball.vx = Math.sin(angle) * speed;
                ball.vy = -Math.abs(Math.cos(angle) * speed);
                ball.y = this.paddle.y - cfg.ballRadius;

                // Track paddle hits for new row spawning
                this.paddleHits++;
                if (this.paddleHits >= cfg.bricksPerNewRow) {
                    this.addBrickRowFromTop();
                    this.paddleHits = 0;
                }
            }

            // Ball brick collision
            for (const brick of this.bricks) {
                if (!brick.alive || brick.destroying) continue;

                if (ball.x + cfg.ballRadius > brick.x &&
                    ball.x - cfg.ballRadius < brick.x + brick.width &&
                    ball.y + cfg.ballRadius > brick.y &&
                    ball.y - cfg.ballRadius < brick.y + brick.height) {

                    // Handle bomb power-up
                    if (this.bombActive) {
                        brick.alive = false;
                        this.spawnParticles(brick);
                        this.score += brick.points;
                        this.detonateBomb(brick);
                    } else {
                        brick.alive = false;
                        this.spawnParticles(brick);
                        this.score += brick.points;

                        // Maybe spawn drop
                        this.spawnDrop(brick);
                    }

                    // Determine collision side for ball reflection
                    const overlapLeft = ball.x + cfg.ballRadius - brick.x;
                    const overlapRight = brick.x + brick.width - (ball.x - cfg.ballRadius);
                    const overlapTop = ball.y + cfg.ballRadius - brick.y;
                    const overlapBottom = brick.y + brick.height - (ball.y - cfg.ballRadius);

                    const minOverlapX = Math.min(overlapLeft, overlapRight);
                    const minOverlapY = Math.min(overlapTop, overlapBottom);

                    if (minOverlapX < minOverlapY) {
                        ball.vx *= -1;
                    } else {
                        ball.vy *= -1;
                    }

                    break; // Only hit one brick per frame per ball
                }
            }
        }

        // Check if all balls are lost
        const activeBalls = this.balls.filter(b => b.active);
        if (activeBalls.length === 0) {
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

        // Update drops
        this.updateDrops();

        // Update particles
        this.updateParticles();

        // Update destroying bricks
        this.updateBricks();

        // Check danger zone
        this.checkDangerZone();

        // Check win condition (no more bricks)
        if (this.bricks.every(b => !b.alive)) {
            this.won = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveHighScore();
            }
        }
    },

    renderParticles() {
        const ctx = this.ctx;

        for (const p of this.particles) {
            const alpha = p.life / 35;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    renderDrops() {
        const ctx = this.ctx;

        for (const drop of this.drops) {
            const dropDef = this.dropTypes[drop.type];

            // Glow effect
            ctx.shadowColor = dropDef.color;
            ctx.shadowBlur = 15;

            // Drop circle
            ctx.fillStyle = dropDef.color;
            ctx.beginPath();
            ctx.arc(drop.x, drop.y, 15, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Symbol
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dropDef.symbol, drop.x, drop.y);
        }
    },

    render() {
        const ctx = this.ctx;
        const cfg = this.config;

        // Background
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, cfg.width, cfg.height);

        // Danger flash effect
        if (this.dangerFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.dangerFlash / 40})`;
            ctx.fillRect(0, 0, cfg.width, cfg.height);
        }

        // Draw particles (behind bricks)
        this.renderParticles();

        // Draw bricks
        for (const brick of this.bricks) {
            if (!brick.alive && !brick.destroying) continue;

            // Destroying animation
            let alpha = 1;
            let scale = 1;
            if (brick.destroying) {
                alpha = brick.destroyTimer / 15;
                scale = brick.destroyTimer / 15;
            }

            ctx.globalAlpha = alpha;

            const w = brick.width * scale;
            const h = brick.height * scale;
            const x = brick.x + (brick.width - w) / 2;
            const y = brick.y + (brick.height - h) / 2;

            // Brick with glow
            ctx.shadowColor = brick.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = brick.color;
            ctx.fillRect(x, y, w, h);

            // Brick highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x, y, w, 4 * scale);

            ctx.globalAlpha = 1;
        }

        ctx.shadowBlur = 0;

        // Draw drops
        this.renderDrops();

        // Draw paddle
        const paddleGradient = ctx.createLinearGradient(
            this.paddle.x, 0, this.paddle.x + cfg.paddleWidth, 0
        );
        paddleGradient.addColorStop(0, '#05d9e8');
        paddleGradient.addColorStop(1, '#d300c5');
        ctx.fillStyle = paddleGradient;
        ctx.fillRect(this.paddle.x, this.paddle.y, cfg.paddleWidth, cfg.paddleHeight);

        // Draw all balls with glow
        for (const ball of this.balls) {
            if (!ball.active) continue;

            ctx.shadowColor = this.bombActive ? '#ffa500' : '#fff';
            ctx.shadowBlur = 15;
            ctx.fillStyle = this.bombActive ? '#ffa500' : '#fff';
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, cfg.ballRadius, 0, Math.PI * 2);
            ctx.fill();
        }
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
        ctx.fillText(`LIVES: ${'❤'.repeat(this.lives)}`, cfg.width - 20, 30);

        // Bomb indicator
        if (this.bombActive) {
            ctx.fillStyle = '#ffa500';
            ctx.textAlign = 'left';
            ctx.fillText('💣 BOMB READY!', 20, 55);
        }

        // Ball count indicator (if multiple) - show bottom left to avoid covering bricks
        const activeBalls = this.balls.filter(b => b.active).length;
        if (activeBalls > 1) {
            ctx.fillStyle = '#05ffa1';
            ctx.textAlign = 'left';
            ctx.fillText(`BALLS: ${activeBalls}`, 20, cfg.height - 60);
        }

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
        this.balls = [];
        this.drops = [];
        this.particles = [];

        // Remove event listeners
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        if (this.keyupHandler) {
            document.removeEventListener('keyup', this.keyupHandler);
        }
        if (this.mousemoveHandler && this.canvas) {
            this.canvas.removeEventListener('mousemove', this.mousemoveHandler);
        }
        if (this.clickHandler && this.canvas) {
            this.canvas.removeEventListener('click', this.clickHandler);
        }

        // Clear the canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};
