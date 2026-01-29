// Hill Climb Racing - Single Player Game
const HillClimbGame = {
    canvas: null,
    ctx: null,
    animationId: null,
    lastTime: 0,

    // Game state
    state: {
        car: {
            x: 100,
            y: 0,
            vx: 0,
            vy: 0,
            rotation: 0,
            angularVelocity: 0
        },
        fuel: 100,
        coins: 0,
        distance: 0,
        gameOver: false,
        gameOverReason: '',
        paused: false,
        showGarage: true,
        garageTab: 'vehicles', // 'vehicles' or 'upgrades'
        selectedUpgrade: 'engine'
    },

    // Progression (saved to localStorage)
    save: {
        totalCoins: 0,
        bestDistance: 0,
        unlockedVehicles: ['jeep'],
        selectedVehicle: 'jeep',
        upgrades: {
            jeep: { engine: 1, suspension: 1, tires: 1, fuel: 1 }
        }
    },

    // Input state
    input: {
        gas: false,
        brake: false
    },

    // Camera
    camera: {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0
    },

    // Terrain chunks
    terrain: {
        chunks: new Map(),
        chunkWidth: 800,
        sampleDistance: 10
    },

    // Collectibles
    collectibles: [],

    // Particles
    particles: [],

    // Crash detection grace period
    crashGraceTimer: 0,
    lastBadLandingTime: 0,

    // First fuel tracking
    firstFuelSpawned: false,

    // Vehicle definitions - tuned for fun, responsive gameplay
    vehicles: {
        jeep: {
            name: 'Jeep',
            mass: 1.0,
            maxSpeed: 18,
            accel: 0.9,
            fuelCapacity: 100,
            wheelBase: 45,
            bodyWidth: 60,
            bodyHeight: 25,
            wheelRadius: 12,
            color: '#4a9c2d',
            bodyColor: '#3d8526'
        },
        motorbike: {
            name: 'Motorbike',
            cost: 25000,
            mass: 0.5,
            maxSpeed: 22,
            accel: 1.2,
            fuelCapacity: 60,
            wheelBase: 35,
            bodyWidth: 40,
            bodyHeight: 20,
            wheelRadius: 10,
            color: '#e63946',
            bodyColor: '#c62828'
        },
        monstertruck: {
            name: 'Monster Truck',
            cost: 100000,
            mass: 1.8,
            maxSpeed: 15,
            accel: 0.7,
            fuelCapacity: 120,
            wheelBase: 55,
            bodyWidth: 70,
            bodyHeight: 30,
            wheelRadius: 18,
            color: '#1e88e5',
            bodyColor: '#1565c0'
        },
        racecar: {
            name: 'Race Car',
            cost: 250000,
            mass: 0.8,
            maxSpeed: 28,
            accel: 1.0,
            fuelCapacity: 80,
            wheelBase: 50,
            bodyWidth: 65,
            bodyHeight: 18,
            wheelRadius: 10,
            color: '#ffc107',
            bodyColor: '#ff9800'
        },
        bus: {
            name: 'Bus',
            cost: 500000,
            mass: 2.5,
            maxSpeed: 12,
            accel: 0.5,
            fuelCapacity: 150,
            wheelBase: 80,
            bodyWidth: 100,
            bodyHeight: 40,
            wheelRadius: 14,
            color: '#9c27b0',
            bodyColor: '#7b1fa2'
        }
    },

    // Upgrade costs (level -> cost)
    upgradeCosts: [
        0, 500, 1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000,
        100000, 150000, 250000, 400000, 600000, 1000000, 1500000, 2500000, 4000000, 6000000
    ],

    // Mouse state for garage UI
    mouse: { x: 0, y: 0, clicked: false },

    // Physics constants (tuned for dt-scaled physics)
    physics: {
        gravity: 0.8,
        springStiffness: 0.2,
        springDamping: 0.3,
        springRestLength: 15,
        friction: 0.8,
        airRotationSpeed: 0.08,
        groundFriction: 0.98,
        airDrag: 0.995
    },

    // Wheels state
    wheels: {
        front: { compression: 0, grounded: false, groundY: 0, rotation: 0 },
        rear: { compression: 0, grounded: false, groundY: 0, rotation: 0 }
    },

    // ============================================
    // SIMPLEX NOISE IMPLEMENTATION
    // ============================================
    noise: {
        grad3: [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
        ],
        perm: [],

        init(seed = 12345) {
            const p = [];
            for (let i = 0; i < 256; i++) p[i] = i;

            // Shuffle using seed
            let n = seed;
            for (let i = 255; i > 0; i--) {
                n = (n * 16807) % 2147483647;
                const j = n % (i + 1);
                [p[i], p[j]] = [p[j], p[i]];
            }

            this.perm = [];
            for (let i = 0; i < 512; i++) {
                this.perm[i] = p[i & 255];
            }
        },

        dot(g, x, y) {
            return g[0] * x + g[1] * y;
        },

        simplex2D(x, y) {
            const F2 = 0.5 * (Math.sqrt(3) - 1);
            const G2 = (3 - Math.sqrt(3)) / 6;

            const s = (x + y) * F2;
            const i = Math.floor(x + s);
            const j = Math.floor(y + s);

            const t = (i + j) * G2;
            const X0 = i - t;
            const Y0 = j - t;
            const x0 = x - X0;
            const y0 = y - Y0;

            let i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }

            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2;
            const y2 = y0 - 1 + 2 * G2;

            const ii = i & 255;
            const jj = j & 255;

            const gi0 = this.perm[ii + this.perm[jj]] % 12;
            const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
            const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

            let n0, n1, n2;

            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 < 0) n0 = 0;
            else {
                t0 *= t0;
                n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
            }

            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 < 0) n1 = 0;
            else {
                t1 *= t1;
                n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
            }

            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 < 0) n2 = 0;
            else {
                t2 *= t2;
                n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
            }

            return 70 * (n0 + n1 + n2);
        }
    },

    // ============================================
    // INITIALIZATION
    // ============================================
    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvas.width = 1200;
        this.canvas.height = 700;

        // Initialize noise
        this.noise.init(Math.floor(Math.random() * 1000000));

        // Load save data
        this.loadGame();

        // Reset game state
        this.resetGame();

        // Show garage on first launch
        this.state.showGarage = true;
        this.state.garageTab = 'vehicles';

        // Setup input
        this.setupInput();

        // Start game loop
        this.lastTime = performance.now();
        this.startGameLoop();
    },

    resetGame() {
        const vehicle = this.vehicles[this.save.selectedVehicle];
        const upgrades = this.save.upgrades[this.save.selectedVehicle] || { engine: 1, suspension: 1, tires: 1, fuel: 1 };

        // Calculate upgraded stats
        const fuelCapacity = vehicle.fuelCapacity * (1 + (upgrades.fuel - 1) * 0.1);

        this.state = {
            car: {
                x: 100,
                y: this.getTerrainHeight(100) - 50,
                vx: 0,
                vy: 0,
                rotation: 0,
                angularVelocity: 0
            },
            fuel: fuelCapacity,
            maxFuel: fuelCapacity,
            coins: 0,
            distance: 0,
            airTime: 0,
            totalRotation: 0,
            lastRotation: 0,
            gameOver: false,
            gameOverReason: '',
            paused: false,
            showGarage: false,
            garageTab: 'vehicles',
            selectedUpgrade: 'engine'
        };

        this.wheels = {
            front: { compression: 0, grounded: false, groundY: 0, rotation: 0 },
            rear: { compression: 0, grounded: false, groundY: 0, rotation: 0 }
        };

        // Clear and regenerate terrain
        this.terrain.chunks.clear();
        this.generateInitialTerrain();

        // Spawn collectibles
        this.collectibles = [];
        this.spawnCollectibles(0, 2000);

        // Clear particles
        this.particles = [];

        // Reset tracking variables
        this.wasAirborne = false;
        this.lastMilestone = 0;
        this.firstFuelSpawned = false;
        this.crashGraceTimer = 0;
        this.lastBadLandingTime = 0;

        // Position car above ground (simple: ground level minus wheel radius minus small buffer)
        this.state.car.y = this.getTerrainHeight(100) - vehicle.wheelRadius - 10;

        // Reset camera
        this.camera.x = this.state.car.x - 200;
        this.camera.targetX = this.camera.x;
    },

    // ============================================
    // TERRAIN GENERATION
    // ============================================
    getTerrainHeight(x) {
        const baseHeight = this.canvas.height - 150;
        let height = baseHeight;

        // Convert pixel position to "meters" (10 pixels = 1 meter)
        const distanceMeters = x / 10;

        // Progressive difficulty zones
        // Zone 1: 0-500m - Nearly flat (max ~10 degree slopes)
        // Zone 2: 500-1000m - Gentle hills (max ~20 degrees)
        // Zone 3: 1000m+ - Progressive challenge
        let amplitudeScale;
        let frequencyScale;

        if (distanceMeters < 500) {
            // First 500 meters: very gentle
            amplitudeScale = 0.12 + (distanceMeters / 500) * 0.18;  // 0.12 to 0.30
            frequencyScale = 0.4;
        } else if (distanceMeters < 1000) {
            // 500-1000m: gentle hills
            const progress = (distanceMeters - 500) / 500;
            amplitudeScale = 0.30 + progress * 0.25;  // 0.30 to 0.55
            frequencyScale = 0.5 + progress * 0.2;
        } else {
            // 1000m+: progressive challenge (caps around 3000m)
            const progress = Math.min((distanceMeters - 1000) / 2000, 1.0);
            amplitudeScale = 0.55 + progress * 0.45;  // 0.55 to 1.0
            frequencyScale = 0.7 + progress * 0.3;
        }

        // Base terrain with REDUCED frequency and amplitude
        const baseFrequency = 0.0012 * frequencyScale;  // Much lower than 0.003
        const maxHeight = 120 * amplitudeScale;          // Reduced from 200

        // Fractional Brownian Motion with 3 octaves (reduced from 4)
        let amplitude = 1.0;
        let frequency = baseFrequency;

        for (let i = 0; i < 3; i++) {
            height -= this.noise.simplex2D(x * frequency, 0) * amplitude * maxHeight;
            amplitude *= 0.5;
            frequency *= 2.0;
        }

        // Flat "rest areas" every ~300 meters (procedural)
        const restAreaPeriod = 300;
        const restAreaWidth = 50;
        const restAreaPosition = distanceMeters % restAreaPeriod;

        if (restAreaPosition < restAreaWidth && distanceMeters > 150) {
            const flatBlend = Math.sin(restAreaPosition / restAreaWidth * Math.PI);
            const flatHeight = baseHeight - 30;
            height = height * (1 - flatBlend * 0.6) + flatHeight * (flatBlend * 0.6);
        }

        // Extended flat starting area (first 150 meters / 1500 pixels)
        if (x < 1500) {
            const flatHeight = baseHeight - 15;
            const blend = Math.pow(x / 1500, 2);  // Quadratic for smoother transition
            height = flatHeight * (1 - blend) + height * blend;
        }

        return Math.max(100, Math.min(this.canvas.height - 50, height));
    },

    getTerrainAngle(x) {
        const dx = 5;
        const h1 = this.getTerrainHeight(x - dx);
        const h2 = this.getTerrainHeight(x + dx);
        return Math.atan2(h2 - h1, dx * 2);
    },

    generateInitialTerrain() {
        // Generate terrain chunks around starting position
        for (let chunkX = -1; chunkX <= 3; chunkX++) {
            this.generateChunk(chunkX * this.terrain.chunkWidth);
        }
    },

    generateChunk(startX) {
        const chunkId = Math.floor(startX / this.terrain.chunkWidth);
        if (this.terrain.chunks.has(chunkId)) return;

        const points = [];
        for (let x = startX; x <= startX + this.terrain.chunkWidth; x += this.terrain.sampleDistance) {
            points.push({ x, y: this.getTerrainHeight(x) });
        }

        this.terrain.chunks.set(chunkId, points);

        // Spawn collectibles in new chunk
        this.spawnCollectibles(startX, startX + this.terrain.chunkWidth);

        // Clean up old chunks
        if (this.terrain.chunks.size > 10) {
            const minChunk = Math.floor((this.state.car.x - this.terrain.chunkWidth * 2) / this.terrain.chunkWidth);
            for (const [id] of this.terrain.chunks) {
                if (id < minChunk) {
                    this.terrain.chunks.delete(id);
                }
            }
        }
    },

    // ============================================
    // COLLECTIBLES
    // ============================================
    spawnCollectibles(startX, endX) {
        // Don't spawn in starting area
        startX = Math.max(startX, 300);

        // Guaranteed first fuel can within first 800 pixels (80m)
        if (startX <= 300 && !this.firstFuelSpawned) {
            const firstFuelX = 500 + Math.random() * 250;
            const terrainY = this.getTerrainHeight(firstFuelX);
            this.collectibles.push({
                type: 'fuel',
                x: firstFuelX,
                y: terrainY - 55,
                collected: false,
                value: 40,
                isLarge: true
            });
            this.firstFuelSpawned = true;
        }

        let x = startX + 30 + Math.random() * 60;
        let lastFuelX = startX - 1000;

        while (x < endX) {
            const terrainY = this.getTerrainHeight(x);
            const distanceFromLastFuel = x - lastFuelX;

            // GUARANTEED fuel can every 750-1500 pixels (75-150m)
            const needsFuel = distanceFromLastFuel >= 750 ||
                             (distanceFromLastFuel >= 500 && Math.random() < distanceFromLastFuel / 1200);

            if (needsFuel) {
                // Fuel canister - larger and more fuel
                this.collectibles.push({
                    type: 'fuel',
                    x: x,
                    y: terrainY - 55,
                    collected: false,
                    value: 30 + Math.floor(Math.random() * 15),  // 30-44 units
                    isLarge: Math.random() < 0.35
                });
                lastFuelX = x;
                x += 80 + Math.random() * 100;
            } else {
                // Coin spawning - much denser with varied patterns
                const coinPattern = Math.random();

                if (coinPattern < 0.04) {
                    // GIANT COIN worth 10x (rare but exciting)
                    this.collectibles.push({
                        type: 'giantcoin',
                        x: x,
                        y: terrainY - 65,
                        collected: false,
                        value: 100
                    });
                    x += 70 + Math.random() * 50;
                } else if (coinPattern < 0.40) {
                    // Arc cluster - 8-12 coins
                    const coinCount = 8 + Math.floor(Math.random() * 5);
                    for (let i = 0; i < coinCount; i++) {
                        this.collectibles.push({
                            type: 'coin',
                            x: x + i * 20,
                            y: terrainY - 45 - Math.sin(i / (coinCount - 1) * Math.PI) * 55,
                            collected: false,
                            value: 10
                        });
                    }
                    x += coinCount * 20 + 30;
                } else if (coinPattern < 0.60) {
                    // Vertical stack - 5-7 coins
                    const stackCount = 5 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < stackCount; i++) {
                        this.collectibles.push({
                            type: 'coin',
                            x: x,
                            y: terrainY - 35 - i * 18,
                            collected: false,
                            value: 10
                        });
                    }
                    x += 50 + Math.random() * 35;
                } else if (coinPattern < 0.75) {
                    // Diamond pattern - 9 coins
                    const positions = [
                        [0, 0], [-12, 18], [12, 18], [-24, 36], [0, 36],
                        [24, 36], [-12, 54], [12, 54], [0, 72]
                    ];
                    for (const [ox, oy] of positions) {
                        this.collectibles.push({
                            type: 'coin',
                            x: x + ox,
                            y: terrainY - 35 - oy,
                            collected: false,
                            value: 10
                        });
                    }
                    x += 65 + Math.random() * 40;
                } else {
                    // Small cluster - 2-4 coins
                    const smallCount = 2 + Math.floor(Math.random() * 3);
                    for (let i = 0; i < smallCount; i++) {
                        this.collectibles.push({
                            type: 'coin',
                            x: x + i * 22,
                            y: terrainY - 40,
                            collected: false,
                            value: 10
                        });
                    }
                    x += 25 + Math.random() * 40;
                }
            }
        }
    },

    // ============================================
    // INPUT HANDLING
    // ============================================
    setupInput() {
        this.keyDownHandler = (e) => {
            // Garage mode keyboard shortcuts
            if (this.state.showGarage) {
                if (e.code === 'Enter' || e.code === 'Space') {
                    this.startFromGarage();
                }
                return;
            }

            if (this.state.gameOver) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.state.showGarage = true;
                }
                return;
            }

            if (e.code === 'Escape') {
                this.state.paused = !this.state.paused;
                return;
            }

            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.input.gas = true;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.input.brake = true;
            }
        };

        this.keyUpHandler = (e) => {
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                this.input.gas = false;
            }
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                this.input.brake = false;
            }
        };

        // Mouse handling for garage UI
        this.mouseMoveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            this.mouse.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        };

        this.mouseClickHandler = (e) => {
            if (this.state.showGarage) {
                this.handleGarageClick(this.mouse.x, this.mouse.y);
            }
        };

        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.addEventListener('click', this.mouseClickHandler);
    },

    startFromGarage() {
        this.resetGame();
        this.state.showGarage = false;
    },

    handleGarageClick(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Tab buttons (top)
        if (y >= 80 && y <= 120) {
            if (x >= centerX - 150 && x <= centerX - 10) {
                this.state.garageTab = 'vehicles';
            } else if (x >= centerX + 10 && x <= centerX + 150) {
                this.state.garageTab = 'upgrades';
            }
            return;
        }

        // Play button
        if (y >= this.canvas.height - 80 && y <= this.canvas.height - 30) {
            if (x >= centerX - 100 && x <= centerX + 100) {
                this.startFromGarage();
                return;
            }
        }

        if (this.state.garageTab === 'vehicles') {
            // Vehicle selection grid
            const vehicles = Object.keys(this.vehicles);
            const gridStartX = 100;
            const gridStartY = 160;
            const cardWidth = 180;
            const cardHeight = 120;
            const cols = 5;

            for (let i = 0; i < vehicles.length; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cardX = gridStartX + col * (cardWidth + 20);
                const cardY = gridStartY + row * (cardHeight + 20);

                if (x >= cardX && x <= cardX + cardWidth && y >= cardY && y <= cardY + cardHeight) {
                    const vehicleId = vehicles[i];
                    const vehicle = this.vehicles[vehicleId];

                    if (this.save.unlockedVehicles.includes(vehicleId)) {
                        // Select this vehicle
                        this.save.selectedVehicle = vehicleId;
                        this.saveGame();
                    } else if (vehicle.cost && this.save.totalCoins >= vehicle.cost) {
                        // Purchase vehicle
                        this.save.totalCoins -= vehicle.cost;
                        this.save.unlockedVehicles.push(vehicleId);
                        this.save.selectedVehicle = vehicleId;
                        this.save.upgrades[vehicleId] = { engine: 1, suspension: 1, tires: 1, fuel: 1 };
                        this.saveGame();
                    }
                    return;
                }
            }
        } else if (this.state.garageTab === 'upgrades') {
            // Upgrade buttons
            const upgrades = ['engine', 'suspension', 'tires', 'fuel'];
            const startY = 180;

            for (let i = 0; i < upgrades.length; i++) {
                const upgradeY = startY + i * 100;
                const btnX = this.canvas.width - 220;
                const btnY = upgradeY + 25;

                if (x >= btnX && x <= btnX + 120 && y >= btnY && y <= btnY + 40) {
                    this.purchaseUpgrade(upgrades[i]);
                    return;
                }
            }
        }
    },

    purchaseUpgrade(upgradeType) {
        const vehicleId = this.save.selectedVehicle;
        if (!this.save.upgrades[vehicleId]) {
            this.save.upgrades[vehicleId] = { engine: 1, suspension: 1, tires: 1, fuel: 1 };
        }

        const currentLevel = this.save.upgrades[vehicleId][upgradeType];
        if (currentLevel >= 20) return; // Max level

        const cost = this.upgradeCosts[currentLevel] || 10000000;
        if (this.save.totalCoins >= cost) {
            this.save.totalCoins -= cost;
            this.save.upgrades[vehicleId][upgradeType]++;
            this.saveGame();
        }
    },

    // ============================================
    // PHYSICS UPDATE (with proper dt scaling)
    // ============================================
    update(dt) {
        if (this.state.showGarage || this.state.paused || this.state.gameOver) return;

        const car = this.state.car;
        const vehicle = this.vehicles[this.save.selectedVehicle];
        const upgrades = this.save.upgrades[this.save.selectedVehicle] || { engine: 1, suspension: 1, tires: 1, fuel: 1 };

        // Calculate upgraded stats (suspension makes springs STRONGER, not weaker)
        const engineMultiplier = 1 + (upgrades.engine - 1) * 0.15;
        const suspensionMultiplier = 1 + (upgrades.suspension - 1) * 0.1;
        const tireGrip = 1 + (upgrades.tires - 1) * 0.1;

        // Get wheel world positions
        const cosR = Math.cos(car.rotation);
        const sinR = Math.sin(car.rotation);
        const halfWheelBase = vehicle.wheelBase / 2;

        const frontWheelX = car.x + cosR * halfWheelBase;
        const frontWheelY = car.y + sinR * halfWheelBase;
        const rearWheelX = car.x - cosR * halfWheelBase;
        const rearWheelY = car.y - sinR * halfWheelBase;

        // Ground detection for each wheel
        const frontGroundY = this.getTerrainHeight(frontWheelX);
        const rearGroundY = this.getTerrainHeight(rearWheelX);

        // Simplified ground detection: wheel touches ground if close enough
        const wheelBottom = vehicle.wheelRadius;
        const frontPenetration = (frontWheelY + wheelBottom) - frontGroundY;
        const rearPenetration = (rearWheelY + wheelBottom) - rearGroundY;

        this.wheels.front.grounded = frontPenetration > -5;
        this.wheels.rear.grounded = rearPenetration > -5;
        this.wheels.front.groundY = frontGroundY;
        this.wheels.rear.groundY = rearGroundY;

        const isGrounded = this.wheels.front.grounded || this.wheels.rear.grounded;

        // Apply gravity (scaled by dt)
        car.vy += this.physics.gravity * dt;

        // Simple ground collision - keep car above terrain
        const groundY = this.getTerrainHeight(car.x);
        const carBottom = car.y + vehicle.wheelRadius + 5;

        if (carBottom > groundY) {
            // Car is touching/below ground - push up and apply friction
            car.y = groundY - vehicle.wheelRadius - 5;

            // Dampen vertical velocity on ground contact
            if (car.vy > 0) {
                car.vy *= -0.3; // Small bounce
                if (Math.abs(car.vy) < 0.5) car.vy = 0;
            }
        }

        // Store compression for visual suspension
        this.wheels.front.compression = Math.max(0, frontPenetration + 5);
        this.wheels.rear.compression = Math.max(0, rearPenetration + 5);

        // Terrain following rotation (smooth, scaled by dt)
        if (isGrounded) {
            const targetAngle = this.getTerrainAngle(car.x);
            const angleDiff = targetAngle - car.rotation;

            // Smoothly rotate towards terrain angle
            car.angularVelocity += angleDiff * 0.15 * dt;
            car.angularVelocity *= Math.pow(0.9, dt); // Damping
        }

        // Controls
        if (isGrounded) {
            // Ground controls - acceleration scaled by dt
            if (this.input.gas) {
                const accel = vehicle.accel * engineMultiplier * tireGrip;
                car.vx += accel * cosR * dt;
            }
            if (this.input.brake) {
                // Brake or reverse
                if (car.vx > 0.5) {
                    car.vx *= Math.pow(0.92, dt); // Brake
                } else {
                    car.vx -= vehicle.accel * 0.4 * engineMultiplier * dt;
                }
            }

            // Ground friction (exponential decay scaled by dt)
            car.vx *= Math.pow(0.98, dt);

            // Track air time for bonus
            this.state.airTime = 0;
        } else {
            // Air controls - rotate vehicle (scaled by dt)
            if (this.input.gas) {
                car.angularVelocity += this.physics.airRotationSpeed * dt;
            }
            if (this.input.brake) {
                car.angularVelocity -= this.physics.airRotationSpeed * dt;
            }

            // Air drag (exponential decay scaled by dt)
            car.vx *= Math.pow(0.995, dt);
            car.vy *= Math.pow(0.995, dt);

            // Track air time
            this.state.airTime += dt;
        }

        // Apply rotation (scaled by dt)
        car.rotation += car.angularVelocity * dt;

        // Clamp angular velocity
        car.angularVelocity = Math.max(-0.1, Math.min(0.1, car.angularVelocity));

        // Limit max speed
        const maxSpeed = vehicle.maxSpeed * engineMultiplier;
        car.vx = Math.max(-maxSpeed * 0.5, Math.min(maxSpeed, car.vx));

        // Clamp vertical velocity
        car.vy = Math.max(-12, Math.min(12, car.vy));

        // Apply velocity (scaled by dt)
        car.x += car.vx * dt;
        car.y += car.vy * dt;

        // Wheel rotation for visual effect
        if (isGrounded) {
            const wheelSpeed = car.vx / vehicle.wheelRadius * dt;
            this.wheels.front.rotation += wheelSpeed;
            this.wheels.rear.rotation += wheelSpeed;
        }

        // Track rotation for flip detection
        const rotationDelta = car.rotation - this.state.lastRotation;
        this.state.totalRotation += rotationDelta;
        this.state.lastRotation = car.rotation;

        // Check for flip bonus
        if (Math.abs(this.state.totalRotation) >= Math.PI * 2) {
            const flips = Math.floor(Math.abs(this.state.totalRotation) / (Math.PI * 2));
            this.state.coins += 500 * flips;
            this.state.totalRotation %= (Math.PI * 2);
            this.spawnParticle(car.x, car.y - 30, 'flip');
        }

        // Check for crash (head touching ground) - MORE FORGIVING
        const headX = car.x + sinR * vehicle.bodyHeight;
        const headY = car.y - cosR * vehicle.bodyHeight;
        const headGroundY = this.getTerrainHeight(headX);

        // Constants for forgiving crash detection
        const CRASH_ANGLE_THRESHOLD = Math.PI * 0.44;  // ~80 degrees (up from 60)
        const SEVERE_FLIP_ANGLE = Math.PI * 0.8;       // ~144 degrees
        const GROUND_BUFFER = 12;                       // 12px buffer (up from 5)
        const GRACE_PERIOD_MS = 500;                    // 0.5 second grace after bad landing
        const SUSTAINED_CRASH_FRAMES = 9;               // ~0.15 seconds at 60fps

        // Check if in grace period after bad landing
        const timeSinceBadLanding = performance.now() - this.lastBadLandingTime;
        const inGracePeriod = timeSinceBadLanding < GRACE_PERIOD_MS;

        // Evaluate crash conditions
        const headPenetration = headY - (headGroundY - GROUND_BUFFER);
        const isSevereAngle = Math.abs(car.rotation) > CRASH_ANGLE_THRESHOLD;
        const isFullFlip = Math.abs(car.rotation) > SEVERE_FLIP_ANGLE;

        if (headPenetration > 0 && (isFullFlip || (isSevereAngle && !inGracePeriod))) {
            // Accumulate crash timer
            this.crashGraceTimer += 1;

            // Only crash after sustained bad position
            if (this.crashGraceTimer > SUSTAINED_CRASH_FRAMES) {
                this.gameOver('crash');
                return;
            }
        } else {
            this.crashGraceTimer = Math.max(0, this.crashGraceTimer - 0.5);  // Decay slowly
        }

        // Track bad landings for grace period
        if (isGrounded && this.wasAirborne && Math.abs(car.rotation) > Math.PI / 4) {
            this.lastBadLandingTime = performance.now();
        }

        // Fuel consumption - designed for 45-60 seconds of full-throttle driving
        // At 100 fuel capacity: 0.028/frame * 60fps = 1.68/sec => ~60 seconds
        const IDLE_DRAIN_RATE = 0.005;      // Minimal idle drain (coasting)
        const THROTTLE_DRAIN_RATE = 0.028;  // Main drain when accelerating
        const UPHILL_DRAIN_BONUS = 0.008;   // Extra drain on steep hills

        let fuelConsumption = IDLE_DRAIN_RATE * dt;
        if (this.input.gas) {
            fuelConsumption += THROTTLE_DRAIN_RATE * dt;
        }

        // Uphill penalty (steeper threshold, scaled by angle)
        const terrainAngle = this.getTerrainAngle(car.x);
        if (terrainAngle < -0.25 && this.input.gas) {
            fuelConsumption += UPHILL_DRAIN_BONUS * dt * Math.abs(terrainAngle);
        }

        this.state.fuel -= fuelConsumption;

        if (this.state.fuel <= 0) {
            this.state.fuel = 0;
            this.gameOver('fuel');
            return;
        }

        // Update distance
        this.state.distance = Math.max(0, Math.floor((car.x - 100) / 10));

        // Distance milestone bonus
        if (this.state.distance > 0 && this.state.distance % 500 === 0) {
            const milestoneBonus = 100;
            if (!this.lastMilestone || this.lastMilestone < this.state.distance) {
                this.state.coins += milestoneBonus;
                this.lastMilestone = this.state.distance;
                this.spawnParticle(car.x, car.y - 50, 'milestone');
            }
        }

        // Collect items
        this.checkCollectibles();

        // Generate new terrain chunks
        const currentChunk = Math.floor(car.x / this.terrain.chunkWidth);
        for (let i = currentChunk - 1; i <= currentChunk + 3; i++) {
            this.generateChunk(i * this.terrain.chunkWidth);
        }

        // Update particles
        this.updateParticles(dt);

        // Spawn dust particles when moving on ground
        if (isGrounded && Math.abs(car.vx) > 2 && Math.random() < 0.3) {
            this.spawnParticle(rearWheelX, rearGroundY, 'dust');
        }

        // Exhaust smoke when accelerating
        if (this.input.gas && Math.random() < 0.4) {
            const exhaustX = car.x - Math.cos(car.rotation) * (vehicle.bodyWidth / 2 + 5);
            const exhaustY = car.y - Math.sin(car.rotation) * (vehicle.bodyWidth / 2 + 5);
            this.spawnParticle(exhaustX, exhaustY, 'exhaust');
        }

        // Landing effect when wheels touch ground after air time
        if (isGrounded && this.wasAirborne) {
            this.spawnParticle(frontWheelX, frontGroundY, 'landing');
            this.spawnParticle(rearWheelX, rearGroundY, 'landing');
        }
        this.wasAirborne = !isGrounded;

        // Sparks when body scrapes ground
        const bodyGroundY = this.getTerrainHeight(car.x);
        if (car.y + 5 > bodyGroundY && Math.abs(car.vx) > 3) {
            this.spawnParticle(car.x, bodyGroundY, 'sparks');
        }

        // Update camera
        this.updateCamera();
    },

    checkCollectibles() {
        const car = this.state.car;
        const vehicle = this.vehicles[this.save.selectedVehicle];
        const collectRadius = vehicle.bodyWidth / 2 + 20;

        for (const item of this.collectibles) {
            if (item.collected) continue;

            const dx = item.x - car.x;
            const dy = item.y - car.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < collectRadius) {
                item.collected = true;

                if (item.type === 'coin' || item.type === 'giantcoin') {
                    // Air bonus for regular coins
                    const multiplier = (item.type === 'coin' && this.state.airTime > 0.5) ? 2 : 1;
                    this.state.coins += item.value * multiplier;
                    this.spawnParticle(item.x, item.y, item.type === 'giantcoin' ? 'giantcoin' : 'coin');
                } else if (item.type === 'fuel') {
                    this.state.fuel = Math.min(this.state.maxFuel, this.state.fuel + item.value);
                    this.spawnParticle(item.x, item.y, 'fuel');
                }
            }
        }

        // Clean up collected items that are far behind
        this.collectibles = this.collectibles.filter(item =>
            !item.collected || item.x > car.x - 500
        );
    },

    updateCamera() {
        const car = this.state.car;

        // Target camera position
        this.camera.targetX = car.x - this.canvas.width * 0.3;
        this.camera.targetY = car.y - this.canvas.height * 0.5;

        // Smooth follow
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.08;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.05;

        // Keep camera above ground level
        const groundY = this.getTerrainHeight(car.x);
        const maxCameraY = groundY - this.canvas.height * 0.6;
        this.camera.y = Math.min(this.camera.y, maxCameraY);
    },

    // ============================================
    // PARTICLES
    // ============================================
    spawnParticle(x, y, type) {
        const configs = {
            dust: { count: 4, vxMult: 3, vyMult: 2, decay: 0.03, size: [3, 7] },
            coin: { count: 10, vxMult: 5, vyMult: 3, decay: 0.025, size: [3, 5] },
            fuel: { count: 12, vxMult: 4, vyMult: 3, decay: 0.02, size: [4, 6] },
            flip: { count: 20, vxMult: 8, vyMult: 6, decay: 0.015, size: [3, 6] },
            milestone: { count: 15, vxMult: 6, vyMult: 5, decay: 0.02, size: [4, 7] },
            exhaust: { count: 2, vxMult: 1, vyMult: 1.5, decay: 0.04, size: [2, 4] },
            landing: { count: 8, vxMult: 5, vyMult: 2, decay: 0.03, size: [4, 8] },
            sparks: { count: 6, vxMult: 8, vyMult: 6, decay: 0.05, size: [2, 4] }
        };

        const cfg = configs[type] || configs.dust;

        for (let i = 0; i < cfg.count; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 5,
                vx: (Math.random() - 0.5) * cfg.vxMult,
                vy: -Math.random() * cfg.vyMult - 0.5,
                life: 1.0,
                decay: cfg.decay + Math.random() * 0.01,
                type,
                size: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]),
                rotation: Math.random() * Math.PI * 2
            });
        }
    },

    updateParticles(dt) {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;

            // Type-specific physics
            if (p.type === 'exhaust') {
                p.vy -= 0.05; // Float up
                p.vx *= 0.98;
                p.size *= 1.02; // Expand
            } else if (p.type === 'sparks') {
                p.vy += 0.2; // Heavy gravity
            } else {
                p.vy += 0.1; // Normal gravity
            }

            p.life -= p.decay;
            if (p.rotation !== undefined) {
                p.rotation += p.vx * 0.1;
            }
        }

        this.particles = this.particles.filter(p => p.life > 0);
    },

    // ============================================
    // GAME OVER
    // ============================================
    gameOver(reason) {
        this.state.gameOver = true;
        this.state.gameOverReason = reason;

        // Update save data
        this.save.totalCoins += this.state.coins;
        if (this.state.distance > this.save.bestDistance) {
            this.save.bestDistance = this.state.distance;
        }

        this.saveGame();
    },

    // ============================================
    // SAVE/LOAD
    // ============================================
    saveGame() {
        localStorage.setItem('hillclimb_save', JSON.stringify(this.save));
    },

    loadGame() {
        const data = localStorage.getItem('hillclimb_save');
        if (data) {
            try {
                const loaded = JSON.parse(data);
                Object.assign(this.save, loaded);
            } catch (e) {
                console.error('Failed to load save:', e);
            }
        }
    },

    // ============================================
    // RENDERING
    // ============================================
    render() {
        const ctx = this.ctx;

        // Clear with sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        skyGradient.addColorStop(0, '#1a1a2e');
        skyGradient.addColorStop(0.5, '#16213e');
        skyGradient.addColorStop(1, '#0f3460');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw parallax backgrounds
        this.drawParallaxBackground(0.1, '#0d1b2a', 0.3);
        this.drawParallaxBackground(0.3, '#1b263b', 0.5);
        this.drawParallaxBackground(0.5, '#415a77', 0.7);

        // Draw terrain
        this.drawTerrain();

        // Draw collectibles
        this.drawCollectibles();

        // Draw vehicle
        this.drawVehicle();

        // Draw particles
        this.drawParticles();

        ctx.restore();

        // Draw UI (not affected by camera)
        this.drawUI();

        if (this.state.gameOver) {
            this.drawGameOver();
        }

        if (this.state.paused) {
            this.drawPaused();
        }

        if (this.state.showGarage) {
            this.drawGarage();
        }
    },

    drawGarage() {
        const ctx = this.ctx;
        const centerX = this.canvas.width / 2;

        // Dark overlay
        ctx.fillStyle = 'rgba(10, 10, 20, 0.97)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Title
        ctx.font = 'bold 42px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#05ffa1';
        ctx.fillText('GARAGE', centerX, 50);

        // Coins display
        ctx.font = 'bold 20px Orbitron, Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${this.save.totalCoins.toLocaleString()}`, this.canvas.width - 30, 40);
        ctx.beginPath();
        ctx.arc(this.canvas.width - 120, 33, 12, 0, Math.PI * 2);
        ctx.fill();

        // Tab buttons
        const tabY = 80;
        const tabHeight = 40;

        // Vehicles tab
        ctx.fillStyle = this.state.garageTab === 'vehicles' ? '#05ffa1' : '#333';
        ctx.fillRect(centerX - 150, tabY, 140, tabHeight);
        ctx.font = 'bold 16px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.state.garageTab === 'vehicles' ? '#000' : '#888';
        ctx.fillText('VEHICLES', centerX - 80, tabY + 27);

        // Upgrades tab
        ctx.fillStyle = this.state.garageTab === 'upgrades' ? '#05ffa1' : '#333';
        ctx.fillRect(centerX + 10, tabY, 140, tabHeight);
        ctx.fillStyle = this.state.garageTab === 'upgrades' ? '#000' : '#888';
        ctx.fillText('UPGRADES', centerX + 80, tabY + 27);

        if (this.state.garageTab === 'vehicles') {
            this.drawVehicleSelection();
        } else {
            this.drawUpgradePanel();
        }

        // Play button
        const btnY = this.canvas.height - 80;
        ctx.fillStyle = '#05ffa1';
        ctx.fillRect(centerX - 100, btnY, 200, 50);
        ctx.font = 'bold 22px Orbitron, Arial';
        ctx.fillStyle = '#000';
        ctx.fillText('PLAY', centerX, btnY + 35);

        // Current vehicle preview
        ctx.font = '14px Orbitron, Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(`Selected: ${this.vehicles[this.save.selectedVehicle].name}`, centerX, this.canvas.height - 100);
    },

    drawVehicleSelection() {
        const ctx = this.ctx;
        const vehicles = Object.keys(this.vehicles);
        const gridStartX = 100;
        const gridStartY = 160;
        const cardWidth = 180;
        const cardHeight = 120;
        const cols = 5;

        for (let i = 0; i < vehicles.length; i++) {
            const vehicleId = vehicles[i];
            const vehicle = this.vehicles[vehicleId];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cardX = gridStartX + col * (cardWidth + 20);
            const cardY = gridStartY + row * (cardHeight + 20);

            const isUnlocked = this.save.unlockedVehicles.includes(vehicleId);
            const isSelected = this.save.selectedVehicle === vehicleId;
            const canAfford = !isUnlocked && vehicle.cost && this.save.totalCoins >= vehicle.cost;

            // Card background
            if (isSelected) {
                ctx.fillStyle = '#05ffa1';
                ctx.fillRect(cardX - 3, cardY - 3, cardWidth + 6, cardHeight + 6);
            }
            ctx.fillStyle = isUnlocked ? '#1a1a2e' : '#0d0d15';
            ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

            // Vehicle preview (simple rect)
            ctx.save();
            ctx.translate(cardX + cardWidth / 2, cardY + 45);

            // Mini vehicle drawing
            ctx.fillStyle = isUnlocked ? vehicle.bodyColor : '#333';
            ctx.fillRect(-vehicle.bodyWidth / 2.5, -vehicle.bodyHeight / 2.5, vehicle.bodyWidth / 1.25, vehicle.bodyHeight / 1.25);
            ctx.fillStyle = isUnlocked ? vehicle.color : '#444';
            ctx.fillRect(-vehicle.bodyWidth / 2.5 + 3, -vehicle.bodyHeight / 2.5 + 2, vehicle.bodyWidth / 1.25 - 6, vehicle.bodyHeight / 3);

            // Wheels
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(-vehicle.wheelBase / 3, vehicle.bodyHeight / 3, vehicle.wheelRadius / 1.5, 0, Math.PI * 2);
            ctx.arc(vehicle.wheelBase / 3, vehicle.bodyHeight / 3, vehicle.wheelRadius / 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();

            // Vehicle name
            ctx.font = 'bold 14px Orbitron, Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = isUnlocked ? '#fff' : '#666';
            ctx.fillText(vehicle.name, cardX + cardWidth / 2, cardY + cardHeight - 25);

            // Cost or Selected text
            ctx.font = '12px Orbitron, Arial';
            if (isUnlocked) {
                if (isSelected) {
                    ctx.fillStyle = '#05ffa1';
                    ctx.fillText('SELECTED', cardX + cardWidth / 2, cardY + cardHeight - 8);
                } else {
                    ctx.fillStyle = '#888';
                    ctx.fillText('OWNED', cardX + cardWidth / 2, cardY + cardHeight - 8);
                }
            } else if (vehicle.cost) {
                ctx.fillStyle = canAfford ? '#ffd700' : '#ff4444';
                ctx.fillText(`${(vehicle.cost / 1000).toFixed(0)}K`, cardX + cardWidth / 2, cardY + cardHeight - 8);
            }

            // Lock overlay
            if (!isUnlocked) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
                ctx.font = '24px Arial';
                ctx.fillStyle = '#666';
                ctx.fillText('🔒', cardX + cardWidth / 2, cardY + 50);
            }
        }
    },

    drawUpgradePanel() {
        const ctx = this.ctx;
        const vehicleId = this.save.selectedVehicle;
        const vehicle = this.vehicles[vehicleId];
        const upgrades = this.save.upgrades[vehicleId] || { engine: 1, suspension: 1, tires: 1, fuel: 1 };

        // Vehicle name header
        ctx.font = 'bold 24px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = vehicle.color;
        ctx.fillText(vehicle.name, this.canvas.width / 2, 155);

        const upgradeTypes = [
            { id: 'engine', name: 'ENGINE', icon: '⚡', desc: 'Speed & Acceleration' },
            { id: 'suspension', name: 'SUSPENSION', icon: '🔧', desc: 'Stability & Handling' },
            { id: 'tires', name: 'TIRES', icon: '⚙️', desc: 'Grip & Hill Climbing' },
            { id: 'fuel', name: 'FUEL TANK', icon: '⛽', desc: 'Fuel Capacity' }
        ];

        const startY = 180;
        const rowHeight = 100;

        for (let i = 0; i < upgradeTypes.length; i++) {
            const upgrade = upgradeTypes[i];
            const level = upgrades[upgrade.id] || 1;
            const y = startY + i * rowHeight;

            // Row background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(100, y, this.canvas.width - 200, 80);

            // Icon
            ctx.font = '32px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(upgrade.icon, 120, y + 50);

            // Name and description
            ctx.font = 'bold 18px Orbitron, Arial';
            ctx.fillStyle = '#fff';
            ctx.fillText(upgrade.name, 180, y + 30);

            ctx.font = '12px Orbitron, Arial';
            ctx.fillStyle = '#666';
            ctx.fillText(upgrade.desc, 180, y + 50);

            // Level bar
            const barX = 180;
            const barY = y + 58;
            const barWidth = 300;
            const barHeight = 12;

            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = '#05ffa1';
            ctx.fillRect(barX, barY, barWidth * (level / 20), barHeight);

            // Level text
            ctx.font = '12px Orbitron, Arial';
            ctx.fillStyle = '#888';
            ctx.textAlign = 'right';
            ctx.fillText(`Lv.${level}/20`, barX + barWidth, y + 30);

            // Upgrade button
            const btnX = this.canvas.width - 220;
            const btnY = y + 25;

            if (level < 20) {
                const cost = this.upgradeCosts[level] || 10000000;
                const canAfford = this.save.totalCoins >= cost;

                ctx.fillStyle = canAfford ? '#ffd700' : '#444';
                ctx.fillRect(btnX, btnY, 120, 40);

                ctx.font = 'bold 12px Orbitron, Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = canAfford ? '#000' : '#666';

                const costText = cost >= 1000000 ? `${(cost / 1000000).toFixed(1)}M` : `${(cost / 1000).toFixed(0)}K`;
                ctx.fillText(`UPGRADE`, btnX + 60, btnY + 17);
                ctx.font = '11px Orbitron, Arial';
                ctx.fillText(costText, btnX + 60, btnY + 32);
            } else {
                ctx.fillStyle = '#05ffa1';
                ctx.fillRect(btnX, btnY, 120, 40);
                ctx.font = 'bold 14px Orbitron, Arial';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#000';
                ctx.fillText('MAX', btnX + 60, btnY + 27);
            }
        }
    },

    drawParallaxBackground(parallax, color, heightScale) {
        const ctx = this.ctx;
        const offsetX = this.camera.x * parallax;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(this.camera.x - 100, this.canvas.height + this.camera.y);

        for (let x = this.camera.x - 100; x < this.camera.x + this.canvas.width + 100; x += 50) {
            const y = this.getTerrainHeight(x + offsetX) * heightScale +
                      this.canvas.height * (1 - heightScale);
            ctx.lineTo(x, y + this.camera.y * (1 - parallax));
        }

        ctx.lineTo(this.camera.x + this.canvas.width + 100, this.canvas.height + this.camera.y);
        ctx.closePath();
        ctx.fill();
    },

    drawTerrain() {
        const ctx = this.ctx;
        const startX = Math.floor(this.camera.x / this.terrain.sampleDistance) * this.terrain.sampleDistance;
        const endX = startX + this.canvas.width + 100;

        // Main terrain fill
        const terrainGradient = ctx.createLinearGradient(0, this.canvas.height - 200, 0, this.canvas.height);
        terrainGradient.addColorStop(0, '#2d5a27');
        terrainGradient.addColorStop(0.3, '#1e3d19');
        terrainGradient.addColorStop(1, '#0d1f0a');

        ctx.fillStyle = terrainGradient;
        ctx.beginPath();
        ctx.moveTo(startX, this.canvas.height + 100);

        for (let x = startX; x <= endX; x += this.terrain.sampleDistance) {
            const y = this.getTerrainHeight(x);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(endX, this.canvas.height + 100);
        ctx.closePath();
        ctx.fill();

        // Grass line on top
        ctx.strokeStyle = '#4a9c2d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += this.terrain.sampleDistance) {
            const y = this.getTerrainHeight(x);
            if (x === startX) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    },

    drawCollectibles() {
        const ctx = this.ctx;
        const time = performance.now() / 1000;

        for (const item of this.collectibles) {
            if (item.collected) continue;
            if (item.x < this.camera.x - 50 || item.x > this.camera.x + this.canvas.width + 50) continue;

            if (item.type === 'giantcoin') {
                // Giant coin (10x value) with pulsing effect
                const pulse = 1 + Math.sin(time * 4) * 0.15;
                const radius = 22 * pulse;

                // Outer glow
                ctx.shadowColor = '#ffdd00';
                ctx.shadowBlur = 25;

                // Main coin body
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Inner ring
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(item.x, item.y, radius * 0.7, 0, Math.PI * 2);
                ctx.stroke();

                // Star in center
                this.drawStar(ctx, item.x, item.y, 5, radius * 0.45, radius * 0.22);
                ctx.fillStyle = '#fff8dc';
                ctx.fill();

                ctx.shadowBlur = 0;

                // "10x" label below
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('10x', item.x, item.y + radius + 14);

            } else if (item.type === 'coin') {
                // Regular golden coin with glow
                ctx.shadowColor = '#ffd700';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(item.x, item.y, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                // Inner detail
                ctx.fillStyle = '#ffec8b';
                ctx.beginPath();
                ctx.arc(item.x - 2, item.y - 2, 4, 0, Math.PI * 2);
                ctx.fill();

            } else if (item.type === 'fuel') {
                // Check if this is a large fuel can (value > 40)
                const isLarge = item.value && item.value > 40;
                const scale = isLarge ? 1.4 : 1;
                const baseW = 20 * scale;
                const baseH = 30 * scale;

                // Fuel canister with glow
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = isLarge ? 25 : 15;

                // Can body
                ctx.fillStyle = '#228b22';
                ctx.fillRect(item.x - baseW / 2, item.y - baseH / 2, baseW, baseH);
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(item.x - baseW / 2 + 3, item.y - baseH / 2 + 3, baseW - 6, baseH - 6);

                // Handle on top
                ctx.fillStyle = '#666';
                ctx.fillRect(item.x - 4, item.y - baseH / 2 - 6, 8, 6);
                ctx.fillRect(item.x - 6, item.y - baseH / 2 - 8, 12, 3);

                ctx.shadowBlur = 0;

                // Fuel label
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${isLarge ? 14 : 10}px Arial`;
                ctx.textAlign = 'center';
                ctx.fillText('F', item.x, item.y + 4);

                // Value label below large cans
                if (isLarge && item.value) {
                    ctx.fillStyle = '#90ee90';
                    ctx.font = 'bold 10px Arial';
                    ctx.fillText('+' + Math.round(item.value), item.x, item.y + baseH / 2 + 12);
                }
            }
        }
    },

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    },

    drawVehicle() {
        const ctx = this.ctx;
        const car = this.state.car;
        const vehicle = this.vehicles[this.save.selectedVehicle];

        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.rotation);

        const halfWB = vehicle.wheelBase / 2;
        const bw = vehicle.bodyWidth;
        const bh = vehicle.bodyHeight;

        // Shadow underneath vehicle
        ctx.save();
        ctx.rotate(-car.rotation); // Counter-rotate for flat shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, vehicle.wheelRadius + this.physics.springRestLength + 5, bw * 0.6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Suspension springs (visual)
        const frontCompression = this.wheels.front.compression || 0;
        const rearCompression = this.wheels.rear.compression || 0;
        this.drawSuspensionSpring(ctx, halfWB, 0, vehicle.wheelRadius + this.physics.springRestLength - frontCompression);
        this.drawSuspensionSpring(ctx, -halfWB, 0, vehicle.wheelRadius + this.physics.springRestLength - rearCompression);

        // Exhaust pipe (rear, bottom)
        ctx.fillStyle = '#555';
        ctx.fillRect(-bw / 2 - 8, -5, 10, 6);
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-bw / 2 - 8, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Car body - chunky curved shape
        ctx.fillStyle = vehicle.bodyColor;
        ctx.beginPath();
        // Start at front bottom
        ctx.moveTo(bw / 2, 0);
        // Front bumper curve
        ctx.quadraticCurveTo(bw / 2 + 8, -5, bw / 2 + 5, -bh * 0.4);
        // Hood slope
        ctx.lineTo(bw / 4, -bh * 0.5);
        // Windshield slope
        ctx.quadraticCurveTo(bw / 6, -bh * 0.9, 0, -bh);
        // Roof
        ctx.lineTo(-bw / 4, -bh);
        // Rear window slope
        ctx.quadraticCurveTo(-bw / 3, -bh * 0.85, -bw / 2.5, -bh * 0.5);
        // Rear slope
        ctx.lineTo(-bw / 2, -bh * 0.3);
        // Rear bumper
        ctx.quadraticCurveTo(-bw / 2 - 5, -5, -bw / 2, 0);
        // Bottom
        ctx.lineTo(bw / 2, 0);
        ctx.closePath();
        ctx.fill();

        // Body highlight (top)
        ctx.fillStyle = vehicle.color;
        ctx.beginPath();
        ctx.moveTo(bw / 4, -bh * 0.5);
        ctx.quadraticCurveTo(bw / 6, -bh * 0.85, 0, -bh + 3);
        ctx.lineTo(-bw / 4, -bh + 3);
        ctx.quadraticCurveTo(-bw / 3, -bh * 0.8, -bw / 2.5 + 5, -bh * 0.5);
        ctx.closePath();
        ctx.fill();

        // Windshield with reflection
        ctx.fillStyle = 'rgba(135, 206, 235, 0.85)';
        ctx.beginPath();
        ctx.moveTo(bw / 5, -bh * 0.55);
        ctx.quadraticCurveTo(bw / 8, -bh * 0.85, -bw / 10, -bh * 0.92);
        ctx.lineTo(-bw / 4 + 5, -bh * 0.92);
        ctx.quadraticCurveTo(-bw / 3 + 8, -bh * 0.75, -bw / 2.8, -bh * 0.55);
        ctx.closePath();
        ctx.fill();

        // Window reflection highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.moveTo(bw / 6, -bh * 0.6);
        ctx.lineTo(bw / 10, -bh * 0.75);
        ctx.lineTo(-bw / 8, -bh * 0.75);
        ctx.lineTo(-bw / 12, -bh * 0.6);
        ctx.closePath();
        ctx.fill();

        // Driver silhouette
        ctx.fillStyle = 'rgba(40, 40, 40, 0.7)';
        // Head
        ctx.beginPath();
        ctx.arc(-bw / 10, -bh * 0.75, 6, 0, Math.PI * 2);
        ctx.fill();
        // Body/shoulders
        ctx.beginPath();
        ctx.ellipse(-bw / 10, -bh * 0.55, 8, 10, 0, 0, Math.PI);
        ctx.fill();

        // Headlights (front)
        ctx.fillStyle = '#fff8dc';
        ctx.shadowColor = '#ffff88';
        ctx.shadowBlur = this.input.gas ? 12 : 6;
        ctx.beginPath();
        ctx.ellipse(bw / 2 + 2, -bh * 0.25, 4, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Taillights (rear) - brighter when braking
        const braking = this.input.brake;
        ctx.fillStyle = braking ? '#ff3333' : '#aa2222';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = braking ? 15 : 5;
        ctx.beginPath();
        ctx.ellipse(-bw / 2 - 2, -bh * 0.2, 3, 5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw wheels
        this.drawWheel(halfWB, vehicle.wheelRadius + this.physics.springRestLength - frontCompression,
                       vehicle.wheelRadius, this.wheels.front.rotation);
        this.drawWheel(-halfWB, vehicle.wheelRadius + this.physics.springRestLength - rearCompression,
                       vehicle.wheelRadius, this.wheels.rear.rotation);

        ctx.restore();
    },

    drawSuspensionSpring(ctx, x, yTop, yBottom) {
        const springCoils = 5;
        const springWidth = 6;
        const springLength = yBottom - yTop;
        const coilHeight = springLength / springCoils;

        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, yTop);

        for (let i = 0; i < springCoils; i++) {
            const y1 = yTop + coilHeight * i + coilHeight * 0.25;
            const y2 = yTop + coilHeight * i + coilHeight * 0.75;
            const dir = i % 2 === 0 ? 1 : -1;
            ctx.lineTo(x + springWidth * dir, y1);
            ctx.lineTo(x - springWidth * dir, y2);
        }
        ctx.lineTo(x, yBottom);
        ctx.stroke();
    },

    drawWheel(x, y, radius, rotation) {
        const ctx = this.ctx;

        // Tire with tread
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Tire tread marks (8 rotating marks on outer edge)
        ctx.fillStyle = '#333';
        for (let i = 0; i < 8; i++) {
            const angle = rotation + (i * Math.PI / 4);
            const treadX = x + Math.cos(angle) * (radius - 3);
            const treadY = y + Math.sin(angle) * (radius - 3);
            ctx.save();
            ctx.translate(treadX, treadY);
            ctx.rotate(angle);
            ctx.fillRect(-2, -4, 4, 8);
            ctx.restore();
        }

        // Rim with metallic gradient
        const rimGradient = ctx.createRadialGradient(x - radius * 0.15, y - radius * 0.15, 0, x, y, radius * 0.6);
        rimGradient.addColorStop(0, '#888');
        rimGradient.addColorStop(0.5, '#555');
        rimGradient.addColorStop(1, '#333');
        ctx.fillStyle = rimGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // 5 Spokes
        ctx.strokeStyle = '#777';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            const angle = rotation + (i * Math.PI * 2 / 5);
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * radius * 0.18, y + Math.sin(angle) * radius * 0.18);
            ctx.lineTo(x + Math.cos(angle) * radius * 0.52, y + Math.sin(angle) * radius * 0.52);
            ctx.stroke();
        }

        // Center hub with gradient
        const hubGradient = ctx.createRadialGradient(x - 2, y - 2, 0, x, y, radius * 0.22);
        hubGradient.addColorStop(0, '#aaa');
        hubGradient.addColorStop(0.7, '#666');
        hubGradient.addColorStop(1, '#444');
        ctx.fillStyle = hubGradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.22, 0, Math.PI * 2);
        ctx.fill();

        // Hub cap center dot
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();
    },

    drawParticles() {
        const ctx = this.ctx;

        for (const p of this.particles) {
            ctx.globalAlpha = p.life;

            const colors = {
                dust: '#8b7355',
                coin: '#ffd700',
                fuel: '#32cd32',
                flip: '#ff6b6b',
                milestone: '#05ffa1',
                exhaust: `rgba(100, 100, 100, ${p.life * 0.5})`,
                landing: '#c9a86c',
                sparks: '#ffaa00'
            };

            ctx.fillStyle = colors[p.type] || '#fff';

            if (p.type === 'sparks') {
                // Draw sparks as small lines
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation || 0);
                ctx.fillRect(-p.size, -1, p.size * 2, 2);
                ctx.restore();
            } else if (p.type === 'exhaust') {
                // Exhaust is more transparent and larger
                ctx.globalAlpha = p.life * 0.4;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (2 - p.life), 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'coin' || p.type === 'milestone') {
                // Add glow effect
                ctx.shadowColor = colors[p.type];
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
    },

    drawUI() {
        const ctx = this.ctx;

        // Fuel bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(15, 15, 200, 30);

        // Fuel bar fill
        const fuelPercent = this.state.fuel / this.state.maxFuel;
        const fuelColor = fuelPercent > 0.3 ? '#32cd32' : (fuelPercent > 0.15 ? '#ffa500' : '#ff4444');
        ctx.fillStyle = fuelColor;
        ctx.fillRect(18, 18, 194 * fuelPercent, 24);

        // Fuel bar border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, 15, 200, 30);

        // Fuel text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FUEL', 115, 36);

        // Distance
        ctx.font = 'bold 28px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#05ffa1';
        ctx.fillText(`${this.state.distance}m`, this.canvas.width / 2, 40);

        // Best distance
        ctx.font = '14px Orbitron, Arial';
        ctx.fillStyle = '#888';
        ctx.fillText(`Best: ${this.save.bestDistance}m`, this.canvas.width / 2, 60);

        // Coins
        ctx.font = 'bold 20px Orbitron, Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`${this.state.coins + this.save.totalCoins}`, this.canvas.width - 20, 35);

        // Coin icon
        ctx.beginPath();
        ctx.arc(this.canvas.width - 100, 28, 12, 0, Math.PI * 2);
        ctx.fill();

        // Run coins
        ctx.font = '14px Orbitron, Arial';
        ctx.fillStyle = '#888';
        ctx.fillText(`+${this.state.coins}`, this.canvas.width - 20, 55);

        // Controls hint
        ctx.font = '12px Orbitron, Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#555';
        ctx.fillText('Arrow Keys: Gas/Brake | ESC: Pause', 15, this.canvas.height - 15);
    },

    drawGameOver() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = 'bold 56px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2a6d';
        ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 60);

        ctx.font = '24px Orbitron, Arial';
        ctx.fillStyle = '#888';
        const reason = this.state.gameOverReason === 'fuel' ? 'Out of Fuel!' : 'Vehicle Crashed!';
        ctx.fillText(reason, this.canvas.width / 2, this.canvas.height / 2 - 20);

        ctx.font = 'bold 28px Orbitron, Arial';
        ctx.fillStyle = '#05ffa1';
        ctx.fillText(`Distance: ${this.state.distance}m`, this.canvas.width / 2, this.canvas.height / 2 + 30);

        ctx.font = '20px Orbitron, Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Coins Earned: ${this.state.coins}`, this.canvas.width / 2, this.canvas.height / 2 + 65);

        ctx.font = '16px Orbitron, Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('Press SPACE or ENTER to play again', this.canvas.width / 2, this.canvas.height / 2 + 110);
    },

    drawPaused() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.font = 'bold 48px Orbitron, Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);

        ctx.font = '18px Orbitron, Arial';
        ctx.fillStyle = '#888';
        ctx.fillText('Press ESC to resume', this.canvas.width / 2, this.canvas.height / 2 + 40);
    },

    // ============================================
    // GAME LOOP
    // ============================================
    startGameLoop() {
        const loop = (time) => {
            if (!this.canvas.parentElement) return;

            const dt = Math.min((time - this.lastTime) / 1000, 0.05);
            this.lastTime = time;

            this.update(dt * 60); // Normalize to 60fps
            this.render();

            this.animationId = requestAnimationFrame(loop);
        };

        this.animationId = requestAnimationFrame(loop);
    },

    // ============================================
    // CLEANUP
    // ============================================
    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);

        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
            this.canvas.removeEventListener('click', this.mouseClickHandler);
        }

        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    // For compatibility with game-server renderer interface
    updateState(state) {
        // Single-player game manages its own state
    },

    reset() {
        this.resetGame();
    }
};
