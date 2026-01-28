// Connect Four renderer
const Connect4Renderer = {
    canvas: null,
    ctx: null,
    state: null,
    hoveredCol: -1,
    config: {
        cellSize: 80,
        padding: 10,
        discRadius: 32
    },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
        this.startRenderLoop();
    },

    setupInput() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.state) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const col = Math.floor(x / this.config.cellSize);
            this.hoveredCol = (col >= 0 && col < 7) ? col : -1;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCol = -1;
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.state || this.state.gameOver) return;
            if (this.state.currentPlayer !== App.playerIndex) return;

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const col = Math.floor(x / this.config.cellSize);

            if (col >= 0 && col < 7) {
                socket.send('input', { col });
            }
        });
    },

    startRenderLoop() {
        const render = () => {
            this.render();
            if (this.canvas.parentElement) {
                requestAnimationFrame(render);
            }
        };
        requestAnimationFrame(render);
    },

    updateState(state) {
        this.state = state;

        // Set canvas size based on board
        const cols = state.config?.cols || 7;
        const rows = state.config?.rows || 6;
        this.canvas.width = cols * this.config.cellSize;
        this.canvas.height = (rows + 1) * this.config.cellSize; // +1 for preview row
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const board = this.state.board;
        const cols = 7;
        const rows = 6;

        // Background
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board background (blue)
        ctx.fillStyle = '#1a3a8a';
        ctx.fillRect(0, cfg.cellSize, cols * cfg.cellSize, rows * cfg.cellSize);

        // Draw preview disc (hovering)
        if (this.hoveredCol >= 0 && !this.state.gameOver &&
            this.state.currentPlayer === App.playerIndex) {
            const previewX = this.hoveredCol * cfg.cellSize + cfg.cellSize / 2;
            const previewY = cfg.cellSize / 2;
            const color = App.playerIndex === 0 ? '#ff2a6d' : '#f9f002';

            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(previewX, previewY, cfg.discRadius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Draw cells and discs
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * cfg.cellSize + cfg.cellSize / 2;
                const y = (row + 1) * cfg.cellSize + cfg.cellSize / 2;

                // Draw hole/disc
                ctx.beginPath();
                ctx.arc(x, y, cfg.discRadius, 0, Math.PI * 2);

                const cell = board[row][col];
                if (cell === 0) {
                    // Empty hole
                    ctx.fillStyle = '#0a0a14';
                } else if (cell === 1) {
                    // Player 1 - Red/Pink
                    ctx.fillStyle = '#ff2a6d';
                    ctx.shadowColor = '#ff2a6d';
                    ctx.shadowBlur = 15;
                } else {
                    // Player 2 - Yellow
                    ctx.fillStyle = '#f9f002';
                    ctx.shadowColor = '#f9f002';
                    ctx.shadowBlur = 15;
                }
                ctx.fill();
                ctx.shadowBlur = 0;

                // Add shine to discs
                if (cell !== 0) {
                    ctx.beginPath();
                    ctx.arc(x - 8, y - 8, cfg.discRadius * 0.3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fill();
                }
            }
        }

        // Highlight last move
        if (this.state.lastCol >= 0 && this.state.lastRow >= 0) {
            const x = this.state.lastCol * cfg.cellSize + cfg.cellSize / 2;
            const y = (this.state.lastRow + 1) * cfg.cellSize + cfg.cellSize / 2;

            ctx.beginPath();
            ctx.arc(x, y, cfg.discRadius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#05d9e8';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw column hover highlight
        if (this.hoveredCol >= 0 && !this.state.gameOver &&
            this.state.currentPlayer === App.playerIndex) {
            ctx.fillStyle = 'rgba(5, 217, 232, 0.1)';
            ctx.fillRect(
                this.hoveredCol * cfg.cellSize,
                cfg.cellSize,
                cfg.cellSize,
                rows * cfg.cellSize
            );
        }

        // Draw turn indicator
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.textAlign = 'center';

        if (!this.state.gameOver) {
            const isMyTurn = this.state.currentPlayer === App.playerIndex;
            ctx.fillStyle = isMyTurn ? '#05ffa1' : '#8a8a8a';
            ctx.fillText(
                isMyTurn ? 'Your Turn' : 'Opponent\'s Turn',
                this.canvas.width / 2,
                30
            );
        }

        // Draw game over overlay
        if (this.state.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.font = 'bold 36px Orbitron, sans-serif';
            ctx.textAlign = 'center';

            if (this.state.winner === -1) {
                ctx.fillStyle = '#f9f002';
                ctx.fillText('Draw!', this.canvas.width / 2, this.canvas.height / 2);
            } else if (this.state.winner === App.playerIndex) {
                ctx.fillStyle = '#05ffa1';
                ctx.fillText('You Win!', this.canvas.width / 2, this.canvas.height / 2);
            } else {
                ctx.fillStyle = '#ff2a6d';
                ctx.fillText('You Lose!', this.canvas.width / 2, this.canvas.height / 2);
            }
        }
    },

    cleanup() {
        this.hoveredCol = -1;
        this.state = null;

        // Clear the canvas
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};
