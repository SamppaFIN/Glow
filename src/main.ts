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
  spawnRain,
  spawnSnow,
  spawnRewardBubbles,
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
  createEventState,
  updateEvents,
  applyEventToShapes,
  EVENTS,
  type EventState,
} from './engine/events.js';
import {
  spawnHazard,
  updateHazards,
  renderHazards,
  getHazardsForLevel,
  type Hazard,
  type HazardAffected,
} from './engine/hazards.js';
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
  playSacredChord,
  playRandomAngelic,
  playLevelComplete,
  killAllAudio,
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
// Track geometry taps this run
const geoTaps: Record<string, number> = {};
const GEO_NAMES: Record<string, string> = { flower: 'Flower of Life', seed: 'Seed of Life', vesica: 'Vesica Piscis', spiral: 'Golden Spiral', sri: 'Sri Yantra', metatron: "Metatron's Cube" };
function recordGeoTap(geo: string): void { geoTaps[geo] = (geoTaps[geo] || 0) + 1; }
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
const MAX_SHAPES = 20;  // Increased for more action
const tabooState: TabooState = createTabooState();
const eventState: EventState = createEventState();

// ── v2.0: Levels + Hazards ───────────────────────────────────
let currentLevel = 1;
let levelTimer = 0;
const LEVEL_DURATION = 40; // Seconds per level
const MAX_LEVEL = 3;
const hazards: Hazard[] = [];
const hazardAffected: HazardAffected[] = [];
let hazardSpawnTimer = 0;
let weatherTimer = 0;
let levelComplete = false;
let levelMessage = '';
let levelMessageTimer = 0;

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
      if (!gameOverReady && gameOverTimer <= 0) {
        gameOverReady = true;
      }
      if (gameOverReady) {
        startNameEntry();
      }
      break;
    case GameState.NameEntry:
      if (nameEntrySaved) {
        transitionState(loop, GameState.Menu);
      } else {
        handleNameEntryTap(tap.x, tap.y);
      }
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

// v2.0: Swipe physics — flick shapes by dragging
let swipeActive = false;
let swipeX = 0, swipeY = 0;

canvas.addEventListener('pointermove', (e) => {
  if (!swipeActive || loop.state !== GameState.Playing) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const dx = px - swipeX;
  const dy = py - swipeY;
  // Push nearby shapes in swipe direction
  for (const shape of shapes) {
    const dist = Math.hypot(shape.x - px, shape.y - py);
    if (dist < shape.radius * 3) {
      shape.x += dx * 0.5;
      shape.y += dy * 0.5;
    }
  }
  swipeX = px;
  swipeY = py;
});

canvas.addEventListener('pointerdown', () => { swipeActive = true; });
canvas.addEventListener('pointerup', () => { swipeActive = false; });
canvas.addEventListener('pointerleave', () => { swipeActive = false; });

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
  const points = Math.round(100 * multiplier * shape.bonusMultiplier * eventState.scoreMultiplier);
  score += points;
  registerHit(errorMeter);
  pushTap(shape.geometry, result);
  recordGeoTap(shape.geometry);

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

  // Top scores
  const scores = loadHighScores();
  if (scores.length > 0) {
    const y0 = H() * 0.65;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${Math.min(W(), H()) * 0.018}px Inter, system-ui, sans-serif`;
    ctx.fillText('🏆 High Scores', W() / 2, y0 - 16);
    for (let i = 0; i < Math.min(3, scores.length); i++) {
      const s = scores[i];
      const icon = GEO_ICONS[s.icon] ?? '🌸';
      ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32';
      ctx.font = `${Math.min(W(), H()) * 0.02}px Inter, system-ui, sans-serif`;
      ctx.fillText(`${icon} ${s.initials} — ${s.score}`, W() / 2, y0 + i * 22);
    }
  }
}

function renderGameOver(): void {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W(), H());
  const reason = shapes.length >= MAX_SHAPES ? 'Screen overflow!'
    : isGameOver(errorMeter) ? 'Too many misses' : 'Game Over';

  ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
  ctx.font = `bold ${Math.min(W(), H()) * 0.05}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('💀 GAME OVER', W() / 2, H() * 0.15);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `${Math.min(W(), H()) * 0.025}px Inter, system-ui, sans-serif`;
  ctx.fillText(reason, W() / 2, H() * 0.22);
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${Math.min(W(), H()) * 0.04}px Inter, system-ui, sans-serif`;
  ctx.fillText(`${score}`, W() / 2, H() * 0.30);

  // Patterns discovered this run
  const discovered = [...patternState.discovered];
  if (discovered.length > 0) {
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.min(W(), H()) * 0.022}px Inter, system-ui, sans-serif`;
    ctx.fillText('✦ SECRETS UNLOCKED ✦', W() / 2, H() * 0.36);
    const names = discovered.map(id => SACRED_PATTERNS.find(p => p.id === id)?.name ?? id);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.min(W(), H()) * 0.018}px Inter, system-ui, sans-serif`;
    ctx.fillText(names.join('  ·  '), W() / 2, H() * 0.40);
  }

  // Geometry tap counts
  const tappedGeos = Object.entries(geoTaps).sort((a, b) => b[1] - a[1]);
  if (tappedGeos.length > 0) {
    const y0 = H() * 0.46;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `bold ${Math.min(W(), H()) * 0.018}px Inter, system-ui, sans-serif`;
    ctx.fillText('📊 SHAPES TAPPED', W() / 2, y0);
    ctx.font = `${Math.min(W(), H()) * 0.016}px Inter, system-ui, sans-serif`;
    const maxShow = 6;
    for (let i = 0; i < Math.min(maxShow, tappedGeos.length); i++) {
      const [geo, count] = tappedGeos[i];
      const icon = GEO_ICONS[geo] ?? '●';
      const name = GEO_NAMES[geo] ?? geo;
      const y = y0 + 16 + i * 16;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(`${icon} ${name}: ${count}`, W() / 2, y);
    }
  }

  // Top scores — FIXED: medal colors on dark bg
  const scores = loadHighScores();
  const tapY = H() * 0.90;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `bold ${Math.min(W(), H()) * 0.018}px Inter, system-ui, sans-serif`;
  ctx.fillText('🏆 TOP 5', W() / 2, H() * 0.74);
  ctx.font = `${Math.min(W(), H()) * 0.016}px Inter, system-ui, sans-serif`;
  for (let i = 0; i < Math.min(5, scores.length); i++) {
    const s = scores[i];
    const icon = GEO_ICONS[s.icon] ?? '🌸';
    ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.6)';
    ctx.fillText(`${icon} ${s.initials}  ${s.score}  ${s.date}`, W() / 2, H() * 0.78 + i * 16);
  }

  // Secret story
  const secrets = [...patternState.discovered];
  if (secrets.length > 0) {
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.font = `${Math.min(W(), H()) * 0.014}px Inter, system-ui, sans-serif`;
    const names = secrets.map(id => SACRED_PATTERNS.find(p => p.id === id)?.name ?? id);
    ctx.fillText('🔮 Unlocked: ' + names.join(' · ') + ' — amplified your score!', W() / 2, H() * 0.93);
  }

  // Tap prompt
  if (gameOverReady) {
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(W(), H()) * 0.022}px Inter, system-ui, sans-serif`;
    ctx.fillText('👆 Tap to save score', W() / 2, tapY);
  } else {
    const remaining = Math.ceil(gameOverTimer);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `${Math.min(W(), H()) * 0.018}px Inter, system-ui, sans-serif`;
    ctx.fillText(`Wait ${remaining}s...`, W() / 2, tapY);
  }
}

function renderPlay(): void {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W(), H());

  renderShapes(ctx, shapes);
  renderTabooWarning(ctx, shapes, tabooState, gameTime);
  renderHazards(ctx, hazards, gameTime);
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

  // Level info (top-center)
  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${Math.min(W(), H()) * 0.022}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`Level ${currentLevel}/${MAX_LEVEL}  ·  ${Math.max(0, Math.ceil(LEVEL_DURATION - levelTimer))}s`, W() / 2, 28);

  // Level message
  if (levelMessageTimer > 0) {
    const alpha = Math.min(1, levelMessageTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.min(W(), H()) * 0.08}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 30;
    ctx.fillText(levelMessage, W() / 2, H() / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  if (combo > 1) {
    ctx.fillStyle = combo >= 50 ? '#FFD700' : combo >= 25 ? '#FF6B6B' : 'rgba(255,255,255,0.5)';
    ctx.font = `bold ${Math.min(W(), H()) * 0.04}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${combo} COMBO`, W() / 2, 60);
  }

  // Random event announcement
  if (eventState.activeEvent && eventState.eventTimer > 0) {
    const ev = eventState.activeEvent;
    const alpha = Math.min(1, eventState.eventTimer);
    const y = H() * 0.14;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.min(W(), H()) * 0.04}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fillText(`${ev.emoji} ${ev.name}`, W() / 2, y);
    ctx.shadowBlur = 0;
    ctx.restore();
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
  shapes = generateShapeGrid(W(), H(), 5); // Start with 5 shapes
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
  // Reset geo tap counts
  for (const k of Object.keys(geoTaps)) delete geoTaps[k];
  patternState.cooldowns.clear();
  patternState.lastActivated = null;
  patternState.activationTimer = 0;
  resetErrorMeter(errorMeter);
  tabooState.activeIds.clear();
  tabooState.active = false;
  tabooState.nextEventTimer = 30 + Math.random() * 15;
  // Reset events
  eventState.activeEvent = null;
  eventState.eventTimer = 0;
  eventState.nextEventTimer = 20 + Math.random() * 20;
  eventState.scoreMultiplier = 1;
  eventState.pulseMultiplier = 1;
  // Reset levels + hazards
  currentLevel = 1;
  levelTimer = 0;
  levelComplete = false;
  levelMessage = '';
  levelMessageTimer = 0;
  hazards.length = 0;
  hazardAffected.length = 0;
  hazardSpawnTimer = 0;
  weatherTimer = 0;
  startPulse(800);
  transitionState(loop, GameState.Playing);
}

// ── Game over guard (prevent accidental skip) ─────────────────
let gameOverReady = false;
let gameOverTimer = 0;
const GAME_OVER_DELAY = 1.5; // Seconds before tap is accepted

function gameOver(): void {
  stopPulse();
  playGameOverSound();
  gameOverReady = false;
  gameOverTimer = GAME_OVER_DELAY;
  setTimeout(() => killAllAudio(), 2000);
  transitionState(loop, GameState.GameOver);
}

// ── High scores ───────────────────────────────────────────────
const HS_KEY = 'glow_highscores';
const GEOS = ['flower', 'seed', 'vesica', 'spiral', 'sri', 'metatron'] as const;
const GEO_ICONS: Record<string, string> = { flower: '🌸', seed: '🌱', vesica: '💧', spiral: '🌀', sri: '🔥', metatron: '🔮' };

interface HighScore {
  score: number; time: number; initials: string; icon: string;
  patterns: string[]; date: string;
}
function loadHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (!raw) return [];
    const parsed: HighScore[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveHighScore(entry: HighScore): void {
  const scores: HighScore[] = loadHighScores(); scores.push(entry);
  scores.sort((a: HighScore, b: HighScore) => b.score - a.score);
  localStorage.setItem(HS_KEY, JSON.stringify(scores.slice(0, 10)));
}
function getTopScore(): number {
  const s = loadHighScores(); return s.length > 0 ? s[0].score : 0;
}

// ── Name entry state ──────────────────────────────────────────
let nameEntryInitials = ['A', 'A', 'A'];
let nameEntrySlot = 0;
let nameEntryIconIdx = 0;
let nameEntrySaved = false;

function startNameEntry(): void {
  nameEntryInitials = ['A', 'A', 'A'];
  nameEntrySlot = 0;
  nameEntryIconIdx = 0;
  nameEntrySaved = false;
  transitionState(loop, GameState.NameEntry);
}

function handleNameEntryTap(tapX: number, tapY: number): void {
  const w = W(), h = H();
  // Save button area (bottom center)
  if (tapY > h * 0.75 && tapX > w * 0.3 && tapX < w * 0.7) {
    if (!nameEntrySaved) {
      const entry: HighScore = {
        score, time: gameTime,
        initials: nameEntryInitials.join(''),
        icon: GEOS[nameEntryIconIdx],
        patterns: [...patternState.discovered],
        date: new Date().toLocaleDateString('fi'),
      };
      saveHighScore(entry);
      nameEntrySaved = true;
    }
    return;
  }
  // Icon area (tap to cycle)
  if (tapY > h * 0.42 && tapY < h * 0.62 && tapX > w * 0.35 && tapX < w * 0.65) {
    nameEntryIconIdx = (nameEntryIconIdx + 1) % GEOS.length;
    return;
  }
  // Letter slots (3 zones at top-center)
  const slotW = w * 0.12;
  const startX = w / 2 - slotW * 1.5;
  for (let i = 0; i < 3; i++) {
    const sx = startX + i * slotW;
    if (tapX > sx && tapX < sx + slotW && tapY > h * 0.22 && tapY < h * 0.38) {
      nameEntrySlot = i;
      nameEntryInitials[i] = cycleLetter(nameEntryInitials[i]);
      return;
    }
  }
}

function cycleLetter(c: string): string {
  const idx = c.charCodeAt(0) - 65;
  return String.fromCharCode(65 + ((idx + 1) % 26));
}

function renderNameEntry(): void {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W(), H());
  const w = W(), h = H();

  ctx.fillStyle = '#FFD700';
  ctx.font = `bold ${Math.min(w, h) * 0.04}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🏆 NEW HIGH SCORE!', w / 2, h * 0.1);

  ctx.fillStyle = '#fff';
  ctx.font = `${Math.min(w, h) * 0.03}px Inter, system-ui, sans-serif`;
  ctx.fillText(`Score: ${score}  ·  Survived: ${Math.floor(gameTime / 60)}:${String(Math.floor(gameTime % 60)).padStart(2, '0')}`, w / 2, h * 0.16);

  // Initials
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `${Math.min(w, h) * 0.02}px Inter, system-ui, sans-serif`;
  ctx.fillText('Tap letters to change', w / 2, h * 0.2);
  const slotW = w * 0.12;
  const startX = w / 2 - slotW * 1.5;
  for (let i = 0; i < 3; i++) {
    const sx = startX + i * slotW;
    const active = i === nameEntrySlot;
    ctx.fillStyle = active ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(sx, h * 0.22, slotW, h * 0.15);
    ctx.strokeStyle = active ? '#FFD700' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, h * 0.22, slotW, h * 0.15);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(w, h) * 0.06}px Inter, system-ui, sans-serif`;
    ctx.fillText(nameEntryInitials[i], sx + slotW / 2, h * 0.33);
  }

  // Geometry icon selector
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `${Math.min(w, h) * 0.02}px Inter, system-ui, sans-serif`;
  ctx.fillText('Tap icon to change', w / 2, h * 0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(w * 0.35, h * 0.42, w * 0.3, h * 0.2);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(w * 0.35, h * 0.42, w * 0.3, h * 0.2);
  ctx.font = `${Math.min(w, h) * 0.1}px Inter, system-ui, sans-serif`;
  ctx.fillText(GEO_ICONS[GEOS[nameEntryIconIdx]], w / 2, h * 0.56);

  // Save button
  const btnY = h * 0.76;
  ctx.fillStyle = nameEntrySaved ? 'rgba(78,205,196,0.3)' : 'rgba(255,215,0,0.2)';
  ctx.fillRect(w * 0.3, btnY, w * 0.4, h * 0.08);
  ctx.strokeStyle = nameEntrySaved ? '#4ECDC4' : '#FFD700';
  ctx.strokeRect(w * 0.3, btnY, w * 0.4, h * 0.08);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.min(w, h) * 0.025}px Inter, system-ui, sans-serif`;
  ctx.fillText(nameEntrySaved ? '✅ SAVED — Tap to continue' : '💾 SAVE SCORE', w / 2, btnY + h * 0.055);

  // Patterns discovered
  if (patternState.discovered.size > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${Math.min(w, h) * 0.018}px Inter, system-ui, sans-serif`;
    const names = [...patternState.discovered].map(id => SACRED_PATTERNS.find(p => p.id === id)?.name ?? id);
    ctx.fillText('Discovered: ' + names.join(', '), w / 2, h * 0.92);
  }
}

/** Spawn interval per level — comfortable pace */
function getSpawnInterval(_elapsed: number): number {
  if (currentLevel === 1) return 4.0;   // Chill
  if (currentLevel === 2) return 3.0;   // Moderate
  return 2.5;                            // Brisk but fair
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
        const shapedDelta = delta * eventState.pulseMultiplier;
        updateShapes(shapes, shapedDelta);
        updateErrorMeter(errorMeter, delta);
        updatePatternState(patternState, delta);
        updateTaboo(tabooState, shapes, delta, gameTime);

        // Random events
        const triggered = updateEvents(eventState, delta);
        if (triggered) {
          applyEventToShapes(triggered, shapes, tabooState.activeIds);
          if (triggered.type === 'shape_storm') {
            for (let i = 0; i < 5; i++) shapes.push(spawnRandomShape(W(), H(), score));
          }
          if (triggered.type === 'bubble_party') {
            triggerBubbleBonus(particles, W() / 2, H() / 2);
          }
        }

        // v2.0: Hazard system
        hazardSpawnTimer += delta;
        const hazardInterval = 14 - currentLevel * 2; // 12s L1, 10s L2, 8s L3
        if (hazardSpawnTimer >= hazardInterval) {
          hazardSpawnTimer -= hazardInterval;
          const types = getHazardsForLevel(currentLevel);
          const type = types[Math.floor(Math.random() * types.length)];
          const target = shapes[Math.floor(Math.random() * shapes.length)];
          if (target) {
            hazards.push(spawnHazard(type, target.x, target.y, target));
          }
        }

        // v2.0: Ambient weather
        weatherTimer += delta;
        if (currentLevel >= 3 && weatherTimer > 0.15) {
          spawnSnow(particles, W(), 1);
          spawnRain(particles, W(), 1);
          weatherTimer = 0;
        } else if (currentLevel >= 2 && weatherTimer > 0.15) {
          spawnRain(particles, W(), 2);
          weatherTimer = 0;
        } else if (weatherTimer > 3) {
          spawnRewardBubbles(particles, W(), H(), 2);
          weatherTimer = 0;
        }
        const hazardResult = updateHazards(hazards, hazardAffected, shapes, delta, W(), H());
        for (const id of hazardResult.shapesToRemove) {
          shapes = shapes.filter(s => s.id !== id);
          registerMiss(errorMeter);
        }
        for (const s of hazardResult.shapesToAdd) {
          shapes.push(s);
        }

        // v2.0: Level progression
        levelTimer += delta;
        if (levelTimer >= LEVEL_DURATION && !levelComplete) {
          levelComplete = true;
          if (currentLevel < MAX_LEVEL) {
            currentLevel++;
            levelMessage = `LEVEL ${currentLevel}!`;
            levelMessageTimer = 3.0;
            levelTimer = 0;
            levelComplete = false;
            playLevelComplete();
            triggerRainbowBurst(particles, W() / 2, H() / 2);
            // Clear hazards between levels
            hazards.length = 0;
            hazardAffected.length = 0;
            // Fresh shape burst for new level — tier 0/1 variety
            for (let i = 0; i < 3; i++) {
              shapes.push(spawnRandomShape(W(), H(), 0)); // Force tier 0
            }
            score += 1000;
          } else {
            // Game complete!
            levelMessage = 'VICTORY!';
            levelMessageTimer = 5.0;
            gameOver();
          }
        }
        if (levelMessageTimer > 0) levelMessageTimer -= delta;
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
        if (gameOverTimer > 0) {
          gameOverTimer -= delta;
          if (gameOverTimer <= 0) gameOverReady = true;
        }
        renderGameOver();
        break;
      case GameState.NameEntry:
        renderNameEntry();
        break;
    }
  },
  onRender() {
    // Rendering happens in onUpdate to keep state/rendering in sync
  },
});
