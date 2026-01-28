// Tetris game renderer - Enhanced with animations and juice
const TetrisRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,
    prevState: null,
    keysPressed: new Set(),
    lastRenderTime: 0,

    // Animation state
    clearingLines: [],
    flashPhase: 0,
    lockParticles: [],
    scorePopups: [],

    // Tetromino colors matching server (with glow variants)
    COLORS: ['#00f5ff', '#ffff00', '#a000f0', '#00f000', '#f00000', '#0000f0', '#f0a000'],
    GLOW_COLORS: ['#00f5ff88', '#ffff0088', '#a000f088', '#00f00088', '#f0000088', '#0000f088', '#f0a00088'],

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
        this.startAnimationLoop();
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

                // Hard drop effect
                if (action === 'hard_drop') {
                    Effects.triggerShake(3);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowDown' || e.key === 's') {
                e.preventDefault();
                this.keysPressed.delete('softdrop');
                socket.send('input', { action: 'soft_drop_end' });
            }
        });
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
        // Update line clear animation
        if (this.clearingLines.length > 0) {
            this.flashPhase += deltaTime;

            // Flash twice over 400ms
            if (this.flashPhase > 400) {
                this.clearingLines = [];
                this.flashPhase = 0;
            }
        }

        // Update score popups
        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.age += deltaTime;
            popup.y -= 1;
            popup.alpha = 1 - (popup.age / popup.lifetime);

            if (popup.age >= popup.lifetime) {
                this.scorePopups.splice(i, 1);
            }
        }

        Effects.updateAnimations(deltaTime);
        Effects.updateShake();
    },

    updateState(state) {
        // Detect line clears
        if (this.prevState && state.players) {
            state.players.forEach((player, idx) => {
                const prev = this.prevState.players?.[idx];
                if (prev && player.lines > prev.lines) {
                    const linesCleared = player.lines - prev.lines;
                    this.onLinesCleared(idx, linesCleared, player.board);

                    // Score popup
                    const points = [0, 100, 300, 500, 800][linesCleared] || 0;
                    if (points > 0) {
                        this.addScorePopup(idx, `+${points}`, linesCleared >= 4 ? '#ffd700' : '#3fb950');
                    }
                }

                // Detect piece lock
                if (prev && prev.pieceY !== undefined && player.pieceY !== undefined) {
                    if (prev.pieceY > 0 && player.pieceY === 0 && player.piece) {
                        this.onPieceLock(idx, player);
                    }
                }
            });
        }

        this.prevState = JSON.parse(JSON.stringify(state));
        this.state = state;
        this.config = state.config;

        // Calculate canvas size
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
    },

    onLinesCleared(playerIdx, count, board) {
        // Find which rows were cleared (they're now empty at top after clear)
        const cfg = this.config;
        const offsetX = playerIdx * (cfg.boardWidth * cfg.cellSize + 120 + 20) + 10;
        const offsetY = 50;

        // Create particles for cleared lines
        for (let y = cfg.boardHeight - 1; y >= 0; y--) {
            const row = board[y];
            const isFull = row && row.every(cell => cell === 0);
            if (isFull && y < cfg.boardHeight - count) continue;

            if (row) {
                for (let x = 0; x < cfg.boardWidth; x++) {
                    const cellX = offsetX + x * cfg.cellSize + cfg.cellSize / 2;
                    const cellY = offsetY + y * cfg.cellSize + cfg.cellSize / 2;
                    Effects.createParticles(cellX, cellY, '#fff', 3, {
                        speed: 3,
                        lifetime: 500,
                        size: 3
                    });
                }
            }
        }

        // Store clearing lines for flash effect
        for (let i = 0; i < count; i++) {
            this.clearingLines.push({
                playerIdx,
                y: cfg.boardHeight - 1 - i
            });
        }

        // Screen shake based on lines cleared
        Effects.triggerShake(count * 3);

        // Flash effect for tetris (4 lines)
        if (count >= 4) {
            Effects.createFlash('#ffd700', 150, 0.3);
        }
    },

    onPieceLock(playerIdx, player) {
        const cfg = this.config;
        const offsetX = playerIdx * (cfg.boardWidth * cfg.cellSize + 120 + 20) + 10;
        const offsetY = 50;

        // Create subtle particles at piece location
        if (player.piece) {
            for (let py = 0; py < 4; py++) {
                for (let px = 0; px < 4; px++) {
                    if (player.piece[py]?.[px] > 0) {
                        const cellX = offsetX + (player.pieceX + px) * cfg.cellSize + cfg.cellSize / 2;
                        const cellY = offsetY + (player.pieceY + py) * cfg.cellSize + cfg.cellSize / 2;
                        Effects.createSparkles(cellX, cellY, this.COLORS[player.piece[py][px] - 1], 2);
                    }
                }
            }
        }
    },

    addScorePopup(playerIdx, text, color) {
        const cfg = this.config;
        const offsetX = playerIdx * (cfg.boardWidth * cfg.cellSize + 120 + 20) + 10;
        const boardWidth = cfg.boardWidth * cfg.cellSize;

        this.scorePopups.push({
            x: offsetX + boardWidth / 2,
            y: 150,
            text,
            color,
            alpha: 1,
            age: 0,
            lifetime: 1000,
            scale: 1.5
        });
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const cellSize = cfg.cellSize;
        const boardWidth = cfg.boardWidth * cellSize;
        const boardHeight = cfg.boardHeight * cellSize;
        const sidebarWidth = 120;

        // Apply screen shake
        const shake = Effects.shake;
        ctx.save();
        ctx.translate(shake.x, shake.y);

        // Clear canvas
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(-10, -10, this.canvas.width + 20, this.canvas.height + 20);

        // Render each player's board
        this.state.players.forEach((player, index) => {
            const offsetX = index * (boardWidth + sidebarWidth + 20) + 10;
            const offsetY = 50;
            this.renderPlayerBoard(player, index, offsetX, offsetY);
        });

        // Render particles and effects
        Effects.updateParticles(ctx, 16);
        Effects.renderFlashes(ctx, this.canvas.width, this.canvas.height);

        // Render score popups
        this.renderScorePopups(ctx);

        ctx.restore();
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

        // Board background with subtle gradient
        const gradient = ctx.createLinearGradient(offsetX, offsetY, offsetX, offsetY + boardHeight);
        gradient.addColorStop(0, '#161b22');
        gradient.addColorStop(1, '#0d1117');
        ctx.fillStyle = gradient;
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

        // Check for line clear flash
        const isFlashing = this.clearingLines.some(l => l.playerIdx === playerIndex);
        const flashOn = isFlashing && Math.floor(this.flashPhase / 100) % 2 === 0;

        // Draw locked pieces
        player.board.forEach((row, y) => {
            const isClearing = this.clearingLines.some(l => l.playerIdx === playerIndex && l.y === y);

            row.forEach((cell, x) => {
                if (cell > 0) {
                    if (isClearing) {
                        // Flash animation for clearing line
                        if (flashOn) {
                            this.drawCell(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, '#ffffff', true);
                        } else {
                            this.drawCell(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, this.COLORS[cell - 1], false, 0.3);
                        }
                    } else {
                        this.drawCell(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, this.COLORS[cell - 1]);
                    }
                }
            });
        });

        // Draw current piece (ghost and active)
        if (player.piece && player.alive && !isFlashing) {
            // Ghost piece (drop preview)
            let ghostY = player.pieceY;
            while (this.canPlacePiece(player, player.pieceX, ghostY + 1)) {
                ghostY++;
            }
            this.drawPiece(player.piece, offsetX + player.pieceX * cellSize, offsetY + ghostY * cellSize, cellSize, 0.2, true);

            // Active piece with subtle bounce
            const bounce = Math.sin(Date.now() / 200) * 0.5;
            this.drawPiece(player.piece, offsetX + player.pieceX * cellSize, offsetY + player.pieceY * cellSize + bounce, cellSize, 1);
        }

        // Sidebar
        this.renderSidebar(player, offsetX + boardWidth + 10, offsetY);

        // Game over overlay
        if (!player.alive) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(offsetX, offsetY, boardWidth, boardHeight);

            ctx.fillStyle = '#f85149';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME', offsetX + boardWidth / 2, offsetY + boardHeight / 2 - 15);
            ctx.fillText('OVER', offsetX + boardWidth / 2, offsetY + boardHeight / 2 + 20);
            ctx.textAlign = 'left';
        }
    },

    renderSidebar(player, sideX, offsetY) {
        const ctx = this.ctx;

        // Next piece label
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('NEXT', sideX, offsetY + 15);

        // Next piece preview box
        ctx.fillStyle = '#161b22';
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.fillRect(sideX, offsetY + 20, 80, 80);
        ctx.strokeRect(sideX, offsetY + 20, 80, 80);

        if (player.nextPiece >= 0) {
            const nextColor = this.COLORS[player.nextPiece];
            const previewSize = 16;
            const previewOffsetX = sideX + 10;
            const previewOffsetY = offsetY + 35;

            for (let py = 0; py < 4; py++) {
                for (let px = 0; px < 4; px++) {
                    const filled = this.getTetrominoShape(player.nextPiece, py, px);
                    if (filled) {
                        this.drawCell(previewOffsetX + px * previewSize, previewOffsetY + py * previewSize, previewSize, nextColor);
                    }
                }
            }
        }

        // Score with glow effect
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('SCORE', sideX, offsetY + 120);

        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(player.score.toLocaleString(), sideX, offsetY + 142);
        ctx.shadowBlur = 0;

        // Lines
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('LINES', sideX, offsetY + 170);
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(player.lines.toString(), sideX, offsetY + 192);

        // Level with color
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText('LEVEL', sideX, offsetY + 220);
        ctx.fillStyle = '#58a6ff';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(player.level.toString(), sideX, offsetY + 242);
    },

    renderScorePopups(ctx) {
        this.scorePopups.forEach(popup => {
            ctx.save();
            ctx.globalAlpha = popup.alpha;
            ctx.fillStyle = popup.color;
            ctx.font = `bold ${20 * popup.scale}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = popup.color;
            ctx.shadowBlur = 15;
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.restore();
        });
    },

    drawCell(x, y, size, color, glow = false, alpha = 1) {
        const ctx = this.ctx;
        const padding = 1;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow effect
        if (glow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
        }

        // Main color
        ctx.fillStyle = color;
        ctx.fillRect(x + padding, y + padding, size - padding * 2, size - padding * 2);

        ctx.shadowBlur = 0;

        // Highlight (top-left)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + padding, y + padding, size - padding * 2, 3);
        ctx.fillRect(x + padding, y + padding, 3, size - padding * 2);

        // Shadow (bottom-right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + padding, y + size - padding - 3, size - padding * 2, 3);
        ctx.fillRect(x + size - padding - 3, y + padding, 3, size - padding * 2);

        ctx.restore();
    },

    drawPiece(piece, x, y, cellSize, alpha, isGhost = false) {
        const ctx = this.ctx;
        ctx.globalAlpha = alpha;

        piece.forEach((row, py) => {
            row.forEach((cell, px) => {
                if (cell > 0) {
                    if (isGhost) {
                        // Ghost piece - just outline
                        ctx.strokeStyle = this.COLORS[cell - 1];
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x + px * cellSize + 2, y + py * cellSize + 2, cellSize - 4, cellSize - 4);
                    } else {
                        this.drawCell(x + px * cellSize, y + py * cellSize, cellSize, this.COLORS[cell - 1]);
                    }
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
        this.clearingLines = [];
        this.scorePopups = [];
        this.state = null;
        this.prevState = null;
        this.config = null;
        Effects.clear();
    },

    reset() {
        this.clearingLines = [];
        this.scorePopups = [];
        this.state = null;
        this.prevState = null;
        Effects.clear();
    }
};
