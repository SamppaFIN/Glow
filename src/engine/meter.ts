/**
 * Error Meter — Game Over on repeated misses.
 * Phase 3: Rises on miss, decays on hit + time, game over at threshold.
 */

export interface ErrorMeter {
  /** Current error level (0–100) */
  value: number;
  /** Maximum before game over */
  max: number;
  /** How much a miss adds */
  missPenalty: number;
  /** How much a hit subtracts */
  hitRecovery: number;
  /** How much value decays per second (natural recovery) */
  decayRate: number;
}

/** Create a fresh error meter */
export function createErrorMeter(
  max = 100,
  missPenalty = 20,
  hitRecovery = 2,
  decayRate = 1.5
): ErrorMeter {
  return { value: 0, max, missPenalty, hitRecovery, decayRate };
}

/** Register a miss — increases error */
export function registerMiss(meter: ErrorMeter): void {
  // Some randomness to miss penalty: 15–25
  const penalty = meter.missPenalty + (Math.random() * 10 - 5);
  meter.value = Math.min(meter.max, meter.value + penalty);
}

/** Register a hit — decreases error */
export function registerHit(meter: ErrorMeter): void {
  meter.value = Math.max(0, meter.value - meter.hitRecovery);
}

/** Apply natural decay over time */
export function updateErrorMeter(meter: ErrorMeter, delta: number): void {
  meter.value = Math.max(0, meter.value - meter.decayRate * delta);
}

/** Check if game should end */
export function isGameOver(meter: ErrorMeter): boolean {
  return meter.value >= meter.max;
}

/** Reset the meter */
export function resetErrorMeter(meter: ErrorMeter): void {
  meter.value = 0;
}

/**
 * Render the error meter as a ring in the top-right corner.
 * Fills clockwise from 12 o'clock as error increases.
 */
export function renderErrorMeter(
  ctx: CanvasRenderingContext2D,
  meter: ErrorMeter,
  x: number,
  y: number,
  radius: number
): void {
  const progress = meter.value / meter.max;

  // Background ring
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 4;
  ctx.stroke();

  if (progress <= 0) return;

  // Filled arc (clockwise from 12 o'clock)
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * progress;

  // Color: green → yellow → orange → red
  const color =
    progress < 0.3 ? 'rgba(78, 205, 196, 0.8)' // teal
    : progress < 0.6 ? 'rgba(245, 158, 11, 0.8)' // amber
    : progress < 0.85 ? 'rgba(249, 115, 22, 0.8)' // orange
    : 'rgba(255, 80, 80, 0.9)'; // red

  ctx.beginPath();
  ctx.arc(x, y, radius, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center percentage text
  if (progress > 0.5) {
    ctx.fillStyle = color;
    ctx.font = `bold ${radius * 0.5}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(meter.value)}`, x, y);
  }
}
