// Pong game renderer
const PongRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,
    keysPressed: new Set(),

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
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

    updateState(state) {
        this.state = state;
        this.config = state.config;

        if (!this.canvas.width || this.canvas.width !== this.config.canvasWidth) {
            this.canvas.width = this.config.canvasWidth;
            this.canvas.height = this.config.canvasHeight;
        }

        this.render();
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;

        // Clear
        ctx.fillStyle = '#161b22';
        ctx.fillRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);

        // Center line
        ctx.strokeStyle = '#30363d';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(cfg.canvasWidth / 2, 0);
        ctx.lineTo(cfg.canvasWidth / 2, cfg.canvasHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // Paddles
        ctx.fillStyle = '#58a6ff';
        ctx.fillRect(cfg.paddleMargin, this.state.paddles[0].y, cfg.paddleWidth, cfg.paddleHeight);
        ctx.fillRect(cfg.canvasWidth - cfg.paddleMargin - cfg.paddleWidth, this.state.paddles[1].y, cfg.paddleWidth, cfg.paddleHeight);

        // Ball
        ctx.fillStyle = '#f0f6fc';
        ctx.beginPath();
        ctx.arc(this.state.ball.x, this.state.ball.y, cfg.ballRadius, 0, Math.PI * 2);
        ctx.fill();

        // Scores
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.state.scores[0], cfg.canvasWidth / 4, 60);
        ctx.fillText(this.state.scores[1], 3 * cfg.canvasWidth / 4, 60);

        // Game over
        if (this.state.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);

            ctx.fillStyle = '#f0f6fc';
            ctx.font = 'bold 36px sans-serif';
            const winner = this.state.winner === App.playerIndex ? 'You Win!' : 'You Lose!';
            ctx.fillText(winner, cfg.canvasWidth / 2, cfg.canvasHeight / 2);

            ctx.font = '24px sans-serif';
            ctx.fillText(`${this.state.scores[0]} - ${this.state.scores[1]}`, cfg.canvasWidth / 2, cfg.canvasHeight / 2 + 40);
        }
    },

    cleanup() {
        this.keysPressed.clear();
    }
};
