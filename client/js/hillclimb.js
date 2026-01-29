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
        paused: false
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

    // Vehicle definitions
    vehicles: {
        jeep: {
            name: 'Jeep',
            mass: 1.0,
            maxSpeed: 12,
            accel: 0.4,
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
            maxSpeed: 15,
            accel: 0.6,
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
            maxSpeed: 10,
            accel: 0.3,
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
            maxSpeed: 18,
            accel: 0.5,
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
            maxSpeed: 8,
            accel: 0.2,
            fuelCapacity: 150,
            wheelBase: 80,
            bodyWidth: 100,
            bodyHeight: 40,
            wheelRadius: 14,
            color: '#9c27b0',
            bodyColor: '#7b1fa2'
        }
    },

    // Physics constants
    physics: {
        gravity: 0.6,
        springStiffness: 0.35,
        springDamping: 0.15,
        springRestLength: 20,
        friction: 0.8,
        airRotationSpeed: 0.003,
        groundFriction: 0.98,
        airDrag: 0.999
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
            showGarage: false
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

        // Position car on ground
        this.state.car.y = this.getTerrainHeight(100) - 30;

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

        // Fractional Brownian Motion with 4 octaves
        let amplitude = 1.0;
        let frequency = 0.003;
        const maxHeight = 200;

        for (let i = 0; i < 4; i++) {
            height -= this.noise.simplex2D(x * frequency, 0) * amplitude * maxHeight;
            amplitude *= 0.5;
            frequency *= 2.0;
        }

        // Increase difficulty with distance
        const distanceFactor = Math.min(x / 8000, 1.5);
        const difficultyAmplitude = 50 * distanceFactor;
        height -= this.noise.simplex2D(x * 0.008, 100) * difficultyAmplitude;

        // Starting area is flat
        if (x < 200) {
            const flatHeight = baseHeight;
            const blend = x / 200;
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

        let x = startX + 50 + Math.random() * 100;
        while (x < endX) {
            const terrainY = this.getTerrainHeight(x);

            // Spawn coin or fuel canister
            if (Math.random() < 0.15) {
                // Fuel canister
                this.collectibles.push({
                    type: 'fuel',
                    x: x,
                    y: terrainY - 40,
                    collected: false,
                    value: 25
                });
                x += 200 + Math.random() * 300;
            } else {
                // Coin cluster or single
                if (Math.random() < 0.3) {
                    // Arc pattern
                    for (let i = 0; i < 5; i++) {
                        this.collectibles.push({
                            type: 'coin',
                            x: x + i * 25,
                            y: terrainY - 50 - Math.sin(i / 4 * Math.PI) * 40,
                            collected: false,
                            value: 10
                        });
                    }
                    x += 150;
                } else {
                    // Single coin
                    this.collectibles.push({
                        type: 'coin',
                        x: x,
                        y: terrainY - 40,
                        collected: false,
                        value: 10
                    });
                    x += 50 + Math.random() * 80;
                }
            }
        }
    },

    // ============================================
    // INPUT HANDLING
    // ============================================
    setupInput() {
        this.keyDownHandler = (e) => {
            if (this.state.gameOver) {
                if (e.code === 'Space' || e.code === 'Enter') {
                    this.resetGame();
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

        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);
    },

    // ============================================
    // PHYSICS UPDATE
    // ============================================
    update(dt) {
        if (this.state.paused || this.state.gameOver) return;

        const car = this.state.car;
        const vehicle = this.vehicles[this.save.selectedVehicle];
        const upgrades = this.save.upgrades[this.save.selectedVehicle] || { engine: 1, suspension: 1, tires: 1, fuel: 1 };

        // Calculate upgraded stats
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

        // Spring-damper suspension
        const restLength = this.physics.springRestLength * suspensionMultiplier;
        const stiffness = this.physics.springStiffness / suspensionMultiplier;
        const damping = this.physics.springDamping;

        // Front wheel suspension
        const frontDist = frontGroundY - frontWheelY - vehicle.wheelRadius;
        this.wheels.front.grounded = frontDist < restLength;
        this.wheels.front.groundY = frontGroundY;

        let frontSpringForce = 0;
        if (this.wheels.front.grounded) {
            const compression = restLength - frontDist;
            this.wheels.front.compression = compression;
            frontSpringForce = compression * stiffness - car.vy * damping;
        }

        // Rear wheel suspension
        const rearDist = rearGroundY - rearWheelY - vehicle.wheelRadius;
        this.wheels.rear.grounded = rearDist < restLength;
        this.wheels.rear.groundY = rearGroundY;

        let rearSpringForce = 0;
        if (this.wheels.rear.grounded) {
            const compression = restLength - rearDist;
            this.wheels.rear.compression = compression;
            rearSpringForce = compression * stiffness - car.vy * damping;
        }

        const isGrounded = this.wheels.front.grounded || this.wheels.rear.grounded;

        // Apply gravity
        car.vy += this.physics.gravity;

        // Apply spring forces
        if (this.wheels.front.grounded) {
            car.vy -= frontSpringForce / vehicle.mass;
        }
        if (this.wheels.rear.grounded) {
            car.vy -= rearSpringForce / vehicle.mass;
        }

        // Terrain following rotation
        if (isGrounded) {
            const targetAngle = this.getTerrainAngle(car.x);
            const angleDiff = targetAngle - car.rotation;
            car.angularVelocity += angleDiff * 0.1;
            car.angularVelocity *= 0.85;
        }

        // Controls
        if (isGrounded) {
            // Ground controls
            if (this.input.gas) {
                const accel = vehicle.accel * engineMultiplier * tireGrip;
                car.vx += accel * cosR;
            }
            if (this.input.brake) {
                // Brake or reverse
                if (car.vx > 0.5) {
                    car.vx *= 0.95;
                } else {
                    car.vx -= vehicle.accel * 0.5 * engineMultiplier;
                }
            }

            // Ground friction
            car.vx *= this.physics.groundFriction;

            // Track air time for bonus
            this.state.airTime = 0;
        } else {
            // Air controls - rotate vehicle
            if (this.input.gas) {
                car.angularVelocity += this.physics.airRotationSpeed;
            }
            if (this.input.brake) {
                car.angularVelocity -= this.physics.airRotationSpeed;
            }

            // Air drag
            car.vx *= this.physics.airDrag;
            car.vy *= this.physics.airDrag;

            // Track air time
            this.state.airTime += dt;
        }

        // Apply rotation
        car.rotation += car.angularVelocity;

        // Limit max speed
        const maxSpeed = vehicle.maxSpeed * engineMultiplier;
        car.vx = Math.max(-maxSpeed * 0.5, Math.min(maxSpeed, car.vx));

        // Apply velocity
        car.x += car.vx;
        car.y += car.vy;

        // Wheel rotation for visual effect
        if (isGrounded) {
            const wheelSpeed = car.vx / vehicle.wheelRadius;
            this.wheels.front.rotation += wheelSpeed;
            this.wheels.rear.rotation += wheelSpeed;
        }

        // Collision with ground (prevent sinking)
        const carGroundY = this.getTerrainHeight(car.x);
        const minY = carGroundY - vehicle.wheelRadius - this.physics.springRestLength;
        if (car.y > minY) {
            car.y = minY;
            if (car.vy > 0) car.vy = 0;
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

        // Check for crash (head touching ground)
        const headX = car.x + sinR * vehicle.bodyHeight;
        const headY = car.y - cosR * vehicle.bodyHeight;
        const headGroundY = this.getTerrainHeight(headX);

        if (headY > headGroundY - 5 && Math.abs(car.rotation) > Math.PI / 3) {
            this.gameOver('crash');
            return;
        }

        // Fuel consumption
        let fuelConsumption = 0.3 * dt;
        if (this.input.gas) fuelConsumption += 0.8 * dt;

        // Uphill penalty
        const terrainAngle = this.getTerrainAngle(car.x);
        if (terrainAngle < -0.2 && this.input.gas) {
            fuelConsumption += 0.3 * dt;
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

                if (item.type === 'coin') {
                    // Air bonus
                    const multiplier = this.state.airTime > 0.5 ? 2 : 1;
                    this.state.coins += item.value * multiplier;
                    this.spawnParticle(item.x, item.y, 'coin');
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
        const count = type === 'dust' ? 3 : (type === 'coin' ? 8 : 12);

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * (type === 'dust' ? 3 : 6),
                vy: -Math.random() * (type === 'dust' ? 2 : 4),
                life: 1.0,
                decay: 0.02 + Math.random() * 0.02,
                type,
                size: type === 'dust' ? 3 + Math.random() * 4 : 4 + Math.random() * 3
            });
        }
    },

    updateParticles(dt) {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // gravity
            p.life -= p.decay;
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

        for (const item of this.collectibles) {
            if (item.collected) continue;
            if (item.x < this.camera.x - 50 || item.x > this.camera.x + this.canvas.width + 50) continue;

            if (item.type === 'coin') {
                // Golden coin with glow
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
                // Fuel canister
                ctx.shadowColor = '#00ff00';
                ctx.shadowBlur = 15;
                ctx.fillStyle = '#228b22';
                ctx.fillRect(item.x - 10, item.y - 15, 20, 30);
                ctx.fillStyle = '#32cd32';
                ctx.fillRect(item.x - 7, item.y - 12, 14, 24);
                ctx.shadowBlur = 0;

                // Fuel label
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('F', item.x, item.y + 3);
            }
        }
    },

    drawVehicle() {
        const ctx = this.ctx;
        const car = this.state.car;
        const vehicle = this.vehicles[this.save.selectedVehicle];

        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.rotation);

        const halfWB = vehicle.wheelBase / 2;

        // Suspension lines
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 3;

        // Front suspension
        const frontCompression = this.wheels.front.compression || 0;
        ctx.beginPath();
        ctx.moveTo(halfWB, 0);
        ctx.lineTo(halfWB, vehicle.wheelRadius + this.physics.springRestLength - frontCompression);
        ctx.stroke();

        // Rear suspension
        const rearCompression = this.wheels.rear.compression || 0;
        ctx.beginPath();
        ctx.moveTo(-halfWB, 0);
        ctx.lineTo(-halfWB, vehicle.wheelRadius + this.physics.springRestLength - rearCompression);
        ctx.stroke();

        // Car body
        ctx.fillStyle = vehicle.bodyColor;
        ctx.beginPath();
        ctx.roundRect(
            -vehicle.bodyWidth / 2,
            -vehicle.bodyHeight,
            vehicle.bodyWidth,
            vehicle.bodyHeight,
            5
        );
        ctx.fill();

        // Body highlight
        ctx.fillStyle = vehicle.color;
        ctx.beginPath();
        ctx.roundRect(
            -vehicle.bodyWidth / 2 + 3,
            -vehicle.bodyHeight + 3,
            vehicle.bodyWidth - 6,
            vehicle.bodyHeight / 2,
            3
        );
        ctx.fill();

        // Windows
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(
            -vehicle.bodyWidth / 4,
            -vehicle.bodyHeight + 5,
            vehicle.bodyWidth / 2,
            vehicle.bodyHeight / 3
        );

        // Draw wheels
        this.drawWheel(halfWB, vehicle.wheelRadius + this.physics.springRestLength - frontCompression,
                       vehicle.wheelRadius, this.wheels.front.rotation);
        this.drawWheel(-halfWB, vehicle.wheelRadius + this.physics.springRestLength - rearCompression,
                       vehicle.wheelRadius, this.wheels.rear.rotation);

        ctx.restore();
    },

    drawWheel(x, y, radius, rotation) {
        const ctx = this.ctx;

        // Tire
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Rim
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Spokes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const angle = rotation + (i * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + Math.cos(angle) * radius * 0.5,
                y + Math.sin(angle) * radius * 0.5
            );
            ctx.stroke();
        }

        // Center hub
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
    },

    drawParticles() {
        const ctx = this.ctx;

        for (const p of this.particles) {
            ctx.globalAlpha = p.life;

            if (p.type === 'dust') {
                ctx.fillStyle = '#8b7355';
            } else if (p.type === 'coin') {
                ctx.fillStyle = '#ffd700';
            } else if (p.type === 'fuel') {
                ctx.fillStyle = '#32cd32';
            } else if (p.type === 'flip' || p.type === 'milestone') {
                ctx.fillStyle = '#ff6b6b';
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
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
