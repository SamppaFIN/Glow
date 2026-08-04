/**
 * Particle Burst Engine
 * Extracted from CV-Site (js/app.js) — converted to TypeScript.
 * Lightweight particle effects for hit/miss/combo feedback.
 */
const DEFAULT_BURST = {
    count: 30,
    spread: Math.PI * 2,
    speed: 3,
    decay: 0.02,
    size: 4,
    effect: 'burst',
};
/** Create a particle burst at (x, y) */
export function triggerBurst(particles, x, y, color, config = {}) {
    const cfg = { ...DEFAULT_BURST, ...config };
    for (let i = 0; i < cfg.count; i++) {
        const angle = (cfg.spread / cfg.count) * i + Math.random() * 0.5;
        const speed = cfg.speed * (0.5 + Math.random());
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            size: cfg.size * (0.5 + Math.random()),
            color,
            hue: Math.random() * 360,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            behavior: cfg.effect,
        });
    }
}
/** Update and render all active particles */
export function updateParticles(particles, ctx, delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= p.maxLife * 0.015 * (delta * 60); // Normalize to ~60 FPS
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        // Apply physics per behavior
        switch (p.behavior) {
            case 'spiral':
                p.vx += Math.cos(p.rotation) * 0.1;
                p.vy += Math.sin(p.rotation) * 0.1;
                break;
            case 'confetti':
                p.vy += 0.05; // Gravity
                p.rotationSpeed *= 0.99;
                break;
            case 'cosmic':
                p.vx *= 0.99;
                p.vy *= 0.99;
                break;
            case 'magnetic':
                p.vx *= 0.98;
                p.vy *= 0.98;
                break;
            case 'fizzle':
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.size *= 0.97;
                break;
            case 'smoke':
                p.vy -= 0.02;
                p.vx += (Math.random() - 0.5) * 0.1;
                p.size += 0.04;
                break;
            case 'bubble':
                p.vy -= 0.03;
                p.vx += Math.sin(p.rotation + Date.now() * 0.001) * 0.05;
                break;
            case 'rainbow':
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.hue = (p.hue + 3) % 360;
                p.color = `hsl(${p.hue}, 80%, 60%)`;
                break;
            case 'fire':
                p.vy -= 0.06;
                p.vx += (Math.random() - 0.5) * 0.15;
                p.hue = 15 + Math.random() * 25;
                break;
            case 'water':
                p.vy += 0.02;
                p.vx *= 0.97;
                p.vy *= 0.97;
                break;
            case 'lightning':
                p.vx += (Math.random() - 0.5) * 0.4;
                p.vy += (Math.random() - 0.5) * 0.4;
                p.size *= 0.95;
                break;
        }
        p.x += p.vx * (delta * 60);
        p.y += p.vy * (delta * 60);
        p.rotation += p.rotationSpeed;
        // Render
        const alpha = Math.max(0, p.life);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        const s = p.size * p.life;
        const bh = p.behavior;
        if (bh === 'cosmic' || bh === 'lightning') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            for (let j = 0; j < 4; j++) {
                ctx.rotate(Math.PI / 2);
                ctx.lineTo(s * 0.3, -s * 0.3);
                ctx.lineTo(0, -s);
            }
            ctx.fill();
        }
        else if (bh === 'smoke') {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (bh === 'bubble') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (bh === 'fire' || bh === 'rainbow') {
            ctx.shadowColor = p.color;
            ctx.shadowBlur = s * 1.5;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        else if (bh === 'water') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, s, s * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, s, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}
// ── Geometry-specific bursts ──────────────────────────────────
export function triggerSeedBurst(p, x, y) {
    triggerBurst(p, x, y, 'rgba(245, 158, 11, 0.9)', { count: 36, speed: 5, size: 6, effect: 'cosmic' });
}
export function triggerVesicaBurst(p, x, y) {
    triggerBurst(p, x, y, 'rgba(6, 182, 212, 0.8)', { count: 24, speed: 2, size: 5, effect: 'water' });
}
export function triggerMetatronBurst(p, x, y) {
    triggerBurst(p, x, y, 'rgba(138, 92, 246, 0.9)', { count: 20, speed: 5, size: 4, effect: 'lightning' });
}
export function triggerFlowerBurst(p, x, y) {
    triggerBurst(p, x, y, 'rgba(255, 255, 255, 0.6)', { count: 15, speed: 1, size: 6, effect: 'smoke' });
}
export function triggerSriBurst(p, x, y) {
    triggerBurst(p, x, y, 'rgba(255, 107, 107, 0.9)', { count: 20, spread: Math.PI * 0.6, speed: 3, size: 4, effect: 'fire' });
}
export function triggerSpiralBurst(p, x, y) {
    triggerBurst(p, x, y, 'rgba(255, 159, 243, 0.8)', { count: 18, speed: 3, size: 3.5, effect: 'rainbow' });
}
/** Maps geometry name to its signature burst */
export function triggerGeometryBurst(p, x, y, geometry) {
    const map = {
        seed: () => triggerSeedBurst(p, x, y),
        vesica: () => triggerVesicaBurst(p, x, y),
        metatron: () => triggerMetatronBurst(p, x, y),
        flower: () => triggerFlowerBurst(p, x, y),
        sri: () => triggerSriBurst(p, x, y),
        spiral: () => triggerSpiralBurst(p, x, y),
    };
    (map[geometry] ?? (() => triggerBurst(p, x, y, '#FFF', { effect: 'burst' })))();
}
// ── Bonus / combo effects ─────────────────────────────────────
export function triggerBubbleBonus(p, x, y) {
    const colors = ['#4ECDC4', '#FF6B6B', '#FFD700', '#A78BFA', '#F472B6'];
    for (let i = 0; i < 12; i++) {
        p.push({
            x: x + (Math.random() - 0.5) * 60, y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 1.5, vy: -(1 + Math.random() * 2),
            life: 1, maxLife: 1, size: 3 + Math.random() * 6,
            color: colors[Math.floor(Math.random() * colors.length)], hue: 0,
            rotation: 0, rotationSpeed: 0, behavior: 'bubble',
        });
    }
}
export function triggerRainbowBurst(p, x, y) {
    triggerBurst(p, x, y, '#FFD700', { count: 40, speed: 4.5, size: 5, effect: 'rainbow' });
}
export function triggerMaxComboBurst(p, x, y) {
    triggerBurst(p, x, y, '#FFF', { count: 60, speed: 6, size: 3, effect: 'cosmic' });
    triggerBurst(p, x, y, '#FFD700', { count: 30, speed: 3, size: 6, effect: 'rainbow' });
}
export function triggerComboBurst(p, x, y, level) {
    if (level >= 50)
        triggerMaxComboBurst(p, x, y);
    else if (level >= 25)
        triggerRainbowBurst(p, x, y);
    else
        triggerBurst(p, x, y, '#FFD700', { count: 20 + level, speed: 4, effect: 'cosmic' });
}
export function triggerFizzle(p, x, y) {
    triggerBurst(p, x, y, 'rgba(255, 100, 100, 0.6)', { count: 8, speed: 1.5, size: 3, effect: 'fizzle' });
}
// ── Ambient weather effects ───────────────────────────────────
/** Rain drops falling from top — continuous */
export function spawnRain(p, w, count = 3) {
    for (let i = 0; i < count; i++) {
        p.push({
            x: Math.random() * w, y: -(Math.random() * 80),
            vx: -0.5, vy: 8 + Math.random() * 4,
            life: 1, maxLife: 1, size: 1 + Math.random() * 2,
            color: 'rgba(100,180,255,0.6)', hue: 0,
            rotation: -0.3, rotationSpeed: 0, behavior: 'burst',
        });
    }
}
/** Snowflakes drifting down — continuous */
export function spawnSnow(p, w, count = 2) {
    for (let i = 0; i < count; i++) {
        const size = 2 + Math.random() * 5;
        p.push({
            x: Math.random() * w, y: -(Math.random() * 200),
            vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
            life: 1, maxLife: 1, size,
            color: 'rgba(255,255,255,0.7)', hue: 0,
            rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.02,
            behavior: 'burst',
        });
    }
}
/** Reward bubbles that float up and give bonus when tapped */
export function spawnRewardBubbles(p, w, h, count = 4) {
    const colors = ['#4ECDC4', '#FFD700', '#A78BFA', '#F472B6', '#60A5FA'];
    for (let i = 0; i < count; i++) {
        p.push({
            x: Math.random() * w, y: h + 20,
            vx: (Math.random() - 0.5) * 0.8, vy: -(1 + Math.random() * 2),
            life: 1, maxLife: 1, size: 8 + Math.random() * 8,
            color: colors[Math.floor(Math.random() * colors.length)], hue: 0,
            rotation: 0, rotationSpeed: 0, behavior: 'bubble',
        });
    }
}
//# sourceMappingURL=particles.js.map