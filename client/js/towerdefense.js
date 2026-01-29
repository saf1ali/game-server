// Tower Defense game renderer with BTD-style branching upgrades
const TowerDefenseRenderer = {
    canvas: null,
    ctx: null,
    state: null,
    config: null,
    selectedTower: null,
    selectedTowerType: 'archer',
    hoveredCell: null,
    showRangeFor: null,
    showUpgradePopout: false,

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

    // Tower ranges (must match server TOWER_STATS)
    TOWER_RANGES: {
        archer: 150,
        cannon: 120,
        mage: 140,
        frost: 130,
        poison: 120,
        lightning: 160,
        barracks: 80,
        ultimate: 200
    },

    // BTD-style upgrade trees - matches server UPGRADE_DEFS
    UPGRADE_TREES: {
        archer: {
            name: 'Archer',
            pathA: {
                name: 'Damage',
                tiers: [
                    { name: 'Sharp Arrows', cost: 75, desc: '+50% damage' },
                    { name: 'Piercing Shot', cost: 150, desc: 'Arrows pierce 2 enemies' },
                    { name: 'Fire Arrows', cost: 300, desc: 'Burn enemies for 8 DPS over 3s', choice: 'A' },
                    { name: 'Ice Arrows', cost: 300, desc: '40% slow for 2s on hit', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Speed',
                tiers: [
                    { name: 'Quick Draw', cost: 75, desc: '+30% attack speed' },
                    { name: 'Eagle Eye', cost: 150, desc: '+40% range' },
                    { name: 'Rapid Fire', cost: 350, desc: '+100% attack speed', choice: 'A' },
                    { name: 'Sniper', cost: 350, desc: '+100% range, 2x dmg to first', choice: 'B' }
                ]
            }
        },
        cannon: {
            name: 'Cannon',
            pathA: {
                name: 'Explosion',
                tiers: [
                    { name: 'Bigger Bombs', cost: 100, desc: '+25% explosion radius' },
                    { name: 'Heavy Ordnance', cost: 200, desc: '+50% damage' },
                    { name: 'Napalm Shells', cost: 400, desc: 'Fire patches burn for 4s', choice: 'A' },
                    { name: 'Concussion Blast', cost: 400, desc: 'Stun enemies for 1.5s', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Fire Rate',
                tiers: [
                    { name: 'Faster Reload', cost: 100, desc: '+25% attack speed' },
                    { name: 'Double Barrel', cost: 225, desc: 'Fire 2 cannonballs per shot' },
                    { name: 'Cluster Bombs', cost: 450, desc: 'Shells split into 4 mini-bombs', choice: 'A' },
                    { name: 'Artillery', cost: 450, desc: '+150% range, slower fire', choice: 'B' }
                ]
            }
        },
        mage: {
            name: 'Mage',
            pathA: {
                name: 'Power',
                tiers: [
                    { name: 'Arcane Mastery', cost: 100, desc: '+40% damage' },
                    { name: 'Spell Surge', cost: 200, desc: 'Every 5th attack = 3x damage' },
                    { name: 'Archmage', cost: 500, desc: 'Bolts chain to 3 enemies', choice: 'A' },
                    { name: 'Void Mage', cost: 500, desc: 'True damage ignores armor', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Utility',
                tiers: [
                    { name: 'Mystic Reach', cost: 100, desc: '+35% range' },
                    { name: 'Enchantment', cost: 225, desc: '20% chance remove buffs' },
                    { name: 'Necromancer', cost: 550, desc: '30% kill = spawn skeleton', choice: 'A' },
                    { name: 'Time Mage', cost: 550, desc: 'Slow attack speed 50%', choice: 'B' }
                ]
            }
        },
        frost: {
            name: 'Frost',
            pathA: {
                name: 'Freeze',
                tiers: [
                    { name: 'Deeper Freeze', cost: 100, desc: '50% slow (up from 40%)' },
                    { name: 'Permafrost', cost: 200, desc: 'Slow persists 2s after' },
                    { name: 'Absolute Zero', cost: 450, desc: 'Freeze solid for 2s', choice: 'A' },
                    { name: 'Frost Nova', cost: 450, desc: 'Every 8s slow all 30%', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Damage',
                tiers: [
                    { name: 'Ice Shards', cost: 100, desc: 'Attacks deal 15 damage' },
                    { name: 'Brittle', cost: 225, desc: 'Slowed = +25% dmg taken' },
                    { name: 'Cryo Cannon', cost: 500, desc: 'Heavy single-target ice', choice: 'A' },
                    { name: 'Blizzard', cost: 500, desc: 'Constant AOE damage', choice: 'B' }
                ]
            }
        },
        poison: {
            name: 'Poison',
            pathA: {
                name: 'Potency',
                tiers: [
                    { name: 'Concentrated Venom', cost: 75, desc: '+50% DoT damage' },
                    { name: 'Corrosive Acid', cost: 175, desc: 'DoT reduces armor 20%' },
                    { name: 'Plague', cost: 400, desc: 'DoT spreads to nearby', choice: 'A' },
                    { name: 'Neurotoxin', cost: 400, desc: 'Poisoned = 40% slower', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Application',
                tiers: [
                    { name: 'Wider Spray', cost: 75, desc: '+30% range' },
                    { name: 'Rapid Injection', cost: 175, desc: '+40% attack speed' },
                    { name: 'Gas Cloud', cost: 425, desc: 'Leave poison clouds 4s', choice: 'A' },
                    { name: 'Venomous Burst', cost: 425, desc: 'Poison death = AOE', choice: 'B' }
                ]
            }
        },
        lightning: {
            name: 'Lightning',
            pathA: {
                name: 'Chain',
                tiers: [
                    { name: 'Conductivity', cost: 125, desc: 'Chain to 4 targets' },
                    { name: 'High Voltage', cost: 250, desc: '+60% chain damage' },
                    { name: 'Storm Caller', cost: 550, desc: 'Every 10s hit 10 random', choice: 'A' },
                    { name: 'Tesla Coil', cost: 550, desc: 'Constant passive damage', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Single Target',
                tiers: [
                    { name: 'Focused Bolt', cost: 125, desc: '+50% primary damage' },
                    { name: 'Overcharge', cost: 250, desc: 'Stun primary 0.5s' },
                    { name: 'Thunderstrike', cost: 600, desc: 'Massive hit, 3s CD', choice: 'A' },
                    { name: 'EMP', cost: 600, desc: 'Disable abilities 5s', choice: 'B' }
                ]
            }
        },
        barracks: {
            name: 'Barracks',
            pathA: {
                name: 'Strength',
                tiers: [
                    { name: 'Combat Training', cost: 125, desc: '+50% soldier HP/dmg' },
                    { name: 'Veteran Soldiers', cost: 275, desc: '+30% attack speed' },
                    { name: 'Knights', cost: 500, desc: 'Block 2 enemies each', choice: 'A' },
                    { name: 'Berserkers', cost: 500, desc: '+100% dmg, -25% HP', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Count',
                tiers: [
                    { name: 'Reinforcements', cost: 150, desc: 'Spawn 2 soldiers' },
                    { name: 'Battalion', cost: 300, desc: 'Spawn 3 soldiers' },
                    { name: 'Army', cost: 550, desc: 'Spawn 5 soldiers', choice: 'A' },
                    { name: 'Elite Guard', cost: 550, desc: '3 elite, mid-wave respawn', choice: 'B' }
                ]
            }
        },
        ultimate: {
            name: 'Ultimate',
            pathA: {
                name: 'Destruction',
                tiers: [
                    { name: 'Empowered', cost: 250, desc: '+30% damage' },
                    { name: 'Devastation', cost: 500, desc: '+50% AOE radius' },
                    { name: 'Apocalypse', cost: 1000, desc: 'Screen pulse every 15s', choice: 'A' },
                    { name: 'Godslayer', cost: 1000, desc: '+500% damage to bosses', choice: 'B' }
                ]
            },
            pathB: {
                name: 'Support',
                tiers: [
                    { name: 'Inspiring Presence', cost: 250, desc: 'Nearby towers +10% dmg' },
                    { name: 'War Banner', cost: 500, desc: 'Nearby +15% attack speed' },
                    { name: 'Fortress', cost: 1000, desc: 'Nearby towers +25% range', choice: 'A' },
                    { name: 'Command Center', cost: 1000, desc: 'All towers +10% dmg/spd', choice: 'B' }
                ]
            }
        }
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

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Check upgrade popout clicks first
            if (this.showUpgradePopout && this.selectedTower) {
                if (this.handleUpgradePopoutClick(x, y)) {
                    return;
                }
            }

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
                        this.showUpgradePopout = true;
                        return;
                    }
                }
            }

            // Clicking elsewhere closes popout and deselects tower
            if (this.showUpgradePopout) {
                this.showUpgradePopout = false;
                this.selectedTower = null;
                return;
            }

            // Try to place tower
            this.selectedTower = null;
            if (this.canPlaceTower(gridX, gridY)) {
                socket.send('input', {
                    action: 'placeTower',
                    towerType: this.selectedTowerType,
                    x: gridX,
                    y: gridY
                });
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.selectedTower = null;
                this.showUpgradePopout = false;
            }
            if (e.key === '1') this.selectedTowerType = 'archer';
            if (e.key === '2') this.selectedTowerType = 'cannon';
            if (e.key === '3') this.selectedTowerType = 'mage';
            if (e.key === '4') this.selectedTowerType = 'frost';
            if (e.key === '5') this.selectedTowerType = 'poison';
            if (e.key === '6') this.selectedTowerType = 'lightning';
            if (e.key === '7') this.selectedTowerType = 'barracks';
            if (e.key === '8') this.selectedTowerType = 'ultimate';
            if (e.key === ' ') {
                e.preventDefault();
                if (!this.state.waveActive) {
                    socket.send('input', { action: 'startWave' });
                }
            }
            if (e.key === 'f' || e.key === 'F') {
                socket.send('input', { action: 'toggleFastForward' });
            }
        });
    },

    handleUIClick(x, y) {
        // Tower selection buttons
        const towers = ['archer', 'cannon', 'mage', 'frost', 'poison', 'lightning', 'barracks', 'ultimate'];
        const startY = 185;
        const buttonHeight = 42;

        for (let i = 0; i < towers.length; i++) {
            const btnY = startY + i * buttonHeight;
            if (y >= btnY && y < btnY + buttonHeight - 2) {
                this.selectedTowerType = towers[i];
                this.selectedTower = null;
                this.showUpgradePopout = false;
                return;
            }
        }

        // Control buttons at bottom
        const infoY = 555;
        if (y >= infoY + 60 && y < infoY + 95) {
            if (!this.state.waveActive) {
                socket.send('input', { action: 'startWave' });
            }
        }
        if (y >= infoY + 100 && y < infoY + 135) {
            socket.send('input', { action: 'toggleFastForward' });
        }
    },

    handleUpgradePopoutClick(x, y) {
        if (!this.selectedTower) return false;

        const popoutY = 520;
        const popoutHeight = 200;

        // Check if click is in popout area
        if (y < popoutY || y > popoutY + popoutHeight) {
            return false;
        }

        const tower = this.selectedTower;
        const tree = this.UPGRADE_TREES[tower.type];
        const ups = tower.upgrades;

        // Close button
        if (x >= 900 && x <= 940 && y >= popoutY + 5 && y <= popoutY + 35) {
            this.showUpgradePopout = false;
            this.selectedTower = null;
            return true;
        }

        // Sell button
        if (x >= 800 && x <= 890 && y >= popoutY + 5 && y <= popoutY + 35) {
            socket.send('input', { action: 'sellTower', towerId: tower.id });
            this.showUpgradePopout = false;
            this.selectedTower = null;
            return true;
        }

        // Path A upgrades (left side)
        const pathAX = 20;
        const tierStartY = popoutY + 60;
        const tierHeight = 32;

        for (let t = 0; t < 4; t++) {
            const tierY = tierStartY + t * tierHeight;
            if (x >= pathAX && x <= pathAX + 200 && y >= tierY && y <= tierY + tierHeight - 2) {
                const tier = (t < 2) ? t + 1 : 3;
                const choice = (t >= 2) ? (t === 2 ? 'A' : 'B') : '';

                if (this.canPurchaseUpgrade(tower, 'A', tier, choice)) {
                    socket.send('input', {
                        action: 'upgrade',
                        towerId: tower.id,
                        path: 'A',
                        tier: tier,
                        choice: choice
                    });
                    return true;
                }
            }
        }

        // Path B upgrades (right side)
        const pathBX = 240;
        for (let t = 0; t < 4; t++) {
            const tierY = tierStartY + t * tierHeight;
            if (x >= pathBX && x <= pathBX + 200 && y >= tierY && y <= tierY + tierHeight - 2) {
                const tier = (t < 2) ? t + 1 : 3;
                const choice = (t >= 2) ? (t === 2 ? 'A' : 'B') : '';

                if (this.canPurchaseUpgrade(tower, 'B', tier, choice)) {
                    socket.send('input', {
                        action: 'upgrade',
                        towerId: tower.id,
                        path: 'B',
                        tier: tier,
                        choice: choice
                    });
                    return true;
                }
            }
        }

        return true; // Consume click in popout area
    },

    canPurchaseUpgrade(tower, pathStr, tier, choice) {
        const ups = tower.upgrades;
        const currentTier = (pathStr === 'A') ? ups.pathA : ups.pathB;

        if (tier !== currentTier + 1) return false;

        const isLocked = (pathStr === 'A') ? ups.pathALocked : ups.pathBLocked;
        if (tier > 2 && isLocked) return false;

        if (tier === 3) {
            const existingChoice = (pathStr === 'A') ? ups.pathAChoice : ups.pathBChoice;
            if (existingChoice !== '') return false;
        }

        const tree = this.UPGRADE_TREES[tower.type];
        const path = (pathStr === 'A') ? tree.pathA : tree.pathB;
        const tierIdx = (tier === 3) ? (choice === 'B' ? 3 : 2) : (tier - 1);
        const cost = path.tiers[tierIdx].cost;

        return this.state.gold >= cost;
    },

    canPlaceTower(x, y) {
        if (!this.state || !this.config) return false;
        if (x < 0 || x >= this.config.gridWidth || y < 0 || y >= this.config.gridHeight) return false;
        if (this.state.map[y][x] !== 0) return false;
        for (const tower of this.state.towers) {
            if (tower.x === x && tower.y === y) return false;
        }
        if (this.state.gold < this.TOWER_COSTS[this.selectedTowerType]) return false;
        return true;
    },

    updateState(state) {
        this.state = state;
        this.config = state.config;

        // Update selected tower reference
        if (this.selectedTower && state.towers) {
            const updated = state.towers.find(t => t.id === this.selectedTower.id);
            if (updated) {
                this.selectedTower = updated;
            } else {
                this.selectedTower = null;
                this.showUpgradePopout = false;
            }
        }
    },

    startRenderLoop() {
        const render = () => {
            this.render();
            requestAnimationFrame(render);
        };
        render();
    },

    render() {
        if (!this.state || !this.config) return;

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderMap();
        this.renderPath();
        this.renderTowers();
        this.renderEnemies();
        this.renderProjectiles();
        this.renderSoldiers();
        this.renderSkeletons();
        this.renderHoverPreview();
        this.renderUI();

        if (this.showUpgradePopout && this.selectedTower) {
            this.renderUpgradePopout();
        }

        if (this.state.gameOver) {
            this.renderGameOver();
        } else if (this.state.victory) {
            this.renderVictory();
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
                    // Grass pattern
                    const brightness = ((x + y) % 2 === 0) ? '#2d5a27' : '#2a5424';
                    ctx.fillStyle = brightness;
                    ctx.fillRect(px, py, cellSize, cellSize);

                    // Subtle grass texture
                    ctx.fillStyle = 'rgba(255,255,255,0.03)';
                    for (let i = 0; i < 3; i++) {
                        const gx = px + Math.random() * cellSize;
                        const gy = py + Math.random() * cellSize;
                        ctx.fillRect(gx, gy, 2, 4);
                    }
                } else if (cell === 1) {
                    // Path
                    ctx.fillStyle = '#8b7355';
                    ctx.fillRect(px, py, cellSize, cellSize);
                    ctx.fillStyle = '#7a6548';
                    ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
                } else {
                    // Blocked (decorative)
                    ctx.fillStyle = '#1a3d18';
                    ctx.fillRect(px, py, cellSize, cellSize);
                    ctx.fillStyle = '#2d5a27';
                    ctx.beginPath();
                    ctx.arc(px + cellSize/2, py + cellSize/2, 15, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    },

    renderPath() {
        const ctx = this.ctx;
        const cellSize = this.config.cellSize;

        // Draw path direction arrows
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;

        for (let i = 0; i < this.state.path.length - 1; i++) {
            const p1 = this.state.path[i];
            const p2 = this.state.path[i + 1];
            const x1 = p1.x * cellSize + cellSize / 2;
            const y1 = p1.y * cellSize + cellSize / 2;
            const x2 = p2.x * cellSize + cellSize / 2;
            const y2 = p2.y * cellSize + cellSize / 2;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const angle = Math.atan2(y2 - y1, x2 - x1);

            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(-8, -5);
            ctx.lineTo(0, 0);
            ctx.lineTo(-8, 5);
            ctx.stroke();
            ctx.restore();
        }

        // Start indicator
        const start = this.state.path[0];
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('START', start.x * cellSize + cellSize/2, start.y * cellSize - 5);

        // End indicator (castle)
        const end = this.state.path[this.state.path.length - 1];
        ctx.fillStyle = '#ffd700';
        ctx.font = '24px sans-serif';
        ctx.fillText('🏰', end.x * cellSize + cellSize/2, end.y * cellSize + cellSize/2 + 8);
    },

    renderTowers() {
        const ctx = this.ctx;
        const cellSize = this.config.cellSize;

        for (const tower of this.state.towers) {
            const x = tower.x * cellSize + cellSize / 2;
            const y = tower.y * cellSize + cellSize / 2;

            const isSelected = this.selectedTower && this.selectedTower.id === tower.id;
            const isHovered = this.showRangeFor === tower.id;

            // Range circle
            if (isSelected || isHovered) {
                ctx.beginPath();
                ctx.arc(x, y, tower.range, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Draw tower
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

            // Upgrade notation
            if (tower.upgrades) {
                const notation = tower.upgrades.notation;
                if (notation !== '0-0') {
                    ctx.fillStyle = '#ffd700';
                    ctx.font = 'bold 9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(notation, x, y - 22);
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

    drawArcherTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Wooden base
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-16, -8, 32, 20);
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-14, -6, 28, 16);

        // Supports
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(-18, 4, 6, 12);
        ctx.fillRect(12, 4, 6, 12);

        // Archer body
        const hasFireArrows = ups.pathA === 3 && ups.pathAChoice === 'A';
        const hasIceArrows = ups.pathA === 3 && ups.pathAChoice === 'B';

        ctx.fillStyle = hasFireArrows ? '#ff5722' : (hasIceArrows ? '#00bcd4' : '#4CAF50');
        ctx.beginPath();
        ctx.ellipse(0, -4, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ffcc80';
        ctx.beginPath();
        ctx.arc(0, -14, 5, 0, Math.PI * 2);
        ctx.fill();

        // Hood
        ctx.fillStyle = hasFireArrows ? '#e64a19' : (hasIceArrows ? '#0097a7' : '#388e3c');
        ctx.beginPath();
        ctx.arc(0, -16, 4, Math.PI, 0);
        ctx.fill();

        // Bow
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(8, -4, 10, -Math.PI/2, Math.PI/2);
        ctx.stroke();
    },

    drawCannonTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Platform
        ctx.fillStyle = '#424242';
        ctx.fillRect(-18, 2, 36, 14);
        ctx.fillStyle = '#616161';
        ctx.fillRect(-16, 4, 32, 10);

        // Wheels
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.arc(-12, 14, 6, 0, Math.PI * 2);
        ctx.arc(12, 14, 6, 0, Math.PI * 2);
        ctx.fill();

        // Cannon barrel
        ctx.fillStyle = ups.pathA >= 2 ? '#212121' : '#37474f';
        ctx.fillRect(-6, -16, 12, 20);

        // Barrel opening
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, -16, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Flame decoration for napalm
        if (ups.pathA === 3 && ups.pathAChoice === 'A') {
            ctx.fillStyle = '#ff5722';
            ctx.beginPath();
            ctx.arc(0, -20, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawMageTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Tower base
        ctx.fillStyle = '#4a148c';
        ctx.beginPath();
        ctx.moveTo(-14, 16);
        ctx.lineTo(-10, -8);
        ctx.lineTo(10, -8);
        ctx.lineTo(14, 16);
        ctx.closePath();
        ctx.fill();

        // Magic orb
        const isVoid = ups.pathA === 3 && ups.pathAChoice === 'B';
        const gradient = ctx.createRadialGradient(0, -4, 0, 0, -4, 10);
        if (isVoid) {
            gradient.addColorStop(0, '#000');
            gradient.addColorStop(0.5, '#4a148c');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#e1bee7');
            gradient.addColorStop(0.5, '#9c27b0');
            gradient.addColorStop(1, '#4a148c');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, -4, 10, 0, Math.PI * 2);
        ctx.fill();

        // Sparkles
        ctx.fillStyle = '#fff';
        const time = Date.now() / 200;
        for (let i = 0; i < 3; i++) {
            const angle = time + i * 2.1;
            const px = Math.cos(angle) * 6;
            const py = -4 + Math.sin(angle) * 6;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawFrostTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Ice crystal base
        ctx.fillStyle = '#b3e5fc';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-8, 16);
        ctx.lineTo(8, 16);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.fill();

        // Inner crystal
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-4, 10);
        ctx.lineTo(4, 10);
        ctx.lineTo(6, 0);
        ctx.closePath();
        ctx.fill();

        // Frost aura for blizzard
        if (ups.pathB === 3 && ups.pathBChoice === 'B') {
            ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
            ctx.lineWidth = 2;
            const time = Date.now() / 500;
            ctx.beginPath();
            ctx.arc(0, 0, 18 + Math.sin(time) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Snowflakes
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText('❄', -8, -8);
        ctx.fillText('❄', 4, 4);
    },

    drawPoisonTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Vat
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.ellipse(0, 8, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Poison liquid
        ctx.fillStyle = '#8bc34a';
        ctx.beginPath();
        ctx.ellipse(0, 4, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bubbles
        ctx.fillStyle = '#c5e1a5';
        const time = Date.now() / 300;
        for (let i = 0; i < 3; i++) {
            const bx = -6 + i * 6 + Math.sin(time + i) * 2;
            const by = 2 - Math.abs(Math.sin(time + i * 0.7)) * 4;
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Skull for potent poison
        if (ups.pathA >= 2) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('☠', 0, -8);
        }
    },

    drawLightningTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Coil base
        ctx.fillStyle = '#ffd54f';
        ctx.fillRect(-8, 4, 16, 12);

        // Tesla coil
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.lineTo(-4, -12);
        ctx.lineTo(4, -12);
        ctx.lineTo(6, 4);
        ctx.closePath();
        ctx.fill();

        // Lightning bolt
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(-4, -8);
        ctx.lineTo(2, -8);
        ctx.lineTo(-2, 0);
        ctx.stroke();

        // Tesla coil effect
        if (ups.pathA === 3 && ups.pathAChoice === 'B') {
            ctx.strokeStyle = 'rgba(255, 235, 59, 0.6)';
            const time = Date.now() / 100;
            ctx.beginPath();
            ctx.arc(0, -4, 12 + Math.sin(time) * 4, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    drawBarracksTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Building
        ctx.fillStyle = '#795548';
        ctx.fillRect(-14, -6, 28, 22);

        // Roof
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.moveTo(-16, -6);
        ctx.lineTo(0, -18);
        ctx.lineTo(16, -6);
        ctx.closePath();
        ctx.fill();

        // Door
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(-4, 4, 8, 12);

        // Flag for upgrades
        if (ups.pathA >= 1 || ups.pathB >= 1) {
            ctx.fillStyle = ups.pathA >= 2 ? '#ffd700' : '#f44336';
            ctx.beginPath();
            ctx.moveTo(8, -16);
            ctx.lineTo(8, -24);
            ctx.lineTo(16, -20);
            ctx.lineTo(8, -16);
            ctx.fill();
        }

        // Soldier icon
        ctx.fillStyle = '#3949ab';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚔', 0, 0);
    },

    drawUltimateTower(ctx, tower) {
        const ups = tower.upgrades || { pathA: 0, pathB: 0 };

        // Grand tower base
        const gradient = ctx.createLinearGradient(-12, 16, 12, -20);
        gradient.addColorStop(0, '#880e4f');
        gradient.addColorStop(0.5, '#e91e63');
        gradient.addColorStop(1, '#f48fb1');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.moveTo(-12, 16);
        ctx.lineTo(-10, -16);
        ctx.lineTo(10, -16);
        ctx.lineTo(12, 16);
        ctx.closePath();
        ctx.fill();

        // Crown
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(-8, -16);
        ctx.lineTo(-6, -22);
        ctx.lineTo(-2, -18);
        ctx.lineTo(0, -24);
        ctx.lineTo(2, -18);
        ctx.lineTo(6, -22);
        ctx.lineTo(8, -16);
        ctx.closePath();
        ctx.fill();

        // Gem
        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(0, -4, 6, 0, Math.PI * 2);
        ctx.fill();

        // Aura for support path
        if (ups.pathB >= 1) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.lineWidth = 2;
            const time = Date.now() / 400;
            ctx.beginPath();
            ctx.arc(0, 0, 20 + Math.sin(time) * 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    },

    drawDefaultTower(ctx, tower) {
        ctx.fillStyle = this.TOWER_COLORS[tower.type] || '#888';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
    },

    renderEnemies() {
        const ctx = this.ctx;

        for (const enemy of this.state.enemies) {
            const x = enemy.x;
            const y = enemy.y;

            // Health bar background
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 15, y - 25, 30, 4);

            // Health bar
            const hpPercent = enemy.hp / enemy.maxHp;
            ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : (hpPercent > 0.25 ? '#ff9800' : '#f44336');
            ctx.fillRect(x - 15, y - 25, 30 * hpPercent, 4);

            // Engaged indicator
            if (enemy.engaged) {
                ctx.fillStyle = '#ff5722';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚔️', x, y - 30);
            }

            // Draw enemy
            ctx.save();
            ctx.translate(x, y);

            // Effect visuals
            let isSlowed = false;
            let isPoisoned = false;
            let isStunned = false;
            for (const eff of enemy.effects) {
                if (eff.type === 0) isSlowed = true;
                if (eff.type === 1) isPoisoned = true;
                if (eff.type === 4) isStunned = true;
            }

            if (isSlowed) {
                ctx.fillStyle = 'rgba(0, 188, 212, 0.3)';
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.fill();
            }

            if (isPoisoned) {
                ctx.strokeStyle = '#8bc34a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 12, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (isStunned) {
                ctx.fillStyle = '#ffeb3b';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('💫', 0, -15);
            }

            // Enemy body
            this.drawEnemy(ctx, enemy);

            ctx.restore();

            // Flying indicator
            if (enemy.flying) {
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✈', x + 12, y - 10);
            }

            // Camo indicator
            if (enemy.camo) {
                ctx.fillStyle = 'rgba(128,128,128,0.7)';
                ctx.font = '8px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('👁', x - 12, y - 10);
            }
        }
    },

    drawEnemy(ctx, enemy) {
        const type = enemy.type;

        switch(type) {
            case 'goblin':
                this.drawGoblin(ctx);
                break;
            case 'orc':
                this.drawOrc(ctx);
                break;
            case 'orc_brute':
                this.drawOrcBrute(ctx);
                break;
            case 'wolf_rider':
                this.drawWolfRider(ctx);
                break;
            case 'troll':
                this.drawTroll(ctx);
                break;
            case 'dark_mage':
                this.drawDarkMage(ctx);
                break;
            case 'bat':
                this.drawBat(ctx);
                break;
            case 'wyvern':
                this.drawWyvern(ctx);
                break;
            case 'golem':
                this.drawGolem(ctx);
                break;
            case 'assassin':
                this.drawAssassin(ctx);
                break;
            case 'necromancer':
                this.drawNecromancer(ctx);
                break;
            case 'dragon':
                this.drawDragon(ctx);
                break;
            case 'giant':
                this.drawGiant(ctx);
                break;
            case 'demon_knight':
                this.drawDemonKnight(ctx);
                break;
            case 'demon_king':
                this.drawDemonKing(ctx);
                break;
            default:
                // Fallback circle
                ctx.fillStyle = '#888';
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
        }
    },

    // GOBLIN - Small green creature with pointy ears
    drawGoblin(ctx) {
        // Body
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.ellipse(0, 2, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#8BC34A';
        ctx.beginPath();
        ctx.arc(0, -8, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pointy ears
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.lineTo(-10, -16);
        ctx.lineTo(-4, -12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -10);
        ctx.lineTo(10, -16);
        ctx.lineTo(4, -12);
        ctx.fill();

        // Eyes (red, menacing)
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(-2, -9, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -9, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Small dagger
        ctx.fillStyle = '#9E9E9E';
        ctx.fillRect(6, -2, 8, 2);
        ctx.fillStyle = '#795548';
        ctx.fillRect(4, -3, 3, 4);
    },

    // ORC - Bulky green warrior with tusks
    drawOrc(ctx) {
        // Body (muscular)
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-8, -2, 16, 14); // armor
        ctx.fillStyle = '#4E7A27';
        ctx.beginPath();
        ctx.ellipse(0, 4, 9, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#558B2F';
        ctx.beginPath();
        ctx.arc(0, -10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Tusks
        ctx.fillStyle = '#FFFDE7';
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(-6, 2);
        ctx.lineTo(-2, -2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(4, -4);
        ctx.lineTo(6, 2);
        ctx.lineTo(2, -2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(-3, -11, 2, 0, Math.PI * 2);
        ctx.arc(3, -11, 2, 0, Math.PI * 2);
        ctx.fill();

        // Axe
        ctx.fillStyle = '#795548';
        ctx.fillRect(10, -14, 3, 20);
        ctx.fillStyle = '#607D8B';
        ctx.beginPath();
        ctx.moveTo(13, -12);
        ctx.lineTo(20, -8);
        ctx.lineTo(20, -2);
        ctx.lineTo(13, 2);
        ctx.fill();
    },

    // ORC_BRUTE - Massive armored orc
    drawOrcBrute(ctx) {
        // Heavy armor body
        ctx.fillStyle = '#37474F';
        ctx.beginPath();
        ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Armor plates
        ctx.fillStyle = '#263238';
        ctx.fillRect(-10, -4, 20, 6);
        ctx.fillRect(-8, 2, 16, 8);

        // Head with helmet
        ctx.fillStyle = '#33691E';
        ctx.beginPath();
        ctx.arc(0, -12, 9, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = '#455A64';
        ctx.beginPath();
        ctx.arc(0, -14, 10, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-10, -14, 20, 4);

        // Glowing eyes through helmet
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(-4, -12, 2, 0, Math.PI * 2);
        ctx.arc(4, -12, 2, 0, Math.PI * 2);
        ctx.fill();

        // Huge mace
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(14, -16, 4, 24);
        ctx.fillStyle = '#37474F';
        ctx.beginPath();
        ctx.arc(16, -18, 8, 0, Math.PI * 2);
        ctx.fill();
        // Spikes on mace
        ctx.fillStyle = '#263238';
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(16 + Math.cos(angle) * 6, -18 + Math.sin(angle) * 6);
            ctx.lineTo(16 + Math.cos(angle) * 12, -18 + Math.sin(angle) * 12);
            ctx.lineTo(16 + Math.cos(angle + 0.3) * 6, -18 + Math.sin(angle + 0.3) * 6);
            ctx.fill();
        }
    },

    // WOLF_RIDER - Goblin riding a wolf
    drawWolfRider(ctx) {
        // Wolf body
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.ellipse(0, 4, 14, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wolf head
        ctx.fillStyle = '#757575';
        ctx.beginPath();
        ctx.ellipse(12, 0, 8, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Wolf snout
        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath();
        ctx.ellipse(18, 2, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wolf ears
        ctx.fillStyle = '#616161';
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.lineTo(6, -12);
        ctx.lineTo(12, -6);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(14, -4);
        ctx.lineTo(16, -12);
        ctx.lineTo(18, -4);
        ctx.fill();

        // Wolf eye
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(14, -1, 2, 0, Math.PI * 2);
        ctx.fill();

        // Wolf legs
        ctx.fillStyle = '#616161';
        ctx.fillRect(-10, 8, 3, 8);
        ctx.fillRect(-4, 8, 3, 8);
        ctx.fillRect(4, 8, 3, 8);
        ctx.fillRect(10, 8, 3, 8);

        // Goblin rider (smaller)
        ctx.fillStyle = '#8BC34A';
        ctx.beginPath();
        ctx.arc(-2, -8, 5, 0, Math.PI * 2);
        ctx.fill();

        // Rider ears
        ctx.fillStyle = '#7CB342';
        ctx.beginPath();
        ctx.moveTo(-6, -10);
        ctx.lineTo(-10, -14);
        ctx.lineTo(-4, -10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, -10);
        ctx.lineTo(6, -14);
        ctx.lineTo(4, -10);
        ctx.fill();

        // Rider spear
        ctx.fillStyle = '#795548';
        ctx.fillRect(2, -18, 2, 20);
        ctx.fillStyle = '#9E9E9E';
        ctx.beginPath();
        ctx.moveTo(3, -18);
        ctx.lineTo(0, -24);
        ctx.lineTo(6, -24);
        ctx.closePath();
        ctx.fill();
    },

    // TROLL - Large regenerating monster
    drawTroll(ctx) {
        // Large body
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.ellipse(0, 6, 14, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.ellipse(0, -14, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Big nose
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.ellipse(0, -10, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Small eyes
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(-5, -16, 2, 0, Math.PI * 2);
        ctx.arc(5, -16, 2, 0, Math.PI * 2);
        ctx.fill();

        // Big arms
        ctx.fillStyle = '#388E3C';
        ctx.beginPath();
        ctx.ellipse(-16, 0, 6, 12, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(16, 0, 6, 12, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Regen glow effect
        ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
    },

    // DARK_MAGE - Robed spellcaster
    drawDarkMage(ctx) {
        // Robe body
        ctx.fillStyle = '#4A148C';
        ctx.beginPath();
        ctx.moveTo(-8, -6);
        ctx.lineTo(-12, 14);
        ctx.lineTo(12, 14);
        ctx.lineTo(8, -6);
        ctx.closePath();
        ctx.fill();

        // Hood
        ctx.fillStyle = '#38006b';
        ctx.beginPath();
        ctx.arc(0, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(0, -18);
        ctx.lineTo(8, -8);
        ctx.closePath();
        ctx.fill();

        // Glowing eyes in hood
        ctx.fillStyle = '#E040FB';
        ctx.beginPath();
        ctx.arc(-3, -8, 2, 0, Math.PI * 2);
        ctx.arc(3, -8, 2, 0, Math.PI * 2);
        ctx.fill();

        // Staff
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(10, -20, 2, 34);

        // Staff orb
        ctx.fillStyle = '#9C27B0';
        ctx.beginPath();
        ctx.arc(11, -22, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(224, 64, 251, 0.5)';
        ctx.beginPath();
        ctx.arc(11, -22, 8, 0, Math.PI * 2);
        ctx.fill();
    },

    // BAT - Flying bat swarm
    drawBat(ctx) {
        // Body
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#212121';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-2, -2);
        ctx.quadraticCurveTo(-14, -8, -16, 0);
        ctx.quadraticCurveTo(-12, 4, -2, 2);
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(2, -2);
        ctx.quadraticCurveTo(14, -8, 16, 0);
        ctx.quadraticCurveTo(12, 4, 2, 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#424242';
        ctx.beginPath();
        ctx.moveTo(-2, -6);
        ctx.lineTo(-4, -12);
        ctx.lineTo(0, -8);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, -6);
        ctx.lineTo(4, -12);
        ctx.lineTo(0, -8);
        ctx.fill();

        // Red eyes
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(-2, -4, 1.5, 0, Math.PI * 2);
        ctx.arc(2, -4, 1.5, 0, Math.PI * 2);
        ctx.fill();
    },

    // WYVERN - Flying dragon-like creature
    drawWyvern(ctx) {
        // Body
        ctx.fillStyle = '#1565C0';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#1976D2';
        ctx.beginPath();
        ctx.ellipse(12, -4, 6, 5, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = '#1565C0';
        ctx.beginPath();
        ctx.moveTo(16, -4);
        ctx.lineTo(24, -2);
        ctx.lineTo(16, 0);
        ctx.closePath();
        ctx.fill();

        // Wings
        ctx.fillStyle = '#0D47A1';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(-20, -16);
        ctx.lineTo(-24, -6);
        ctx.lineTo(-16, 0);
        ctx.lineTo(-4, 0);
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(4, -4);
        ctx.lineTo(8, -16);
        ctx.lineTo(0, -20);
        ctx.lineTo(-6, -10);
        ctx.lineTo(4, 0);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(14, -5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.fillStyle = '#1565C0';
        ctx.beginPath();
        ctx.moveTo(-8, 2);
        ctx.quadraticCurveTo(-16, 8, -20, 4);
        ctx.lineTo(-18, 0);
        ctx.quadraticCurveTo(-14, 4, -8, 0);
        ctx.fill();
    },

    // GOLEM - Stone/rock monster
    drawGolem(ctx) {
        // Main body (rocky)
        ctx.fillStyle = '#78909C';
        ctx.beginPath();
        ctx.moveTo(-12, 16);
        ctx.lineTo(-14, 4);
        ctx.lineTo(-12, -8);
        ctx.lineTo(-6, -14);
        ctx.lineTo(6, -14);
        ctx.lineTo(12, -8);
        ctx.lineTo(14, 4);
        ctx.lineTo(12, 16);
        ctx.closePath();
        ctx.fill();

        // Rock texture lines
        ctx.strokeStyle = '#546E7A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -10);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, -8);
        ctx.lineTo(8, 2);
        ctx.lineTo(4, 10);
        ctx.stroke();

        // Glowing rune in chest
        ctx.fillStyle = '#00BCD4';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-4, 2);
        ctx.lineTo(0, 8);
        ctx.lineTo(4, 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0, 188, 212, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 2, 10, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (glowing)
        ctx.fillStyle = '#00BCD4';
        ctx.beginPath();
        ctx.arc(-5, -8, 3, 0, Math.PI * 2);
        ctx.arc(5, -8, 3, 0, Math.PI * 2);
        ctx.fill();

        // Arms (rocky)
        ctx.fillStyle = '#607D8B';
        ctx.beginPath();
        ctx.ellipse(-18, 2, 6, 10, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(18, 2, 6, 10, -0.2, 0, Math.PI * 2);
        ctx.fill();
    },

    // ASSASSIN - Stealthy cloaked figure
    drawAssassin(ctx) {
        // Cloak body
        ctx.fillStyle = '#37474F';
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.lineTo(-8, 12);
        ctx.lineTo(8, 12);
        ctx.lineTo(6, -4);
        ctx.closePath();
        ctx.fill();

        // Hood
        ctx.fillStyle = '#263238';
        ctx.beginPath();
        ctx.arc(0, -6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(0, -14);
        ctx.lineTo(6, -6);
        ctx.closePath();
        ctx.fill();

        // Face shadow (barely visible)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(0, -5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Glinting eyes
        ctx.fillStyle = '#B0BEC5';
        ctx.beginPath();
        ctx.arc(-2, -6, 1, 0, Math.PI * 2);
        ctx.arc(2, -6, 1, 0, Math.PI * 2);
        ctx.fill();

        // Daggers
        ctx.fillStyle = '#9E9E9E';
        ctx.save();
        ctx.translate(-8, 0);
        ctx.rotate(-0.5);
        ctx.fillRect(0, -1, 10, 2);
        ctx.restore();
        ctx.save();
        ctx.translate(8, 0);
        ctx.rotate(0.5);
        ctx.fillRect(-10, -1, 10, 2);
        ctx.restore();
    },

    // NECROMANCER - Dark robed magic user with skull staff
    drawNecromancer(ctx) {
        // Robe
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-14, 16);
        ctx.lineTo(14, 16);
        ctx.lineTo(8, -4);
        ctx.closePath();
        ctx.fill();

        // Hood
        ctx.fillStyle = '#0d0d0d';
        ctx.beginPath();
        ctx.arc(0, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(0, -20);
        ctx.lineTo(8, -8);
        ctx.closePath();
        ctx.fill();

        // Glowing green eyes
        ctx.fillStyle = '#76FF03';
        ctx.beginPath();
        ctx.arc(-3, -8, 2, 0, Math.PI * 2);
        ctx.arc(3, -8, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(118, 255, 3, 0.3)';
        ctx.beginPath();
        ctx.arc(0, -8, 6, 0, Math.PI * 2);
        ctx.fill();

        // Staff with skull
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(12, -24, 2, 38);

        // Skull on staff
        ctx.fillStyle = '#ECEFF1';
        ctx.beginPath();
        ctx.arc(13, -28, 5, 0, Math.PI * 2);
        ctx.fill();
        // Skull eyes
        ctx.fillStyle = '#76FF03';
        ctx.beginPath();
        ctx.arc(11, -29, 1.5, 0, Math.PI * 2);
        ctx.arc(15, -29, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Skull teeth
        ctx.fillStyle = '#ECEFF1';
        ctx.fillRect(10, -25, 6, 2);
    },

    // DRAGON - Large flying boss
    drawDragon(ctx) {
        // Main body
        ctx.fillStyle = '#C62828';
        ctx.beginPath();
        ctx.ellipse(0, 4, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Scales detail
        ctx.fillStyle = '#B71C1C';
        for (let i = -12; i < 12; i += 6) {
            ctx.beginPath();
            ctx.arc(i, 4, 4, 0, Math.PI);
            ctx.fill();
        }

        // Head
        ctx.fillStyle = '#D32F2F';
        ctx.beginPath();
        ctx.ellipse(18, -4, 10, 8, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Snout
        ctx.fillStyle = '#C62828';
        ctx.beginPath();
        ctx.moveTo(24, -4);
        ctx.lineTo(34, 0);
        ctx.lineTo(24, 4);
        ctx.closePath();
        ctx.fill();

        // Horns
        ctx.fillStyle = '#4E342E';
        ctx.beginPath();
        ctx.moveTo(12, -10);
        ctx.lineTo(8, -22);
        ctx.lineTo(16, -12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(20, -10);
        ctx.lineTo(24, -22);
        ctx.lineTo(22, -12);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#B71C1C';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-28, -24);
        ctx.lineTo(-34, -10);
        ctx.lineTo(-26, 2);
        ctx.lineTo(-8, 4);
        ctx.fill();
        // Wing bones
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -2);
        ctx.lineTo(-28, -24);
        ctx.moveTo(-14, -6);
        ctx.lineTo(-30, -14);
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(22, -6, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(22, -6, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Fire breath effect
        ctx.fillStyle = 'rgba(255, 152, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(44, -4);
        ctx.lineTo(44, 4);
        ctx.closePath();
        ctx.fill();

        // Tail
        ctx.fillStyle = '#C62828';
        ctx.beginPath();
        ctx.moveTo(-14, 6);
        ctx.quadraticCurveTo(-26, 12, -30, 6);
        ctx.quadraticCurveTo(-34, 2, -36, 6);
        ctx.lineTo(-32, 2);
        ctx.quadraticCurveTo(-28, 6, -14, 2);
        ctx.fill();
    },

    // GIANT - Huge humanoid boss
    drawGiant(ctx) {
        // Legs
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(-12, 12, 8, 14);
        ctx.fillRect(4, 12, 8, 14);

        // Body
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.ellipse(0, 4, 16, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // Loincloth
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.moveTo(-14, 8);
        ctx.lineTo(-10, 18);
        ctx.lineTo(10, 18);
        ctx.lineTo(14, 8);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = '#795548';
        ctx.beginPath();
        ctx.arc(0, -16, 12, 0, Math.PI * 2);
        ctx.fill();

        // Brow ridge
        ctx.fillStyle = '#5D4037';
        ctx.beginPath();
        ctx.ellipse(0, -20, 12, 4, 0, 0, Math.PI);
        ctx.fill();

        // Eyes (small, angry)
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(-5, -16, 2, 0, Math.PI * 2);
        ctx.arc(5, -16, 2, 0, Math.PI * 2);
        ctx.fill();

        // Arms
        ctx.fillStyle = '#6D4C41';
        ctx.beginPath();
        ctx.ellipse(-22, 0, 8, 14, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(22, 0, 8, 14, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Club in hand
        ctx.fillStyle = '#4E342E';
        ctx.save();
        ctx.translate(28, 0);
        ctx.rotate(-0.4);
        ctx.fillRect(-4, -30, 8, 40);
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.ellipse(0, -32, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    // DEMON_KNIGHT - Armored demon warrior
    drawDemonKnight(ctx) {
        // Armor body
        ctx.fillStyle = '#B71C1C';
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(-12, 14);
        ctx.lineTo(12, 14);
        ctx.lineTo(10, -4);
        ctx.closePath();
        ctx.fill();

        // Armor plates
        ctx.fillStyle = '#7f0000';
        ctx.fillRect(-8, 0, 16, 4);
        ctx.fillRect(-8, 6, 16, 4);

        // Shoulder pads
        ctx.fillStyle = '#B71C1C';
        ctx.beginPath();
        ctx.ellipse(-14, -2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(14, -2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Helmet
        ctx.fillStyle = '#880E4F';
        ctx.beginPath();
        ctx.arc(0, -12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Horns
        ctx.fillStyle = '#4A0000';
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
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(-4, -12, 2, 0, Math.PI * 2);
        ctx.arc(4, -12, 2, 0, Math.PI * 2);
        ctx.fill();

        // Flaming sword
        ctx.fillStyle = '#424242';
        ctx.fillRect(16, -20, 3, 30);
        // Blade
        ctx.fillStyle = '#F44336';
        ctx.beginPath();
        ctx.moveTo(17.5, -20);
        ctx.lineTo(14, -34);
        ctx.lineTo(21, -34);
        ctx.closePath();
        ctx.fill();
        // Fire effect
        ctx.fillStyle = 'rgba(255, 152, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(17.5, -34);
        ctx.quadraticCurveTo(12, -40, 17.5, -44);
        ctx.quadraticCurveTo(23, -40, 17.5, -34);
        ctx.fill();
    },

    // DEMON_KING - Final boss, massive demon
    drawDemonKing(ctx) {
        // Aura
        ctx.fillStyle = 'rgba(136, 14, 79, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#4A0000';
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-12, -8);
        ctx.lineTo(-40, -30);
        ctx.lineTo(-46, -10);
        ctx.lineTo(-40, 6);
        ctx.lineTo(-12, 8);
        ctx.fill();
        // Right wing
        ctx.beginPath();
        ctx.moveTo(12, -8);
        ctx.lineTo(40, -30);
        ctx.lineTo(46, -10);
        ctx.lineTo(40, 6);
        ctx.lineTo(12, 8);
        ctx.fill();

        // Body
        ctx.fillStyle = '#880E4F';
        ctx.beginPath();
        ctx.ellipse(0, 6, 18, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Armor/chest detail
        ctx.fillStyle = '#6a0038';
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(-12, 6);
        ctx.lineTo(0, 22);
        ctx.lineTo(12, 6);
        ctx.closePath();
        ctx.fill();

        // Head
        ctx.fillStyle = '#AD1457';
        ctx.beginPath();
        ctx.arc(0, -18, 14, 0, Math.PI * 2);
        ctx.fill();

        // Crown of horns
        ctx.fillStyle = '#4A0000';
        for (let i = -2; i <= 2; i++) {
            const x = i * 6;
            const height = i === 0 ? 24 : 18;
            ctx.beginPath();
            ctx.moveTo(x - 3, -28);
            ctx.lineTo(x, -28 - height);
            ctx.lineTo(x + 3, -28);
            ctx.closePath();
            ctx.fill();
        }

        // Glowing eyes
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.arc(-5, -18, 3, 0, Math.PI * 2);
        ctx.arc(5, -18, 3, 0, Math.PI * 2);
        ctx.fill();
        // Eye glow
        ctx.fillStyle = 'rgba(255, 23, 68, 0.5)';
        ctx.beginPath();
        ctx.arc(-5, -18, 6, 0, Math.PI * 2);
        ctx.arc(5, -18, 6, 0, Math.PI * 2);
        ctx.fill();

        // Arms
        ctx.fillStyle = '#AD1457';
        ctx.beginPath();
        ctx.ellipse(-24, 4, 8, 16, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(24, 4, 8, 16, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Claws
        ctx.fillStyle = '#4A0000';
        // Left hand claws
        ctx.beginPath();
        ctx.moveTo(-28, 18);
        ctx.lineTo(-32, 28);
        ctx.lineTo(-26, 20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-24, 20);
        ctx.lineTo(-24, 30);
        ctx.lineTo(-20, 22);
        ctx.fill();
        // Right hand claws
        ctx.beginPath();
        ctx.moveTo(28, 18);
        ctx.lineTo(32, 28);
        ctx.lineTo(26, 20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(24, 20);
        ctx.lineTo(24, 30);
        ctx.lineTo(20, 22);
        ctx.fill();
    },

    getEnemySize(type) {
        const sizes = {
            goblin: 10,
            orc: 12,
            orc_brute: 16,
            wolf_rider: 16,
            troll: 18,
            dark_mage: 12,
            bat: 12,
            wyvern: 16,
            golem: 20,
            assassin: 10,
            necromancer: 14,
            dragon: 28,
            giant: 28,
            demon_knight: 18,
            demon_king: 36
        };
        return sizes[type] || 12;
    },

    renderProjectiles() {
        const ctx = this.ctx;

        for (const proj of this.state.projectiles) {
            ctx.save();
            ctx.translate(proj.x, proj.y);

            switch (proj.type) {
                case 0: // Arrow
                    ctx.fillStyle = '#8d6e63';
                    ctx.fillRect(-6, -1, 12, 2);
                    break;
                case 1: // Cannonball
                    ctx.fillStyle = '#424242';
                    ctx.beginPath();
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 2: // Magic bolt
                    ctx.fillStyle = '#e1bee7';
                    ctx.beginPath();
                    ctx.arc(0, 0, 4, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 3: // Ice shard
                    ctx.fillStyle = '#4fc3f7';
                    ctx.beginPath();
                    ctx.moveTo(0, -6);
                    ctx.lineTo(3, 0);
                    ctx.lineTo(0, 6);
                    ctx.lineTo(-3, 0);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 4: // Poison dart
                    ctx.fillStyle = '#8bc34a';
                    ctx.fillRect(-4, -1, 8, 2);
                    break;
                case 5: // Lightning
                    ctx.strokeStyle = '#ffeb3b';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(-4, 0);
                    ctx.lineTo(4, 0);
                    ctx.stroke();
                    break;
                case 6: // Fire arrow
                    ctx.fillStyle = '#ff5722';
                    ctx.fillRect(-6, -1, 12, 2);
                    ctx.fillStyle = '#ff9800';
                    ctx.beginPath();
                    ctx.arc(4, 0, 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 7: // Ice arrow
                    ctx.fillStyle = '#4fc3f7';
                    ctx.fillRect(-6, -1, 12, 2);
                    break;
            }

            ctx.restore();
        }
    },

    renderSoldiers() {
        if (!this.state.soldiers || this.state.soldiers.length === 0) return;

        const ctx = this.ctx;

        for (const soldier of this.state.soldiers) {
            const x = soldier.x;
            const y = soldier.y;

            // Health bar
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 8, y - 18, 16, 3);
            const hpPercent = soldier.hp / soldier.maxHp;
            ctx.fillStyle = hpPercent > 0.5 ? '#2196F3' : '#ff9800';
            ctx.fillRect(x - 8, y - 18, 16 * hpPercent, 3);

            // Soldier body
            ctx.fillStyle = '#3949ab';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Helmet
            ctx.fillStyle = '#5c6bc0';
            ctx.beginPath();
            ctx.arc(x, y - 4, 5, Math.PI, 0);
            ctx.fill();

            // Shield
            ctx.fillStyle = '#1565c0';
            ctx.fillRect(x - 10, y - 4, 4, 10);

            // Sword animation when engaged
            if (soldier.engaged) {
                const time = Date.now() / 100;
                const swingAngle = Math.sin(time) * 0.5;
                ctx.save();
                ctx.translate(x + 6, y);
                ctx.rotate(swingAngle);
                ctx.fillStyle = '#9e9e9e';
                ctx.fillRect(-1, -12, 2, 12);
                ctx.restore();
            }
        }
    },

    renderSkeletons() {
        if (!this.state.skeletons || this.state.skeletons.length === 0) return;

        const ctx = this.ctx;

        for (const skeleton of this.state.skeletons) {
            const x = skeleton.x;
            const y = skeleton.y;

            // Health bar (purple for skeletons)
            ctx.fillStyle = '#333';
            ctx.fillRect(x - 8, y - 20, 16, 3);
            const hpPercent = skeleton.hp / skeleton.maxHp;
            ctx.fillStyle = skeleton.isStrong ? '#9c27b0' : '#7b1fa2';
            ctx.fillRect(x - 8, y - 20, 16 * hpPercent, 3);

            // Lifetime indicator (fading when close to despawn)
            const lifetimePercent = Math.min(skeleton.lifetime / 15, 1);
            const alpha = lifetimePercent < 0.3 ? 0.5 + lifetimePercent : 1;

            ctx.globalAlpha = alpha;

            // Skeleton body (bone white/gray)
            const bodyColor = skeleton.isStrong ? '#e1bee7' : '#bdbdbd';
            ctx.fillStyle = bodyColor;
            ctx.beginPath();
            ctx.arc(x, y, skeleton.isStrong ? 9 : 7, 0, Math.PI * 2);
            ctx.fill();

            // Skull
            ctx.fillStyle = skeleton.isStrong ? '#f3e5f5' : '#e0e0e0';
            ctx.beginPath();
            ctx.arc(x, y - 3, skeleton.isStrong ? 6 : 5, 0, Math.PI * 2);
            ctx.fill();

            // Eye sockets (dark purple glow)
            ctx.fillStyle = skeleton.isStrong ? '#7b1fa2' : '#4a148c';
            ctx.beginPath();
            ctx.arc(x - 2, y - 4, 1.5, 0, Math.PI * 2);
            ctx.arc(x + 2, y - 4, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Bone arms
            ctx.strokeStyle = bodyColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x - 10, y + 4);
            ctx.moveTo(x + 6, y);
            ctx.lineTo(x + 10, y + 4);
            ctx.stroke();

            // Sword animation when engaged (purple/magic sword for strong)
            if (skeleton.engaged) {
                const time = Date.now() / 80;
                const swingAngle = Math.sin(time) * 0.6;
                ctx.save();
                ctx.translate(x + 8, y);
                ctx.rotate(swingAngle);
                ctx.fillStyle = skeleton.isStrong ? '#9c27b0' : '#757575';
                ctx.fillRect(-1, -14, 2, 14);
                // Sword tip
                ctx.beginPath();
                ctx.moveTo(-2, -14);
                ctx.lineTo(0, -18);
                ctx.lineTo(2, -14);
                ctx.fill();
                ctx.restore();
            }

            // Strong skeleton purple aura
            if (skeleton.isStrong) {
                ctx.strokeStyle = 'rgba(156, 39, 176, 0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, 12, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
        }
    },

    renderHoverPreview() {
        if (!this.hoveredCell || this.selectedTower) return;
        if (!this.selectedTowerType) return;

        const ctx = this.ctx;
        const cellSize = this.config.cellSize;
        const x = this.hoveredCell.x * cellSize;
        const y = this.hoveredCell.y * cellSize;
        const centerX = x + cellSize / 2;
        const centerY = y + cellSize / 2;

        const canPlace = this.canPlaceTower(this.hoveredCell.x, this.hoveredCell.y);
        const range = this.TOWER_RANGES[this.selectedTowerType] || 100;

        // Range preview
        ctx.beginPath();
        ctx.arc(centerX, centerY, range, 0, Math.PI * 2);
        ctx.fillStyle = canPlace ? 'rgba(76, 175, 80, 0.12)' : 'rgba(244, 67, 54, 0.12)';
        ctx.fill();
        ctx.strokeStyle = canPlace ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cell highlight
        ctx.fillStyle = canPlace ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = canPlace ? '#4CAF50' : '#f44336';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Tower preview sprite
        if (canPlace) {
            ctx.globalAlpha = 0.6;
            ctx.save();
            ctx.translate(centerX, centerY);

            const mockTower = { type: this.selectedTowerType, upgrades: { pathA: 0, pathB: 0 } };
            switch (this.selectedTowerType) {
                case 'archer': this.drawArcherTower(ctx, mockTower); break;
                case 'cannon': this.drawCannonTower(ctx, mockTower); break;
                case 'mage': this.drawMageTower(ctx, mockTower); break;
                case 'frost': this.drawFrostTower(ctx, mockTower); break;
                case 'poison': this.drawPoisonTower(ctx, mockTower); break;
                case 'lightning': this.drawLightningTower(ctx, mockTower); break;
                case 'barracks': this.drawBarracksTower(ctx, mockTower); break;
                case 'ultimate': this.drawUltimateTower(ctx, mockTower); break;
            }

            ctx.restore();
            ctx.globalAlpha = 1;
        }
    },

    renderUI() {
        const ctx = this.ctx;
        const panelX = 960;

        // Panel background
        const gradient = ctx.createLinearGradient(panelX, 0, panelX + 240, 0);
        gradient.addColorStop(0, '#1a1f2e');
        gradient.addColorStop(1, '#161b22');
        ctx.fillStyle = gradient;
        ctx.fillRect(panelX, 0, 240, 720);

        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, 0, 240, 720);

        // Title
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', panelX + 120, 18);

        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('Tower Defense', panelX + 120, 38);

        // Stats
        ctx.textAlign = 'left';

        // Gold
        ctx.fillStyle = '#21262d';
        ctx.fillRect(panelX + 10, 58, 105, 35);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('💰 ' + this.state.gold.toLocaleString(), panelX + 18, 82);

        // Lives
        ctx.fillStyle = '#21262d';
        ctx.fillRect(panelX + 125, 58, 105, 35);
        ctx.fillStyle = '#f44336';
        ctx.fillText('❤️ ' + this.state.lives, panelX + 133, 82);

        // Wave
        ctx.fillStyle = '#21262d';
        ctx.fillRect(panelX + 10, 100, 220, 25);
        ctx.fillStyle = '#8b949e';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Wave ${this.state.wave}/${this.state.maxWaves}`, panelX + 18, 118);

        // Score
        ctx.fillStyle = '#58a6ff';
        ctx.textAlign = 'right';
        ctx.fillText(`Score: ${this.state.score}`, panelX + 222, 118);

        // Tower selection
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('SELECT TOWER', panelX + 120, 155);
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px sans-serif';
        ctx.fillText('(Keys 1-8)', panelX + 120, 170);

        // Tower buttons
        const towers = [
            { type: 'archer', name: 'Archer', icon: '🏹' },
            { type: 'cannon', name: 'Cannon', icon: '💣' },
            { type: 'mage', name: 'Mage', icon: '🔮' },
            { type: 'frost', name: 'Frost', icon: '❄️' },
            { type: 'poison', name: 'Poison', icon: '☠️' },
            { type: 'lightning', name: 'Lightning', icon: '⚡' },
            { type: 'barracks', name: 'Barracks', icon: '⚔️' },
            { type: 'ultimate', name: 'Ultimate', icon: '👑' }
        ];

        const startY = 185;
        for (let i = 0; i < towers.length; i++) {
            const t = towers[i];
            const btnY = startY + i * 42;
            const isSelected = this.selectedTowerType === t.type;
            const cost = this.TOWER_COSTS[t.type];
            const canAfford = this.state.gold >= cost;

            // Button background
            ctx.fillStyle = isSelected ? '#238636' : (canAfford ? '#21262d' : '#161b22');
            ctx.fillRect(panelX + 10, btnY, 220, 40);

            if (isSelected) {
                ctx.strokeStyle = '#3fb950';
                ctx.lineWidth = 2;
                ctx.strokeRect(panelX + 10, btnY, 220, 40);
            }

            // Icon and name
            ctx.fillStyle = canAfford ? '#f0f6fc' : '#484f58';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(t.icon, panelX + 18, btnY + 26);

            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(t.name, panelX + 42, btnY + 22);

            // Cost
            ctx.fillStyle = canAfford ? '#ffd700' : '#484f58';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${cost}g`, panelX + 42, btnY + 34);

            // Hotkey
            ctx.fillStyle = '#484f58';
            ctx.textAlign = 'right';
            ctx.fillText(`[${i + 1}]`, panelX + 222, btnY + 26);
        }

        // Controls
        const ctrlY = 555;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('CONTROLS', panelX + 120, ctrlY);

        // Start Wave button
        const canStart = !this.state.waveActive && !this.state.gameOver && !this.state.victory;
        ctx.fillStyle = canStart ? '#238636' : '#21262d';
        ctx.fillRect(panelX + 10, ctrlY + 15, 220, 35);
        ctx.fillStyle = canStart ? '#f0f6fc' : '#484f58';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(this.state.waveActive ? 'Wave In Progress...' : 'START WAVE [Space]', panelX + 120, ctrlY + 38);

        // Fast Forward button
        ctx.fillStyle = this.state.fastForward ? '#1f6feb' : '#21262d';
        ctx.fillRect(panelX + 10, ctrlY + 55, 220, 35);
        ctx.fillStyle = '#f0f6fc';
        ctx.fillText(this.state.fastForward ? '⏩ FAST (2x) [F]' : '▶️ NORMAL [F]', panelX + 120, ctrlY + 78);

        // Tips
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px sans-serif';
        ctx.fillText('Click tower to see upgrades', panelX + 120, ctrlY + 110);
        ctx.fillText('ESC to deselect', panelX + 120, ctrlY + 125);
    },

    renderUpgradePopout() {
        const ctx = this.ctx;
        const tower = this.selectedTower;
        if (!tower) return;

        const tree = this.UPGRADE_TREES[tower.type];
        const ups = tower.upgrades;

        const popoutY = 520;
        const popoutHeight = 200;

        // Background with slight transparency
        ctx.fillStyle = 'rgba(22, 27, 34, 0.95)';
        ctx.fillRect(0, popoutY, 960, popoutHeight);

        // Border
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, popoutY, 960, popoutHeight);

        // Header
        ctx.fillStyle = this.TOWER_COLORS[tower.type];
        ctx.fillRect(0, popoutY, 960, 40);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${tree.name} Tower [${ups.notation}]`, 15, popoutY + 26);

        // Stats
        ctx.font = '12px sans-serif';
        ctx.fillText(`DMG: ${tower.damage}  |  Range: ${Math.round(tower.range)}  |  Speed: ${tower.attackSpeed.toFixed(1)}/s`, 200, popoutY + 26);

        // Sell button
        ctx.fillStyle = '#da3633';
        ctx.fillRect(800, popoutY + 5, 90, 30);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Sell +${tower.sellValue}g`, 845, popoutY + 25);

        // Close button
        ctx.fillStyle = '#484f58';
        ctx.fillRect(900, popoutY + 5, 40, 30);
        ctx.fillStyle = '#fff';
        ctx.fillText('✕', 920, popoutY + 25);

        // Path headers
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#58a6ff';
        ctx.fillText(`Path A: ${tree.pathA.name}`, 110, popoutY + 55);
        ctx.fillText(`Path B: ${tree.pathB.name}`, 350, popoutY + 55);

        // Path A upgrades
        this.renderUpgradePath(ctx, 20, popoutY + 60, tree.pathA, ups.pathA, ups.pathAChoice, ups.pathALocked, 'A');

        // Path B upgrades
        this.renderUpgradePath(ctx, 240, popoutY + 60, tree.pathB, ups.pathB, ups.pathBChoice, ups.pathBLocked, 'B');

        // Tower preview with current upgrades
        ctx.save();
        ctx.translate(700, popoutY + 120);
        ctx.scale(2, 2);
        switch (tower.type) {
            case 'archer': this.drawArcherTower(ctx, tower); break;
            case 'cannon': this.drawCannonTower(ctx, tower); break;
            case 'mage': this.drawMageTower(ctx, tower); break;
            case 'frost': this.drawFrostTower(ctx, tower); break;
            case 'poison': this.drawPoisonTower(ctx, tower); break;
            case 'lightning': this.drawLightningTower(ctx, tower); break;
            case 'barracks': this.drawBarracksTower(ctx, tower); break;
            case 'ultimate': this.drawUltimateTower(ctx, tower); break;
        }
        ctx.restore();

        // Instructions
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Click upgrade to purchase • Tier 3 locks other path at tier 2', 480, popoutY + 190);
    },

    renderUpgradePath(ctx, x, y, path, currentTier, tier3Choice, isLocked, pathLetter) {
        const tierHeight = 32;

        for (let t = 0; t < 4; t++) {
            const tier = path.tiers[t];
            const tierY = y + t * tierHeight;
            const tierNum = (t < 2) ? t + 1 : 3;
            const isChoice = t >= 2;
            const choiceLetter = isChoice ? tier.choice : '';

            // Determine state
            let state = 'available';
            if (isLocked && tierNum > 2) {
                state = 'locked';
            } else if (tierNum <= currentTier) {
                state = 'purchased';
            } else if (tierNum === currentTier + 1) {
                if (isChoice) {
                    if (currentTier < 2) state = 'unavailable';
                    else if (tier3Choice !== '' && tier3Choice !== choiceLetter) state = 'unavailable';
                    else state = this.state.gold >= tier.cost ? 'available' : 'cantafford';
                } else {
                    state = this.state.gold >= tier.cost ? 'available' : 'cantafford';
                }
            } else {
                state = 'unavailable';
            }

            // Background
            let bgColor = '#21262d';
            let textColor = '#f0f6fc';
            let borderColor = '#30363d';

            if (state === 'purchased') {
                bgColor = '#238636';
                borderColor = '#3fb950';
            } else if (state === 'available') {
                bgColor = '#1f6feb';
                borderColor = '#58a6ff';
            } else if (state === 'locked') {
                bgColor = '#161b22';
                textColor = '#484f58';
            } else if (state === 'cantafford') {
                bgColor = '#21262d';
                textColor = '#6e7681';
            } else {
                textColor = '#484f58';
            }

            ctx.fillStyle = bgColor;
            ctx.fillRect(x, tierY, 200, tierHeight - 2);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, tierY, 200, tierHeight - 2);

            // Tier indicator
            ctx.fillStyle = textColor;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'left';
            const tierLabel = isChoice ? `T3${choiceLetter}` : `T${tierNum}`;
            ctx.fillText(tierLabel, x + 5, tierY + 12);

            // Name
            ctx.font = '11px sans-serif';
            ctx.fillText(tier.name, x + 35, tierY + 12);

            // Description
            ctx.fillStyle = state === 'purchased' ? '#a5d6a7' : '#8b949e';
            ctx.font = '9px sans-serif';
            ctx.fillText(tier.desc, x + 5, tierY + 24);

            // Cost or status
            ctx.textAlign = 'right';
            if (state === 'purchased') {
                ctx.fillStyle = '#3fb950';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText('✓', x + 195, tierY + 18);
            } else if (state === 'locked') {
                ctx.fillStyle = '#484f58';
                ctx.font = '9px sans-serif';
                ctx.fillText('LOCKED', x + 195, tierY + 18);
            } else if (state === 'available' || state === 'cantafford') {
                ctx.fillStyle = state === 'available' ? '#ffd700' : '#6e7681';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText(`${tier.cost}g`, x + 195, tierY + 18);
            }
        }
    },

    renderGameOver() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, 960, 720);

        ctx.fillStyle = '#f44336';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', 480, 320);

        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.fillText(`Reached Wave ${this.state.wave}`, 480, 370);
        ctx.fillText(`Final Score: ${this.state.score}`, 480, 410);
    },

    renderVictory() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, 960, 720);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 VICTORY! 🏆', 480, 320);

        ctx.fillStyle = '#fff';
        ctx.font = '24px sans-serif';
        ctx.fillText('All 50 Waves Completed!', 480, 370);
        ctx.fillText(`Final Score: ${this.state.score}`, 480, 410);
    },

    cleanup() {
        this.state = null;
        this.config = null;
        this.selectedTower = null;
        this.showUpgradePopout = false;
    }
};
