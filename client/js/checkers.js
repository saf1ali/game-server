// Checkers game renderer - Clean code with proper interactive states
const CheckersRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,
    hoveredCell: null,

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
        blackPiece: '#2d2d2d',
        selected: 'rgba(255, 255, 0, 0.5)',
        validMove: 'rgba(0, 255, 0, 0.4)',
        hover: 'rgba(255, 255, 255, 0.2)',
        king: '#ffd700'
    },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
    },

    setupInput() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredCell = null;
            this.render();
        });
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
        const changed = !this.hoveredCell ||
            !cell ||
            this.hoveredCell.x !== cell.x ||
            this.hoveredCell.y !== cell.y;

        if (changed) {
            this.hoveredCell = cell;
            this.render();
        }
    },

    handleClick(e) {
        const cell = this.getCellFromEvent(e);
        if (!cell || !this.state) return;

        // Check if it's our turn
        if (this.state.currentPlayer !== App.playerIndex) return;

        const piece = this.state.board[cell.y][cell.x];
        const isOurPiece = this.isPlayerPiece(App.playerIndex, piece);

        if (this.state.selectedX >= 0) {
            // Try to move to this cell
            const isValidMove = this.state.validMoves.some(m =>
                m.fromX === this.state.selectedX &&
                m.fromY === this.state.selectedY &&
                m.toX === cell.x &&
                m.toY === cell.y
            );

            if (isValidMove) {
                socket.send('input', { action: 'move', x: cell.x, y: cell.y });
            } else if (isOurPiece) {
                // Select different piece
                socket.send('input', { action: 'select', x: cell.x, y: cell.y });
            }
        } else if (isOurPiece) {
            // Select this piece
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
        this.state = state;
        this.config = state.config;

        const size = this.config.boardSize * this.config.cellSize;
        if (this.canvas.width !== size) {
            this.canvas.width = size;
            this.canvas.height = size + 60; // Extra space for info
        }

        this.render();
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const cellSize = cfg.cellSize;
        const boardSize = cfg.boardSize;

        // Clear
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw board
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const isLight = (x + y) % 2 === 0;
                ctx.fillStyle = isLight ? this.COLORS.lightSquare : this.COLORS.darkSquare;
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
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
        }

        // Highlight valid moves
        if (this.state.currentPlayer === App.playerIndex) {
            this.state.validMoves.forEach(move => {
                // Only show moves from selected piece, or all if none selected
                if (this.state.selectedX < 0 ||
                    (move.fromX === this.state.selectedX && move.fromY === this.state.selectedY)) {
                    ctx.fillStyle = this.COLORS.validMove;
                    ctx.fillRect(move.toX * cellSize, move.toY * cellSize, cellSize, cellSize);
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

        // Draw pieces
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                const piece = this.state.board[y][x];
                if (piece !== this.EMPTY) {
                    this.drawPiece(x, y, piece, cellSize);
                }
            }
        }

        // Draw info bar
        this.drawInfoBar(boardSize * cellSize);
    },

    drawPiece(x, y, piece, cellSize) {
        const ctx = this.ctx;
        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;
        const radius = cellSize * 0.4;

        const isRed = piece === this.RED || piece === this.RED_KING;
        const isKing = piece === this.RED_KING || piece === this.BLACK_KING;

        // Piece shadow
        ctx.beginPath();
        ctx.arc(centerX + 2, centerY + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        // Main piece
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = isRed ? this.COLORS.redPiece : this.COLORS.blackPiece;
        ctx.fill();

        // Piece highlight
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // Piece border
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isRed ? '#8b0000' : '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // King crown
        if (isKing) {
            ctx.fillStyle = this.COLORS.king;
            ctx.font = `bold ${cellSize * 0.35}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('♔', centerX, centerY);
        }
    },

    drawInfoBar(yOffset) {
        const ctx = this.ctx;
        const isMyTurn = this.state.currentPlayer === App.playerIndex;

        // Turn indicator
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';

        if (this.state.gameOver) {
            const winText = this.state.winner === App.playerIndex ? 'You Win!' :
                this.state.winner === -1 ? 'Draw!' : 'You Lose!';
            ctx.fillStyle = this.state.winner === App.playerIndex ? '#3fb950' : '#f85149';
            ctx.fillText(winText, 10, yOffset + 30);
        } else {
            ctx.fillStyle = isMyTurn ? '#3fb950' : '#8b949e';
            ctx.fillText(isMyTurn ? 'Your Turn' : "Opponent's Turn", 10, yOffset + 30);
        }

        // Piece counts
        ctx.textAlign = 'right';
        ctx.fillStyle = this.COLORS.redPiece;
        ctx.fillText(`Red: ${this.state.pieces[0]}`, this.canvas.width - 100, yOffset + 30);

        ctx.fillStyle = '#f0f6fc';
        ctx.fillText(`Black: ${this.state.pieces[1]}`, this.canvas.width - 10, yOffset + 30);

        // Player indicator
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        const yourColor = App.playerIndex === 0 ? 'Red' : 'Black';
        ctx.fillText(`You are ${yourColor}`, this.canvas.width / 2, yOffset + 50);
    },

    cleanup() {
        this.hoveredCell = null;
    }
};
