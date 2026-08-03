/**
 * Shape System — Pulsing Sacred Geometry Shapes
 * Phase 2+: Progressive complexity & size with player level.
 * Shapes disappear on hit and respawn. Higher tiers unlock over time.
 */
import { GeometrySymbols } from './geometry.js';
/** Geometry symbols grouped by tier */
export const TIER_SYMBOLS = {
    0: ['flower'], // Simplest: circles
    1: ['seed', 'vesica'], // Intermediate: Seed of Life, Vesica Piscis
    2: ['spiral', 'sri'], // Advanced: Golden Spiral, Sri Yantra
    3: ['metatron'], // Boss: Metatron's Cube
};
/** Tier thresholds based on score */
export function getTier(score) {
    if (score >= 5000)
        return 3;
    if (score >= 2000)
        return 2;
    if (score >= 500)
        return 1;
    return 0;
}
/** Radius scales with tier */
export function getRadiusForTier(tier, baseSize) {
    const multipliers = { 0: 0.7, 1: 0.85, 2: 1.0, 3: 1.15 };
    return baseSize * multipliers[tier] * (0.85 + Math.random() * 0.3);
}
/** Pulse speed increases with tier (harder to time) */
export function getPulseSpeedForTier(tier) {
    const speeds = { 0: 1.2, 1: 1.6, 2: 2.0, 3: 2.5 };
    return speeds[tier] + (Math.random() - 0.5) * 0.4;
}
let nextId = 1;
/** Create a new shape */
export function createShape(geometry, tier, x, y, radius, pulseSpeed) {
    return {
        id: nextId++,
        geometry,
        tier,
        x,
        y,
        radius,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: pulseSpeed ?? getPulseSpeedForTier(tier),
        scale: 1.0,
        taboo: false,
        bonusMultiplier: 1.0,
    };
}
/** Update pulse animation for all shapes */
export function updateShapes(shapes, delta) {
    for (const shape of shapes) {
        shape.pulsePhase += shape.pulseSpeed * delta;
        // Keep phase in [0, 2π)
        if (shape.pulsePhase > Math.PI * 2) {
            shape.pulsePhase -= Math.PI * 2;
        }
        // Scale pulses with sine: 1.0 at peak, 0.7 at trough
        shape.scale = 1.0 + Math.sin(shape.pulsePhase) * 0.3;
    }
}
/**
 * Render all shapes with their pulse animation and timing ring.
 * The timing ring shows the player when to tap.
 */
export function renderShapes(ctx, shapes) {
    for (const shape of shapes) {
        const drawFn = GeometrySymbols[shape.geometry].fn;
        const baseColor = GeometrySymbols[shape.geometry].color;
        const color = shape.taboo
            ? 'rgba(150, 50, 50, 0.5)'
            : baseColor;
        // Draw the sacred geometry shape with pulse scale
        ctx.save();
        ctx.globalAlpha = shape.taboo ? 0.4 : 0.9;
        drawFn(ctx, shape.x, shape.y, shape.radius * 2, shape.scale);
        // Timing ring: a circle that contracts toward the shape
        // Peak = ring at shape edge; trough = ring far out
        const ringProgress = Math.abs(Math.sin(shape.pulsePhase));
        const ringRadius = shape.radius * (1.5 + ringProgress * 0.8);
        ctx.globalAlpha = shape.taboo ? 0.15 : 0.5;
        ctx.strokeStyle = shape.taboo ? 'rgba(255, 80, 80, 0.3)' : color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(shape.x, shape.y, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        // Perfect zone indicator (thin inner ring)
        if (!shape.taboo) {
            const perfectZone = shape.radius * 1.1;
            ctx.globalAlpha = 0.15;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(shape.x, shape.y, perfectZone, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }
}
/**
 * Generate a grid of shapes for game start.
 * Uses tier 0 shapes initially, distributed evenly.
 */
export function generateShapeGrid(canvasWidth, canvasHeight, count) {
    const shapes = [];
    const margin = 100;
    const usableW = canvasWidth - margin * 2;
    const usableH = canvasHeight - margin * 2;
    const cols = Math.ceil(Math.sqrt(count * (usableW / usableH)));
    const rows = Math.ceil(count / cols);
    const cellW = usableW / cols;
    const cellH = usableH / rows;
    const baseRadius = Math.min(cellW, cellH) * 0.3;
    for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = margin + cellW * (col + 0.5);
        const y = margin + cellH * (row + 0.5);
        // Start all at tier 0
        const tier = 0;
        const symbols = TIER_SYMBOLS[tier];
        const geometry = symbols[i % symbols.length];
        shapes.push(createShape(geometry, tier, x, y, getRadiusForTier(tier, baseRadius)));
    }
    return shapes;
}
/** Spawn a random shape at a random position, tier based on score */
export function spawnRandomShape(canvasWidth, canvasHeight, score) {
    const tier = getTier(score);
    const symbols = TIER_SYMBOLS[tier];
    const geometry = symbols[Math.floor(Math.random() * symbols.length)];
    const margin = 100;
    const x = margin + Math.random() * (canvasWidth - margin * 2);
    const y = margin + Math.random() * (canvasHeight - margin * 2);
    const baseSize = Math.min(canvasWidth, canvasHeight) * 0.045; // Small on mobile
    return createShape(geometry, tier, x, y, getRadiusForTier(tier, baseSize));
}
//# sourceMappingURL=shapes.js.map