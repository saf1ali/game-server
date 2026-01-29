// Slither Battle renderer
const SlitherRenderer = {
    canvas: null,
    ctx: null,
    state: null,

    // Input state
    mouseX: 800,
    mouseY: 450,
    boosting: false,

    // Animation
    lastRenderTime: 0,
    gridOffset: 0,

    // Visual config
    config: {
        bgColor: '#0a0a14',
        gridColor: '#1a1a2e',
        gridSize: 40,
        // 6 distinct player colors
        colors: ['#ff2a6d', '#05d9e8', '#05ffa1', '#f9f002', '#ff6b35', '#d557ff'],
        pelletGlow: true
    },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // Larger arena for 6 players
        this.canvas.width = 1600;
        this.canvas.height = 900;
        this.setupInput();
        this.startRenderLoop();
    },

    setupInput() {
        // Mouse movement - track position
        this.mouseMoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            this.sendInput();
        };
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);

        // Boost on click
        this.mouseDownHandler = () => {
            this.boosting = true;
            this.sendInput();
        };
        this.mouseUpHandler = () => {
            this.boosting = false;
            this.sendInput();
        };
        this.canvas.addEventListener('mousedown', this.mouseDownHandler);
        this.canvas.addEventListener('mouseup', this.mouseUpHandler);

        // Boost on space
        this.keyDownHandler = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.boosting = true;
                this.sendInput();
            }
        };
        this.keyUpHandler = (e) => {
            if (e.code === 'Space') {
                this.boosting = false;
                this.sendInput();
            }
        };
        document.addEventListener('keydown', this.keyDownHandler);
        document.addEventListener('keyup', this.keyUpHandler);
    },

    sendInput() {
        if (typeof socket !== 'undefined' && socket.connected) {
            socket.send('input', {
                mouseX: this.mouseX,
                mouseY: this.mouseY,
                boost: this.boosting
            });
        }
    },

    startRenderLoop() {
        const animate = (time) => {
            if (!this.canvas.parentElement) return; // Stop if removed from DOM

            const deltaTime = time - this.lastRenderTime;
            this.lastRenderTime = time;

            // Animate grid for movement feel
            this.gridOffset = (this.gridOffset + 0.5) % this.config.gridSize;

            this.render();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    },

    updateState(state) {
        this.state = state;
    },

    render() {
        if (!this.ctx) return;

        const ctx = this.ctx;

        // Clear and draw background
        ctx.fillStyle = this.config.bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw border
        this.drawBorder();

        if (!this.state) {
            // Show waiting message
            ctx.font = 'bold 24px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#888';
            ctx.fillText('Waiting for game to start...', this.canvas.width / 2, this.canvas.height / 2);
            return;
        }

        // Draw pellets
        this.drawPellets();

        // Draw snakes
        this.drawSnakes();

        // Draw UI (scores, round indicator)
        this.drawUI();

        // Draw boost indicator
        this.drawBoostIndicator();

        // Draw game over overlay
        if (this.state.gameOver) {
            this.drawGameOver();
        }
    },

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = this.config.gridColor;
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = this.gridOffset; x < this.canvas.width; x += this.config.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = this.gridOffset; y < this.canvas.height; y += this.config.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    },

    drawBorder() {
        const ctx = this.ctx;
        ctx.strokeStyle = '#ff2a6d';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff2a6d';
        ctx.shadowBlur = 10;
        ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        ctx.shadowBlur = 0;
    },

    drawPellets() {
        const ctx = this.ctx;

        for (const pellet of this.state.pellets) {
            // Glow effect
            ctx.shadowColor = pellet.color;
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(pellet.x, pellet.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = pellet.color;
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    },

    drawSnakes() {
        const ctx = this.ctx;

        for (let i = 0; i < this.state.players.length; i++) {
            const player = this.state.players[i];
            if (!player.body || player.body.length === 0) continue;

            const color = player.color || this.config.colors[i % 6];
            const isMe = i === App.playerIndex;

            // Draw body segments (back to front for proper layering)
            for (let j = player.body.length - 1; j >= 0; j--) {
                const seg = player.body[j];
                const radius = j === 0 ? 10 : 8;  // Head is bigger

                // Stronger glow for own snake
                if (isMe) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 20;
                }

                ctx.beginPath();
                ctx.arc(seg.x, seg.y, radius, 0, Math.PI * 2);

                // Gradient from head to tail
                const brightness = j === 0 ? 0 : -Math.min(30, j * 2);
                ctx.fillStyle = j === 0 ? color : this.adjustBrightness(color, brightness);
                ctx.fill();

                ctx.shadowBlur = 0;
            }

            // Draw eyes on head
            if (player.body.length > 0 && player.alive) {
                this.drawEyes(player, color);
            }

            // Draw username above head
            if (player.body.length > 0) {
                this.drawUsername(player, color, isMe);
            }

            // Draw boost effect
            if (player.boosting && player.alive) {
                this.drawBoostTrail(player, color);
            }
        }
    },

    drawEyes(player, color) {
        const ctx = this.ctx;
        const head = player.body[0];
        const dir = player.direction || { x: 1, y: 0 };

        // Calculate eye positions perpendicular to direction
        const eyeOffset = 5;
        const perpX = -dir.y;
        const perpY = dir.x;

        const leftEye = { x: head.x + perpX * eyeOffset, y: head.y + perpY * eyeOffset };
        const rightEye = { x: head.x - perpX * eyeOffset, y: head.y - perpY * eyeOffset };

        // Draw white of eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(leftEye.x, leftEye.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEye.x, rightEye.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw pupils (looking in direction)
        ctx.fillStyle = 'black';
        const pupilOffset = 1.5;
        ctx.beginPath();
        ctx.arc(leftEye.x + dir.x * pupilOffset, leftEye.y + dir.y * pupilOffset, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rightEye.x + dir.x * pupilOffset, rightEye.y + dir.y * pupilOffset, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    drawUsername(player, color, isMe) {
        const ctx = this.ctx;
        const head = player.body[0];

        ctx.font = 'bold 12px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Draw text shadow for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText(player.username, head.x + 1, head.y - 18 + 1);

        // Draw username
        ctx.fillStyle = isMe ? '#fff' : color;
        ctx.fillText(player.username, head.x, head.y - 18);

        // Add "(You)" indicator for own snake
        if (isMe) {
            ctx.font = '10px Orbitron, sans-serif';
            ctx.fillStyle = '#05ffa1';
            ctx.fillText('(You)', head.x, head.y - 6);
        }

        // Show [DEAD] if not alive
        if (!player.alive) {
            ctx.font = 'bold 10px Orbitron, sans-serif';
            ctx.fillStyle = '#ff2a6d';
            ctx.fillText('[DEAD]', head.x, head.y - 6);
        }
    },

    drawBoostTrail(player, color) {
        const ctx = this.ctx;

        // Draw particles behind the snake when boosting
        if (player.body.length < 3) return;

        for (let i = 0; i < 3; i++) {
            const idx = Math.min(player.body.length - 1, 2 + i * 2);
            const seg = player.body[idx];

            ctx.globalAlpha = 0.3 - i * 0.1;
            ctx.beginPath();
            ctx.arc(
                seg.x + (Math.random() - 0.5) * 10,
                seg.y + (Math.random() - 0.5) * 10,
                3 + Math.random() * 3,
                0, Math.PI * 2
            );
            ctx.fillStyle = color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    drawUI() {
        const ctx = this.ctx;

        // Leaderboard in top-right corner
        ctx.font = 'bold 14px Orbitron, sans-serif';
        ctx.textAlign = 'right';

        // Sort players by round wins, then by score
        const sortedPlayers = [...this.state.players]
            .map((p, i) => ({ ...p, index: i }))
            .sort((a, b) => b.roundWins - a.roundWins || b.score - a.score);

        const leaderboardX = this.canvas.width - 10;
        const leaderboardWidth = 250;
        const leaderboardHeight = 40 + sortedPlayers.length * 24;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(leaderboardX - leaderboardWidth, 10, leaderboardWidth, leaderboardHeight);

        // Title
        ctx.fillStyle = '#fff';
        ctx.fillText('LEADERBOARD', leaderboardX - 10, 32);

        // Player list
        for (let i = 0; i < sortedPlayers.length; i++) {
            const p = sortedPlayers[i];
            const color = p.color || this.config.colors[p.index % 6];
            const y = 58 + i * 24;
            const status = p.alive ? '' : ' [DEAD]';
            const isMe = p.index === App.playerIndex;

            // Highlight current player
            if (isMe) {
                ctx.fillStyle = 'rgba(5, 255, 161, 0.2)';
                ctx.fillRect(leaderboardX - leaderboardWidth, y - 16, leaderboardWidth, 22);
            }

            ctx.fillStyle = color;
            ctx.fillText(
                `${p.username}: ${p.score} pts | Wins: ${p.roundWins}${status}`,
                leaderboardX - 10, y
            );
        }

        // Round indicator at top center
        ctx.textAlign = 'center';
        ctx.font = 'bold 18px Orbitron, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(
            `Round ${this.state.currentRound || 1} - First to ${this.state.roundsToWin} wins!`,
            this.canvas.width / 2, 30
        );
    },

    drawBoostIndicator() {
        const ctx = this.ctx;

        // Show boost status in bottom left
        ctx.font = 'bold 14px Orbitron, sans-serif';
        ctx.textAlign = 'left';

        if (this.boosting) {
            ctx.fillStyle = '#ff6b35';
            ctx.fillText('BOOST ACTIVE (losing mass)', 20, this.canvas.height - 20);
        } else {
            ctx.fillStyle = '#888';
            ctx.fillText('Hold SPACE or CLICK to boost', 20, this.canvas.height - 20);
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

        if (this.state.winner === App.playerIndex) {
            ctx.fillStyle = '#05ffa1';
            ctx.fillText('YOU WIN!', this.canvas.width / 2, this.canvas.height / 2 - 30);
        } else {
            ctx.fillStyle = '#ff2a6d';
            ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
            ctx.font = 'bold 28px Orbitron, sans-serif';
            ctx.fillStyle = '#fff';
            ctx.fillText(`${winnerName} wins!`, this.canvas.width / 2, this.canvas.height / 2 + 20);
        }

        ctx.font = '18px Orbitron, sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText('Click "Restart Game" to play again', this.canvas.width / 2, this.canvas.height / 2 + 70);
    },

    adjustBrightness(color, amount) {
        // Convert hex to RGB, adjust, convert back
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `rgb(${r}, ${g}, ${b})`;
    },

    cleanup() {
        // Remove event listeners
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
            this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
            this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
        }
        document.removeEventListener('keydown', this.keyDownHandler);
        document.removeEventListener('keyup', this.keyUpHandler);

        this.state = null;
        this.boosting = false;

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};
