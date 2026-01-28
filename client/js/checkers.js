// Checkers game renderer - Enhanced with animations and juice
const CheckersRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,
    prevState: null,
    hoveredCell: null,
    lastRenderTime: 0,

    // Animation state
    movingPieces: [],
    capturedPieces: [],
    promotingPieces: [],
    boardShake: 0,

    // Piece types from server
    EMPTY: 0,
    RED: 1,
    RED_KING: 2,
    BLACK: 3,
    BLACK_KING: 4,

    // Colors
    COLORS: {
        lightSquare: '#f0d9b5',
        darkSquare: '#b58863',
        redPiece: '#c41e3a',
        redPieceLight: '#e63950',
        blackPiece: '#2d2d2d',
        blackPieceLight: '#4a4a4a',
        selected: 'rgba(255, 215, 0, 0.6)',
        validMove: 'rgba(100, 255, 100, 0.5)',
        hover: 'rgba(255, 255, 255, 0.3)',
        lastMove: 'rgba(255, 215, 0, 0.3)',
        king: '#ffd700'
    },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
        this.startAnimationLoop();
    },

    setupInput() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCell = null;
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
        // Update moving pieces
        for (let i = this.movingPieces.length - 1; i >= 0; i--) {
            const move = this.movingPieces[i];
            move.progress += deltaTime / move.duration;

            if (move.progress >= 1) {
                this.movingPieces.splice(i, 1);
            } else {
                // Easing
                const t = move.progress;
                const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

                move.currentX = move.fromX + (move.toX - move.fromX) * ease;
                move.currentY = move.fromY + (move.toY - move.fromY) * ease;

                // Arc for jump
                if (move.isJump) {
                    move.currentY -= Math.sin(t * Math.PI) * 30;
                }
            }
        }

        // Update captured pieces (explosion)
        for (let i = this.capturedPieces.length - 1; i >= 0; i--) {
            const cap = this.capturedPieces[i];
            cap.progress += deltaTime / cap.duration;

            if (cap.progress >= 1) {
                this.capturedPieces.splice(i, 1);
            } else {
                cap.scale = 1 + cap.progress * 0.5;
                cap.alpha = 1 - cap.progress;
                cap.rotation += deltaTime * 0.01;
            }
        }

        // Update promoting pieces (crown animation)
        for (let i = this.promotingPieces.length - 1; i >= 0; i--) {
            const promo = this.promotingPieces[i];
            promo.progress += deltaTime / promo.duration;

            if (promo.progress >= 1) {
                this.promotingPieces.splice(i, 1);
            } else {
                // Bounce effect
                const t = promo.progress;
                promo.crownScale = t < 0.5
                    ? 1 + Math.sin(t * Math.PI * 2) * 0.3
                    : 1 + Math.sin(t * Math.PI) * 0.1;
                promo.glowIntensity = Math.sin(t * Math.PI) * 20;
            }
        }

        // Board shake decay
        if (this.boardShake > 0) {
            this.boardShake *= 0.9;
            if (this.boardShake < 0.1) this.boardShake = 0;
        }

        Effects.updateAnimations(deltaTime);
        Effects.updateParticles(this.ctx, deltaTime);
    },

    getCellFromEvent(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellSize = this.config?.cellSize || 60;
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);

        if (cellX >= 0 && cellX < 8 && cellY >= 0 && cellY < 8) {
            return { x: cellX, y: cellY };
        }
        return null;
    },

    handleMouseMove(e) {
        const cell = this.getCellFromEvent(e);
        this.hoveredCell = cell;
    },

    handleClick(e) {
        const cell = this.getCellFromEvent(e);
        if (!cell || !this.state) return;

        if (this.state.currentPlayer !== App.playerIndex) return;

        const piece = this.state.board[cell.y][cell.x];
        const isOurPiece = this.isPlayerPiece(App.playerIndex, piece);

        if (this.state.selectedX >= 0) {
            const isValidMove = this.state.validMoves.some(m =>
                m.fromX === this.state.selectedX &&
                m.fromY === this.state.selectedY &&
                m.toX === cell.x &&
                m.toY === cell.y
            );

            if (isValidMove) {
                socket.send('input', { action: 'move', x: cell.x, y: cell.y });
            } else if (isOurPiece) {
                socket.send('input', { action: 'select', x: cell.x, y: cell.y });
            }
        } else if (isOurPiece) {
            socket.send('input', { action: 'select', x: cell.x, y: cell.y });
        }
    },

    isPlayerPiece(playerId, piece) {
        if (playerId === 0) {
            return piece === this.RED || piece === this.RED_KING;
        }
        return piece === this.BLACK || piece === this.BLACK_KING;
    },

    updateState(state) {
        // Detect moves and captures
        if (this.prevState && state.board) {
            this.detectAnimations(this.prevState, state);
        }

        this.prevState = JSON.parse(JSON.stringify(state));
        this.state = state;
        this.config = state.config;

        const size = this.config.boardSize * this.config.cellSize;
        if (this.canvas.width !== size) {
            this.canvas.width = size;
            this.canvas.height = size + 80;
        }
    },

    detectAnimations(prev, curr) {
        const cellSize = this.config?.cellSize || 60;

        // Find pieces that moved or were captured
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const prevPiece = prev.board[y][x];
                const currPiece = curr.board[y][x];

                // Piece was captured (was there, now empty)
                if (prevPiece !== this.EMPTY && currPiece === this.EMPTY) {
                    // Check if it moved elsewhere or was captured
                    let wasCaptured = true;
                    for (let ny = 0; ny < 8; ny++) {
                        for (let nx = 0; nx < 8; nx++) {
                            if (prev.board[ny][nx] === this.EMPTY && curr.board[ny][nx] === prevPiece) {
                                // Piece moved from (x,y) to (nx,ny)
                                const isJump = Math.abs(nx - x) > 1;
                                this.movingPieces.push({
                                    piece: prevPiece,
                                    fromX: x * cellSize + cellSize / 2,
                                    fromY: y * cellSize + cellSize / 2,
                                    toX: nx * cellSize + cellSize / 2,
                                    toY: ny * cellSize + cellSize / 2,
                                    currentX: x * cellSize + cellSize / 2,
                                    currentY: y * cellSize + cellSize / 2,
                                    progress: 0,
                                    duration: 200,
                                    isJump
                                });
                                wasCaptured = false;
                            }
                        }
                    }

                    if (wasCaptured) {
                        // Piece was captured - explosion animation
                        this.capturedPieces.push({
                            piece: prevPiece,
                            x: x * cellSize + cellSize / 2,
                            y: y * cellSize + cellSize / 2,
                            progress: 0,
                            duration: 400,
                            scale: 1,
                            alpha: 1,
                            rotation: 0
                        });

                        // Particles
                        const isRed = prevPiece === this.RED || prevPiece === this.RED_KING;
                        const color = isRed ? this.COLORS.redPiece : this.COLORS.blackPiece;
                        Effects.createParticles(
                            x * cellSize + cellSize / 2,
                            y * cellSize + cellSize / 2,
                            color,
                            15,
                            { speed: 6, lifetime: 600, size: 5 }
                        );

                        // Screen shake
                        this.boardShake = 8;
                    }
                }

                // Piece was promoted to king
                if ((prevPiece === this.RED && currPiece === this.RED_KING) ||
                    (prevPiece === this.BLACK && currPiece === this.BLACK_KING)) {
                    this.promotingPieces.push({
                        x: x * cellSize + cellSize / 2,
                        y: y * cellSize + cellSize / 2,
                        progress: 0,
                        duration: 800,
                        crownScale: 0,
                        glowIntensity: 0
                    });

                    // Crown sparkles
                    Effects.createSparkles(
                        x * cellSize + cellSize / 2,
                        y * cellSize + cellSize / 2,
                        this.COLORS.king,
                        10
                    );
                }
            }
        }
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const cellSize = cfg.cellSize;
        const boardSize = cfg.boardSize;

        // Apply screen shake
        ctx.save();
        if (this.boardShake > 0) {
            ctx.translate(
                (Math.random() - 0.5) * this.boardShake,
                (Math.random() - 0.5) * this.boardShake
            );
        }

        // Clear
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board with wood texture effect
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const isLight = (x + y) % 2 === 0;
                const baseColor = isLight ? this.COLORS.lightSquare : this.COLORS.darkSquare;

                ctx.fillStyle = baseColor;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                // Subtle texture
                if (!isLight) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    for (let i = 0; i < 3; i++) {
                        const lineY = y * cellSize + (i + 1) * cellSize / 4;
                        ctx.fillRect(x * cellSize, lineY, cellSize, 1);
                    }
                }
            }
        }

        // Highlight selected piece
        if (this.state.selectedX >= 0) {
            ctx.fillStyle = this.COLORS.selected;
            ctx.fillRect(
                this.state.selectedX * cellSize,
                this.state.selectedY * cellSize,
                cellSize, cellSize
            );

            // Pulsing border
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(
                this.state.selectedX * cellSize + 1,
                this.state.selectedY * cellSize + 1,
                cellSize - 2, cellSize - 2
            );
        }

        // Highlight valid moves
        if (this.state.currentPlayer === App.playerIndex) {
            this.state.validMoves.forEach(move => {
                if (this.state.selectedX < 0 ||
                    (move.fromX === this.state.selectedX && move.fromY === this.state.selectedY)) {

                    // Draw valid move indicator
                    ctx.fillStyle = this.COLORS.validMove;
                    ctx.beginPath();
                    ctx.arc(
                        move.toX * cellSize + cellSize / 2,
                        move.toY * cellSize + cellSize / 2,
                        cellSize / 4,
                        0, Math.PI * 2
                    );
                    ctx.fill();

                    // Jump indicator (larger circle)
                    if (move.isCapture) {
                        ctx.strokeStyle = '#ff6b6b';
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(
                            move.toX * cellSize + cellSize / 2,
                            move.toY * cellSize + cellSize / 2,
                            cellSize / 3,
                            0, Math.PI * 2
                        );
                        ctx.stroke();
                    }
                }
            });
        }

        // Hover highlight
        if (this.hoveredCell && this.state.currentPlayer === App.playerIndex) {
            ctx.fillStyle = this.COLORS.hover;
            ctx.fillRect(
                this.hoveredCell.x * cellSize,
                this.hoveredCell.y * cellSize,
                cellSize, cellSize
            );
        }

        // Draw pieces (skip those being animated)
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const piece = this.state.board[y][x];
                if (piece !== this.EMPTY) {
                    // Check if this piece is being animated
                    const isMoving = this.movingPieces.some(m =>
                        Math.abs(m.fromX - (x * cellSize + cellSize / 2)) < 5 &&
                        Math.abs(m.fromY - (y * cellSize + cellSize / 2)) < 5
                    );

                    if (!isMoving) {
                        const promo = this.promotingPieces.find(p =>
                            Math.abs(p.x - (x * cellSize + cellSize / 2)) < 5 &&
                            Math.abs(p.y - (y * cellSize + cellSize / 2)) < 5
                        );

                        this.drawPiece(
                            x * cellSize + cellSize / 2,
                            y * cellSize + cellSize / 2,
                            piece,
                            cellSize,
                            promo
                        );
                    }
                }
            }
        }

        // Draw moving pieces
        this.movingPieces.forEach(move => {
            this.drawPiece(move.currentX, move.currentY, move.piece, cellSize);
        });

        // Draw captured pieces (exploding)
        this.capturedPieces.forEach(cap => {
            ctx.save();
            ctx.globalAlpha = cap.alpha;
            ctx.translate(cap.x, cap.y);
            ctx.rotate(cap.rotation);
            ctx.scale(cap.scale, cap.scale);

            const isRed = cap.piece === this.RED || cap.piece === this.RED_KING;
            const color = isRed ? this.COLORS.redPiece : this.COLORS.blackPiece;

            ctx.beginPath();
            ctx.arc(0, 0, cellSize * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();

            ctx.restore();
        });

        // Draw particles
        Effects.updateParticles(ctx, 16);

        // Draw info bar
        this.drawInfoBar(boardSize * cellSize);

        ctx.restore();
    },

    drawPiece(centerX, centerY, piece, cellSize, promoAnim = null) {
        const ctx = this.ctx;
        const radius = cellSize * 0.38;

        const isRed = piece === this.RED || piece === this.RED_KING;
        const isKing = piece === this.RED_KING || piece === this.BLACK_KING;

        // Glow for promoting pieces
        if (promoAnim) {
            ctx.save();
            ctx.shadowColor = this.COLORS.king;
            ctx.shadowBlur = promoAnim.glowIntensity;
        }

        // Piece shadow
        ctx.beginPath();
        ctx.arc(centerX + 3, centerY + 3, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fill();

        // Main piece - gradient
        const gradient = ctx.createRadialGradient(
            centerX - radius * 0.3, centerY - radius * 0.3, 0,
            centerX, centerY, radius
        );

        if (isRed) {
            gradient.addColorStop(0, this.COLORS.redPieceLight);
            gradient.addColorStop(1, this.COLORS.redPiece);
        } else {
            gradient.addColorStop(0, this.COLORS.blackPieceLight);
            gradient.addColorStop(1, this.COLORS.blackPiece);
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Shine highlight
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.25, centerY - radius * 0.25, radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();

        // Piece border
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isRed ? '#8b0000' : '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner ring for depth
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // King crown
        if (isKing) {
            const crownScale = promoAnim ? promoAnim.crownScale : 1;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(crownScale, crownScale);

            // Crown glow
            ctx.shadowColor = this.COLORS.king;
            ctx.shadowBlur = 8;

            ctx.fillStyle = this.COLORS.king;
            ctx.font = `bold ${cellSize * 0.4}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('♔', 0, 0);

            ctx.restore();
        }

        if (promoAnim) {
            ctx.restore();
        }
    },

    drawInfoBar(yOffset) {
        const ctx = this.ctx;
        const isMyTurn = this.state.currentPlayer === App.playerIndex;

        // Background
        ctx.fillStyle = '#161b22';
        ctx.fillRect(0, yOffset, this.canvas.width, 80);

        // Divider
        ctx.fillStyle = '#30363d';
        ctx.fillRect(0, yOffset, this.canvas.width, 1);

        // Turn indicator with animation
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'left';

        if (this.state.gameOver) {
            const winText = this.state.winner === App.playerIndex ? 'You Win!' :
                this.state.winner === -1 ? 'Draw!' : 'You Lose!';
            ctx.fillStyle = this.state.winner === App.playerIndex ? '#3fb950' : '#f85149';
            ctx.fillText(winText, 15, yOffset + 35);
        } else {
            const pulse = isMyTurn ? Math.sin(Date.now() / 300) * 0.2 + 0.8 : 1;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = isMyTurn ? '#3fb950' : '#8b949e';
            ctx.fillText(isMyTurn ? '● Your Turn' : "○ Opponent's Turn", 15, yOffset + 35);
            ctx.globalAlpha = 1;
        }

        // Piece counts with icons
        ctx.textAlign = 'right';

        // Red count
        ctx.fillStyle = this.COLORS.redPiece;
        ctx.beginPath();
        ctx.arc(this.canvas.width - 150, yOffset + 30, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f0f6fc';
        ctx.font = '16px sans-serif';
        ctx.fillText(this.state.pieces[0], this.canvas.width - 125, yOffset + 35);

        // Black count
        ctx.fillStyle = this.COLORS.blackPiece;
        ctx.beginPath();
        ctx.arc(this.canvas.width - 70, yOffset + 30, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText(this.state.pieces[1], this.canvas.width - 45, yOffset + 35);

        // Player indicator
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        const yourColor = App.playerIndex === 0 ? 'Red' : 'Black';
        ctx.fillText(`You are ${yourColor}`, this.canvas.width / 2, yOffset + 60);
    },

    cleanup() {
        this.hoveredCell = null;
        this.movingPieces = [];
        this.capturedPieces = [];
        this.promotingPieces = [];
        this.state = null;
        this.prevState = null;
        this.selectedPiece = null;
        this.validMoves = [];
        Effects.clear();
    },

    reset() {
        this.hoveredCell = null;
        this.movingPieces = [];
        this.capturedPieces = [];
        this.promotingPieces = [];
        this.state = null;
        this.prevState = null;
        this.selectedPiece = null;
        this.validMoves = [];
        Effects.clear();
    }
};
