/**
 * Taboo Mechanic — Periodic shape restrictions.
 * Phase 4: Every 30-45s, a shape becomes forbidden.
 * Tapping a taboo shape = auto miss + error meter penalty.
 */

import type { Shape } from './shapes.js';

export interface TabooState {
  /** Currently taboo shape IDs */
  activeIds: Set<number>;
  /** Timer until next taboo event */
  nextEventTimer: number;
  /** Timer until current taboo ends */
  durationTimer: number;
  /** Whether a taboo event is active */
  active: boolean;
}

export function createTabooState(): TabooState {
  return {
    activeIds: new Set(),
    nextEventTimer: 30 + Math.random() * 15, // 30-45s
    durationTimer: 0,
    active: false,
  };
}

/** Update taboo state each frame */
export function updateTaboo(
  state: TabooState,
  shapes: Shape[],
  delta: number,
  gameTime: number
): void {
  // Faster taboo cycles as game progresses
  const speedMultiplier = 1 + gameTime * 0.008;

  if (!state.active) {
    state.nextEventTimer -= delta * speedMultiplier;
    if (state.nextEventTimer <= 0) {
      activateTaboo(state, shapes);
    }
  } else {
    state.durationTimer -= delta;
    if (state.durationTimer <= 0) {
      deactivateTaboo(state, shapes);
    }
  }
}

/** Pick 1-3 random shapes and mark them taboo */
function activateTaboo(state: TabooState, shapes: Shape[]): void {
  if (shapes.length === 0) return;

  // More taboos at higher difficulty (based on shape count as proxy)
  const count = shapes.length > 8 ? Math.min(3, Math.ceil(shapes.length / 5))
    : shapes.length > 5 ? 2
    : 1;

  const candidates = shapes.filter(s => !s.taboo);
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    shuffled[i].taboo = true;
    state.activeIds.add(shuffled[i].id);
  }

  state.active = true;
  state.durationTimer = 8 + Math.random() * 4; // 8-12s
}

/** Remove taboo markers */
function deactivateTaboo(state: TabooState, shapes: Shape[]): void {
  for (const shape of shapes) {
    if (state.activeIds.has(shape.id)) {
      shape.taboo = false;
    }
  }
  state.activeIds.clear();
  state.active = false;
  state.nextEventTimer = 25 + Math.random() * 20; // Next in 25-45s
}

/** Check if a shape is taboo — if so, register a penalty */
export function checkTabooHit(shape: Shape, state: TabooState): boolean {
  if (shape.taboo && state.activeIds.has(shape.id)) {
    return true; // Taboo hit!
  }
  return false;
}

/** Render taboo warning indicator near shapes */
export function renderTabooWarning(
  ctx: CanvasRenderingContext2D,
  shapes: Shape[],
  tabooState: TabooState,
  gameTime: number
): void {
  for (const shape of shapes) {
    if (!shape.taboo) continue;

    // Pulsing red X overlay
    const pulse = 0.3 + Math.sin(gameTime * 4) * 0.15;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(shape.x, shape.y, shape.radius * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small "forbidden" indicator
    const size = shape.radius * 0.4;
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(shape.x - size, shape.y - size);
    ctx.lineTo(shape.x + size, shape.y + size);
    ctx.moveTo(shape.x + size, shape.y - size);
    ctx.lineTo(shape.x - size, shape.y + size);
    ctx.stroke();

    ctx.restore();
  }
}

/** Get time until next taboo event (for UI hint) */
export function getTabooTimer(state: TabooState): number {
  return state.active ? state.durationTimer : state.nextEventTimer;
}

export function isTabooActive(state: TabooState): boolean {
  return state.active;
}
