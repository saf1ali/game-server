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
                    // Buildable - grass
                    ctx.fillStyle = '#1e3a2f';
                } else if (cell === 1) {
                    // Path
                    ctx.fillStyle = '#4a4a6a';
                } else {
                    // Blocked - rocks
                    ctx.fillStyle = '#2d2d3d';
                }

                ctx.fillRect(px, py, cellSize, cellSize);

                // Grid lines
                ctx.strokeStyle = '#21262d';
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, cellSize, cellSize);
            }
        }
    },

    renderPath() {
        const ctx = this.ctx;
        const path = this.state.path;
        const cellSize = this.config.cellSize;

        if (!path || path.length < 2) return;

        ctx.strokeStyle = '#6b5b4f';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2);

        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x * cellSize + cellSize / 2, path[i].y * cellSize + cellSize / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Spawn marker
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('S', path[0].x * cellSize + cellSize / 2, path[0].y * cellSize + cellSize / 2 + 4);

        // Castle/End marker
        const end = path[path.length - 1];
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(end.x * cellSize + cellSize / 2, end.y * cellSize + cellSize / 2, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText('E', end.x * cellSize + cellSize / 2, end.y * cellSize + cellSize / 2 + 4);
    },

    renderTowers() {
        const ctx = this.ctx;
        const cellSize = this.config.cellSize;

        for (const tower of this.state.towers) {
            const x = tower.x * cellSize + cellSize / 2;
            const y = tower.y * cellSize + cellSize / 2;
            const color = this.TOWER_COLORS[tower.type] || '#888';
            const isSelected = this.selectedTower && this.selectedTower.id === tower.id;
            const showRange = this.showRangeFor === tower.id || isSelected;

            // Range indicator
            if (showRange) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, tower.range, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Tower base
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.fill();

            // Tower body
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.fill();

            // Level indicator
            if (tower.level > 0) {
                ctx.fillStyle = '#ffd700';
                for (let i = 0; i < tower.level; i++) {
                    const starX = x - 10 + i * 10;
                    const starY = y - 20;
                    ctx.font = '10px sans-serif';
                    ctx.fillText('★', starX, starY);
                }
            }

            // Selection ring
            if (isSelected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(x, y, 22, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Tower type letter
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(tower.type[0].toUpperCase(), x, y + 5);
        }
    },

    renderEnemies() {
        const ctx = this.ctx;

        for (const enemy of this.state.enemies) {
            const color = this.ENEMY_COLORS[enemy.type] || '#888';

            // Enemy body
            ctx.fillStyle = color;
            ctx.beginPath();
            if (enemy.flying) {
                // Flying enemies are triangles
                ctx.moveTo(enemy.x, enemy.y - 12);
                ctx.lineTo(enemy.x - 10, enemy.y + 8);
                ctx.lineTo(enemy.x + 10, enemy.y + 8);
                ctx.closePath();
            } else {
                // Ground enemies are circles
                ctx.arc(enemy.x, enemy.y, 10, 0, Math.PI * 2);
            }
            ctx.fill();

            // Camo indicator
            if (enemy.camo) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Health bar
            const hpPercent = enemy.hp / enemy.maxHp;
            const barWidth = 24;
            const barHeight = 4;
            const barX = enemy.x - barWidth / 2;
            const barY = enemy.y - 18;

            // Background
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health
            ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FF9800' : '#f44336';
            ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

            // Effects indicators
            if (enemy.effects && enemy.effects.length > 0) {
                let effectX = enemy.x - 8;
                for (const effect of enemy.effects) {
                    ctx.fillStyle = effect === 0 ? '#00BCD4' : effect === 1 ? '#8BC34A' : '#FF5722';
                    ctx.beginPath();
                    ctx.arc(effectX, enemy.y + 14, 3, 0, Math.PI * 2);
                    ctx.fill();
                    effectX += 8;
                }
            }
        }
    },

    renderProjectiles() {
        const ctx = this.ctx;

        for (const proj of this.state.projectiles) {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
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

        // UI Panel background
        ctx.fillStyle = '#161b22';
        ctx.fillRect(panelX, 0, 240, 720);
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, 0, 240, 720);

        // Title
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Tower Defense', panelX + 120, 30);

        // Stats
        ctx.textAlign = 'left';
        ctx.font = '14px sans-serif';

        // Gold
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Gold: ${this.state.gold}`, panelX + 15, 60);

        // Lives
        ctx.fillStyle = '#f44336';
        ctx.fillText(`Lives: ${this.state.lives}`, panelX + 120, 60);

        // Wave
        ctx.fillStyle = '#8b949e';
        ctx.fillText(`Wave: ${this.state.wave}/${this.state.maxWaves}`, panelX + 15, 85);

        // Score
        ctx.fillText(`Score: ${this.state.score}`, panelX + 120, 85);

        // Fast forward indicator
        if (this.state.fastForward) {
            ctx.fillStyle = '#FF9800';
            ctx.fillText('>> 2x Speed', panelX + 15, 110);
        }

        // Tower selection
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('Towers (1-8):', panelX + 15, 140);

        const towerTypes = ['archer', 'cannon', 'mage', 'frost', 'poison', 'lightning', 'barracks', 'ultimate'];
        const buttonHeight = 50;
        const startY = 150;

        for (let i = 0; i < towerTypes.length; i++) {
            const type = towerTypes[i];
            const btnY = startY + i * (buttonHeight + 10);
            const isSelected = this.selectedTowerType === type;
            const cost = this.TOWER_COSTS[type];
            const canAfford = this.state.gold >= cost;
            const isLocked = type === 'ultimate' && this.state.wave < 40;

            // Button background
            ctx.fillStyle = isSelected ? '#30363d' : '#21262d';
            ctx.fillRect(panelX + 10, btnY, 220, buttonHeight);

            if (isSelected) {
                ctx.strokeStyle = this.TOWER_COLORS[type];
                ctx.lineWidth = 2;
                ctx.strokeRect(panelX + 10, btnY, 220, buttonHeight);
            }

            // Tower icon
            ctx.fillStyle = isLocked ? '#555' : this.TOWER_COLORS[type];
            ctx.beginPath();
            ctx.arc(panelX + 35, btnY + 25, 12, 0, Math.PI * 2);
            ctx.fill();

            // Tower name and cost
            ctx.fillStyle = isLocked ? '#555' : canAfford ? '#f0f6fc' : '#f44336';
            ctx.font = '13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${i + 1}. ${type.charAt(0).toUpperCase() + type.slice(1)}`, panelX + 55, btnY + 22);

            ctx.fillStyle = isLocked ? '#555' : canAfford ? '#ffd700' : '#f44336';
            ctx.font = '11px sans-serif';
            ctx.fillText(isLocked ? 'Wave 40' : `${cost} gold`, panelX + 55, btnY + 40);
        }

        // Selected tower info
        if (this.selectedTower) {
            ctx.fillStyle = '#30363d';
            ctx.fillRect(panelX + 10, 480, 220, 130);

            ctx.fillStyle = '#f0f6fc';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'left';
            const towerName = this.selectedTower.type.charAt(0).toUpperCase() + this.selectedTower.type.slice(1);
            ctx.fillText(`${towerName} (Lv ${this.selectedTower.level + 1})`, panelX + 20, 505);

            // Upgrade button
            if (this.selectedTower.level < 3) {
                ctx.fillStyle = '#238636';
                ctx.fillRect(panelX + 20, 520, 90, 35);
                ctx.fillStyle = '#fff';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Upgrade', panelX + 65, 542);
            }

            // Sell button
            ctx.fillStyle = '#f44336';
            ctx.fillRect(panelX + 130, 520, 90, 35);
            ctx.fillStyle = '#fff';
            ctx.fillText('Sell', panelX + 175, 542);

            // Targeting
            ctx.fillStyle = '#8b949e';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('Target:', panelX + 20, 575);

            const targets = ['first', 'last', 'strong', 'weak', 'close'];
            const targetLabels = ['First', 'Last', 'Strong', 'Weak', 'Close'];
            ctx.font = '10px sans-serif';
            for (let i = 0; i < targets.length; i++) {
                const btnX = panelX + 20 + (i % 3) * 73;
                const btnY = 580 + Math.floor(i / 3) * 28;
                const isActive = this.selectedTower.targeting === i;

                ctx.fillStyle = isActive ? '#238636' : '#21262d';
                ctx.fillRect(btnX, btnY, 68, 24);

                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(targetLabels[i], btnX + 34, btnY + 16);
            }
        }

        // Start wave button
        if (!this.state.waveActive && this.state.wave <= this.state.maxWaves) {
            ctx.fillStyle = '#238636';
            ctx.fillRect(panelX + 10, 660, 220, 50);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Start Wave (Space)', panelX + 120, 692);
        } else if (this.state.waveActive) {
            ctx.fillStyle = '#21262d';
            ctx.fillRect(panelX + 10, 660, 220, 50);

            ctx.fillStyle = '#FF9800';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Wave in Progress...', panelX + 120, 692);
        }

        // Controls help
        ctx.fillStyle = '#6e7681';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('F: Fast Forward | S: Sell | U: Upgrade', panelX + 15, 715);
    },

    renderEndScreen() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 960, 720);

        ctx.textAlign = 'center';

        if (this.state.victory) {
            ctx.fillStyle = '#4CAF50';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText('VICTORY!', 480, 300);

            ctx.fillStyle = '#f0f6fc';
            ctx.font = '24px sans-serif';
            ctx.fillText('You defeated the Demon King!', 480, 360);
        } else {
            ctx.fillStyle = '#f44336';
            ctx.font = 'bold 48px sans-serif';
            ctx.fillText('GAME OVER', 480, 300);

            ctx.fillStyle = '#f0f6fc';
            ctx.font = '24px sans-serif';
            ctx.fillText('The castle has fallen...', 480, 360);
        }

        ctx.fillStyle = '#ffd700';
        ctx.font = '20px sans-serif';
        ctx.fillText(`Final Score: ${this.state.score}`, 480, 420);
        ctx.fillText(`Waves Completed: ${this.state.wave - 1}`, 480, 450);
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
