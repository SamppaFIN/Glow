/**
 * Game Loop + State Machine
 * Core engine for the Glow rhythm game.
 * Phase 1: RAF loop, delta time, state transitions.
 */
/** All possible game states */
export var GameState;
(function (GameState) {
    GameState["Menu"] = "menu";
    GameState["Playing"] = "playing";
    GameState["Paused"] = "paused";
    GameState["GameOver"] = "gameover";
    GameState["NameEntry"] = "nameentry";
    GameState["Bonus"] = "bonus";
})(GameState || (GameState = {}));
/** Game configuration constants */
export const GameConfig = {
    /** Target frames per second */
    targetFPS: 60,
    /** Maximum delta time cap (prevents spiral of death) */
    maxDelta: 0.05, // 50ms = 20 FPS minimum
};
/**
 * Creates a fresh game loop state.
 */
export function createGameLoop() {
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
export function startGameLoop(loop, callbacks) {
    if (loop.running)
        return;
    loop.running = true;
    loop.lastTime = performance.now();
    const frame = (now) => {
        if (!loop.running)
            return;
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
export function stopGameLoop(loop) {
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
export function transitionState(loop, to) {
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
function isValidTransition(from, to) {
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
            // GameOver -> NameEntry (score submit) | Menu (skip)
            return to === GameState.NameEntry || to === GameState.Menu;
        case GameState.NameEntry:
            // NameEntry -> Menu (saved)
            return to === GameState.Menu;
        case GameState.Bonus:
            // Bonus -> Playing (bonus ends)
            return to === GameState.Playing;
        default:
            return false;
    }
}
//# sourceMappingURL=game.js.map