// Tower Defense game renderer
const TowerDefenseRenderer = {
    canvas: null,
    ctx: null,
    state: null,
    config: null,
    selectedTower: null,
    selectedTowerType: 'archer',
    hoveredCell: null,
    showRangeFor: null,

    // Tower colors
    TOWER_COLORS: {
        archer: '#4CAF50',
        cannon: '#FF5722',
        mage: '#9C27B0',
        frost: '#00BCD4',
        poison: '#8BC34A',
        lightning: '#FFEB3B',
        barracks: '#795548',
        ultimate: '#E91E63'
    },

    // Enemy colors
    ENEMY_COLORS: {
        goblin: '#7CB342',
        orc: '#5D4037',
        orc_brute: '#3E2723',
        wolf_rider: '#FF8F00',
        troll: '#2E7D32',
        dark_mage: '#4A148C',
        bat: '#424242',
        wyvern: '#1565C0',
        golem: '#78909C',
        assassin: '#37474F',
        necromancer: '#6A1B9A',
        dragon: '#C62828',
        giant: '#4E342E',
        demon_knight: '#B71C1C',
        demon_king: '#880E4F'
    },

    // Tower costs for UI
    TOWER_COSTS: {
        archer: 100,
        cannon: 200,
        mage: 250,
        frost: 200,
        poison: 175,
        lightning: 300,
        barracks: 250,
        ultimate: 1000
    },

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 1200;
        this.canvas.height = 720;
        this.setupInput();
        this.startRenderLoop();
    },

    setupInput() {
        // Mouse move for hover effects
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.config) {
                const gridX = Math.floor(x / this.config.cellSize);
                const gridY = Math.floor(y / this.config.cellSize);

                if (gridX >= 0 && gridX < this.config.gridWidth &&
                    gridY >= 0 && gridY < this.config.gridHeight) {
                    this.hoveredCell = { x: gridX, y: gridY };
                } else {
                    this.hoveredCell = null;
                }
            }

            // Check if hovering over tower for range display
            this.showRangeFor = null;
            if (this.state && this.state.towers) {
                for (const tower of this.state.towers) {
                    const towerX = tower.x * this.config.cellSize + this.config.cellSize / 2;
                    const towerY = tower.y * this.config.cellSize + this.config.cellSize / 2;
                    const dist = Math.sqrt((x - towerX) ** 2 + (y - towerY) ** 2);
                    if (dist < this.config.cellSize / 2) {
                        this.showRangeFor = tower.id;
                        break;
                    }
                }
            }
        });

        // Click to place/select towers
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check if clicking on UI panel (right side)
            if (x > 960) {
                this.handleUIClick(x - 960, y);
                return;
            }

            if (!this.config) return;

            const gridX = Math.floor(x / this.config.cellSize);
            const gridY = Math.floor(y / this.config.cellSize);

            // Check if clicking on existing tower
            if (this.state && this.state.towers) {
                for (const tower of this.state.towers) {
                    if (tower.x === gridX && tower.y === gridY) {
                        this.selectedTower = tower;
                        return;
                    }
                }
            }

            // Try to place tower
            this.selectedTower = null;
            if (this.canPlaceTower(gridX, gridY)) {
                socket.send('input', {
                    action: 'place_tower',
                    type: this.selectedTowerType,
                    x: gridX,
                    y: gridY
                });
            }
        });

        // Right click to deselect
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.selectedTower = null;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.state) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (!this.state.waveActive) {
                        socket.send('input', { action: 'start_wave' });
                    }
                    break;
                case 'f':
                    socket.send('input', { action: 'fast_forward', enabled: !this.state.fastForward });
                    break;
                case '1': this.selectedTowerType = 'archer'; break;
                case '2': this.selectedTowerType = 'cannon'; break;
                case '3': this.selectedTowerType = 'mage'; break;
                case '4': this.selectedTowerType = 'frost'; break;
                case '5': this.selectedTowerType = 'poison'; break;
                case '6': this.selectedTowerType = 'lightning'; break;
                case '7': this.selectedTowerType = 'barracks'; break;
                case '8': this.selectedTowerType = 'ultimate'; break;
                case 's':
                    if (this.selectedTower) {
                        socket.send('input', { action: 'sell_tower', towerId: this.selectedTower.id });
                        this.selectedTower = null;
                    }
                    break;
                case 'u':
                    if (this.selectedTower) {
                        socket.send('input', { action: 'upgrade_tower', towerId: this.selectedTower.id });
                    }
                    break;
            }
        });
    },

    handleUIClick(x, y) {
        // Tower selection buttons (in sidebar)
        const towerTypes = ['archer', 'cannon', 'mage', 'frost', 'poison', 'lightning', 'barracks', 'ultimate'];
        const buttonHeight = 50;
        const startY = 150;

        for (let i = 0; i < towerTypes.length; i++) {
            const btnY = startY + i * (buttonHeight + 10);
            if (y >= btnY && y < btnY + buttonHeight && x >= 10 && x < 220) {
                this.selectedTowerType = towerTypes[i];
                this.selectedTower = null;
                return;
            }
        }

        // Start wave button
        if (y >= 620 && y < 670 && x >= 10 && x < 220) {
            if (this.state && !this.state.waveActive) {
                socket.send('input', { action: 'start_wave' });
            }
        }

        // Selected tower actions
        if (this.selectedTower) {
            // Upgrade button
            if (y >= 520 && y < 555 && x >= 10 && x < 110) {
                socket.send('input', { action: 'upgrade_tower', towerId: this.selectedTower.id });
            }
            // Sell button
            if (y >= 520 && y < 555 && x >= 120 && x < 220) {
                socket.send('input', { action: 'sell_tower', towerId: this.selectedTower.id });
                this.selectedTower = null;
            }
            // Targeting buttons
            const targets = ['first', 'last', 'strongest', 'weakest', 'closest'];
            for (let i = 0; i < targets.length; i++) {
                const btnY = 560 + Math.floor(i / 3) * 30;
                const btnX = 10 + (i % 3) * 73;
                if (y >= btnY && y < btnY + 25 && x >= btnX && x < btnX + 70) {
                    socket.send('input', { action: 'set_targeting', towerId: this.selectedTower.id, priority: targets[i] });
                }
            }
        }
    },

    canPlaceTower(x, y) {
        if (!this.state || !this.state.map) return false;
        if (x < 0 || x >= this.config.gridWidth || y < 0 || y >= this.config.gridHeight) return false;

        // Check map cell (0 = EMPTY, 1 = PATH, 2 = BLOCKED)
        if (this.state.map[y][x] !== 0) return false;

        // Check existing towers
        for (const tower of this.state.towers) {
            if (tower.x === x && tower.y === y) return false;
        }

        // Check cost
        const cost = this.TOWER_COSTS[this.selectedTowerType];
        if (this.state.gold < cost) return false;

        // Check ultimate unlock
        if (this.selectedTowerType === 'ultimate' && this.state.wave < 40) return false;

        return true;
    },

    startRenderLoop() {
        const render = () => {
            this.render();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    },

    updateState(state) {
        this.state = state;
        this.config = state.config;

        // Update selected tower reference
        if (this.selectedTower && state.towers) {
            const updated = state.towers.find(t => t.id === this.selectedTower.id);
            this.selectedTower = updated || null;
        }
    },

    render() {
        if (!this.ctx) return;

        const ctx = this.ctx;
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.state || !this.config) {
            ctx.fillStyle = '#8b949e';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Waiting for game to start...', 480, 360);
            return;
        }

        this.renderMap();
        this.renderPath();
        this.renderTowers();
        this.renderEnemies();
        this.renderProjectiles();
        this.renderHoverPreview();
        this.renderUI();

        // Game over / Victory overlay
        if (this.state.gameOver || this.state.victory) {
            this.renderEndScreen();
        }
    },

    renderMap() {
        const ctx = this.ctx;
        const cellSize = this.config.cellSize;

        for (let y = 0; y < this.config.gridHeight; y++) {
            for (let x = 0; x < this.config.gridWidth; x++) {
                const cell = this.state.map[y][x];
                const px = x * cellSize;
                const py = y * cellSize;

                if (cell === 0) {
                    // Buildable - grass with texture
                    this.drawGrassTile(ctx, px, py, cellSize, x, y);
                } else if (cell === 1) {
                    // Path - cobblestone
                    this.drawPathTile(ctx, px, py, cellSize, x, y);
                } else {
                    // Blocked - decorative rocks/trees
                    this.drawBlockedTile(ctx, px, py, cellSize, x, y);
                }
            }
        }

        // Subtle grid overlay
        ctx.strokeStyle = 'rgba(33, 38, 45, 0.5)';
        ctx.lineWidth = 1;
        for (let y = 0; y <= this.config.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(this.config.gridWidth * cellSize, y * cellSize);
            ctx.stroke();
        }
        for (let x = 0; x <= this.config.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, this.config.gridHeight * cellSize);
            ctx.stroke();
        }
    },

    // Draw textured grass tile
    drawGrassTile(ctx, px, py, size, gridX, gridY) {
        // Base grass color with slight variation
        const variation = ((gridX * 7 + gridY * 13) % 3) * 0.02;
        ctx.fillStyle = `rgb(${30 + variation * 100}, ${58 + variation * 50}, ${47 + variation * 30})`;
        ctx.fillRect(px, py, size, size);

        // Grass texture (small dots/blades)
        ctx.fillStyle = 'rgba(40, 80, 60, 0.4)';
        const seed = gridX * 100 + gridY;
        for (let i = 0; i < 8; i++) {
            const sx = px + ((seed * (i + 1) * 17) % size);
            const sy = py + ((seed * (i + 1) * 23) % size);
            ctx.fillRect(sx, sy, 2, 4);
        }

        // Occasional flower or small detail
        if ((gridX + gridY) % 7 === 0) {
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(px + size * 0.3, py + size * 0.7, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if ((gridX * 3 + gridY * 5) % 11 === 0) {
            ctx.fillStyle = '#81c784';
            ctx.beginPath();
            ctx.arc(px + size * 0.6, py + size * 0.4, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // Draw cobblestone path tile
    drawPathTile(ctx, px, py, size, gridX, gridY) {
        // Base path color
        ctx.fillStyle = '#5d5d7a';
        ctx.fillRect(px, py, size, size);

        // Cobblestone pattern
        ctx.fillStyle = '#4a4a6a';
        const stonePattern = [
            [0.1, 0.1, 0.35, 0.4],
            [0.5, 0.05, 0.45, 0.35],
            [0.05, 0.55, 0.4, 0.4],
            [0.5, 0.45, 0.45, 0.5]
        ];

        for (const [sx, sy, sw, sh] of stonePattern) {
            ctx.fillStyle = ((gridX + gridY) % 2 === 0) ? '#4a4a6a' : '#525278';
            ctx.beginPath();
            ctx.roundRect(px + sx * size, py + sy * size, sw * size * 0.9, sh * size * 0.9, 3);
            ctx.fill();
        }

        // Stone highlights
        ctx.fillStyle = 'rgba(100, 100, 140, 0.3)';
        ctx.fillRect(px + 4, py + 4, size * 0.3, 2);
        ctx.fillRect(px + size * 0.5, py + size * 0.5, size * 0.25, 2);

        // Worn path edges
        ctx.fillStyle = 'rgba(80, 80, 100, 0.4)';
        ctx.fillRect(px, py, size, 2);
        ctx.fillRect(px, py + size - 2, size, 2);
    },

    // Draw blocked/decorative tile
    drawBlockedTile(ctx, px, py, size, gridX, gridY) {
        // Dark base
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(px, py, size, size);

        const decorType = (gridX * 3 + gridY * 7) % 4;

        if (decorType === 0 || decorType === 1) {
            // Draw rock formation
            this.drawRockDecoration(ctx, px, py, size);
        } else {
            // Draw tree
            this.drawTreeDecoration(ctx, px, py, size);
        }
    },

    // Draw rock formation
    drawRockDecoration(ctx, px, py, size) {
        const cx = px + size / 2;
        const cy = py + size / 2;

        // Large rock
        ctx.fillStyle = '#455a64';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 4, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock top
        ctx.fillStyle = '#546e7a';
        ctx.beginPath();
        ctx.ellipse(cx, cy, size * 0.35, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#607d8b';
        ctx.beginPath();
        ctx.ellipse(cx - 4, cy - 4, size * 0.15, size * 0.1, -0.5, 0, Math.PI * 2);
        ctx.fill();

        // Small rocks
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.arc(cx - size * 0.3, cy + size * 0.2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + size * 0.25, cy + size * 0.25, 5, 0, Math.PI * 2);
        ctx.fill();
    },

    // Draw tree decoration
    drawTreeDecoration(ctx, px, py, size) {
        const cx = px + size / 2;
        const cy = py + size / 2;

        // Tree shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + size * 0.35, size * 0.35, size * 0.15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(cx - 4, cy, 8, size * 0.35);

        // Foliage layers
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, size * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#388e3c';
        ctx.beginPath();
        ctx.arc(cx - 4, cy + 4, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 6, cy + 2, size * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Highlights
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 6, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
    },

    renderPath() {
        const ctx = this.ctx;
        const path = this.state.path;
        const cellSize = this.config.cellSize;

        if (!path || path.length < 2) return;

        // Draw spawn portal
        const spawn = path[0];
        this.drawSpawnPortal(ctx, spawn.x * cellSize + cellSize / 2, spawn.y * cellSize + cellSize / 2);

        // Draw castle at end
        const end = path[path.length - 1];
        this.drawCastle(ctx, end.x * cellSize + cellSize / 2, end.y * cellSize + cellSize / 2);
    },

    // Draw spawn portal
    drawSpawnPortal(ctx, x, y) {
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3) * 0.2 + 0.8;

        // Outer glow
        ctx.fillStyle = `rgba(76, 175, 80, ${0.2 * pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();

        // Portal ring
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.stroke();

        // Inner portal
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();

        // Swirl effect
        ctx.strokeStyle = '#81c784';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const angle = time * 2 + i * Math.PI * 2 / 3;
            ctx.beginPath();
            ctx.arc(x, y, 10, angle, angle + Math.PI / 2);
            ctx.stroke();
        }

        // Center glow
        ctx.fillStyle = '#a5d6a7';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Arrow indicating direction
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(x + 24, y);
        ctx.lineTo(x + 16, y - 6);
        ctx.lineTo(x + 16, y + 6);
        ctx.closePath();
        ctx.fill();
    },

    // Draw castle
    drawCastle(ctx, x, y) {
        const time = Date.now() / 1000;

        // Castle shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(x + 4, y + 20, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Main castle body
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x - 18, y - 10, 36, 30);

        // Castle front face
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(x - 16, y - 8, 32, 26);

        // Door
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.moveTo(x - 6, y + 18);
        ctx.lineTo(x - 6, y + 4);
        ctx.arc(x, y + 4, 6, Math.PI, 0);
        ctx.lineTo(x + 6, y + 18);
        ctx.fill();

        // Door handle
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x + 3, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();

        // Windows
        ctx.fillStyle = '#ffeb3b';
        ctx.globalAlpha = 0.6 + Math.sin(time * 2) * 0.2;
        ctx.fillRect(x - 12, y - 2, 6, 8);
        ctx.fillRect(x + 6, y - 2, 6, 8);
        ctx.globalAlpha = 1;

        // Tower left
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x - 22, y - 20, 12, 40);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(x - 20, y - 18, 8, 36);

        // Tower right
        ctx.fillRect(x + 10, y - 20, 12, 40);
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(x + 12, y - 18, 8, 36);

        // Battlements left
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(x - 24, y - 24, 4, 6);
        ctx.fillRect(x - 18, y - 24, 4, 6);
        ctx.fillRect(x - 12, y - 24, 4, 6);

        // Battlements right
        ctx.fillRect(x + 8, y - 24, 4, 6);
        ctx.fillRect(x + 14, y - 24, 4, 6);
        ctx.fillRect(x + 20, y - 24, 4, 6);

        // Battlements center
        ctx.fillRect(x - 6, y - 14, 4, 4);
        ctx.fillRect(x + 2, y - 14, 4, 4);

        // Flags
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x - 18, y - 34, 2, 14);
        ctx.fillRect(x + 16, y - 34, 2, 14);

        // Flag cloth (waving)
        const wave = Math.sin(time * 4) * 2;
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.moveTo(x - 16, y - 34);
        ctx.quadraticCurveTo(x - 8, y - 32 + wave, x - 16, y - 26);
        ctx.lineTo(x - 16, y - 34);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 18, y - 34);
        ctx.quadraticCurveTo(x + 26, y - 32 + wave, x + 18, y - 26);
        ctx.lineTo(x + 18, y - 34);
        ctx.fill();

        // Lives indicator (hearts around castle)
        if (this.state && this.state.lives !== undefined) {
            ctx.fillStyle = '#f44336';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`♥ ${this.state.lives}`, x, y + 32);
        }
    },

    renderTowers() {
        const ctx = this.ctx;
        const cellSize = this.config.cellSize;

        for (const tower of this.state.towers) {
            const x = tower.x * cellSize + cellSize / 2;
            const y = tower.y * cellSize + cellSize / 2;
            const isSelected = this.selectedTower && this.selectedTower.id === tower.id;
            const showRange = this.showRangeFor === tower.id || isSelected;

            // Range indicator
            if (showRange) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, tower.range, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Draw tower based on type
            ctx.save();
            ctx.translate(x, y);

            switch (tower.type) {
                case 'archer': this.drawArcherTower(ctx, tower); break;
                case 'cannon': this.drawCannonTower(ctx, tower); break;
                case 'mage': this.drawMageTower(ctx, tower); break;
                case 'frost': this.drawFrostTower(ctx, tower); break;
                case 'poison': this.drawPoisonTower(ctx, tower); break;
                case 'lightning': this.drawLightningTower(ctx, tower); break;
                case 'barracks': this.drawBarracksTower(ctx, tower); break;
                case 'ultimate': this.drawUltimateTower(ctx, tower); break;
                default: this.drawDefaultTower(ctx, tower); break;
            }

            ctx.restore();

            // Level stars
            if (tower.level > 0) {
                ctx.fillStyle = '#ffd700';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                for (let i = 0; i < tower.level; i++) {
                    ctx.fillText('★', x - 8 + i * 8, y - 20);
                }
            }

            // Selection ring
            if (isSelected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(x, y, 24, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    },

    // Archer Tower - Wooden platform with archer figure
    drawArcherTower(ctx, tower) {
        const level = tower.level;

        // Wooden base platform
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-16, -8, 32, 20);
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-14, -6, 28, 16);

        // Wooden supports
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-18, 4, 6, 12);
        ctx.fillRect(12, 4, 6, 12);

        // Archer body (green tunic)
        ctx.fillStyle = level >= 2 ? '#2e7d32' : '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(0, -4, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Archer head
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(0, -14, 5, 0, Math.PI * 2);
        ctx.fill();

        // Hood/hat
        ctx.fillStyle = level >= 2 ? '#1b5e20' : '#388e3c';
        ctx.beginPath();
        ctx.arc(0, -16, 4, Math.PI, 0);
        ctx.fill();

        // Bow
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8, -8, 10, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();

        // Bowstring
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, -16);
        ctx.lineTo(8, 0);
        ctx.stroke();

        // Level 3: Arrow quiver
        if (level >= 3) {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(-10, -10, 4, 12);
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(-9, -14, 2, 6);
            ctx.fillRect(-9, -14, 2, 6);
        }
    },

    // Cannon Tower - Stone platform with rotating barrel
    drawCannonTower(ctx, tower) {
        const level = tower.level;
        const time = Date.now() / 1000;

        // Stone base (circular platform)
        ctx.fillStyle = '#546e7a';
        ctx.beginPath();
        ctx.arc(0, 4, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#455a64';
        ctx.beginPath();
        ctx.arc(0, 2, 16, 0, Math.PI * 2);
        ctx.fill();

        // Brick pattern
        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 1;
        for (let i = -12; i <= 12; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, -8);
            ctx.lineTo(i, 10);
            ctx.stroke();
        }

        // Cannon body
        const cannonColor = level >= 2 ? '#4a4a4a' : '#616161';
        ctx.fillStyle = cannonColor;
        ctx.fillRect(-6, -16, 12, 20);

        // Cannon barrel
        ctx.fillStyle = level >= 3 ? '#b71c1c' : '#424242';
        ctx.beginPath();
        ctx.moveTo(-4, -16);
        ctx.lineTo(-6, -24);
        ctx.lineTo(6, -24);
        ctx.lineTo(4, -16);
        ctx.fill();

        // Cannon wheel (left)
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(-10, 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cannon wheel (right)
        ctx.beginPath();
        ctx.arc(10, 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Cannonball stack (level 3)
        if (level >= 3) {
            ctx.fillStyle = '#212121';
            ctx.beginPath();
            ctx.arc(-14, -4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-10, -4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(-12, -8, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // Mage Tower - Crystal spire with floating orb
    drawMageTower(ctx, tower) {
        const level = tower.level;
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3) * 0.2 + 0.8;

        // Base platform (mystical stone)
        ctx.fillStyle = '#4a148c';
        ctx.beginPath();
        ctx.moveTo(-16, 10);
        ctx.lineTo(-12, -2);
        ctx.lineTo(12, -2);
        ctx.lineTo(16, 10);
        ctx.closePath();
        ctx.fill();

        // Spire body
        const gradient = ctx.createLinearGradient(0, -20, 0, 10);
        gradient.addColorStop(0, '#7b1fa2');
        gradient.addColorStop(1, '#4a148c');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(-8, 8);
        ctx.lineTo(-4, -18);
        ctx.lineTo(4, -18);
        ctx.lineTo(8, 8);
        ctx.closePath();
        ctx.fill();

        // Spire tip
        ctx.fillStyle = '#9c27b0';
        ctx.beginPath();
        ctx.moveTo(-4, -18);
        ctx.lineTo(0, -26);
        ctx.lineTo(4, -18);
        ctx.closePath();
        ctx.fill();

        // Floating orb
        const orbY = -10 + Math.sin(time * 2) * 3;
        const orbSize = 6 * pulse;

        // Orb glow
        ctx.fillStyle = `rgba(186, 104, 200, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, orbY, orbSize + 4, 0, Math.PI * 2);
        ctx.fill();

        // Orb
        ctx.fillStyle = level >= 2 ? '#e040fb' : '#ce93d8';
        ctx.beginPath();
        ctx.arc(0, orbY, orbSize, 0, Math.PI * 2);
        ctx.fill();

        // Orb highlight
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, orbY - 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Magic runes (level 3)
        if (level >= 3) {
            ctx.strokeStyle = '#e1bee7';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 6, 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    // Frost Tower - Ice crystal formation
    drawFrostTower(ctx, tower) {
        const level = tower.level;
        const time = Date.now() / 1000;

        // Ice base
        ctx.fillStyle = '#4dd0e1';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(-14, 12);
        ctx.lineTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.lineTo(14, 12);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main ice crystal
        const crystalGradient = ctx.createLinearGradient(0, -24, 0, 8);
        crystalGradient.addColorStop(0, '#e0f7fa');
        crystalGradient.addColorStop(0.5, '#80deea');
        crystalGradient.addColorStop(1, '#00bcd4');
        ctx.fillStyle = crystalGradient;

        ctx.beginPath();
        ctx.moveTo(0, -24);
        ctx.lineTo(-8, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();

        // Crystal shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(-2, -20);
        ctx.lineTo(-4, -8);
        ctx.lineTo(-1, -8);
        ctx.lineTo(0, -18);
        ctx.closePath();
        ctx.fill();

        // Side crystals
        ctx.fillStyle = '#4dd0e1';
        // Left crystal
        ctx.beginPath();
        ctx.moveTo(-12, 4);
        ctx.lineTo(-16, -8);
        ctx.lineTo(-8, -4);
        ctx.closePath();
        ctx.fill();

        // Right crystal
        ctx.beginPath();
        ctx.moveTo(12, 4);
        ctx.lineTo(16, -8);
        ctx.lineTo(8, -4);
        ctx.closePath();
        ctx.fill();

        // Cold aura particles (level 2+)
        if (level >= 2) {
            ctx.fillStyle = 'rgba(224, 247, 250, 0.6)';
            for (let i = 0; i < 5; i++) {
                const angle = (time + i * 1.2) % (Math.PI * 2);
                const dist = 16 + Math.sin(time * 2 + i) * 4;
                const px = Math.cos(angle) * dist;
                const py = Math.sin(angle) * dist - 4;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },

    // Poison Tower - Bubbling cauldron
    drawPoisonTower(ctx, tower) {
        const level = tower.level;
        const time = Date.now() / 1000;

        // Cauldron base
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.ellipse(0, 8, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cauldron body
        ctx.fillStyle = '#455a64';
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI);
        ctx.fill();

        // Cauldron rim
        ctx.fillStyle = '#546e7a';
        ctx.beginPath();
        ctx.ellipse(0, -2, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Poison liquid
        ctx.fillStyle = level >= 2 ? '#76ff03' : '#8bc34a';
        ctx.beginPath();
        ctx.ellipse(0, -2, 12, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bubbles
        ctx.fillStyle = '#c5e1a5';
        const bubbleCount = level >= 3 ? 6 : 4;
        for (let i = 0; i < bubbleCount; i++) {
            const bx = Math.sin(time * 2 + i * 1.5) * 8;
            const by = -4 - ((time * 20 + i * 15) % 12);
            const bs = 2 + Math.sin(time + i) * 1;
            ctx.globalAlpha = 1 - (by + 16) / 12 * 0.7;
            ctx.beginPath();
            ctx.arc(bx, by, bs, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Poison drips (level 3)
        if (level >= 3) {
            ctx.fillStyle = '#8bc34a';
            const dripY = (time * 30) % 20;
            ctx.beginPath();
            ctx.ellipse(-10, 8 + dripY, 2, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Skull decoration
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(0, 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#37474f';
        ctx.beginPath();
        ctx.arc(-2, 3, 1.5, 0, Math.PI * 2);
        ctx.arc(2, 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
    },

    // Lightning Tower - Tesla coil with electric arcs
    drawLightningTower(ctx, tower) {
        const level = tower.level;
        const time = Date.now() / 1000;

        // Metal base
        ctx.fillStyle = '#546e7a';
        ctx.fillRect(-12, 4, 24, 12);

        // Base detail
        ctx.fillStyle = '#78909c';
        ctx.fillRect(-10, 6, 20, 4);

        // Central coil post
        ctx.fillStyle = '#455a64';
        ctx.fillRect(-4, -20, 8, 28);

        // Coil rings
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(0, -4 - i * 5, 8, 3, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Top sphere
        ctx.fillStyle = level >= 2 ? '#ffc107' : '#ffeb3b';
        ctx.beginPath();
        ctx.arc(0, -22, 6, 0, Math.PI * 2);
        ctx.fill();

        // Electric glow
        ctx.fillStyle = 'rgba(255, 235, 59, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -22, 10, 0, Math.PI * 2);
        ctx.fill();

        // Lightning arcs
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 2;
        const arcCount = level >= 3 ? 4 : 2;
        for (let i = 0; i < arcCount; i++) {
            const angle = (time * 3 + i * Math.PI / 2) % (Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(0, -22);
            const midX = Math.cos(angle) * 12 + (Math.random() - 0.5) * 4;
            const midY = -22 + Math.sin(angle) * 10 + (Math.random() - 0.5) * 4;
            ctx.lineTo(midX, midY);
            ctx.lineTo(midX + (Math.random() - 0.5) * 8, midY + 8);
            ctx.stroke();
        }
    },

    // Barracks Tower - Small fort with knight
    drawBarracksTower(ctx, tower) {
        const level = tower.level;

        // Fort base (stone wall)
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-18, -4, 36, 20);

        // Battlements
        ctx.fillStyle = '#4e342e';
        for (let i = -16; i <= 12; i += 8) {
            ctx.fillRect(i, -12, 6, 8);
        }

        // Door
        ctx.fillStyle = '#3e2723';
        ctx.beginPath();
        ctx.moveTo(-6, 16);
        ctx.lineTo(-6, 4);
        ctx.arc(0, 4, 6, Math.PI, 0);
        ctx.lineTo(6, 16);
        ctx.fill();

        // Knight figure
        // Body armor
        ctx.fillStyle = level >= 2 ? '#c0c0c0' : '#9e9e9e';
        ctx.fillRect(-4, -8, 8, 12);

        // Helmet
        ctx.fillStyle = level >= 2 ? '#bdbdbd' : '#757575';
        ctx.beginPath();
        ctx.arc(0, -12, 5, 0, Math.PI * 2);
        ctx.fill();

        // Helmet visor
        ctx.fillStyle = '#424242';
        ctx.fillRect(-3, -12, 6, 2);

        // Shield
        ctx.fillStyle = level >= 3 ? '#f44336' : '#795548';
        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(-10, 4);
        ctx.lineTo(-6, 8);
        ctx.lineTo(-6, -6);
        ctx.closePath();
        ctx.fill();

        // Sword
        ctx.fillStyle = '#bdbdbd';
        ctx.fillRect(6, -16, 2, 20);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(4, -4, 6, 2);

        // Banner (level 3)
        if (level >= 3) {
            ctx.fillStyle = '#f44336';
            ctx.beginPath();
            ctx.moveTo(14, -16);
            ctx.lineTo(14, -4);
            ctx.lineTo(20, -10);
            ctx.closePath();
            ctx.fill();
        }
    },

    // Ultimate Tower - Grand tower with golden glow
    drawUltimateTower(ctx, tower) {
        const level = tower.level;
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 2) * 0.15 + 0.85;

        // Golden aura
        ctx.fillStyle = `rgba(255, 215, 0, ${0.2 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, -4, 28, 0, Math.PI * 2);
        ctx.fill();

        // Grand base
        const baseGradient = ctx.createLinearGradient(-18, 0, 18, 0);
        baseGradient.addColorStop(0, '#5d4037');
        baseGradient.addColorStop(0.5, '#8d6e63');
        baseGradient.addColorStop(1, '#5d4037');
        ctx.fillStyle = baseGradient;
        ctx.fillRect(-18, 4, 36, 14);

        // Tower body
        const towerGradient = ctx.createLinearGradient(0, -24, 0, 8);
        towerGradient.addColorStop(0, '#ffd54f');
        towerGradient.addColorStop(0.5, '#e91e63');
        towerGradient.addColorStop(1, '#880e4f');
        ctx.fillStyle = towerGradient;

        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(-8, -16);
        ctx.lineTo(8, -16);
        ctx.lineTo(12, 8);
        ctx.closePath();
        ctx.fill();

        // Tower top
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(-8, -16);
        ctx.lineTo(0, -28);
        ctx.lineTo(8, -16);
        ctx.closePath();
        ctx.fill();

        // Crown jewel
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(0, -20, 4, 0, Math.PI * 2);
        ctx.fill();

        // Jewel glow
        ctx.fillStyle = 'rgba(255, 23, 68, 0.4)';
        ctx.beginPath();
        ctx.arc(0, -20, 6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Side ornaments
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(-14, -2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(14, -2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Energy particles (level 2+)
        if (level >= 2) {
            ctx.fillStyle = '#ffd700';
            for (let i = 0; i < 6; i++) {
                const angle = time * 2 + i * Math.PI / 3;
                const dist = 20 + Math.sin(time * 3 + i) * 3;
                const px = Math.cos(angle) * dist;
                const py = Math.sin(angle) * dist - 8;
                ctx.globalAlpha = 0.7 + Math.sin(time * 4 + i) * 0.3;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    },

    // Default tower fallback
    drawDefaultTower(ctx, tower) {
        const color = this.TOWER_COLORS[tower.type] || '#888';
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tower.type[0].toUpperCase(), 0, 5);
    },

    renderEnemies() {
        const ctx = this.ctx;
        const time = Date.now() / 1000;

        for (const enemy of this.state.enemies) {
            ctx.save();
            ctx.translate(enemy.x, enemy.y);

            // Walking bob animation
            const bobAmount = enemy.flying ? 0 : Math.sin(time * 10 + enemy.id) * 2;
            ctx.translate(0, bobAmount);

            // Camo effect (semi-transparent)
            if (enemy.camo) {
                ctx.globalAlpha = 0.5 + Math.sin(time * 3) * 0.2;
            }

            // Draw enemy based on type
            switch (enemy.type) {
                case 'goblin': this.drawGoblin(ctx, enemy); break;
                case 'orc': this.drawOrc(ctx, enemy); break;
                case 'orc_brute': this.drawOrcBrute(ctx, enemy); break;
                case 'wolf_rider': this.drawWolfRider(ctx, enemy); break;
                case 'troll': this.drawTroll(ctx, enemy, time); break;
                case 'dark_mage': this.drawDarkMage(ctx, enemy, time); break;
                case 'bat': this.drawBatSwarm(ctx, enemy, time); break;
                case 'wyvern': this.drawWyvern(ctx, enemy, time); break;
                case 'golem': this.drawGolem(ctx, enemy); break;
                case 'assassin': this.drawAssassin(ctx, enemy); break;
                case 'necromancer': this.drawNecromancer(ctx, enemy, time); break;
                case 'dragon': this.drawDragon(ctx, enemy, time); break;
                case 'giant': this.drawGiant(ctx, enemy); break;
                case 'demon_knight': this.drawDemonKnight(ctx, enemy); break;
                case 'demon_king': this.drawDemonKing(ctx, enemy, time); break;
                default: this.drawDefaultEnemy(ctx, enemy); break;
            }

            ctx.globalAlpha = 1;
            ctx.restore();

            // Health bar (outside transform)
            this.drawEnemyHealthBar(ctx, enemy);

            // Effect indicators
            this.drawEnemyEffects(ctx, enemy);
        }
    },

    drawEnemyHealthBar(ctx, enemy) {
        const hpPercent = enemy.hp / enemy.maxHp;
        const isBoss = ['dragon', 'giant', 'demon_knight', 'demon_king'].includes(enemy.type);
        const barWidth = isBoss ? 40 : 24;
        const barHeight = isBoss ? 6 : 4;
        const barX = enemy.x - barWidth / 2;
        const barY = enemy.y - (isBoss ? 28 : 18);

        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

        // Health gradient
        const healthColor = hpPercent > 0.6 ? '#4CAF50' : hpPercent > 0.3 ? '#FF9800' : '#f44336';
        ctx.fillStyle = healthColor;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

        // Boss outline
        if (isBoss) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        }
    },

    drawEnemyEffects(ctx, enemy) {
        if (!enemy.effects || enemy.effects.length === 0) return;

        let effectX = enemy.x - (enemy.effects.length - 1) * 4;
        for (const effect of enemy.effects) {
            // 0=SLOW, 1=POISON, 2=BURN
            const colors = ['#00BCD4', '#8BC34A', '#FF5722'];
            ctx.fillStyle = colors[effect] || '#fff';
            ctx.beginPath();
            ctx.arc(effectX, enemy.y + 14, 3, 0, Math.PI * 2);
            ctx.fill();
            effectX += 8;
        }
    },

    // Goblin - Small green creature
    drawGoblin(ctx, enemy) {
        // Body
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.ellipse(0, 2, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#8BC34A';
        ctx.beginPath();
        ctx.arc(0, -8, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pointy ears
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.moveTo(-5, -10);
        ctx.lineTo(-9, -14);
        ctx.lineTo(-4, -8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -10);
        ctx.lineTo(9, -14);
        ctx.lineTo(4, -8);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-2, -9, 2, 0, Math.PI * 2);
        ctx.arc(2, -9, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-2, -9, 1, 0, Math.PI * 2);
        ctx.arc(2, -9, 1, 0, Math.PI * 2);
        ctx.fill();

        // Small dagger
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(6, -2, 2, 8);
    },

    // Orc - Large muscular figure
    drawOrc(ctx, enemy) {
        // Body
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.ellipse(0, 2, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.arc(0, -10, 7, 0, Math.PI * 2);
        ctx.fill();

        // Jaw
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(0, -6, 5, 0, Math.PI);
        ctx.fill();

        // Tusks
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(-4, -5);
        ctx.lineTo(-6, -1);
        ctx.lineTo(-3, -3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -5);
        ctx.lineTo(6, -1);
        ctx.lineTo(3, -3);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ff5722';
        ctx.beginPath();
        ctx.arc(-3, -11, 2, 0, Math.PI * 2);
        ctx.arc(3, -11, 2, 0, Math.PI * 2);
        ctx.fill();

        // Weapon (axe)
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(10, -8, 3, 16);
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.moveTo(10, -8);
        ctx.lineTo(18, -4);
        ctx.lineTo(18, 2);
        ctx.lineTo(10, 0);
        ctx.fill();
    },

    // Orc Brute - Heavy armored orc
    drawOrcBrute(ctx, enemy) {
        // Armor body
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.ellipse(0, 2, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Armor plates
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-8, -4, 16, 12);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 2;
        ctx.strokeRect(-8, -4, 16, 12);

        // Head with helmet
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(0, -10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.arc(0, -12, 7, Math.PI, 0);
        ctx.fill();

        // Eye slits
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(-5, -11, 4, 2);
        ctx.fillRect(1, -11, 4, 2);

        // Spikes
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.moveTo(-6, -18);
        ctx.lineTo(-4, -12);
        ctx.lineTo(-8, -12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -18);
        ctx.lineTo(4, -12);
        ctx.lineTo(8, -12);
        ctx.fill();
    },

    // Wolf Rider - Orc on wolf
    drawWolfRider(ctx, enemy) {
        // Wolf body
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.ellipse(0, 6, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wolf head
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.ellipse(10, 2, 6, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Wolf ears
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.lineTo(6, -8);
        ctx.lineTo(10, -4);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.lineTo(14, -8);
        ctx.lineTo(12, -4);
        ctx.fill();

        // Orc rider
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.ellipse(-2, -4, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rider head
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.arc(-2, -12, 4, 0, Math.PI * 2);
        ctx.fill();

        // Spear
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(4, -18, 2, 20);
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath();
        ctx.moveTo(4, -18);
        ctx.lineTo(5, -24);
        ctx.lineTo(6, -18);
        ctx.fill();
    },

    // Troll - Regenerating monster
    drawTroll(ctx, enemy, time) {
        // Large body
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.arc(0, -12, 8, 0, Math.PI * 2);
        ctx.fill();

        // Warts
        ctx.fillStyle = '#1B5E20';
        ctx.beginPath();
        ctx.arc(-4, -14, 2, 0, Math.PI * 2);
        ctx.arc(5, -10, 2, 0, Math.PI * 2);
        ctx.arc(-6, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(-3, -13, 3, 0, Math.PI * 2);
        ctx.arc(3, -13, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-3, -13, 1.5, 0, Math.PI * 2);
        ctx.arc(3, -13, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Regeneration sparkles
        if (enemy.hp < enemy.maxHp) {
            ctx.fillStyle = '#76ff03';
            for (let i = 0; i < 3; i++) {
                const angle = time * 3 + i * 2;
                const px = Math.cos(angle) * 14;
                const py = Math.sin(angle) * 14;
                ctx.globalAlpha = 0.5 + Math.sin(time * 5 + i) * 0.3;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    },

    // Dark Mage - Hooded spellcaster
    drawDarkMage(ctx, enemy, time) {
        // Robe
        ctx.fillStyle = '#4A148C';
        ctx.beginPath();
        ctx.moveTo(-8, 12);
        ctx.lineTo(-6, -4);
        ctx.lineTo(6, -4);
        ctx.lineTo(8, 12);
        ctx.closePath();
        ctx.fill();

        // Hood
        ctx.fillStyle = '#311B92';
        ctx.beginPath();
        ctx.arc(0, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(0, -18);
        ctx.lineTo(8, -8);
        ctx.fill();

        // Face shadow
        ctx.fillStyle = '#1A0033';
        ctx.beginPath();
        ctx.ellipse(0, -6, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = '#e040fb';
        ctx.beginPath();
        ctx.arc(-2, -7, 2, 0, Math.PI * 2);
        ctx.arc(2, -7, 2, 0, Math.PI * 2);
        ctx.fill();

        // Magic orb
        const orbPulse = Math.sin(time * 4) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(156, 39, 176, ${orbPulse})`;
        ctx.beginPath();
        ctx.arc(10, -2, 5, 0, Math.PI * 2);
        ctx.fill();
    },

    // Bat Swarm - Multiple small bats
    drawBatSwarm(ctx, enemy, time) {
        ctx.fillStyle = '#424242';
        for (let i = 0; i < 5; i++) {
            const offsetX = Math.sin(time * 8 + i * 1.5) * 8;
            const offsetY = Math.cos(time * 6 + i * 1.2) * 6;

            ctx.save();
            ctx.translate(offsetX, offsetY);

            // Bat body
            ctx.beginPath();
            ctx.ellipse(0, 0, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Wings
            const wingFlap = Math.sin(time * 20 + i) * 0.5;
            ctx.beginPath();
            ctx.moveTo(-3, 0);
            ctx.quadraticCurveTo(-8, -4 + wingFlap * 4, -10, 2);
            ctx.lineTo(-3, 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(3, 0);
            ctx.quadraticCurveTo(8, -4 + wingFlap * 4, 10, 2);
            ctx.lineTo(3, 2);
            ctx.fill();

            ctx.restore();
        }
    },

    // Wyvern - Flying dragon-like creature
    drawWyvern(ctx, enemy, time) {
        const wingFlap = Math.sin(time * 8) * 0.4;

        // Body
        ctx.fillStyle = '#1565C0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#1976D2';
        ctx.beginPath();
        ctx.ellipse(10, -4, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.beginPath();
        ctx.moveTo(14, -4);
        ctx.lineTo(20, -2);
        ctx.lineTo(14, 0);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#0D47A1';
        ctx.save();
        ctx.rotate(wingFlap);
        ctx.beginPath();
        ctx.moveTo(-4, -2);
        ctx.quadraticCurveTo(-14, -20, -20, -8);
        ctx.lineTo(-8, 0);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.rotate(-wingFlap);
        ctx.beginPath();
        ctx.moveTo(4, -2);
        ctx.quadraticCurveTo(14, -20, 20, -8);
        ctx.lineTo(8, 0);
        ctx.fill();
        ctx.restore();

        // Tail
        ctx.beginPath();
        ctx.moveTo(-8, 2);
        ctx.quadraticCurveTo(-16, 8, -18, 4);
        ctx.lineTo(-10, 0);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(12, -5, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    // Golem - Magic immune stone creature
    drawGolem(ctx, enemy) {
        // Body (rocky)
        ctx.fillStyle = '#78909C';
        ctx.beginPath();
        ctx.moveTo(-10, 12);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-8, -8);
        ctx.lineTo(8, -8);
        ctx.lineTo(12, 0);
        ctx.lineTo(10, 12);
        ctx.closePath();
        ctx.fill();

        // Rock texture lines
        ctx.strokeStyle = '#546e7a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(-4, 8);
        ctx.moveTo(2, -6);
        ctx.lineTo(6, 6);
        ctx.stroke();

        // Head
        ctx.fillStyle = '#90A4AE';
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-4, -18);
        ctx.lineTo(4, -18);
        ctx.lineTo(8, -8);
        ctx.closePath();
        ctx.fill();

        // Glowing rune eyes
        ctx.fillStyle = '#00bcd4';
        ctx.beginPath();
        ctx.arc(-3, -12, 3, 0, Math.PI * 2);
        ctx.arc(3, -12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Magic immunity aura
        ctx.strokeStyle = 'rgba(0, 188, 212, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
    },

    // Assassin - Camo enemy
    drawAssassin(ctx, enemy) {
        // Cloak
        ctx.fillStyle = '#37474F';
        ctx.beginPath();
        ctx.moveTo(-6, 10);
        ctx.lineTo(-8, -2);
        ctx.lineTo(0, -6);
        ctx.lineTo(8, -2);
        ctx.lineTo(6, 10);
        ctx.closePath();
        ctx.fill();

        // Hood
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.arc(0, -8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, -8);
        ctx.lineTo(0, -16);
        ctx.lineTo(6, -8);
        ctx.fill();

        // Eyes (barely visible)
        ctx.fillStyle = '#b0bec5';
        ctx.beginPath();
        ctx.arc(-2, -8, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -8, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Daggers
        ctx.fillStyle = '#9e9e9e';
        ctx.fillRect(-12, -4, 6, 2);
        ctx.fillRect(6, -4, 6, 2);
    },

    // Necromancer - Resurrects dead
    drawNecromancer(ctx, enemy, time) {
        // Dark robe
        ctx.fillStyle = '#1A237E';
        ctx.beginPath();
        ctx.moveTo(-8, 12);
        ctx.lineTo(-6, -4);
        ctx.lineTo(6, -4);
        ctx.lineTo(8, 12);
        ctx.closePath();
        ctx.fill();

        // Hood
        ctx.fillStyle = '#0D1B4A';
        ctx.beginPath();
        ctx.arc(0, -8, 7, 0, Math.PI * 2);
        ctx.fill();

        // Skull face
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(0, -6, 5, 0, Math.PI * 2);
        ctx.fill();

        // Eye sockets
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-2, -7, 2, 0, Math.PI * 2);
        ctx.arc(2, -7, 2, 0, Math.PI * 2);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = '#7c4dff';
        ctx.beginPath();
        ctx.arc(-2, -7, 1, 0, Math.PI * 2);
        ctx.arc(2, -7, 1, 0, Math.PI * 2);
        ctx.fill();

        // Staff
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(10, -16, 3, 24);

        // Staff skull
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(11.5, -18, 4, 0, Math.PI * 2);
        ctx.fill();

        // Dark energy
        ctx.fillStyle = `rgba(124, 77, 255, ${0.3 + Math.sin(time * 4) * 0.2})`;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
    },

    // Dragon - Flying boss
    drawDragon(ctx, enemy, time) {
        const wingFlap = Math.sin(time * 6) * 0.5;

        // Body
        ctx.fillStyle = '#C62828';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Neck and head
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.ellipse(14, -6, 8, 5, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(22, -10, 6, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = '#B71C1C';
        ctx.beginPath();
        ctx.moveTo(26, -10);
        ctx.lineTo(34, -8);
        ctx.lineTo(26, -6);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#8B0000';
        ctx.save();
        ctx.rotate(wingFlap);
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.quadraticCurveTo(-24, -36, -30, -12);
        ctx.lineTo(-10, 0);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.rotate(-wingFlap);
        ctx.beginPath();
        ctx.moveTo(6, -4);
        ctx.quadraticCurveTo(24, -36, 30, -12);
        ctx.lineTo(10, 0);
        ctx.fill();
        ctx.restore();

        // Tail
        ctx.fillStyle = '#C62828';
        ctx.beginPath();
        ctx.moveTo(-14, 4);
        ctx.quadraticCurveTo(-28, 12, -32, 6);
        ctx.quadraticCurveTo(-30, 2, -24, 6);
        ctx.lineTo(-14, 2);
        ctx.fill();

        // Horns
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.moveTo(20, -14);
        ctx.lineTo(18, -22);
        ctx.lineTo(22, -14);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(24, -14);
        ctx.lineTo(26, -22);
        ctx.lineTo(28, -14);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(24, -11, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(24, -11, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Fire breath effect
        ctx.fillStyle = `rgba(255, 87, 34, ${0.3 + Math.sin(time * 8) * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(34, -8);
        ctx.quadraticCurveTo(44, -8, 48, -6);
        ctx.quadraticCurveTo(44, -4, 34, -6);
        ctx.fill();
    },

    // Giant - Mini-boss
    drawGiant(ctx, enemy) {
        // Massive body
        ctx.fillStyle = '#4E342E';
        ctx.beginPath();
        ctx.ellipse(0, 4, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.arc(0, -16, 10, 0, Math.PI * 2);
        ctx.fill();

        // Beard
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.moveTo(-8, -10);
        ctx.quadraticCurveTo(0, 2, 8, -10);
        ctx.quadraticCurveTo(0, -4, -8, -10);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-4, -18, 3, 0, Math.PI * 2);
        ctx.arc(4, -18, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-4, -18, 1.5, 0, Math.PI * 2);
        ctx.arc(4, -18, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Club
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(16, -10, 6, 28);
        ctx.fillStyle = '#4e342e';
        ctx.beginPath();
        ctx.ellipse(19, -12, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Boss aura
        ctx.strokeStyle = 'rgba(255, 152, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();
    },

    // Demon Knight - Boss enemy
    drawDemonKnight(ctx, enemy) {
        // Dark armor body
        ctx.fillStyle = '#B71C1C';
        ctx.beginPath();
        ctx.ellipse(0, 2, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Armor plates
        ctx.fillStyle = '#7f0000';
        ctx.fillRect(-10, -6, 20, 16);
        ctx.strokeStyle = '#4a0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-10, -6, 20, 16);

        // Horned helmet
        ctx.fillStyle = '#212121';
        ctx.beginPath();
        ctx.arc(0, -12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Horns
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.moveTo(-8, -16);
        ctx.lineTo(-14, -28);
        ctx.lineTo(-4, -18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8, -16);
        ctx.lineTo(14, -28);
        ctx.lineTo(4, -18);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(-4, -12, 3, 0, Math.PI * 2);
        ctx.arc(4, -12, 3, 0, Math.PI * 2);
        ctx.fill();

        // Flaming sword
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(14, -20, 4, 30);
        ctx.fillStyle = '#ff9800';
        ctx.beginPath();
        ctx.moveTo(14, -20);
        ctx.lineTo(16, -28);
        ctx.lineTo(18, -20);
        ctx.fill();

        // Boss aura
        ctx.strokeStyle = 'rgba(244, 67, 54, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.stroke();
    },

    // Demon King - Final boss
    drawDemonKing(ctx, enemy, time) {
        const pulse = Math.sin(time * 2) * 0.2 + 0.8;

        // Flame aura
        ctx.fillStyle = `rgba(255, 87, 34, ${0.2 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();

        // Massive body
        ctx.fillStyle = '#880E4F';
        ctx.beginPath();
        ctx.ellipse(0, 4, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Armor
        ctx.fillStyle = '#4a0000';
        ctx.fillRect(-14, -8, 28, 24);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(-14, -8, 28, 24);

        // Skull emblem
        ctx.fillStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.arc(0, 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4a0000';
        ctx.beginPath();
        ctx.arc(-2, 3, 2, 0, Math.PI * 2);
        ctx.arc(2, 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ad1457';
        ctx.beginPath();
        ctx.arc(0, -18, 14, 0, Math.PI * 2);
        ctx.fill();

        // Crown of horns
        ctx.fillStyle = '#212121';
        for (let i = -2; i <= 2; i++) {
            const hornX = i * 6;
            const hornHeight = i === 0 ? 24 : 18;
            ctx.beginPath();
            ctx.moveTo(hornX - 3, -24);
            ctx.lineTo(hornX, -24 - hornHeight);
            ctx.lineTo(hornX + 3, -24);
            ctx.fill();
        }

        // Burning eyes
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(-5, -18, 4, 0, Math.PI * 2);
        ctx.arc(5, -18, 4, 0, Math.PI * 2);
        ctx.fill();

        // Eye glow
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(-5, -19, 2, 0, Math.PI * 2);
        ctx.arc(5, -19, 2, 0, Math.PI * 2);
        ctx.fill();

        // Flaming cape
        ctx.fillStyle = `rgba(255, 87, 34, ${0.6 + Math.sin(time * 4) * 0.2})`;
        for (let i = 0; i < 5; i++) {
            const flameOffset = Math.sin(time * 6 + i) * 4;
            ctx.beginPath();
            ctx.moveTo(-16 + i * 8, 16);
            ctx.quadraticCurveTo(-16 + i * 8, 30 + flameOffset, -12 + i * 8, 36);
            ctx.quadraticCurveTo(-8 + i * 8, 30 + flameOffset, -8 + i * 8, 16);
            ctx.fill();
        }

        // Boss crown glow
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 * pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, -18, 18, 0, Math.PI * 2);
        ctx.stroke();
    },

    // Default enemy fallback
    drawDefaultEnemy(ctx, enemy) {
        const color = this.ENEMY_COLORS[enemy.type] || '#888';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
    },

    renderProjectiles() {
        const ctx = this.ctx;
        const time = Date.now() / 1000;

        for (const proj of this.state.projectiles) {
            ctx.save();
            ctx.translate(proj.x, proj.y);

            // Calculate rotation based on velocity (if available)
            // For now, use the direction to target
            const target = this.state.enemies.find(e => e.id === proj.targetId);
            if (target) {
                const angle = Math.atan2(target.y - proj.y, target.x - proj.x);
                ctx.rotate(angle);
            }

            // Draw based on projectile type (0=arrow, 1=cannonball, 2=magic, 3=ice, 4=poison, 5=lightning)
            switch (proj.type) {
                case 0: this.drawArrowProjectile(ctx); break;
                case 1: this.drawCannonballProjectile(ctx); break;
                case 2: this.drawMagicBoltProjectile(ctx, time); break;
                case 3: this.drawIceShardProjectile(ctx); break;
                case 4: this.drawPoisonDartProjectile(ctx); break;
                case 5: this.drawLightningBoltProjectile(ctx, time); break;
                default: this.drawDefaultProjectile(ctx); break;
            }

            ctx.restore();
        }
    },

    // Arrow projectile
    drawArrowProjectile(ctx) {
        // Shaft
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(-8, -1.5, 14, 3);

        // Arrowhead
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath();
        ctx.moveTo(6, -3);
        ctx.lineTo(12, 0);
        ctx.lineTo(6, 3);
        ctx.closePath();
        ctx.fill();

        // Fletching
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.moveTo(-8, -1);
        ctx.lineTo(-12, -4);
        ctx.lineTo(-8, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, 1);
        ctx.lineTo(-12, 4);
        ctx.lineTo(-8, 0);
        ctx.fill();
    },

    // Cannonball projectile
    drawCannonballProjectile(ctx) {
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 2, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ball
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.arc(-2, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Smoke trail
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(-10 - i * 6, (Math.random() - 0.5) * 4, 3 + i, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // Magic bolt projectile
    drawMagicBoltProjectile(ctx, time) {
        const pulse = Math.sin(time * 10) * 0.3 + 0.7;

        // Outer glow
        ctx.fillStyle = `rgba(156, 39, 176, ${0.3 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = `rgba(186, 104, 200, ${0.5 * pulse})`;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#e1bee7';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Sparkles
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 4; i++) {
            const angle = time * 8 + i * Math.PI / 2;
            const dist = 6 + Math.sin(time * 12 + i) * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // Ice shard projectile
    drawIceShardProjectile(ctx) {
        // Main crystal
        ctx.fillStyle = '#b3e5fc';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // Crystal shine
        ctx.fillStyle = '#e1f5fe';
        ctx.beginPath();
        ctx.moveTo(6, -1);
        ctx.lineTo(2, -2);
        ctx.lineTo(-2, -1);
        ctx.lineTo(2, 0);
        ctx.closePath();
        ctx.fill();

        // Ice trail
        ctx.fillStyle = 'rgba(179, 229, 252, 0.5)';
        ctx.beginPath();
        ctx.arc(-12, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(179, 229, 252, 0.3)';
        ctx.beginPath();
        ctx.arc(-18, 0, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    // Poison dart projectile
    drawPoisonDartProjectile(ctx) {
        // Dart body
        ctx.fillStyle = '#558b2f';
        ctx.fillRect(-6, -2, 10, 4);

        // Dart tip
        ctx.fillStyle = '#33691e';
        ctx.beginPath();
        ctx.moveTo(4, -3);
        ctx.lineTo(10, 0);
        ctx.lineTo(4, 3);
        ctx.closePath();
        ctx.fill();

        // Poison drip
        ctx.fillStyle = '#8bc34a';
        ctx.beginPath();
        ctx.arc(8, 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // Poison trail
        ctx.fillStyle = 'rgba(139, 195, 74, 0.4)';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(-8 - i * 5, Math.sin(i * 2) * 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // Lightning bolt projectile
    drawLightningBoltProjectile(ctx, time) {
        const jitter = Math.sin(time * 30) * 2;

        // Electric glow
        ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        // Lightning bolt shape
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-10, jitter);
        ctx.lineTo(-4, -3 + jitter);
        ctx.lineTo(0, 2 + jitter);
        ctx.lineTo(6, -2 + jitter);
        ctx.lineTo(10, jitter);
        ctx.stroke();

        // Core glow
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-10, jitter);
        ctx.lineTo(-4, -3 + jitter);
        ctx.lineTo(0, 2 + jitter);
        ctx.lineTo(6, -2 + jitter);
        ctx.lineTo(10, jitter);
        ctx.stroke();

        // Sparks
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 3; i++) {
            const sparkX = (Math.random() - 0.5) * 16;
            const sparkY = (Math.random() - 0.5) * 8;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    // Default projectile fallback
    drawDefaultProjectile(ctx) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
    },

    renderHoverPreview() {
        if (!this.hoveredCell || this.selectedTower) return;

        const ctx = this.ctx;
        const cellSize = this.config.cellSize;
        const x = this.hoveredCell.x * cellSize;
        const y = this.hoveredCell.y * cellSize;

        const canPlace = this.canPlaceTower(this.hoveredCell.x, this.hoveredCell.y);

        // Preview overlay
        ctx.fillStyle = canPlace ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
        ctx.fillRect(x, y, cellSize, cellSize);

        ctx.strokeStyle = canPlace ? '#4CAF50' : '#f44336';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Tower preview
        if (canPlace) {
            const centerX = x + cellSize / 2;
            const centerY = y + cellSize / 2;
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = this.TOWER_COLORS[this.selectedTowerType];
            ctx.beginPath();
            ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    },

    renderUI() {
        const ctx = this.ctx;
        const panelX = 960;
        const time = Date.now() / 1000;

        // UI Panel background with gradient
        const gradient = ctx.createLinearGradient(panelX, 0, panelX + 240, 0);
        gradient.addColorStop(0, '#1a1f2e');
        gradient.addColorStop(1, '#161b22');
        ctx.fillStyle = gradient;
        ctx.fillRect(panelX, 0, 240, 720);

        // Panel border with glow
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, 0, 240, 720);

        // Title with crown decoration
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', panelX + 120, 18);

        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Tower Defense', panelX + 120, 38);

        // Divider line
        ctx.strokeStyle = '#30363d';
        ctx.beginPath();
        ctx.moveTo(panelX + 20, 50);
        ctx.lineTo(panelX + 220, 50);
        ctx.stroke();

        // Stats section with icons
        ctx.textAlign = 'left';

        // Gold with coin icon
        this.drawStatBox(ctx, panelX + 10, 58, 105, 35, '#ffd700', '💰', this.state.gold.toLocaleString());

        // Lives with heart icon
        this.drawStatBox(ctx, panelX + 125, 58, 105, 35, '#f44336', '❤️', this.state.lives.toString());

        // Wave progress bar
        ctx.fillStyle = '#21262d';
        ctx.fillRect(panelX + 10, 100, 220, 25);
        const waveProgress = this.state.wave / this.state.maxWaves;
        const waveGradient = ctx.createLinearGradient(panelX + 10, 0, panelX + 230, 0);
        waveGradient.addColorStop(0, '#4CAF50');
        waveGradient.addColorStop(1, '#8BC34A');
        ctx.fillStyle = waveGradient;
        ctx.fillRect(panelX + 10, 100, 220 * waveProgress, 25);
        ctx.strokeStyle = '#30363d';
        ctx.strokeRect(panelX + 10, 100, 220, 25);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Wave ${this.state.wave} / ${this.state.maxWaves}`, panelX + 120, 117);

        // Score with animation
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(`Score: ${this.state.score.toLocaleString()}`, panelX + 120, 138);

        // Fast forward indicator
        if (this.state.fastForward) {
            ctx.fillStyle = '#FF9800';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('⚡ 2x SPEED ⚡', panelX + 120, 155);
        }

        // Tower selection header
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🏰 Select Tower (1-8)', panelX + 15, 175);

        // Tower buttons with improved styling
        const towerTypes = ['archer', 'cannon', 'mage', 'frost', 'poison', 'lightning', 'barracks', 'ultimate'];
        const towerEmojis = ['🏹', '💣', '🔮', '❄️', '☠️', '⚡', '⚔️', '👑'];
        const buttonHeight = 42;
        const startY = 185;

        for (let i = 0; i < towerTypes.length; i++) {
            const type = towerTypes[i];
            const btnY = startY + i * (buttonHeight + 4);
            const isSelected = this.selectedTowerType === type;
            const cost = this.TOWER_COSTS[type];
            const canAfford = this.state.gold >= cost;
            const isLocked = type === 'ultimate' && this.state.wave < 40;

            // Button background with hover effect
            if (isSelected) {
                ctx.fillStyle = '#2d333b';
            } else {
                ctx.fillStyle = '#21262d';
            }
            ctx.beginPath();
            ctx.roundRect(panelX + 10, btnY, 220, buttonHeight, 6);
            ctx.fill();

            // Selection border
            if (isSelected) {
                ctx.strokeStyle = this.TOWER_COLORS[type];
                ctx.lineWidth = 2;
                ctx.stroke();

                // Glow effect
                ctx.shadowColor = this.TOWER_COLORS[type];
                ctx.shadowBlur = 8;
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Tower emoji icon
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = isLocked ? '#555' : '#fff';
            ctx.fillText(towerEmojis[i], panelX + 18, btnY + 28);

            // Tower color indicator
            ctx.fillStyle = isLocked ? '#555' : this.TOWER_COLORS[type];
            ctx.beginPath();
            ctx.arc(panelX + 52, btnY + 21, 6, 0, Math.PI * 2);
            ctx.fill();

            // Tower name
            ctx.fillStyle = isLocked ? '#555' : canAfford ? '#f0f6fc' : '#888';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(type.charAt(0).toUpperCase() + type.slice(1), panelX + 65, btnY + 18);

            // Cost with coin
            ctx.fillStyle = isLocked ? '#555' : canAfford ? '#ffd700' : '#f44336';
            ctx.font = '11px sans-serif';
            ctx.fillText(isLocked ? '🔒 Wave 40' : `💰 ${cost}`, panelX + 65, btnY + 34);

            // Keybind hint
            ctx.fillStyle = '#6e7681';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`[${i + 1}]`, panelX + 222, btnY + 26);
            ctx.textAlign = 'left';
        }

        // Selected tower info panel
        if (this.selectedTower) {
            const infoY = 575;
            ctx.fillStyle = '#2d333b';
            ctx.beginPath();
            ctx.roundRect(panelX + 10, infoY, 220, 75, 6);
            ctx.fill();
            ctx.strokeStyle = '#30363d';
            ctx.stroke();

            // Tower name and level with stars
            const towerName = this.selectedTower.type.charAt(0).toUpperCase() + this.selectedTower.type.slice(1);
            ctx.fillStyle = '#f0f6fc';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(towerName, panelX + 20, infoY + 18);

            // Level stars
            ctx.fillStyle = '#ffd700';
            const stars = '★'.repeat(this.selectedTower.level + 1) + '☆'.repeat(3 - this.selectedTower.level);
            ctx.fillText(stars, panelX + 100, infoY + 18);

            // Action buttons
            // Upgrade button
            if (this.selectedTower.level < 3) {
                ctx.fillStyle = '#238636';
                ctx.beginPath();
                ctx.roundRect(panelX + 20, infoY + 28, 95, 32, 4);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⬆️ Upgrade', panelX + 67, infoY + 48);
            }

            // Sell button
            ctx.fillStyle = '#da3633';
            ctx.beginPath();
            ctx.roundRect(panelX + 125, infoY + 28, 95, 32, 4);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText('💰 Sell', panelX + 172, infoY + 48);

            // Targeting quick hint
            ctx.fillStyle = '#8b949e';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Press S to sell, U to upgrade', panelX + 20, infoY + 70);
        }

        // Start wave button
        const waveButtonY = 660;
        if (!this.state.waveActive && this.state.wave <= this.state.maxWaves) {
            // Pulsing glow effect
            const pulse = Math.sin(time * 4) * 0.1 + 0.9;
            ctx.shadowColor = '#4CAF50';
            ctx.shadowBlur = 10 * pulse;

            const buttonGradient = ctx.createLinearGradient(panelX + 10, waveButtonY, panelX + 10, waveButtonY + 50);
            buttonGradient.addColorStop(0, '#2ea043');
            buttonGradient.addColorStop(1, '#238636');
            ctx.fillStyle = buttonGradient;
            ctx.beginPath();
            ctx.roundRect(panelX + 10, waveButtonY, 220, 50, 8);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('▶ Start Wave', panelX + 120, waveButtonY + 28);
            ctx.font = '11px sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.fillText('Press SPACE', panelX + 120, waveButtonY + 44);
        } else if (this.state.waveActive) {
            ctx.fillStyle = '#21262d';
            ctx.beginPath();
            ctx.roundRect(panelX + 10, waveButtonY, 220, 50, 8);
            ctx.fill();

            // Animated loading dots
            const dots = '.'.repeat(Math.floor(time * 3) % 4);
            ctx.fillStyle = '#FF9800';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`⏳ Wave in Progress${dots}`, panelX + 120, waveButtonY + 32);
        }

        // Controls help at bottom
        ctx.fillStyle = '#484f58';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('F: Speed | S: Sell | U: Upgrade | Right-click: Deselect', panelX + 120, 716);
    },

    // Helper to draw stat boxes
    drawStatBox(ctx, x, y, w, h, color, icon, value) {
        // Background
        ctx.fillStyle = '#21262d';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 4);
        ctx.fill();

        // Icon
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(icon, x + 8, y + 24);

        // Value
        ctx.fillStyle = color;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(value, x + 32, y + 24);
    },

    renderEndScreen() {
        const ctx = this.ctx;
        const time = Date.now() / 1000;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, 960, 720);

        ctx.textAlign = 'center';

        if (this.state.victory) {
            // Victory celebration
            // Golden particles
            ctx.fillStyle = '#ffd700';
            for (let i = 0; i < 20; i++) {
                const px = 480 + Math.sin(time * 2 + i * 0.5) * 200;
                const py = 200 + ((time * 50 + i * 30) % 400);
                const size = 3 + Math.sin(time * 3 + i) * 2;
                ctx.globalAlpha = 1 - py / 600;
                ctx.beginPath();
                ctx.arc(px, py, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Crown emoji
            ctx.font = '60px sans-serif';
            ctx.fillText('👑', 480, 220);

            // Victory text with glow
            ctx.shadowColor = '#4CAF50';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 56px sans-serif';
            ctx.fillText('VICTORY!', 480, 300);
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#81c784';
            ctx.font = '24px sans-serif';
            ctx.fillText('🏆 You defeated the Demon King! 🏆', 480, 360);

        } else {
            // Game over effects
            // Falling embers
            ctx.fillStyle = '#f44336';
            for (let i = 0; i < 15; i++) {
                const px = 480 + Math.sin(time + i * 0.7) * 180;
                const py = 150 + ((time * 40 + i * 25) % 350);
                ctx.globalAlpha = 0.5 - py / 800;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Skull emoji
            ctx.font = '60px sans-serif';
            ctx.fillText('💀', 480, 220);

            // Game over text with glow
            ctx.shadowColor = '#f44336';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#f44336';
            ctx.font = 'bold 56px sans-serif';
            ctx.fillText('GAME OVER', 480, 300);
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#ef9a9a';
            ctx.font = '24px sans-serif';
            ctx.fillText('The castle has fallen...', 480, 360);
        }

        // Stats box
        ctx.fillStyle = 'rgba(33, 38, 45, 0.9)';
        ctx.beginPath();
        ctx.roundRect(330, 400, 300, 140, 12);
        ctx.fill();
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Final stats
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('📊 FINAL STATS', 480, 430);

        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`🏅 Score: ${this.state.score.toLocaleString()}`, 480, 465);

        ctx.fillStyle = '#8b949e';
        ctx.font = '16px sans-serif';
        ctx.fillText(`📋 Waves Completed: ${this.state.wave - 1} / ${this.state.maxWaves}`, 480, 495);

        // Towers built count
        const towerCount = this.state.towers ? this.state.towers.length : 0;
        ctx.fillText(`🏰 Towers Built: ${towerCount}`, 480, 520);

        // Restart hint
        ctx.fillStyle = '#6e7681';
        ctx.font = '14px sans-serif';
        ctx.fillText('Click "Restart Game" to play again', 480, 570);
    },

    cleanup() {
        this.state = null;
        this.config = null;
        this.selectedTower = null;
        this.hoveredCell = null;
    },

    reset() {
        this.selectedTower = null;
        this.hoveredCell = null;
        this.selectedTowerType = 'archer';
    }
};
