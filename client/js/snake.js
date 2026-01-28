// Snake game renderer - Enhanced with animations and juice
const SnakeRenderer = {
    canvas: null,
    ctx: null,
    config: null,
    state: null,
    prevState: null,
    lastRenderTime: 0,

    // Animation state
    foodPulse: 0,
    eatenFood: [],
    growingSegments: [],
    deathAnimations: [],
    scorePopups: [],

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.setupInput();
        this.startAnimationLoop();
    },

    setupInput() {
        document.addEventListener('keydown', (e) => {
            const keyMap = {
                'ArrowUp': 'up', 'w': 'up',
                'ArrowDown': 'down', 's': 'down',
                'ArrowLeft': 'left', 'a': 'left',
                'ArrowRight': 'right', 'd': 'right'
            };

            if (keyMap[e.key]) {
                e.preventDefault();
                socket.send('input', { direction: keyMap[e.key] });
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
        // Pulse food
        this.foodPulse += deltaTime * 0.005;

        // Update eaten food animations
        for (let i = this.eatenFood.length - 1; i >= 0; i--) {
            const food = this.eatenFood[i];
            food.age += deltaTime;
            food.scale = 1 + (food.age / food.lifetime) * 2;
            food.alpha = 1 - (food.age / food.lifetime);

            if (food.age >= food.lifetime) {
                this.eatenFood.splice(i, 1);
            }
        }

        // Update growing segments
        for (let i = this.growingSegments.length - 1; i >= 0; i--) {
            const seg = this.growingSegments[i];
            seg.age += deltaTime;
            seg.scale = Math.min(1, seg.age / seg.duration);

            if (seg.age >= seg.duration) {
                this.growingSegments.splice(i, 1);
            }
        }

        // Update death animations
        for (let i = this.deathAnimations.length - 1; i >= 0; i--) {
            const death = this.deathAnimations[i];
            death.age += deltaTime;

            // Update each segment in the explosion
            death.segments.forEach(seg => {
                seg.x += seg.vx;
                seg.y += seg.vy;
                seg.vy += 0.3; // gravity
                seg.rotation += seg.rotSpeed;
                seg.alpha = 1 - (death.age / death.lifetime);
            });

            if (death.age >= death.lifetime) {
                this.deathAnimations.splice(i, 1);
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
        // Detect food eaten
        if (this.prevState && state.snakes) {
            state.snakes.forEach((snake, idx) => {
                const prevSnake = this.prevState.snakes?.[idx];
                if (prevSnake && snake.score > prevSnake.score) {
                    this.onFoodEaten(idx, snake);
                }

                // Detect death
                if (prevSnake?.alive && !snake.alive) {
                    this.onSnakeDeath(idx, prevSnake);
                }
            });

            // Find which food was eaten
            if (this.prevState.food && state.food) {
                this.prevState.food.forEach(prevFood => {
                    const stillExists = state.food.some(f => f.x === prevFood.x && f.y === prevFood.y);
                    if (!stillExists) {
                        this.createEatenFoodAnimation(prevFood);
                    }
                });
            }
        }

        this.prevState = JSON.parse(JSON.stringify(state));
        this.state = state;
        this.config = state.config;

        const width = this.config.gridWidth * this.config.cellSize;
        const height = this.config.gridHeight * this.config.cellSize;

        if (this.canvas.width !== width) {
            this.canvas.width = width;
            this.canvas.height = height + 50; // Extra space for scores
        }
    },

    createEatenFoodAnimation(food) {
        const cellSize = this.config.cellSize;
        const x = food.x * cellSize + cellSize / 2;
        const y = food.y * cellSize + cellSize / 2;

        this.eatenFood.push({
            x, y,
            scale: 1,
            alpha: 1,
            age: 0,
            lifetime: 300
        });

        // Particles
        Effects.createParticles(x, y, '#f85149', 12, {
            speed: 5,
            lifetime: 400,
            size: 4
        });

        Effects.triggerShake(2);
    },

    onFoodEaten(snakeIdx, snake) {
        const cellSize = this.config.cellSize;

        // Add growing segment animation for the tail
        if (snake.body.length > 0) {
            const tail = snake.body[snake.body.length - 1];
            this.growingSegments.push({
                snakeIdx,
                x: tail.x,
                y: tail.y,
                scale: 0,
                age: 0,
                duration: 200,
                color: snake.color
            });
        }

        // Score popup
        const head = snake.body[0];
        if (head) {
            this.scorePopups.push({
                x: head.x * cellSize + cellSize / 2,
                y: head.y * cellSize,
                text: '+10',
                color: snake.color,
                alpha: 1,
                age: 0,
                lifetime: 800
            });
        }
    },

    onSnakeDeath(snakeIdx, prevSnake) {
        const cellSize = this.config.cellSize;

        // Create explosion animation
        const segments = prevSnake.body.map((seg, i) => ({
            x: seg.x * cellSize + cellSize / 2,
            y: seg.y * cellSize + cellSize / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 5,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            size: i === 0 ? cellSize - 2 : cellSize - 4,
            alpha: 1
        }));

        this.deathAnimations.push({
            snakeIdx,
            segments,
            color: prevSnake.color,
            age: 0,
            lifetime: 1000
        });

        // Big screen shake
        Effects.triggerShake(10);

        // Lots of particles
        prevSnake.body.forEach(seg => {
            Effects.createParticles(
                seg.x * cellSize + cellSize / 2,
                seg.y * cellSize + cellSize / 2,
                prevSnake.color,
                5,
                { speed: 6, lifetime: 500, size: 4 }
            );
        });
    },

    render() {
        if (!this.state || !this.ctx) return;

        const ctx = this.ctx;
        const cfg = this.config;
        const cellSize = cfg.cellSize;

        // Apply screen shake
        const shake = Effects.shake;
        ctx.save();
        ctx.translate(shake.x, shake.y);

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0f1318');
        gradient.addColorStop(1, '#161b22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid with subtle pattern
        ctx.strokeStyle = '#1c2128';
        ctx.lineWidth = 1;
        for (let x = 0; x <= cfg.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, cfg.gridHeight * cellSize);
            ctx.stroke();
        }
        for (let y = 0; y <= cfg.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(this.canvas.width, y * cellSize);
            ctx.stroke();
        }

        // Food with pulse animation
        const pulse = Math.sin(this.foodPulse) * 0.2 + 1;
        this.state.food.forEach(f => {
            const x = f.x * cellSize + cellSize / 2;
            const y = f.y * cellSize + cellSize / 2;

            // Glow
            ctx.shadowColor = '#f85149';
            ctx.shadowBlur = 15;

            // Food gradient
            const foodGradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, cellSize / 3 * pulse);
            foodGradient.addColorStop(0, '#ff6b6b');
            foodGradient.addColorStop(1, '#f85149');

            ctx.fillStyle = foodGradient;
            ctx.beginPath();
            ctx.arc(x, y, cellSize / 3 * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Shine
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(x - 3, y - 3, cellSize / 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
        });

        // Eaten food animations
        this.eatenFood.forEach(food => {
            ctx.save();
            ctx.globalAlpha = food.alpha;
            ctx.fillStyle = '#f85149';
            ctx.beginPath();
            ctx.arc(food.x, food.y, (cellSize / 3) * food.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Snakes
        this.state.snakes.forEach((snake, index) => {
            if (!snake.alive && snake.body.length === 0) return;

            // Draw body segments
            snake.body.forEach((seg, i) => {
                const isHead = i === 0;
                const x = seg.x * cellSize;
                const y = seg.y * cellSize;

                // Check for growing animation
                const growing = this.growingSegments.find(g =>
                    g.snakeIdx === index && g.x === seg.x && g.y === seg.y
                );
                const scale = growing ? growing.scale : 1;

                const size = isHead ? cellSize - 2 : cellSize - 4;
                const offset = isHead ? 1 : 2;
                const actualSize = size * scale;
                const actualOffset = offset + (size - actualSize) / 2;

                // Segment gradient for 3D effect
                const segGradient = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
                segGradient.addColorStop(0, this.lightenColor(snake.color, 30));
                segGradient.addColorStop(1, snake.color);

                ctx.fillStyle = snake.alive ? segGradient : '#4a4a4a';

                // Rounded rectangle
                const radius = isHead ? actualSize / 4 : actualSize / 6;
                this.roundRect(ctx, x + actualOffset, y + actualOffset, actualSize, actualSize, radius);
                ctx.fill();

                // Highlight on top
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(x + actualOffset, y + actualOffset, actualSize, actualSize / 4);
            });

            // Eyes on head
            if (snake.body.length > 0 && snake.alive) {
                const head = snake.body[0];
                const dir = snake.dir || 'right';
                const hx = head.x * cellSize + cellSize / 2;
                const hy = head.y * cellSize + cellSize / 2;

                // Eye positions based on direction
                let eye1, eye2;
                const eyeOffset = cellSize / 5;
                const eyeForward = cellSize / 6;

                switch (dir) {
                    case 'up':
                        eye1 = { x: hx - eyeOffset, y: hy - eyeForward };
                        eye2 = { x: hx + eyeOffset, y: hy - eyeForward };
                        break;
                    case 'down':
                        eye1 = { x: hx - eyeOffset, y: hy + eyeForward };
                        eye2 = { x: hx + eyeOffset, y: hy + eyeForward };
                        break;
                    case 'left':
                        eye1 = { x: hx - eyeForward, y: hy - eyeOffset };
                        eye2 = { x: hx - eyeForward, y: hy + eyeOffset };
                        break;
                    default: // right
                        eye1 = { x: hx + eyeForward, y: hy - eyeOffset };
                        eye2 = { x: hx + eyeForward, y: hy + eyeOffset };
                }

                // Eye whites
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(eye1.x, eye1.y, 4, 0, Math.PI * 2);
                ctx.arc(eye2.x, eye2.y, 4, 0, Math.PI * 2);
                ctx.fill();

                // Pupils
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(eye1.x + 1, eye1.y, 2, 0, Math.PI * 2);
                ctx.arc(eye2.x + 1, eye2.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Death explosions
        this.deathAnimations.forEach(death => {
            ctx.save();
            ctx.fillStyle = death.color;

            death.segments.forEach(seg => {
                ctx.save();
                ctx.globalAlpha = seg.alpha;
                ctx.translate(seg.x, seg.y);
                ctx.rotate(seg.rotation);
                ctx.fillRect(-seg.size / 2, -seg.size / 2, seg.size, seg.size);
                ctx.restore();
            });

            ctx.restore();
        });

        // Particles
        Effects.updateParticles(ctx, 16);

        // Score popups
        this.scorePopups.forEach(popup => {
            ctx.save();
            ctx.globalAlpha = popup.alpha;
            ctx.fillStyle = popup.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = popup.color;
            ctx.shadowBlur = 10;
            ctx.fillText(popup.text, popup.x, popup.y);
            ctx.restore();
        });

        // Score display
        const scoreY = cfg.gridHeight * cellSize + 30;
        ctx.fillStyle = '#f0f6fc';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';

        this.state.snakes.forEach((snake, i) => {
            if (snake.body.length > 0 || snake.score > 0) {
                const label = i === App.playerIndex ? 'You' : `P${i + 1}`;
                const x = 15 + i * 120;

                // Color indicator
                ctx.fillStyle = snake.alive ? snake.color : '#4a4a4a';
                ctx.fillRect(x, scoreY - 12, 12, 12);

                // Score text
                ctx.fillStyle = snake.alive ? '#f0f6fc' : '#8b949e';
                ctx.fillText(`${label}: ${snake.score}`, x + 18, scoreY);
            }
        });

        // Game over overlay
        if (this.state.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.textAlign = 'center';

            let text = 'Game Over!';
            let color = '#f85149';
            if (this.state.winner >= 0) {
                if (this.state.winner === App.playerIndex) {
                    text = 'You Win!';
                    color = '#3fb950';
                } else {
                    text = `Player ${this.state.winner + 1} Wins!`;
                }
            }

            ctx.fillStyle = color;
            ctx.font = 'bold 42px sans-serif';
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2 - 20);

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#8b949e';
            ctx.font = '20px sans-serif';
            const myScore = this.state.snakes[App.playerIndex]?.score || 0;
            ctx.fillText(`Your Score: ${myScore}`, this.canvas.width / 2, this.canvas.height / 2 + 25);
        }

        ctx.restore();
    },

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    },

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    },

    cleanup() {
        this.eatenFood = [];
        this.growingSegments = [];
        this.deathAnimations = [];
        this.scorePopups = [];
        Effects.clear();
    }
};
