/**
 * Hazard System v2.0 — Elemental effects that interact with shapes.
 * Freeze, Fire, Black Hole, Lightning, Wind, Flood, Overgrowth, Mirror, Vortex.
 */

import type { Shape } from './shapes.js';
import type { Particle } from './particles.js';

// ── Hazard types ──────────────────────────────────────────────

export type HazardType =
  | 'freeze' | 'fire' | 'blackhole' | 'lightning'
  | 'wind' | 'flood' | 'overgrowth' | 'mirror' | 'vortex';

export interface Hazard {
  type: HazardType;
  x: number;
  y: number;
  life: number;       // Seconds remaining
  maxLife: number;
  radius: number;
  targetId?: number;   // Shape ID this hazard is attached to
  vx?: number;
  vy?: number;
}

export interface HazardAffected {
  shapeId: number;
  effect: HazardType;
  timer: number;       // Seconds remaining
}

// ── Spawn hazards per level ───────────────────────────────────

export function getHazardsForLevel(level: number): HazardType[] {
  switch (level) {
    case 1: return ['freeze', 'wind'];
    case 2: return ['freeze', 'fire', 'lightning', 'mirror'];
    case 3: return ['freeze', 'fire', 'blackhole', 'lightning', 'wind', 'flood', 'vortex', 'overgrowth'];
    default: return ['freeze'];
  }
}

// ── Spawn a random hazard ─────────────────────────────────────

export function spawnHazard(
  type: HazardType,
  x: number,
  y: number,
  targetShape?: Shape
): Hazard {
  const configs: Record<HazardType, { life: number; radius: number }> = {
    freeze:    { life: 3.0, radius: 30 },
    fire:      { life: 2.5, radius: 25 },
    blackhole: { life: 5.0, radius: 60 },
    lightning: { life: 0.8, radius: 80 },
    wind:      { life: 2.0, radius: 120 },
    flood:     { life: 4.0, radius: 200 },
    overgrowth:{ life: 4.0, radius: 20 },
    mirror:    { life: 3.0, radius: 15 },
    vortex:    { life: 4.0, radius: 90 },
  };
  const cfg = configs[type];
  return {
    type, x, y,
    life: cfg.life,
    maxLife: cfg.life,
    radius: cfg.radius,
    targetId: targetShape?.id,
  };
}

// ── Update hazards ────────────────────────────────────────────

export function updateHazards(
  hazards: Hazard[],
  affected: HazardAffected[],
  shapes: Shape[],
  delta: number,
  canvasW: number,
  canvasH: number
): { shapesToRemove: number[]; shapesToAdd: Shape[] } {
  const shapesToRemove: number[] = [];
  const shapesToAdd: Shape[] = [];

  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.life -= delta;
    if (h.life <= 0) { hazards.splice(i, 1); continue; }

    switch (h.type) {
      case 'freeze': {
        // Find nearest shape not already frozen
        const shape = shapes.find(s => s.id === h.targetId && !affected.find(a => a.shapeId === s.id));
        if (shape) {
          affected.push({ shapeId: shape.id, effect: 'freeze', timer: 3.0 });
          shape.scale = 0.6;
        }
        hazards.splice(i, 1);
        break;
      }
      case 'fire': {
        if (h.targetId) {
          const shape = shapes.find(s => s.id === h.targetId);
          if (shape) {
            shape.scale *= 0.85;
            if (shape.scale < 0.2) shapesToRemove.push(shape.id);
          }
        }
        break;
      }
      case 'blackhole': {
        // Pull all shapes toward black hole, destroy those that touch center
        for (const shape of shapes) {
          const dx = h.x - shape.x;
          const dy = h.y - shape.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < h.radius * 0.3) {
            shapesToRemove.push(shape.id);
          } else if (dist < h.radius * 2) {
            const pull = (1 - dist / (h.radius * 2)) * 200 * delta;
            shape.x += (dx / dist) * pull;
            shape.y += (dy / dist) * pull;
          }
        }
        // Black hole grows
        h.radius += delta * 20;
        break;
      }
      case 'lightning': {
        // Stun all shapes within radius
        for (const shape of shapes) {
          const dx = h.x - shape.x;
          const dy = h.y - shape.y;
          if (Math.sqrt(dx * dx + dy * dy) < h.radius) {
            shape.pulseSpeed *= 0.3;
          }
        }
        break;
      }
      case 'wind': {
        const dir = (h.vx ?? 0) || (Math.random() - 0.5);
        for (const shape of shapes) {
          shape.x += dir * 150 * delta;
        }
        break;
      }
      case 'flood': {
        // Shapes slowly sink
        for (const shape of shapes) {
          shape.y += 30 * delta;
          if (shape.y > canvasH + 50) shapesToRemove.push(shape.id);
        }
        break;
      }
      case 'overgrowth': {
        if (h.targetId) {
          const shape = shapes.find(s => s.id === h.targetId);
          if (shape) {
            shape.scale += delta * 0.3;
            shape.pulseSpeed *= 0.95;
          }
        }
        break;
      }
      case 'mirror': {
        // Duplicate target shape
        if (h.targetId && h.life > h.maxLife * 0.8) {
          const orig = shapes.find(s => s.id === h.targetId);
          if (orig) {
            const copy = { ...orig, id: Math.random() * 10000 | 0, x: orig.x + (Math.random() - 0.5) * 80, y: orig.y + (Math.random() - 0.5) * 80 };
            shapesToAdd.push(copy);
          }
        }
        break;
      }
      case 'vortex': {
        // Spin shapes around hazard center
        for (const shape of shapes) {
          const dx = shape.x - h.x;
          const dy = shape.y - h.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < h.radius) {
            const angle = Math.atan2(dy, dx) + delta * 3;
            shape.x = h.x + Math.cos(angle) * dist;
            shape.y = h.y + Math.sin(angle) * dist;
          }
        }
        break;
      }
    }
  }

  // Update affected timers
  for (let i = affected.length - 1; i >= 0; i--) {
    affected[i].timer -= delta;
    if (affected[i].timer <= 0) {
      // Un-freeze
      const shape = shapes.find(s => s.id === affected[i].shapeId);
      if (shape) shape.scale = 1.0;
      affected.splice(i, 1);
    }
  }

  return { shapesToRemove, shapesToAdd };
}

// ── Render hazards ────────────────────────────────────────────

export function renderHazards(
  ctx: CanvasRenderingContext2D,
  hazards: Hazard[],
  gameTime: number
): void {
  for (const h of hazards) {
    const alpha = Math.max(0, h.life / h.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    switch (h.type) {
      case 'freeze': {
        // Icy blue overlay on shape
        ctx.fillStyle = 'rgba(100, 200, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 240, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Frost crystals
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI * 2 * i) / 6 + gameTime;
          ctx.beginPath();
          ctx.moveTo(h.x, h.y);
          ctx.lineTo(h.x + Math.cos(a) * h.radius, h.y + Math.sin(a) * h.radius);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        break;
      }
      case 'fire': {
        const flicker = h.radius + Math.sin(gameTime * 15) * 4;
        ctx.fillStyle = 'rgba(255, 100, 20, 0.6)';
        ctx.shadowColor = '#FF4400';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(h.x, h.y, flicker, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
      case 'blackhole': {
        // Dark center with purple event horizon
        const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.3, 'rgba(30,0,50,0.8)');
        grad.addColorStop(0.7, 'rgba(80,0,120,0.3)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fill();
        // Accretion disk
        ctx.strokeStyle = 'rgba(180, 100, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius * 0.8, h.radius * 0.2, gameTime, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'lightning': {
        // Jagged bolt
        ctx.strokeStyle = '#FFFF88';
        ctx.shadowColor = '#FFFF00';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y - h.radius);
        let lx = h.x, ly = h.y - h.radius;
        for (let j = 0; j < 4; j++) {
          lx += (Math.random() - 0.5) * 40;
          ly += h.radius / 4;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        break;
      }
      case 'wind': {
        // Gust lines
        ctx.strokeStyle = 'rgba(200,220,255,0.3)';
        ctx.lineWidth = 1;
        for (let j = 0; j < 5; j++) {
          const wy = h.y - h.radius + j * h.radius * 0.4;
          ctx.beginPath();
          ctx.moveTo(h.x - h.radius, wy);
          ctx.lineTo(h.x + h.radius, wy + (Math.sin(gameTime * 3 + j) * 20));
          ctx.stroke();
        }
        break;
      }
      case 'flood': {
        // Blue wave
        ctx.fillStyle = 'rgba(20, 100, 200, 0.25)';
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, h.radius, h.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'overgrowth': {
        // Green vine-like growth
        ctx.strokeStyle = 'rgba(50, 200, 50, 0.7)';
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          const a = gameTime * 2 + j * Math.PI * 0.7;
          ctx.beginPath();
          ctx.arc(h.x + Math.cos(a) * h.radius * 0.5, h.y + Math.sin(a) * h.radius * 0.5, h.radius * 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'mirror': {
        // Glowing duplicate indicator
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'vortex': {
        // Spiral
        ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 4; a += 0.2) {
          const r = (a / (Math.PI * 4)) * h.radius;
          ctx.lineTo(h.x + Math.cos(a + gameTime * 2) * r, h.y + Math.sin(a + gameTime * 2) * r);
        }
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}
