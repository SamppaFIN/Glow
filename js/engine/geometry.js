/**
 * Sacred Geometry Drawing Functions
 * Extracted from CV-Site (js/app.js) — converted to TypeScript.
 * All functions signature: (ctx, x, y, size, scale)
 */
/** Draws 7 circles in Flower of Life pattern */
export function drawFlowerOfLife(ctx, x, y, radius, scale = 1) {
    const scaledRadius = radius * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    // 7 circles: center + 6 surrounding in a hexagon
    const centers = [
        { x, y }, // Center
        { x: x - scaledRadius, y }, // Left
        { x: x + scaledRadius, y }, // Right
        { x: x - scaledRadius / 2, y: y - scaledRadius * Math.sin(Math.PI / 3) }, // Top-left
        { x: x + scaledRadius / 2, y: y - scaledRadius * Math.sin(Math.PI / 3) }, // Top-right
        { x: x - scaledRadius / 2, y: y + scaledRadius * Math.sin(Math.PI / 3) }, // Bottom-left
        { x: x + scaledRadius / 2, y: y + scaledRadius * Math.sin(Math.PI / 3) }, // Bottom-right
    ];
    for (const center of centers) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, scaledRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
}
/** Draws 13 circles in Metatron's Cube pattern with connecting lines */
export function drawMetatronsCube(ctx, x, y, size, scale = 1) {
    const scaledSize = size * scale;
    ctx.strokeStyle = 'rgba(138, 92, 246, 0.8)';
    ctx.lineWidth = 2;
    const radius = scaledSize / 6;
    const centers = [
        { x, y }, // Center
        { x: x - scaledSize / 3, y: y - scaledSize / 3 },
        { x: x + scaledSize / 3, y: y - scaledSize / 3 },
        { x: x - scaledSize / 3, y: y + scaledSize / 3 },
        { x: x + scaledSize / 3, y: y + scaledSize / 3 },
        { x: x - scaledSize / 2, y },
        { x: x + scaledSize / 2, y },
        { x, y: y - scaledSize / 2 },
        { x, y: y + scaledSize / 2 },
        { x: x - scaledSize / 4, y: y - scaledSize / 4 },
        { x: x + scaledSize / 4, y: y - scaledSize / 4 },
        { x: x - scaledSize / 4, y: y + scaledSize / 4 },
        { x: x + scaledSize / 4, y: y + scaledSize / 4 },
    ];
    // Draw connecting lines between all centers
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(138, 92, 246, 0.4)';
    for (let i = 0; i < centers.length; i++) {
        for (let j = i + 1; j < centers.length; j++) {
            ctx.beginPath();
            ctx.moveTo(centers[i].x, centers[i].y);
            ctx.lineTo(centers[j].x, centers[j].y);
            ctx.stroke();
        }
    }
    // Draw circles
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(138, 92, 246, 0.8)';
    for (const center of centers) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}
/** Draws 4 concentric rotated triangles + 8 lotus petals (Sri Yantra) */
export function drawSriYantra(ctx, x, y, size, scale = 1) {
    const scaledSize = size * scale;
    ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
    ctx.lineWidth = 2;
    // 4 concentric triangles at alternating rotations
    for (let i = 0; i < 4; i++) {
        const triangleSize = scaledSize * (1 - i * 0.2);
        const rotation = i * Math.PI / 3;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.moveTo(0, -triangleSize / 2);
        ctx.lineTo(-triangleSize / 2 * Math.cos(Math.PI / 3), triangleSize / 2 * Math.sin(Math.PI / 3));
        ctx.lineTo(triangleSize / 2 * Math.cos(Math.PI / 3), triangleSize / 2 * Math.sin(Math.PI / 3));
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
    // 8 lotus petals
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
        const angle = (Math.PI * 2 * i) / petalCount;
        const petalX = x + Math.cos(angle) * scaledSize * 0.6;
        const petalY = y + Math.sin(angle) * scaledSize * 0.6;
        ctx.beginPath();
        ctx.ellipse(petalX, petalY, scaledSize * 0.1, scaledSize * 0.05, angle, 0, Math.PI * 2);
        ctx.stroke();
    }
}
/** Draws two overlapping circles forming the Vesica Piscis lens */
export function drawVesicaPiscis(ctx, x, y, size, scale = 1) {
    const scaledSize = size * scale;
    const radius = scaledSize / 2;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.lineWidth = 2;
    // Left circle
    ctx.beginPath();
    ctx.arc(x - radius / 2, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Right circle
    ctx.beginPath();
    ctx.arc(x + radius / 2, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Lens outline (the intersection shape)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x - radius / 2, y, radius, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + radius / 2, y, radius, 2 * Math.PI / 3, 4 * Math.PI / 3);
    ctx.stroke();
}
/** Draws 7 circles: center + 6 surrounding in hexagonal arrangement */
export function drawSeedOfLife(ctx, x, y, size, scale = 1) {
    const scaledSize = size * scale;
    const radius = scaledSize / 6;
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 2;
    // Center circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    // 6 surrounding circles at 60° intervals
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const circleX = x + Math.cos(angle) * radius;
        const circleY = y + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}
/** Draws a golden spiral using the golden ratio (φ = 1.618) */
export function drawGoldenSpiral(ctx, x, y, size, scale = 1) {
    const scaledSize = size * scale;
    const goldenRatio = 1.618;
    const maxRadius = scaledSize / 2;
    ctx.strokeStyle = 'rgba(255, 159, 243, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let radius = 1;
    let angle = 0;
    while (radius < maxRadius) {
        const spiralX = x + Math.cos(angle) * radius;
        const spiralY = y + Math.sin(angle) * radius;
        if (angle === 0) {
            ctx.moveTo(spiralX, spiralY);
        }
        else {
            ctx.lineTo(spiralX, spiralY);
        }
        angle += 0.1;
        radius = Math.pow(goldenRatio, angle / (Math.PI * 2)) * 2;
    }
    ctx.stroke();
}
/** All available geometry symbols for runtime lookup */
export const GeometrySymbols = {
    flower: { name: 'Flower of Life', fn: drawFlowerOfLife, color: 'rgba(255, 255, 255, 0.8)' },
    metatron: { name: "Metatron's Cube", fn: drawMetatronsCube, color: 'rgba(138, 92, 246, 0.8)' },
    sri: { name: 'Sri Yantra', fn: drawSriYantra, color: 'rgba(255, 107, 107, 0.8)' },
    vesica: { name: 'Vesica Piscis', fn: drawVesicaPiscis, color: 'rgba(6, 182, 212, 0.8)' },
    seed: { name: 'Seed of Life', fn: drawSeedOfLife, color: 'rgba(245, 158, 11, 0.8)' },
    spiral: { name: 'Golden Spiral', fn: drawGoldenSpiral, color: 'rgba(255, 159, 243, 0.8)' },
};
//# sourceMappingURL=geometry.js.map