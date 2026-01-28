// Snake game renderer
const SnakeRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
    },

    setupInput() {
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                'ArrowUp': 'up', 'w': 'up',
                'ArrowDown': 'down', 's': 'down',
                'ArrowLeft': 'left', 'a': 'left',
                'ArrowRight': 'right', 'd': 'right'
            };

            if (keyMap[e.key]) {
                e.preventDefault();
                socket.send('input', { direction: keyMap[e.key] });
            }
        });
    },

    updateState(state) {
        this.state = state;
        this.config = state.config;

        const width = this.config.gridWidth * this.config.cellSize;
        const height = this.config.gridHeight * this.config.cellSize;

        if (this.canvas.width !== width) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        this.render();
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const cellSize = cfg.cellSize;

        // Clear
        ctx.fillStyle = '#161b22';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid
        ctx.strokeStyle = '#21262d';
        for (let x = 0; x <= cfg.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, this.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= cfg.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(this.canvas.width, y * cellSize);
            ctx.stroke();
        }

        // Food
        ctx.fillStyle = '#f85149';
        this.state.food.forEach(f => {
            ctx.beginPath();
            ctx.arc(f.x * cellSize + cellSize / 2, f.y * cellSize + cellSize / 2, cellSize / 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Snakes
        this.state.snakes.forEach((snake, index) => {
            if (!snake.alive && snake.body.length === 0) return;

            ctx.fillStyle = snake.alive ? snake.color : '#4a4a4a';

            snake.body.forEach((seg, i) => {
                const size = i === 0 ? cellSize - 2 : cellSize - 4;
                const offset = i === 0 ? 1 : 2;
                ctx.fillRect(seg.x * cellSize + offset, seg.y * cellSize + offset, size, size);
            });

            // Eyes on head
            if (snake.body.length > 0 && snake.alive) {
                const head = snake.body[0];
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(head.x * cellSize + cellSize / 3, head.y * cellSize + cellSize / 3, 3, 0, Math.PI * 2);
                ctx.arc(head.x * cellSize + 2 * cellSize / 3, head.y * cellSize + cellSize / 3, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Scores
        ctx.fillStyle = '#f0f6fc';
        ctx.font = '16px sans-serif';
        this.state.snakes.forEach((snake, i) => {
            if (snake.body.length > 0) {
                ctx.fillStyle = snake.color;
                ctx.fillText(`P${i + 1}: ${snake.score}`, 10 + i * 100, 25);
            }
        });

        // Game over
        if (this.state.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.fillStyle = '#f0f6fc';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';

            let text = 'Game Over!';
            if (this.state.winner >= 0) {
                text = this.state.winner === App.playerIndex ? 'You Win!' : `Player ${this.state.winner + 1} Wins!`;
            }
            ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);

            ctx.font = '24px sans-serif';
            const myScore = this.state.snakes[App.playerIndex]?.score || 0;
            ctx.fillText(`Your Score: ${myScore}`, this.canvas.width / 2, this.canvas.height / 2 + 40);
            ctx.textAlign = 'left';
        }
    },

    cleanup() {}
};
