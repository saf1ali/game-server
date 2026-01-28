// Shared animation effects for game juice
const Effects = {
    // Particle system
    particles: [],

    // Screen shake state
    shake: { x: 0, y: 0, intensity: 0, decay: 0.9 },

    // Easing functions
    ease: {
        linear: t => t,
        quadOut: t => t * (2 - t),
        quadIn: t => t * t,
        cubicOut: t => (--t) * t * t + 1,
        elasticOut: t => {
            const p = 0.3;
            return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        },
        bounceOut: t => {
            if (t < 1 / 2.75) return 7.5625 * t * t;
            if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
            if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    },

    // Create particle burst
    createParticles(x, y, color, count = 10, options = {}) {
        const { speed = 5, lifetime = 1000, size = 4, gravity = 0.1, spread = Math.PI * 2 } = options;

        for (let i = 0; i < count; i++) {
            const angle = (spread === Math.PI * 2)
                ? Math.random() * Math.PI * 2
                : -Math.PI / 2 + (Math.random() - 0.5) * spread;
            const velocity = speed * (0.5 + Math.random() * 0.5);

            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                color,
                size: size * (0.5 + Math.random() * 0.5),
                lifetime,
                maxLifetime: lifetime,
                gravity,
                alpha: 1
            });
        }
    },

    // Create sparkle effect
    createSparkles(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 20;

            this.particles.push({
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                vx: 0,
                vy: -1,
                color,
                size: 2 + Math.random() * 3,
                lifetime: 500,
                maxLifetime: 500,
                gravity: 0,
                alpha: 1,
                sparkle: true
            });
        }
    },

    // Update and render particles
    updateParticles(ctx, deltaTime = 16) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.lifetime -= deltaTime;
            if (p.lifetime <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha = p.lifetime / p.maxLifetime;

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;

            if (p.sparkle) {
                // Star shape for sparkles
                ctx.beginPath();
                for (let j = 0; j < 4; j++) {
                    const angle = (j / 4) * Math.PI * 2 + Date.now() / 200;
                    const len = p.size * (j % 2 ? 0.5 : 1);
                    ctx.lineTo(p.x + Math.cos(angle) * len, p.y + Math.sin(angle) * len);
                }
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    },

    // Trigger screen shake
    triggerShake(intensity = 5) {
        this.shake.intensity = Math.max(this.shake.intensity, intensity);
    },

    // Update and get shake offset
    updateShake() {
        if (this.shake.intensity > 0.1) {
            this.shake.x = (Math.random() - 0.5) * this.shake.intensity * 2;
            this.shake.y = (Math.random() - 0.5) * this.shake.intensity * 2;
            this.shake.intensity *= this.shake.decay;
        } else {
            this.shake.x = 0;
            this.shake.y = 0;
            this.shake.intensity = 0;
        }
        return { x: this.shake.x, y: this.shake.y };
    },

    // Flash effect data
    flashes: [],

    // Create flash overlay
    createFlash(color = '#fff', duration = 100, alpha = 0.5) {
        this.flashes.push({
            color,
            alpha,
            maxAlpha: alpha,
            duration,
            maxDuration: duration
        });
    },

    // Render flashes
    renderFlashes(ctx, width, height) {
        for (let i = this.flashes.length - 1; i >= 0; i--) {
            const f = this.flashes[i];
            f.duration -= 16;

            if (f.duration <= 0) {
                this.flashes.splice(i, 1);
                continue;
            }

            f.alpha = f.maxAlpha * (f.duration / f.maxDuration);
            ctx.save();
            ctx.globalAlpha = f.alpha;
            ctx.fillStyle = f.color;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    },

    // Animation queue for complex sequences
    animations: [],

    // Add animation to queue
    animate(target, props, duration, easing = 'quadOut', onComplete = null) {
        const anim = {
            target,
            startProps: {},
            endProps: props,
            duration,
            elapsed: 0,
            easing: this.ease[easing] || this.ease.quadOut,
            onComplete
        };

        // Store starting values
        for (const key in props) {
            anim.startProps[key] = target[key] || 0;
        }

        this.animations.push(anim);
        return anim;
    },

    // Update all animations
    updateAnimations(deltaTime = 16) {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const anim = this.animations[i];
            anim.elapsed += deltaTime;

            const progress = Math.min(anim.elapsed / anim.duration, 1);
            const easedProgress = anim.easing(progress);

            for (const key in anim.endProps) {
                anim.target[key] = anim.startProps[key] +
                    (anim.endProps[key] - anim.startProps[key]) * easedProgress;
            }

            if (progress >= 1) {
                if (anim.onComplete) anim.onComplete();
                this.animations.splice(i, 1);
            }
        }
    },

    // Clear all effects
    clear() {
        this.particles = [];
        this.flashes = [];
        this.animations = [];
        this.shake = { x: 0, y: 0, intensity: 0, decay: 0.9 };
    }
};
