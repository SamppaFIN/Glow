/**
 * Game Loop + State Machine
 * Core engine for the Glow rhythm game.
 * Phase 1: RAF loop, delta time, state transitions.
 */

/** All possible game states */
export enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'gameover',
  Bonus = 'bonus',
}

/** Game configuration constants */
export const GameConfig = {
  /** Target frames per second */
  targetFPS: 60,
  /** Maximum delta time cap (prevents spiral of death) */
  maxDelta: 0.05, // 50ms = 20 FPS minimum
} as const;

/** Core game state that persists across frames */
export interface GameLoopState {
  state: GameState;
  /** Timestamp of last frame (ms) */
  lastTime: number;
  /** Running delta time accumulator */
  delta: number;
  /** Whether the loop is running */
  running: boolean;
  /** RAF handle for cancellation */
  rafId: number | null;
}

/** Callbacks that the game loop invokes */
export interface GameLoopCallbacks {
  onUpdate: (delta: number) => void;
  onRender: () => void;
}

/**
 * Creates a fresh game loop state.
 */
export function createGameLoop(): GameLoopState {
  return {
    state: GameState.Menu,
    lastTime: 0,
    delta: 0,
    running: false,
    rafId: null,
  };
}

/**
 * Starts the requestAnimationFrame loop.
 * Calls onUpdate(delta) then onRender() each frame.
 */
export function startGameLoop(
  loop: GameLoopState,
  callbacks: GameLoopCallbacks
): void {
  if (loop.running) return;
  loop.running = true;
  loop.lastTime = performance.now();

  const frame = (now: number) => {
    if (!loop.running) return;

    // Calculate delta in seconds, capped to avoid spiral of death
    const rawDelta = (now - loop.lastTime) / 1000;
    loop.delta = Math.min(rawDelta, GameConfig.maxDelta);
    loop.lastTime = now;

    callbacks.onUpdate(loop.delta);
    callbacks.onRender();

    loop.rafId = requestAnimationFrame(frame);
  };

  loop.rafId = requestAnimationFrame(frame);
}

/**
 * Stops the game loop and cancels the RAF handle.
 */
export function stopGameLoop(loop: GameLoopState): void {
  loop.running = false;
  if (loop.rafId !== null) {
    cancelAnimationFrame(loop.rafId);
    loop.rafId = null;
  }
}

/**
 * Transition to a new game state. Returns the previous state.
 * Enforces valid transitions only.
 */
export function transitionState(
  loop: GameLoopState,
  to: GameState
): GameState {
  const from = loop.state;

  // Validate transition
  const valid = isValidTransition(from, to);
  if (!valid) {
    console.warn(`Invalid state transition: ${from} → ${to}`);
    return from;
  }

  loop.state = to;
  return from;
}

/**
 * Valid state transitions for the Glow rhythm game:
 *
 *   Menu ──→ Playing ──→ Paused ──→ Playing
 *     │         │           │
 *     │         ├──→ GameOver ──→ Menu
 *     │         │
 *     │         └──→ Bonus ──→ Playing
 *     │
 *     └── GameOver ──→ Menu (score submit)
 */
function isValidTransition(from: GameState, to: GameState): boolean {
  switch (from) {
    case GameState.Menu:
      // Menu -> Playing (start game)
      return to === GameState.Playing;
    case GameState.Playing:
      // Playing -> Paused | GameOver | Bonus
      return to === GameState.Paused || to === GameState.GameOver || to === GameState.Bonus;
    case GameState.Paused:
      // Paused -> Playing (resume) | Menu (quit)
      return to === GameState.Playing || to === GameState.Menu;
    case GameState.GameOver:
      // GameOver -> Menu (score submit)
      return to === GameState.Menu;
    case GameState.Bonus:
      // Bonus -> Playing (bonus ends)
      return to === GameState.Playing;
    default:
      return false;
  }
}
