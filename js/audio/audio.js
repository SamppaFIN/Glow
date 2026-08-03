/**
 * Audio Feedback — Web Audio API generated sounds.
 * Phase 5: No external files, everything synthesized at runtime.
 * Tiny bundle, instant playback, works offline.
 */
let audioCtx = null;
let muted = false;
function ctx() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}
export function isMuted() { return muted; }
export function toggleMute() { muted = !muted; return muted; }
export function setMuted(m) { muted = m; }
/** Resume audio context after user gesture (required by browsers) */
export function unlockAudio() {
    if (audioCtx?.state === 'suspended') {
        audioCtx.resume();
    }
}
// ── Sound generators ──────────────────────────────────────────
function playTone(freq, duration, type = 'sine', volume = 0.15) {
    if (muted)
        return;
    try {
        const c = ctx();
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + duration);
    }
    catch { /* Audio not available */ }
}
/** Rising tone for hits — higher pitch with combo */
export function playHitSound(combo) {
    const baseFreq = 400 + combo * 15; // Rises with combo
    playTone(Math.min(baseFreq, 1200), 0.15, 'sine', 0.12);
}
/** Perfect hit — brighter chime */
export function playPerfectSound(combo) {
    const baseFreq = 600 + combo * 20;
    playTone(Math.min(baseFreq, 1600), 0.12, 'triangle', 0.1);
    // Harmony note
    setTimeout(() => playTone(Math.min(baseFreq * 1.5, 2400), 0.1, 'sine', 0.06), 50);
}
/** Low thud for miss */
export function playMissSound() {
    playTone(80, 0.2, 'sawtooth', 0.08);
}
/** Taboo warning hum */
export function playTabooWarning() {
    playTone(120, 0.3, 'sine', 0.04);
}
/** Combo milestone arpeggio */
export function playComboMilestone(milestone) {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const count = milestone >= 100 ? 4 : milestone >= 50 ? 3 : 2;
    for (let i = 0; i < count; i++) {
        setTimeout(() => playTone(notes[i], 0.2, 'triangle', 0.1), i * 80);
    }
}
/** Secret pattern activation fanfare */
export function playPatternSound(pattern) {
    const notes = {
        seed_of_life: [523, 659, 784, 1047, 1319],
        vesica_piscis: [440, 554, 659],
        metatrons_cube: [262, 330, 392, 523, 659, 784, 1047],
    };
    const seq = notes[pattern] ?? [523, 659, 784];
    for (let i = 0; i < seq.length; i++) {
        setTimeout(() => playTone(seq[i], 0.3, 'triangle', 0.08), i * 100);
    }
}
/** Level-up fanfare */
export function playLevelUpSound() {
    const notes = [523, 659, 784, 1047, 1319];
    for (let i = 0; i < notes.length; i++) {
        setTimeout(() => playTone(notes[i], 0.25, 'triangle', 0.1), i * 120);
    }
}
/** Game over descending tone */
export function playGameOverSound() {
    const notes = [440, 370, 330, 262];
    for (let i = 0; i < notes.length; i++) {
        setTimeout(() => playTone(notes[i], 0.4, 'sawtooth', 0.06), i * 200);
    }
}
/** Background pulse — subtle rhythmic tick */
let pulseInterval = null;
export function startPulse(intervalMs = 800) {
    stopPulse();
    pulseInterval = setInterval(() => {
        if (!muted)
            playTone(60, 0.05, 'sine', 0.02);
    }, intervalMs);
}
export function stopPulse() {
    if (pulseInterval) {
        clearInterval(pulseInterval);
        pulseInterval = null;
    }
}
//# sourceMappingURL=audio.js.map