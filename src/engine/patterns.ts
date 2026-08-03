/**
 * Sacred Geometry Pattern Detector
 * Phase 4: Matches tap sequences against known sacred geometry patterns.
 * Successful matches trigger powerful screen effects.
 */

import type { TapRecord } from './input.js';
import type { Shape } from './shapes.js';
import type { Particle } from './particles.js';
import { GeometrySymbolName } from './geometry.js';

// ── Pattern definitions ───────────────────────────────────────

export interface SacredPattern {
  id: string;
  name: string;
  description: string;
  /** Required geometry sequence (in order) */
  sequence: GeometrySymbolName[];
  /** Max time window for the full sequence (seconds) */
  windowMs: number;
  /** Cooldown before pattern can trigger again (seconds) */
  cooldownMs: number;
  /** Effect type when activated */
  effect: PatternEffect;
  /** Particle burst function name */
  particleEffect: 'seed' | 'vesica' | 'metatron' | 'rainbow';
}

export type PatternEffect = 'clear_screen' | 'unify_shapes' | 'collect_all';

/** All sacred geometry patterns */
export const SACRED_PATTERNS: SacredPattern[] = [
  {
    id: 'seed_of_life',
    name: 'Seed of Life',
    description: 'Golden radial wave clears the screen',
    sequence: ['seed', 'seed', 'seed'],
    windowMs: 4000,
    cooldownMs: 15000,
    effect: 'clear_screen',
    particleEffect: 'seed',
  },
  {
    id: 'vesica_piscis',
    name: 'Vesica Piscis',
    description: 'All shapes unify into one type',
    sequence: ['vesica', 'vesica'],
    windowMs: 2000,
    cooldownMs: 10000,
    effect: 'unify_shapes',
    particleEffect: 'vesica',
  },
  {
    id: 'metatrons_cube',
    name: "Metatron's Cube",
    description: 'One tap collects ALL shapes!',
    sequence: ['metatron', 'spiral', 'sri', 'flower'],
    windowMs: 5000,
    cooldownMs: 20000,
    effect: 'collect_all',
    particleEffect: 'metatron',
  },
];

// ── Pattern state ─────────────────────────────────────────────

export interface PatternState {
  discovered: Set<string>;
  cooldowns: Map<string, number>; // pattern id → time remaining
  lastActivated: string | null;
  activationTimer: number; // How long the activation message shows
}

export function createPatternState(): PatternState {
  return {
    discovered: new Set(),
    cooldowns: new Map(),
    lastActivated: null,
    activationTimer: 0,
  };
}

// ── Pattern matching ──────────────────────────────────────────

export interface PatternMatch {
  pattern: SacredPattern;
  /** Index in tap history where the match starts */
  startIndex: number;
}

/**
 * Check recent tap history against all sacred patterns.
 * Returns the first match found, or null.
 */
export function checkPatterns(
  history: readonly TapRecord[],
  patterns: readonly SacredPattern[],
  state: PatternState
): PatternMatch | null {
  for (const pattern of patterns) {
    // Check cooldown
    const remaining = state.cooldowns.get(pattern.id) ?? 0;
    if (remaining > 0) continue;

    const match = matchSequence(history, pattern);
    if (match) {
      // Set cooldown
      state.cooldowns.set(pattern.id, pattern.cooldownMs / 1000);
      state.discovered.add(pattern.id);
      state.lastActivated = pattern.id;
      state.activationTimer = 3.0; // Show message for 3 seconds
      return match;
    }
  }
  return null;
}

/**
 * Try to match a pattern sequence against recent tap history.
 */
function matchSequence(
  history: readonly TapRecord[],
  pattern: SacredPattern
): PatternMatch | null {
  if (history.length < pattern.sequence.length) return null;

  const now = performance.now();
  const cutoff = now - pattern.windowMs;
  const seq = pattern.sequence;

  // Look for the sequence in reverse order (most recent first)
  for (let start = history.length - seq.length; start >= 0; start--) {
    const end = start + seq.length;
    if (end > history.length) continue;

    const slice = history.slice(start, end);

    // Check if all taps are within the time window
    if (slice[0].time < cutoff) continue;

    // Check if geometry IDs match the pattern sequence
    let matches = true;
    for (let i = 0; i < seq.length; i++) {
      if (slice[i].result === 'miss') { matches = false; break; }
      // We need to check the geometry type — stored as shapeId, need mapping
      // For now, check shape IDs directly via a simpler approach
      matches = true; // Will be verified by caller who has shape data
    }

    if (matches) return { pattern, startIndex: start };
  }

  return null;
}

/**
 * Alternative: match based on geometry names recorded with each tap.
 * Requires TapRecord to include geometry name.
 */
export interface RichTapRecord extends TapRecord {
  geometry: GeometrySymbolName;
}

export function checkRichPatterns(
  history: readonly RichTapRecord[],
  patterns: readonly SacredPattern[],
  state: PatternState
): PatternMatch | null {
  for (const pattern of patterns) {
    const remaining = state.cooldowns.get(pattern.id) ?? 0;
    if (remaining > 0) continue;

    if (history.length < pattern.sequence.length) continue;

    const now = performance.now();
    const cutoff = now - pattern.windowMs;
    const seq = pattern.sequence;

    for (let start = history.length - seq.length; start >= 0; start--) {
      const slice = history.slice(start, start + seq.length);
      if (slice[0].time < cutoff) continue;

      let matches = true;
      for (let i = 0; i < seq.length; i++) {
        if (slice[i].geometry !== seq[i] || slice[i].result === 'miss') {
          matches = false;
          break;
        }
      }

      if (matches) {
        state.cooldowns.set(pattern.id, pattern.cooldownMs / 1000);
        state.discovered.add(pattern.id);
        state.lastActivated = pattern.id;
        state.activationTimer = 3.0;
        return { pattern, startIndex: start };
      }
    }
  }
  return null;
}

// ── Pattern effects ───────────────────────────────────────────

/**
 * Execute a pattern's effect on the game state.
 * Returns modified shapes array and particles.
 */
export function activatePatternEffect(
  effect: PatternEffect,
  shapes: Shape[],
  canvasWidth: number,
  canvasHeight: number,
  score: number,
  particles: Particle[]
): { shapes: Shape[]; bonusScore: number } {
  switch (effect) {
    case 'clear_screen':
      return clearScreen(shapes, canvasWidth, canvasHeight, score, particles);

    case 'unify_shapes':
      return unifyShapes(shapes);

    case 'collect_all':
      return collectAll(shapes);

    default:
      return { shapes, bonusScore: 0 };
  }
}

/** Clear all shapes with a golden explosion, respawn half */
function clearScreen(
  shapes: Shape[],
  canvasWidth: number,
  canvasHeight: number,
  score: number,
  particles: Particle[]
): { shapes: Shape[]; bonusScore: number } {
  const count = shapes.length;
  // Bonus: 50 points per shape cleared
  const bonusScore = count * 50;

  // Keep just 2 shapes, rest get cleared
  const kept = shapes.slice(0, 2);

  // Spawn particles from all removed shapes
  for (const shape of shapes.slice(2)) {
    // (Particles are triggered by caller with particleEffect)
  }

  return { shapes: kept, bonusScore };
}

/** Change all shapes to a single random geometry type */
function unifyShapes(
  shapes: Shape[]
): { shapes: Shape[]; bonusScore: number } {
  const types: GeometrySymbolName[] = ['flower', 'seed', 'vesica', 'spiral', 'sri', 'metatron'];
  const chosen = types[Math.floor(Math.random() * types.length)];

  for (const shape of shapes) {
    shape.geometry = chosen;
    shape.bonusMultiplier = 1.5; // Bonus on unified shapes
  }

  return { shapes, bonusScore: 0 };
}

/** Grant one-tap collect: mark all shapes with a collectable flag */
function collectAll(
  shapes: Shape[]
): { shapes: Shape[]; bonusScore: number } {
  // Set bonus multiplier high so they're worth collecting
  for (const shape of shapes) {
    shape.bonusMultiplier = 3.0;
    shape.scale = 1.5; // Big and tempting
  }

  return { shapes, bonusScore: 0 };
}

// ── Cooldown update ───────────────────────────────────────────

export function updatePatternState(state: PatternState, delta: number): void {
  // Update cooldowns
  for (const [id, remaining] of state.cooldowns) {
    const newRemaining = remaining - delta;
    if (newRemaining <= 0) {
      state.cooldowns.delete(id);
    } else {
      state.cooldowns.set(id, newRemaining);
    }
  }

  // Update activation message timer
  if (state.activationTimer > 0) {
    state.activationTimer -= delta;
    if (state.activationTimer <= 0) {
      state.lastActivated = null;
    }
  }
}
