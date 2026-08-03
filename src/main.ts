/**
 * Glow — Sacred Geometry Rhythm Game
 * Entry point. Wires engine modules together.
 */

import {
  createGameLoop,
  startGameLoop,
  GameState,
  transitionState,
  type GameLoopState,
} from './engine/game.js';
import {
  type Particle,
  updateParticles,
  triggerBurst,
  triggerFizzle,
  triggerGeometryBurst,
  triggerComboBurst,
  triggerBubbleBonus,
  triggerRainbowBurst,
} from './engine/particles.js';
import { setupInputHandler, evaluateTap, type HitResult } from './engine/input.js';
import {
  generateShapeGrid,
  spawnRandomShape,
  updateShapes,
  renderShapes,
  getTier,
  type Shape,
} from './engine/shapes.js';
import {
  createTabooState,
  updateTaboo,
  checkTabooHit,
  renderTabooWarning,
  type TabooState,
} from './engine/taboo.js';
import {
  unlockAudio,
  setMuted,
  isMuted,
  toggleMute,
  playHitSound,
  playPerfectSound,
  playMissSound,
  playTabooWarning,
  playComboMilestone,
  playPatternSound,
  playLevelUpSound,
  playGameOverSound,
  startPulse,
  stopPulse,
} from './audio/audio.js';
import { GeometrySymbolName } from './engine/geometry.js';
import type { SacredPattern } from './engine/patterns.js';
import {
  createErrorMeter,
  registerMiss,
  registerHit,
  updateErrorMeter,
  isGameOver,
  resetErrorMeter,
  renderErrorMeter,
} from './engine/meter.js';
import {
  SACRED_PATTERNS,
  createPatternState,
  checkRichPatterns,
  activatePatternEffect,
  updatePatternState,
  type PatternState,
  type RichTapRecord,
} from './engine/patterns.js';

// ── Canvas setup ──────────────────────────────────────────────
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

/** CSS-pixel dimensions — use these for all game logic positioning */
const W = () => window.innerWidth;
const H = () => window.innerHeight;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ── Game state ────────────────────────────────────────────────
const loop: GameLoopState = createGameLoop();
const particles: Particle[] = [];
const tapHistory: RichTapRecord[] = [];
const patternState: PatternState = createPatternState();
let collectAllActive = false;  // Metatron's Cube power-up
const errorMeter = createErrorMeter();
let shapes: Shape[] = [];
let score = 0;
let combo = 0;
let multiplier = 1.0;
let prevComboMilestone = 0;
let prevTier = 0;              // Track tier for level-up messages
let tierUpMessage = '';
let tierUpTimer = 0;
let gameTime = 0;
let spawnTimer = 0;
const MAX_SHAPES = 15;
const tabooState: TabooState = createTabooState();

// ── Input ─────────────────────────────────────────────────────
const cleanupInput = setupInputHandler(canvas, (tap) => {
  unlockAudio(); // Browser requires user gesture for audio
  switch (loop.state) {
    case GameState.Menu:
      startGame();
      break;
    case GameState.Playing: {
      const hit = evaluateTap(tap, shapes);
      if (hit) {
        handleHit(hit.shape, hit.result, tap.x, tap.y);
      } else {
        // Tapped empty space — small penalty
        combo = 0;
        multiplier = 1.0;
        prevComboMilestone = 0;
        collectAllActive = false;
        registerMiss(errorMeter);
        triggerFizzle(particles, tap.x, tap.y);
        playMissSound();
      }
      break;
    }
    case GameState.GameOver:
      transitionState(loop, GameState.Menu);
      break;
  }
});

// Keyboard: M to mute, P to pause
window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    const muted = toggleMute();
    console.log(muted ? '🔇 Muted' : '🔊 Unmuted');
  }
  if (e.key === 'p' || e.key === 'P' && loop.state === GameState.Playing) {
    transitionState(loop, GameState.Paused);
  }
});

// ── Hit handling ──────────────────────────────────────────────
function handleHit(shape: Shape, result: HitResult, x: number, y: number): void {
  // Taboo check
  if (checkTabooHit(shape, tabooState)) {
    combo = 0; multiplier = 1.0; prevComboMilestone = 0; collectAllActive = false;
    registerMiss(errorMeter); registerMiss(errorMeter);
    triggerFizzle(particles, x, y);
    playMissSound(); playTabooWarning();
    addFloatingText(x, y, '🚫 TABOO!', '#ff4444');
    return;
  }

  // Collect-all mode
  if (collectAllActive) {
    const collected = shapes.length;
    combo += collected;
    multiplier = Math.min(1.0 + combo * 0.1, 5.0);
    const bonus = Math.round(collected * 100 * multiplier * 3.0);
    score += bonus;
    triggerRainbowBurst(particles, x, y);
    shapes = [spawnRandomShape(W(), H(), score)];
    collectAllActive = false;
    registerHit(errorMeter);
    pushTap(shape.geometry, 'perfect');
    playPerfectSound(combo);
    addFloatingText(x, y, `+${bonus} ALL!`, '#FFD700');
    return;
  }

  // Remove shape, spawn new
  shapes = shapes.filter((s) => s.id !== shape.id);
  shapes.push(spawnRandomShape(W(), H(), score));

  combo++;
  multiplier = Math.min(1.0 + combo * 0.1, 5.0);
  const points = Math.round(100 * multiplier * shape.bonusMultiplier);
  score += points;
  registerHit(errorMeter);
  pushTap(shape.geometry, result);

  // Floating score text
  const label = result === 'perfect' ? `+${points} PERFECT!` : `+${points}`;
  const color = result === 'perfect' ? '#FFD700' : '#ffffff';
  addFloatingText(x, y, label, color);

  // Audio
  if (result === 'perfect') playPerfectSound(combo);
  else playHitSound(combo);

  // Pattern check
  const match = checkRichPatterns(tapHistory, SACRED_PATTERNS, patternState);
  if (match) {
    triggerPattern(match.pattern, shape);
    playPatternSound(match.pattern.id);
  }

  // Particle burst
  triggerGeometryBurst(particles, x, y, shape.geometry);

  // Combo milestone
  const milestones = [10, 25, 50, 100];
  for (const m of milestones) {
    if (combo >= m && prevComboMilestone < m) {
      triggerComboBurst(particles, x, y, combo);
      playComboMilestone(m);
      addFloatingText(x, y - 30, `${m} COMBO!`, '#FFD700');
      break;
    }
  }
  prevComboMilestone = combo;
}

// ── Floating score text ──────────────────────────────────────
interface FloatingText {
  x: number; y: number; text: string; color: string; life: number;
}
const floatingTexts: FloatingText[] = [];

function addFloatingText(x: number, y: number, text: string, color: string): void {
  floatingTexts.push({ x, y, text, color, life: 1.0 });
}

function updateFloatingTexts(delta: number): void {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y -= 40 * delta; // Float upward
    ft.life -= delta * 1.2;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function renderFloatingTexts(ctx: CanvasRenderingContext2D): void {
  for (const ft of floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.life);
    ctx.font = `bold ${Math.min(W(), H()) * 0.035}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = ft.color;
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function pushTap(geometry: string, result: HitResult): void {
  tapHistory.push({
    geometry: geometry as GeometrySymbolName,
    shapeId: 0,
    time: performance.now(),
    result,
  });
  // Keep last 20 taps
  if (tapHistory.length > 20) tapHistory.shift();
}

function triggerPattern(pattern: SacredPattern, shape: Shape): void {
  const result = activatePatternEffect(
    pattern.effect,
    shapes,
    W(),
    H(),
    score,
    particles
  );
  const fx = pattern.effect;
  const newShapes = result.shapes;
  const bonusScore = result.bonusScore;

  if (fx === 'clear_screen') {
    shapes = newShapes;
    triggerRainbowBurst(particles, shape.x, shape.y);
    triggerBubbleBonus(particles, shape.x, shape.y);
    score += bonusScore;
  } else if (fx === 'unify_shapes') {
    shapes = newShapes;
    triggerBubbleBonus(particles, shape.x, shape.y);
    score += bonusScore;
  } else if (fx === 'collect_all') {
    shapes = newShapes;
    collectAllActive = true;
    triggerBubbleBonus(particles, shape.x, shape.y);
    score += bonusScore;
  }
}

// ── Rendering ─────────────────────────────────────────────────
function clearScreen(): void {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W(), H());
}

function renderMenu(): void {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W(), H());
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `bold ${Math.min(W(), H()) * 0.06}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('☀️ Glow', W() / 2, H() / 2 - 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `${Math.min(W(), H()) * 0.025}px Inter, system-ui, sans-serif`;
  ctx.fillText('Tap to start', W() / 2, H() / 2 + 30);
}

function renderGameOver(): void {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W(), H());
  const reason = shapes.length >= MAX_SHAPES ? 'Screen overflowed!'
    : isGameOver(errorMeter) ? 'Too many misses!' : 'Game Over';
  ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
  ctx.font = `bold ${Math.min(W(), H()) * 0.05}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(reason, W() / 2, H() / 2 - 40);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = `${Math.min(W(), H()) * 0.035}px Inter, system-ui, sans-serif`;
  ctx.fillText(`Score: ${score}`, W() / 2, H() / 2 + 5);
  const mins = Math.floor(gameTime / 60);
  const secs = Math.floor(gameTime % 60);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `${Math.min(W(), H()) * 0.025}px Inter, system-ui, sans-serif`;
  ctx.fillText(`Survived: ${mins}:${secs.toString().padStart(2, '0')}`, W() / 2, H() / 2 + 40);
  const best = getTopScore();
  ctx.fillStyle = score >= best && score > 0 ? '#FFD700' : 'rgba(255,255,255,0.5)';
  ctx.fillText(score >= best && score > 0 ? `🏆 NEW BEST: ${score}` : `Best: ${best}`, W() / 2, H() / 2 + 72);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = `${Math.min(W(), H()) * 0.02}px Inter, system-ui, sans-serif`;
  ctx.fillText('Tap to return', W() / 2, H() / 2 + 105);
}

function renderPlay(): void {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W(), H());

  renderShapes(ctx, shapes);
  renderTabooWarning(ctx, shapes, tabooState, gameTime);
  updateParticles(particles, ctx, loop.delta);

  renderFloatingTexts(ctx);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `bold ${Math.min(W(), H()) * 0.025}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(`☀️ ${score}`, 16, 40);
  ctx.font = `${Math.min(W(), H()) * 0.02}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(`×${multiplier.toFixed(1)}`, 16, 65);

  const tier = getTier(score);
  const tierNames = ['🌱 Novice', '🌿 Seeker', '🔥 Adept', '👁️ Mystic'];
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `${Math.min(W(), H()) * 0.018}px Inter, system-ui, sans-serif`;
  ctx.fillText(tierNames[tier], 16, 90);

  const ringX = W() - 50;
  const ringY = 50;
  const ringR = 28;
  renderErrorMeter(ctx, errorMeter, ringX, ringY, ringR);

  const shapeFullness = shapes.length / MAX_SHAPES;
  const warnColor = shapeFullness > 0.8 ? 'rgba(255, 80, 80, 0.8)' : 'rgba(255, 255, 255, 0.4)';
  ctx.fillStyle = warnColor;
  ctx.font = `${Math.min(W(), H()) * 0.016}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText(`${shapes.length}/${MAX_SHAPES}`, W() - 16, 105);

  const mins = Math.floor(gameTime / 60);
  const secs = Math.floor(gameTime % 60);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'left';
  ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, 16, 112);

  if (combo > 1) {
    ctx.fillStyle = combo >= 50 ? '#FFD700' : combo >= 25 ? '#FF6B6B' : 'rgba(255,255,255,0.5)';
    ctx.font = `bold ${Math.min(W(), H()) * 0.04}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${combo} COMBO`, W() / 2, 60);
  }

  // ── Activation messages ───────────────────────────────────

  // Sacred pattern activation
  if (patternState.lastActivated && patternState.activationTimer > 0) {
    const pat = SACRED_PATTERNS.find(p => p.id === patternState.lastActivated);
    if (pat) {
      const alpha = Math.min(1, patternState.activationTimer);
      const y = H() * 0.35;
      const pulse = 1 + Math.sin(gameTime * 3) * 0.05;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.min(W(), H()) * 0.05 * pulse}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20;
      ctx.fillText(`✦ ${pat.name} ✦`, W() / 2, y);
      ctx.shadowBlur = 0;
      ctx.font = `${Math.min(W(), H()) * 0.022}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText(pat.description, W() / 2, y + 30);
      ctx.restore();
    }
  }

  // Tier-up message
  if (tierUpTimer > 0) {
    const alpha = Math.min(1, tierUpTimer);
    const y = H() * 0.25;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.min(W(), H()) * 0.055}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4ECDC4';
    ctx.shadowColor = '#4ECDC4';
    ctx.shadowBlur = 15;
    ctx.fillText(tierUpMessage, W() / 2, y);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Collect-all warning
  if (collectAllActive) {
    const pulse = 1 + Math.sin(gameTime * 6) * 0.08;
    ctx.save();
    ctx.font = `bold ${Math.min(W(), H()) * 0.045 * pulse}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A78BFA';
    ctx.shadowColor = '#A78BFA';
    ctx.shadowBlur = 25;
    ctx.fillText('⚡ TAP ANYWHERE! ⚡', W() / 2, H() * 0.55);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ── State transitions ─────────────────────────────────────────
function startGame(): void {
  shapes = generateShapeGrid(W(), H(), 3);
  score = 0;
  combo = 0;
  multiplier = 1.0;
  prevComboMilestone = 0;
  prevTier = 0;
  tierUpMessage = '';
  tierUpTimer = 0;
  collectAllActive = false;
  gameTime = 0;
  spawnTimer = 0;
  particles.length = 0;
  tapHistory.length = 0;
  patternState.cooldowns.clear();
  patternState.lastActivated = null;
  patternState.activationTimer = 0;
  resetErrorMeter(errorMeter);
  tabooState.activeIds.clear();
  tabooState.active = false;
  tabooState.nextEventTimer = 30 + Math.random() * 15;
  startPulse(800);
  transitionState(loop, GameState.Playing);
}

function gameOver(): void {
  stopPulse();
  playGameOverSound();
  saveHighScore(score);
  transitionState(loop, GameState.GameOver);
}

// ── High scores ───────────────────────────────────────────────
const HS_KEY = 'glow_highscores';
function loadHighScores(): number[] {
  try { const raw = localStorage.getItem(HS_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
function saveHighScore(s: number): void {
  const scores = loadHighScores(); scores.push(s);
  scores.sort((a, b) => b - a);
  localStorage.setItem(HS_KEY, JSON.stringify(scores.slice(0, 5)));
}
function getTopScore(): number {
  const s = loadHighScores(); return s.length > 0 ? s[0] : 0;
}

/** Spawn interval decreases over time — starts slow, accelerates */
function getSpawnInterval(elapsed: number): number {
  if (elapsed < 15) return 3.0;       // Chill start
  if (elapsed < 30) return 2.5;
  if (elapsed < 45) return 2.0;
  if (elapsed < 60) return 1.5;
  if (elapsed < 90) return 1.0;       // Getting intense
  return 0.7;                          // Mayhem
}

// ── Bootstrap ─────────────────────────────────────────────────
console.log('☀️ Glow v0.1.0 — Phase 2: Playable prototype');
console.log('Tap anywhere to start!');
// loop starts in Menu state from createGameLoop()

// Single tick: handles update + render based on state
startGameLoop(loop, {
  onUpdate(delta) {
    switch (loop.state) {
      case GameState.Menu:
        renderMenu();
        break;
      case GameState.Playing:
        gameTime += delta;
        updateShapes(shapes, delta);
        updateErrorMeter(errorMeter, delta);
        updatePatternState(patternState, delta);
        updateTaboo(tabooState, shapes, delta, gameTime);
        updateFloatingTexts(delta);

        // Tier-up detection
        const currentTier = getTier(score);
        if (currentTier > prevTier) {
          prevTier = currentTier;
          const tierNames = ['🌱 Novice', '🌿 Seeker', '🔥 Adept', '👁️ Mystic'];
          tierUpMessage = `LEVEL UP! ${tierNames[currentTier]}`;
          tierUpTimer = 2.5;
          triggerRainbowBurst(particles, W() / 2, H() / 2);
        }
        if (tierUpTimer > 0) tierUpTimer -= delta;

        // Check shape limit
        if (shapes.length >= MAX_SHAPES) { gameOver(); break; }

        // Auto-spawn new shapes with accelerating pace
        spawnTimer += delta;
        const interval = getSpawnInterval(gameTime);
        if (spawnTimer >= interval) {
          spawnTimer -= interval;
          const newShape = spawnRandomShape(W(), H(), score);
          newShape.bonusMultiplier = 1.0 + gameTime * 0.005; // Slight bonus over time
          shapes.push(newShape);
        }

        // Danger mode: flash warning when close to full
        if (isGameOver(errorMeter)) gameOver();
        renderPlay();
        break;
      case GameState.GameOver:
        renderGameOver();
        break;
    }
  },
  onRender() {
    // Rendering happens in onUpdate to keep state/rendering in sync
  },
});
