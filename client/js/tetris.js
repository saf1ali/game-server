// Tetris game renderer - Clean code with proper states
const TetrisRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,
    keysPressed: new Set(),

    // Tetromino colors matching server
    COLORS: ['#00f5ff', '#ffff00', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'],

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
    },

    setupInput() {
        const keyActions = {
            'ArrowLeft': 'left',
            'a': 'left',
            'ArrowRight': 'right',
            'd': 'right',
            'ArrowUp': 'rotate_cw',
            'w': 'rotate_cw',
            'z': 'rotate_ccw',
            ' ': 'hard_drop'
        };

        document.addEventListener('keydown', (e) => {
            // Soft drop start
            if (e.key === 'ArrowDown' || e.key === 's') {
                e.preventDefault();
                if (!this.keysPressed.has('softdrop')) {
                    this.keysPressed.add('softdrop');
                    socket.send('input', { action: 'soft_drop_start' });
                }
                return;
            }

            const action = keyActions[e.key];
            if (action) {
                e.preventDefault();
                socket.send('input', { action });
            }
        });

        document.addEventListener('keyup', (e) => {
            // Soft drop end
            if (e.key === 'ArrowDown' || e.key === 's') {
                e.preventDefault();
                this.keysPressed.delete('softdrop');
                socket.send('input', { action: 'soft_drop_end' });
            }
        });
    },

    updateState(state) {
        this.state = state;
        this.config = state.config;

        // Calculate canvas size based on players
        const playerCount = state.players.length;
        const boardWidth = this.config.boardWidth * this.config.cellSize;
        const boardHeight = this.config.boardHeight * this.config.cellSize;
        const sidebarWidth = 120;
        const padding = 20;

        const totalWidth = (boardWidth + sidebarWidth + padding) * playerCount;
        const totalHeight = boardHeight + 60;

        if (this.canvas.width !== totalWidth) {
            this.canvas.width = totalWidth;
            this.canvas.height = totalHeight;
        }

        this.render();
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const cellSize = cfg.cellSize;
        const boardWidth = cfg.boardWidth * cellSize;
        const boardHeight = cfg.boardHeight * cellSize;
        const sidebarWidth = 120;

        // Clear canvas
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render each player's board
        this.state.players.forEach((player, index) => {
            const offsetX = index * (boardWidth + sidebarWidth + 20) + 10;
            const offsetY = 50;

            this.renderPlayerBoard(player, index, offsetX, offsetY);
        });
    },

    renderPlayerBoard(player, playerIndex, offsetX, offsetY) {
        const ctx = this.ctx;
        const cfg = this.config;
        const cellSize = cfg.cellSize;
        const boardWidth = cfg.boardWidth * cellSize;
        const boardHeight = cfg.boardHeight * cellSize;

        // Player label
        ctx.fillStyle = playerIndex === App.playerIndex ? '#58a6ff' : '#8b949e';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(playerIndex === App.playerIndex ? 'You' : `Player ${playerIndex + 1}`, offsetX, offsetY - 10);

        // Board background
        ctx.fillStyle = '#161b22';
        ctx.fillRect(offsetX, offsetY, boardWidth, boardHeight);

        // Grid lines (subtle)
        ctx.strokeStyle = '#21262d';
        ctx.lineWidth = 1;
        for (let x = 0; x <= cfg.boardWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(offsetX + x * cellSize, offsetY);
            ctx.lineTo(offsetX + x * cellSize, offsetY + boardHeight);
            ctx.stroke();
        }
        for (let y = 0; y <= cfg.boardHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + y * cellSize);
            ctx.lineTo(offsetX + boardWidth, offsetY + y * cellSize);
            ctx.stroke();
        }

        // Draw locked pieces
        player.board.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell > 0) {
                    this.drawCell(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, this.COLORS[cell - 1]);
                }
            });
        });

        // Draw current piece (ghost and active)
        if (player.piece && player.alive) {
            // Ghost piece (drop preview)
            let ghostY = player.pieceY;
            while (this.canPlacePiece(player, player.pieceX, ghostY + 1)) {
                ghostY++;
            }
            this.drawPiece(player.piece, offsetX + player.pieceX * cellSize, offsetY + ghostY * cellSize, cellSize, 0.3);

            // Active piece
            this.drawPiece(player.piece, offsetX + player.pieceX * cellSize, offsetY + player.pieceY * cellSize, cellSize, 1);
        }

        // Sidebar - Next piece and score
        const sideX = offsetX + boardWidth + 10;

        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('NEXT', sideX, offsetY + 15);

        // Next piece preview box
        ctx.fillStyle = '#161b22';
        ctx.fillRect(sideX, offsetY + 20, 80, 80);

        if (player.nextPiece >= 0) {
            const nextColor = this.COLORS[player.nextPiece];
            const previewSize = 16;
            const previewOffsetX = sideX + 10;
            const previewOffsetY = offsetY + 35;

            // Simple 4x4 preview
            for (let py = 0; py < 4; py++) {
                for (let px = 0; px < 4; px++) {
                    // Show filled cells for next piece (rotation 0)
                    const filled = this.getTetrominoShape(player.nextPiece, py, px);
                    if (filled) {
                        this.drawCell(previewOffsetX + px * previewSize, previewOffsetY + py * previewSize, previewSize, nextColor);
                    }
                }
            }
        }

        // Score
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('SCORE', sideX, offsetY + 120);
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(player.score.toLocaleString(), sideX, offsetY + 142);

        // Lines
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('LINES', sideX, offsetY + 170);
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(player.lines.toString(), sideX, offsetY + 192);

        // Level
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('LEVEL', sideX, offsetY + 220);
        ctx.fillStyle = '#58a6ff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(player.level.toString(), sideX, offsetY + 242);

        // Game over overlay
        if (!player.alive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(offsetX, offsetY, boardWidth, boardHeight);

            ctx.fillStyle = '#f85149';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', offsetX + boardWidth / 2, offsetY + boardHeight / 2);
            ctx.textAlign = 'left';
        }
    },

    drawCell(x, y, size, color) {
        const ctx = this.ctx;
        const padding = 1;

        // Main color
        ctx.fillStyle = color;
        ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);

        // Highlight (top-left)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + padding, y + padding, size - padding * 2, 3);
        ctx.fillRect(x + padding, y + padding, 3, size - padding * 2);

        // Shadow (bottom-right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + padding, y + size - padding - 3, size - padding * 2, 3);
        ctx.fillRect(x + size - padding - 3, y + padding, 3, size - padding * 2);
    },

    drawPiece(piece, x, y, cellSize, alpha) {
        const ctx = this.ctx;
        ctx.globalAlpha = alpha;

        piece.forEach((row, py) => {
            row.forEach((cell, px) => {
                if (cell > 0) {
                    this.drawCell(x + px * cellSize, y + py * cellSize, cellSize, this.COLORS[cell - 1]);
                }
            });
        });

        ctx.globalAlpha = 1;
    },

    canPlacePiece(player, pieceX, pieceY) {
        if (!player.piece) return false;

        for (let py = 0; py < 4; py++) {
            for (let px = 0; px < 4; px++) {
                if (player.piece[py][px] > 0) {
                    const boardX = pieceX + px;
                    const boardY = pieceY + py;

                    if (boardX < 0 || boardX >= this.config.boardWidth || boardY >= this.config.boardHeight) {
                        return false;
                    }
                    if (boardY >= 0 && player.board[boardY][boardX] > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    },

    // Simplified tetromino shapes for preview
    getTetrominoShape(type, row, col) {
        const shapes = [
            [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
            [[1,1,0,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]], // O
            [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // T
            [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]], // S
            [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]], // Z
            [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]], // J
            [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]]  // L
        ];
        return shapes[type]?.[row]?.[col] || 0;
    },

    cleanup() {
        this.keysPressed.clear();
    }
};
