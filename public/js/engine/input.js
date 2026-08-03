/**
 * Input Handler — Touch & Mouse → Canvas Coordinates
 * Phase 2: Maps raw input to game shapes, detects hits within timing window.
 */
/**
 * Sets up touch and mouse listeners on a canvas element.
 * Normalizes coordinates and invokes callback on each tap/click.
 * Returns a cleanup function.
 */
export function setupInputHandler(canvas, onTap) {
    const handlePointer = (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        // Use CSS pixels directly — canvas drawing is already DPR-scaled via setTransform
        const tap = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            time: performance.now(),
        };
        onTap(tap);
    };
    canvas.addEventListener('pointerdown', handlePointer, { passive: false });
    // Prevent context menu on long-press (mobile)
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Cleanup
    return () => {
        canvas.removeEventListener('pointerdown', handlePointer);
    };
}
/** Timing window thresholds as fraction of pulse cycle */
export const TimingWindow = {
    /** < 30% off peak = perfect */
    perfect: 0.30,
    /** Anything on the shape = at least good */
    good: 1.0, // Always good if you tap the shape!
};
/**
 * Check if a tap hits a shape and evaluate timing.
 * Returns the hit shape and result, or null if no shape was hit.
 */
export function evaluateTap(tap, shapes) {
    // Find which shape was tapped (first hit wins)
    for (const shape of shapes) {
        if (isPointInShape(tap.x, tap.y, shape)) {
            const result = evaluateTiming(shape);
            return { shape, result };
        }
    }
    return null;
}
/** Simple circle hit-test for shapes — generous for mobile */
function isPointInShape(px, py, shape) {
    const dx = px - shape.x;
    const dy = py - shape.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= shape.radius * 2.0; // Very generous hitbox
}
/**
 * Evaluate timing based on shape's current pulse phase.
 * Phase 0 = peak. Any tap on the shape is at least 'good'.
 */
function evaluateTiming(shape) {
    const phase = ((shape.pulsePhase % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const distFromPeak = Math.abs(Math.sin(phase));
    if (distFromPeak <= TimingWindow.perfect)
        return 'perfect';
    return 'good'; // Tap on shape = always at least good!
}
/** Keep track of recent taps for secret pattern detection */
export class TapHistory {
    history = [];
    maxSize;
    constructor(maxSize = 20) {
        this.maxSize = maxSize;
    }
    push(record) {
        this.history.push(record);
        // Prune old entries (keep last N)
        if (this.history.length > this.maxSize) {
            this.history = this.history.slice(-this.maxSize);
        }
    }
    /** Get taps within the last `windowMs` milliseconds */
    recent(windowMs) {
        const cutoff = performance.now() - windowMs;
        return this.history.filter((r) => r.time >= cutoff);
    }
    /** All recorded taps */
    all() {
        return this.history;
    }
    clear() {
        this.history = [];
    }
}
//# sourceMappingURL=input.js.map