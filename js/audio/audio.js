/**
 * Audio Feedback — Web Audio API generated sounds.
 * All oscillators tracked for instant cleanup. Crash-safe.
 */
let audioCtx = null;
let muted = false;
let audioCrashed = false;
const activeOscs = [];
const activeTimers = [];
function getCtx() {
    if (audioCrashed)
        return null;
    if (!audioCtx) {
        try {
            audioCtx = new AudioContext();
        }
        catch {
            audioCrashed = true;
            return null;
        }
    }
    if (audioCtx.state === 'suspended')
        audioCtx.resume().catch(() => { });
    return audioCtx;
}
export function isMuted() { return muted || audioCrashed; }
export function toggleMute() { muted = !muted; return muted; }
export function setMuted(m) { muted = m; }
export function unlockAudio() { if (audioCtx?.state === 'suspended')
    audioCtx.resume().catch(() => { }); }
/** Kill every oscillator, timer, and the audio context. Call on game over / crash. */
export function killAllAudio() {
    for (const o of activeOscs) {
        try {
            o.stop();
            o.disconnect();
        }
        catch { /* */ }
    }
    activeOscs.length = 0;
    for (const t of activeTimers)
        clearTimeout(t);
    activeTimers.length = 0;
    stopPulse();
    if (audioCtx) {
        try {
            audioCtx.close();
        }
        catch { /* */ }
        audioCtx = null;
    }
    audioCrashed = false;
}
function safeTimeout(fn, ms) {
    const t = setTimeout(() => {
        const i = activeTimers.indexOf(t);
        if (i >= 0)
            activeTimers.splice(i, 1);
        fn();
    }, ms);
    activeTimers.push(t);
}
function playTone(freq, dur, type = 'sine', vol = 0.10) {
    if (muted || audioCrashed)
        return;
    const c = getCtx();
    if (!c) {
        audioCrashed = true;
        return;
    }
    try {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.value = Math.max(20, Math.min(freq, 8000));
        gain.gain.setValueAtTime(vol, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        osc.connect(gain);
        gain.connect(c.destination);
        activeOscs.push(osc);
        osc.start(c.currentTime);
        osc.stop(c.currentTime + dur);
        osc.onended = () => {
            const i = activeOscs.indexOf(osc);
            if (i >= 0)
                activeOscs.splice(i, 1);
            try {
                osc.disconnect();
                gain.disconnect();
            }
            catch { /* */ }
        };
    }
    catch {
        audioCrashed = true;
        killAllAudio();
    }
}
export function playHitSound(combo) { playTone(Math.min(400 + combo * 15, 1200), 0.12, 'sine', 0.10); }
export function playPerfectSound(combo) {
    const f = Math.min(600 + combo * 20, 1600);
    playTone(f, 0.10, 'triangle', 0.08);
    safeTimeout(() => playTone(Math.min(f * 1.5, 2400), 0.08, 'sine', 0.04), 50);
}
export function playMissSound() { playTone(80, 0.15, 'sawtooth', 0.05); }
export function playTabooWarning() { playTone(120, 0.25, 'sine', 0.03); }
export function playComboMilestone(m) {
    const n = [523, 659, 784, 1047];
    const c = m >= 100 ? 4 : m >= 50 ? 3 : 2;
    for (let i = 0; i < c; i++)
        safeTimeout(() => playTone(n[i], 0.15, 'triangle', 0.08), i * 80);
}
export function playPatternSound(p) {
    const notes = { seed_of_life: [523, 659, 784, 1047, 1319], vesica_piscis: [440, 554, 659], metatrons_cube: [262, 330, 392, 523, 659, 784, 1047] };
    (notes[p] ?? [523, 659, 784]).forEach((n, i) => safeTimeout(() => playTone(n, 0.25, 'triangle', 0.06), i * 100));
}
export function playLevelUpSound() {
    [523, 659, 784, 1047, 1319].forEach((n, i) => safeTimeout(() => playTone(n, 0.2, 'triangle', 0.08), i * 120));
}
export function playGameOverSound() {
    [440, 370, 330, 262].forEach((n, i) => safeTimeout(() => playTone(n, 0.35, 'sawtooth', 0.04), i * 200));
}
let pulseInterval = null;
export function startPulse(ms = 800) {
    stopPulse();
    pulseInterval = setInterval(() => { if (!muted && !audioCrashed && audioCtx?.state === 'running')
        playTone(60, 0.04, 'sine', 0.015); }, ms);
}
export function stopPulse() { if (pulseInterval) {
    clearInterval(pulseInterval);
    pulseInterval = null;
} }
//# sourceMappingURL=audio.js.map