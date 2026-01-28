// Pong game renderer - Enhanced with animations and juice
const PongRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,
    prevState: null,
    keysPressed: new Set(),
    lastRenderTime: 0,

    // Animation state
    paddleHits: [],
    ballTrail: [],
    scoreAnimations: [],
    goalFlash: null,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
        this.startAnimationLoop();
    },

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
                e.preventDefault();
                if (!this.keysPressed.has(e.key)) {
                    this.keysPressed.add(e.key);
                    this.sendInput();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (['ArrowUp', 'ArrowDown', 'w', 's'].includes(e.key)) {
                e.preventDefault();
                this.keysPressed.delete(e.key);
                this.sendInput();
            }
        });
    },

    sendInput() {
        let direction = 'stop';
        if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('w')) {
            direction = 'up';
        } else if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('s')) {
            direction = 'down';
        }
        socket.send('input', { direction });
    },

    startAnimationLoop() {
        const animate = (time) => {
            const deltaTime = time - this.lastRenderTime;
            this.lastRenderTime = time;

            this.updateAnimations(deltaTime);
            this.render();

            if (this.canvas.parentElement) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    },

    updateAnimations(deltaTime) {
        // Update paddle hit animations
        for (let i = this.paddleHits.length - 1; i >= 0; i--) {
            const hit = this.paddleHits[i];
            hit.age += deltaTime;
            hit.radius += deltaTime * 0.2;
            hit.alpha = 1 - (hit.age / hit.lifetime);

            if (hit.age >= hit.lifetime) {
                this.paddleHits.splice(i, 1);
            }
        }

        // Update ball trail
        if (this.state?.ball) {
            this.ballTrail.push({
                x: this.state.ball.x,
                y: this.state.ball.y,
                age: 0,
                maxAge: 150
            });

            // Limit trail length
            if (this.ballTrail.length > 15) {
                this.ballTrail.shift();
            }
        }

        // Age trail points
        for (let i = this.ballTrail.length - 1; i >= 0; i--) {
            this.ballTrail[i].age += deltaTime;
            if (this.ballTrail[i].age >= this.ballTrail[i].maxAge) {
                this.ballTrail.splice(i, 1);
            }
        }

        // Update score animations
        for (let i = this.scoreAnimations.length - 1; i >= 0; i--) {
            const anim = this.scoreAnimations[i];
            anim.age += deltaTime;
            anim.scale = 1 + Math.sin(anim.age / 100) * 0.3 * (1 - anim.age / anim.lifetime);
            anim.alpha = 1 - (anim.age / anim.lifetime);

            if (anim.age >= anim.lifetime) {
                this.scoreAnimations.splice(i, 1);
            }
        }

        // Update goal flash
        if (this.goalFlash) {
            this.goalFlash.age += deltaTime;
            this.goalFlash.alpha = 0.5 * (1 - this.goalFlash.age / this.goalFlash.lifetime);

            if (this.goalFlash.age >= this.goalFlash.lifetime) {
                this.goalFlash = null;
            }
        }

        Effects.updateAnimations(deltaTime);
        Effects.updateShake();
    },

    updateState(state) {
        // Detect paddle hits
        if (this.prevState && state.ball && this.prevState.ball) {
            const prevVx = this.prevState.ball.vx || 0;
            const currVx = state.ball.vx || 0;

            // Ball direction changed = paddle hit
            if (Math.sign(prevVx) !== Math.sign(currVx) && prevVx !== 0) {
                const hitX = currVx > 0 ? this.config.paddleMargin + this.config.paddleWidth :
                    this.config.canvasWidth - this.config.paddleMargin - this.config.paddleWidth;

                this.onPaddleHit(hitX, state.ball.y, currVx > 0 ? 0 : 1);
            }

            // Detect score change
            if (this.prevState.scores) {
                for (let i = 0; i < 2; i++) {
                    if (state.scores[i] > this.prevState.scores[i]) {
                        this.onGoal(i);
                    }
                }
            }
        }

        this.prevState = JSON.parse(JSON.stringify(state));
        this.state = state;
        this.config = state.config;

        if (!this.canvas.width || this.canvas.width !== this.config.canvasWidth) {
            this.canvas.width = this.config.canvasWidth;
            this.canvas.height = this.config.canvasHeight;
        }
    },

    onPaddleHit(x, y, paddleIndex) {
        // Ripple effect
        this.paddleHits.push({
            x,
            y,
            radius: 10,
            alpha: 1,
            age: 0,
            lifetime: 300,
            color: '#58a6ff'
        });

        // Particles
        Effects.createParticles(x, y, '#58a6ff', 8, {
            speed: 4,
            lifetime: 400,
            size: 3,
            spread: Math.PI
        });

        // Small screen shake
        Effects.triggerShake(3);

        // Flash paddle
        this.paddleHits.push({
            x: paddleIndex === 0 ? this.config.paddleMargin : this.config.canvasWidth - this.config.paddleMargin - this.config.paddleWidth,
            y: this.state.paddles[paddleIndex].y,
            isPaddleFlash: true,
            alpha: 1,
            age: 0,
            lifetime: 150
        });
    },

    onGoal(scoringPlayer) {
        // Big score animation
        const x = scoringPlayer === 0 ? this.config.canvasWidth / 4 : 3 * this.config.canvasWidth / 4;

        this.scoreAnimations.push({
            x,
            y: 60,
            value: this.state.scores[scoringPlayer],
            scale: 1,
            alpha: 1,
            age: 0,
            lifetime: 800,
            color: scoringPlayer === App.playerIndex ? '#3fb950' : '#f85149'
        });

        // Goal flash on scoring side
        this.goalFlash = {
            side: scoringPlayer === 0 ? 'left' : 'right',
            alpha: 0.5,
            age: 0,
            lifetime: 500,
            color: scoringPlayer === App.playerIndex ? '#3fb950' : '#f85149'
        };

        // Screen shake
        Effects.triggerShake(8);

        // Particles burst
        const burstX = scoringPlayer === 0 ? 50 : this.config.canvasWidth - 50;
        Effects.createParticles(burstX, this.config.canvasHeight / 2,
            scoringPlayer === App.playerIndex ? '#3fb950' : '#f85149',
            20, { speed: 8, lifetime: 600, size: 5 });
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;

        // Apply screen shake
        const shake = Effects.shake;
        ctx.save();
        ctx.translate(shake.x, shake.y);

        // Background with gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, cfg.canvasHeight);
        gradient.addColorStop(0, '#1a1f26');
        gradient.addColorStop(0.5, '#161b22');
        gradient.addColorStop(1, '#1a1f26');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);

        // Goal flash
        if (this.goalFlash) {
            ctx.save();
            ctx.globalAlpha = this.goalFlash.alpha;
            const flashGradient = ctx.createLinearGradient(
                this.goalFlash.side === 'left' ? 0 : cfg.canvasWidth,
                0,
                this.goalFlash.side === 'left' ? cfg.canvasWidth / 3 : 2 * cfg.canvasWidth / 3,
                0
            );
            flashGradient.addColorStop(0, this.goalFlash.color);
            flashGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = flashGradient;
            ctx.fillRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);
            ctx.restore();
        }

        // Center line with glow
        ctx.strokeStyle = '#30363d';
        ctx.setLineDash([15, 15]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cfg.canvasWidth / 2, 0);
        ctx.lineTo(cfg.canvasWidth / 2, cfg.canvasHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Center circle
        ctx.beginPath();
        ctx.arc(cfg.canvasWidth / 2, cfg.canvasHeight / 2, 50, 0, Math.PI * 2);
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Ball trail
        this.ballTrail.forEach((point, i) => {
            const alpha = (1 - point.age / point.maxAge) * 0.5;
            const size = cfg.ballRadius * (1 - point.age / point.maxAge) * 0.8;

            ctx.beginPath();
            ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240, 246, 252, ${alpha})`;
            ctx.fill();
        });

        // Paddle hit effects (ripples)
        this.paddleHits.filter(h => !h.isPaddleFlash).forEach(hit => {
            ctx.beginPath();
            ctx.arc(hit.x, hit.y, hit.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(88, 166, 255, ${hit.alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // Paddles with glow
        this.state.paddles.forEach((paddle, i) => {
            const paddleX = i === 0 ? cfg.paddleMargin : cfg.canvasWidth - cfg.paddleMargin - cfg.paddleWidth;

            // Check for flash
            const flash = this.paddleHits.find(h => h.isPaddleFlash && Math.abs(h.x - paddleX) < 20);

            if (flash) {
                // Glowing paddle
                ctx.shadowColor = '#58a6ff';
                ctx.shadowBlur = 20;
            }

            // Paddle gradient
            const paddleGradient = ctx.createLinearGradient(paddleX, 0, paddleX + cfg.paddleWidth, 0);
            if (i === 0) {
                paddleGradient.addColorStop(0, '#3d8bfd');
                paddleGradient.addColorStop(1, '#58a6ff');
            } else {
                paddleGradient.addColorStop(0, '#58a6ff');
                paddleGradient.addColorStop(1, '#3d8bfd');
            }

            ctx.fillStyle = paddleGradient;
            ctx.fillRect(paddleX, paddle.y, cfg.paddleWidth, cfg.paddleHeight);

            // Rounded corners effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(paddleX, paddle.y, cfg.paddleWidth, 5);

            ctx.shadowBlur = 0;
        });

        // Ball with glow
        ctx.shadowColor = '#f0f6fc';
        ctx.shadowBlur = 15;

        ctx.fillStyle = '#f0f6fc';
        ctx.beginPath();
        ctx.arc(this.state.ball.x, this.state.ball.y, cfg.ballRadius, 0, Math.PI * 2);
        ctx.fill();

        // Ball inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(this.state.ball.x - 2, this.state.ball.y - 2, cfg.ballRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Scores with animations
        ctx.font = 'bold 64px sans-serif';
        ctx.textAlign = 'center';

        // Check for score animations
        const scoreAnim0 = this.scoreAnimations.find(a => a.x < cfg.canvasWidth / 2);
        const scoreAnim1 = this.scoreAnimations.find(a => a.x > cfg.canvasWidth / 2);

        // Player 1 score
        ctx.save();
        if (scoreAnim0) {
            ctx.translate(cfg.canvasWidth / 4, 70);
            ctx.scale(scoreAnim0.scale, scoreAnim0.scale);
            ctx.translate(-cfg.canvasWidth / 4, -70);
            ctx.fillStyle = scoreAnim0.color;
            ctx.shadowColor = scoreAnim0.color;
            ctx.shadowBlur = 20;
        } else {
            ctx.fillStyle = App.playerIndex === 0 ? '#58a6ff' : '#8b949e';
        }
        ctx.fillText(this.state.scores[0], cfg.canvasWidth / 4, 80);
        ctx.restore();

        // Player 2 score
        ctx.save();
        if (scoreAnim1) {
            ctx.translate(3 * cfg.canvasWidth / 4, 70);
            ctx.scale(scoreAnim1.scale, scoreAnim1.scale);
            ctx.translate(-3 * cfg.canvasWidth / 4, -70);
            ctx.fillStyle = scoreAnim1.color;
            ctx.shadowColor = scoreAnim1.color;
            ctx.shadowBlur = 20;
        } else {
            ctx.fillStyle = App.playerIndex === 1 ? '#58a6ff' : '#8b949e';
        }
        ctx.fillText(this.state.scores[1], 3 * cfg.canvasWidth / 4, 80);
        ctx.restore();

        // Player labels
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(App.playerIndex === 0 ? 'You' : 'Opponent', cfg.canvasWidth / 4, 110);
        ctx.fillText(App.playerIndex === 1 ? 'You' : 'Opponent', 3 * cfg.canvasWidth / 4, 110);

        // Particles
        Effects.updateParticles(ctx, 16);

        // Game over
        if (this.state.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);

            const isWinner = this.state.winner === App.playerIndex;

            ctx.fillStyle = isWinner ? '#3fb950' : '#f85149';
            ctx.font = 'bold 48px sans-serif';
            ctx.shadowColor = isWinner ? '#3fb950' : '#f85149';
            ctx.shadowBlur = 20;
            ctx.fillText(isWinner ? 'You Win!' : 'You Lose!', cfg.canvasWidth / 2, cfg.canvasHeight / 2 - 20);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#f0f6fc';
            ctx.font = '28px sans-serif';
            ctx.fillText(`${this.state.scores[0]} - ${this.state.scores[1]}`, cfg.canvasWidth / 2, cfg.canvasHeight / 2 + 30);
        }

        ctx.restore();
    },

    cleanup() {
        this.keysPressed.clear();
        this.paddleHits = [];
        this.ballTrail = [];
        this.scoreAnimations = [];
        this.goalFlash = null;
        this.state = null;
        this.prevState = null;
        this.config = null;
        Effects.clear();
    },

    reset() {
        this.paddleHits = [];
        this.ballTrail = [];
        this.scoreAnimations = [];
        this.goalFlash = null;
        this.state = null;
        this.prevState = null;
        Effects.clear();
    }
};
