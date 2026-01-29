// Agar.io renderer
const AgarRenderer = {
    canvas: null,
    ctx: null,
    state: null,

    // Camera follows player's center of mass
    camera: { x: 1000, y: 1000, zoom: 1.0, targetZoom: 1.0 },

    // Input state
    mouseX: 0,
    mouseY: 0,

    // Animation
    lastRenderTime: 0,

    config: {
        bgColor: '#111118',
        gridColor: '#1a1a28',
        gridSize: 50,
        colors: ['#ff2a6d', '#05d9e8', '#05ffa1', '#f9f002',
                 '#ff6b35', '#d557ff', '#00ff88', '#ff8800'],
        pelletColors: ['#ff0055', '#00ffaa', '#ffaa00', '#aa00ff',
                      '#00aaff', '#ff5500', '#55ff00', '#ff00aa']
    },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 1200;
        this.canvas.height = 800;
        this.state = null;
        this.camera = { x: 1000, y: 1000, zoom: 1.0, targetZoom: 1.0 };
        this.setupInput();
        this.startRenderLoop();
    },

    setupInput() {
        // Mouse for movement direction
        this.mouseMoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            this.sendInput();
        };
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);

        // Split on Space, Eject on W
        this.keyDownHandler = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.sendAction('split');
            } else if (e.code === 'KeyW') {
                this.sendAction('eject');
            }
        };
        document.addEventListener('keydown', this.keyDownHandler);
    },

    sendInput() {
        if (typeof socket !== 'undefined' && socket.connected) {
            // Convert screen coordinates to world coordinates
            const worldX = (this.mouseX - this.canvas.width / 2) / this.camera.zoom + this.camera.x;
            const worldY = (this.mouseY - this.canvas.height / 2) / this.camera.zoom + this.camera.y;

            socket.send('input', {
                targetX: worldX,
                targetY: worldY
            });
        }
    },

    sendAction(action) {
        if (typeof socket !== 'undefined' && socket.connected) {
            socket.send('input', { action: action });
        }
    },

    startRenderLoop() {
        const animate = (time) => {
            if (!this.canvas.parentElement) return;

            this.lastRenderTime = time;
            this.updateCamera();
            this.render();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    },

    updateState(state) {
        this.state = state;
    },

    updateCamera() {
        if (!this.state || !this.state.players) return;

        const player = this.state.players[App.playerIndex];
        if (!player || !player.cells || player.cells.length === 0) return;

        // Calculate center of mass
        let totalMass = 0;
        let centerX = 0;
        let centerY = 0;

        for (const cell of player.cells) {
            if (!cell.alive) continue;
            centerX += cell.x * cell.mass;
            centerY += cell.y * cell.mass;
            totalMass += cell.mass;
        }

        if (totalMass > 0) {
            // Smooth camera follow
            const targetX = centerX / totalMass;
            const targetY = centerY / totalMass;
            this.camera.x += (targetX - this.camera.x) * 0.1;
            this.camera.y += (targetY - this.camera.y) * 0.1;

            // Zoom out as player gets bigger
            this.camera.targetZoom = Math.max(0.35, Math.min(1.0, 1.0 - totalMass / 800));
            this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;
        }
    },

    render() {
        if (!this.ctx) return;

        try {
            const ctx = this.ctx;

            // Clear
            ctx.fillStyle = this.config.bgColor;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            if (!this.state || !this.state.players) {
                ctx.font = 'bold 24px Orbitron, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#888';
                ctx.fillText('Waiting for game to start...', this.canvas.width / 2, this.canvas.height / 2);
                return;
            }

            // Apply camera transform
            ctx.save();
            ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            ctx.scale(this.camera.zoom, this.camera.zoom);
            ctx.translate(-this.camera.x, -this.camera.y);

            // Draw grid
            this.drawGrid();

            // Draw arena bounds
            this.drawArenaBounds();

            // Draw pellets
            this.drawPellets();

            // Draw all cells
            this.drawCells();

            ctx.restore();

            // Draw UI (not affected by camera)
            this.drawUI();

            if (this.state.gameOver) {
                this.drawGameOver();
            }
        } catch (e) {
            console.error('Agar render error:', e);
        }
    },

    drawGrid() {
        const ctx = this.ctx;
        const config = this.state.config || { arenaWidth: 2000, arenaHeight: 2000 };

        ctx.strokeStyle = this.config.gridColor;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= config.arenaWidth; x += this.config.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, config.arenaHeight);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= config.arenaHeight; y += this.config.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(config.arenaWidth, y);
            ctx.stroke();
        }
    },

    drawArenaBounds() {
        const ctx = this.ctx;
        const config = this.state.config || { arenaWidth: 2000, arenaHeight: 2000 };

        ctx.strokeStyle = '#ff2a6d';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#ff2a6d';
        ctx.shadowBlur = 20;
        ctx.strokeRect(0, 0, config.arenaWidth, config.arenaHeight);
        ctx.shadowBlur = 0;
    },

    drawPellets() {
        const ctx = this.ctx;
        if (!this.state.pellets) return;

        for (const pellet of this.state.pellets) {
            const radius = Math.sqrt(pellet.mass / Math.PI) * 4;

            ctx.shadowColor = pellet.color;
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(pellet.x, pellet.y, Math.max(radius, 5), 0, Math.PI * 2);
            ctx.fillStyle = pellet.color;
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    },

    drawCells() {
        const ctx = this.ctx;

        // Collect all cells with player info
        const allCells = [];
        for (let p = 0; p < this.state.players.length; p++) {
            const player = this.state.players[p];
            if (!player.cells) continue;

            for (const cell of player.cells) {
                if (!cell.alive) continue;
                allCells.push({
                    ...cell,
                    playerIndex: p,
                    color: player.color || this.config.colors[p % 8],
                    username: player.username,
                    isMe: p === App.playerIndex
                });
            }
        }

        // Sort by mass (draw largest first, so smallest are on top)
        allCells.sort((a, b) => b.mass - a.mass);

        for (const cell of allCells) {
            const radius = Math.sqrt(cell.mass / Math.PI) * 4;

            // Glow for own cells
            if (cell.isMe) {
                ctx.shadowColor = cell.color;
                ctx.shadowBlur = 25;
            }

            // Cell body with gradient
            const gradient = ctx.createRadialGradient(
                cell.x, cell.y, 0,
                cell.x, cell.y, radius
            );
            gradient.addColorStop(0, this.lighten(cell.color, 30));
            gradient.addColorStop(0.7, cell.color);
            gradient.addColorStop(1, this.darken(cell.color, 20));

            ctx.beginPath();
            ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Border
            ctx.strokeStyle = this.darken(cell.color, 40);
            ctx.lineWidth = Math.max(2, radius * 0.08);
            ctx.stroke();

            ctx.shadowBlur = 0;

            // Username (only on cells large enough)
            if (radius > 25) {
                const fontSize = Math.min(radius * 0.4, 18);
                ctx.font = `bold ${fontSize}px Orbitron, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Text shadow
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillText(cell.username, cell.x + 1, cell.y + 1);

                // Username
                ctx.fillStyle = 'white';
                ctx.fillText(cell.username, cell.x, cell.y);

                // Mass number
                const massSize = Math.min(radius * 0.25, 12);
                ctx.font = `${massSize}px Orbitron, sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(Math.floor(cell.mass), cell.x, cell.y + fontSize * 0.8);
            }
        }
    },

    drawUI() {
        const ctx = this.ctx;

        // Leaderboard in top-right
        ctx.font = 'bold 16px Orbitron, sans-serif';
        ctx.textAlign = 'right';

        const sorted = [...this.state.players]
            .map((p, i) => ({ ...p, index: i }))
            .filter(p => p.connected)
            .sort((a, b) => (b.totalMass || 0) - (a.totalMass || 0));

        const leaderboardWidth = 220;
        const leaderboardHeight = 50 + sorted.length * 28;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(this.canvas.width - leaderboardWidth - 10, 10, leaderboardWidth, leaderboardHeight);

        ctx.fillStyle = '#fff';
        ctx.fillText('LEADERBOARD', this.canvas.width - 20, 35);

        for (let i = 0; i < sorted.length; i++) {
            const p = sorted[i];
            const color = p.color || this.config.colors[p.index % 8];
            const y = 65 + i * 28;
            const isMe = p.index === App.playerIndex;

            if (isMe) {
                ctx.fillStyle = 'rgba(5, 255, 161, 0.2)';
                ctx.fillRect(this.canvas.width - leaderboardWidth - 10, y - 18, leaderboardWidth, 26);
            }

            ctx.fillStyle = color;
            ctx.fillText(
                `${i + 1}. ${p.username}: ${Math.floor(p.totalMass || 0)}`,
                this.canvas.width - 20, y
            );
        }

        // Timer at top center
        const minutes = Math.floor((this.state.timeRemaining || 0) / 60);
        const seconds = Math.floor((this.state.timeRemaining || 0) % 60);
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Orbitron, sans-serif';
        ctx.fillStyle = this.state.timeRemaining < 60 ? '#ff2a6d' : '#888';
        ctx.fillText(
            `${minutes}:${seconds.toString().padStart(2, '0')}`,
            this.canvas.width / 2, 35
        );

        // Goal indicator
        ctx.font = '14px Orbitron, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('First to 500 mass wins!', this.canvas.width / 2, 55);

        // Controls hint at bottom
        ctx.font = '14px Orbitron, sans-serif';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'left';
        ctx.fillText('Space: Split | W: Eject Mass', 15, this.canvas.height - 15);

        // Show own mass prominently
        const player = this.state.players[App.playerIndex];
        if (player) {
            ctx.textAlign = 'left';
            ctx.font = 'bold 18px Orbitron, sans-serif';
            ctx.fillStyle = '#05ffa1';
            ctx.fillText(`Mass: ${Math.floor(player.totalMass || 0)}`, 15, 35);

            ctx.font = '14px Orbitron, sans-serif';
            ctx.fillStyle = '#888';
            ctx.fillText(`Score: ${player.score || 0}`, 15, 55);
        }
    },

    drawGameOver() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = 'bold 56px Orbitron, sans-serif';
        ctx.textAlign = 'center';

        const winner = this.state.players[this.state.winner];
        const winnerName = winner ? winner.username : 'Unknown';
        const winnerMass = winner ? Math.floor(winner.totalMass || 0) : 0;

        if (this.state.winner === App.playerIndex) {
            ctx.fillStyle = '#05ffa1';
            ctx.fillText('YOU WIN!', this.canvas.width / 2, this.canvas.height / 2 - 40);
        } else {
            ctx.fillStyle = '#ff2a6d';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
            ctx.font = 'bold 28px Orbitron, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(`${winnerName} wins!`, this.canvas.width / 2, this.canvas.height / 2 + 10);
        }

        ctx.font = '20px Orbitron, sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText(`Final Mass: ${winnerMass}`, this.canvas.width / 2, this.canvas.height / 2 + 50);

        ctx.font = '16px Orbitron, sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('Click "Restart Game" to play again', this.canvas.width / 2, this.canvas.height / 2 + 90);
    },

    lighten(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount);
        const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount);
        const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount);
        return `rgb(${r}, ${g}, ${b})`;
    },

    darken(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - amount);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - amount);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - amount);
        return `rgb(${r}, ${g}, ${b})`;
    },

    cleanup() {
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        document.removeEventListener('keydown', this.keyDownHandler);

        this.state = null;
        this.camera = { x: 1000, y: 1000, zoom: 1.0, targetZoom: 1.0 };

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};
