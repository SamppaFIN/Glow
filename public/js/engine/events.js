/**
 * Random Events — Surprise game modifiers.
 * Triggers periodically to keep gameplay fresh.
 */
export const EVENTS = {
    shape_storm: { type: 'shape_storm', name: 'Shape Storm!', emoji: '🌪️', duration: 0 },
    golden_moment: { type: 'golden_moment', name: 'Golden Moment!', emoji: '✨', duration: 5 },
    slow_motion: { type: 'slow_motion', name: 'Slow Motion', emoji: '🐌', duration: 3 },
    taboo_wave: { type: 'taboo_wave', name: 'Taboo Wave!', emoji: '🚫', duration: 0 },
    bubble_party: { type: 'bubble_party', name: 'Bubble Party!', emoji: '🫧', duration: 3 },
    shape_swap: { type: 'shape_swap', name: 'Shape Swap!', emoji: '🔄', duration: 0 },
    clear_skies: { type: 'clear_skies', name: 'Clear Skies', emoji: '☀️', duration: 0 },
    mystery_box: { type: 'mystery_box', name: 'Mystery Box!', emoji: '🎁', duration: 0 },
};
const ALL_EVENTS = ['shape_storm', 'golden_moment', 'slow_motion', 'taboo_wave', 'bubble_party', 'shape_swap', 'clear_skies'];
export function createEventState() {
    return {
        activeEvent: null,
        eventTimer: 0,
        nextEventTimer: 20 + Math.random() * 20, // First event after 20-40s
        scoreMultiplier: 1,
        pulseMultiplier: 1,
    };
}
export function updateEvents(state, delta) {
    // Tick active event
    if (state.activeEvent) {
        state.eventTimer -= delta;
        if (state.eventTimer <= 0) {
            endEvent(state);
        }
    }
    // Countdown to next event
    if (!state.activeEvent) {
        state.nextEventTimer -= delta;
        if (state.nextEventTimer <= 0) {
            return triggerRandomEvent(state);
        }
    }
    return null;
}
function triggerRandomEvent(state) {
    // Pick random, mystery_box resolves to another random
    let type = ALL_EVENTS[Math.floor(Math.random() * ALL_EVENTS.length)];
    if (type === 'mystery_box') {
        type = ALL_EVENTS[Math.floor(Math.random() * ALL_EVENTS.length)];
    }
    const event = EVENTS[type];
    state.activeEvent = event;
    state.eventTimer = event.duration;
    state.nextEventTimer = 20 + Math.random() * 25; // Next in 20-45s
    // Apply effects
    if (type === 'golden_moment')
        state.scoreMultiplier = 2;
    if (type === 'slow_motion')
        state.pulseMultiplier = 0.4;
    return event;
}
function endEvent(state) {
    state.scoreMultiplier = 1;
    state.pulseMultiplier = 1;
    state.activeEvent = null;
}
/** Apply event effects to shapes */
export function applyEventToShapes(event, shapes, tabooActiveIds) {
    if (!event)
        return;
    switch (event.type) {
        case 'taboo_wave': {
            // Mark 3 random shapes as taboo for 8s
            const candidates = shapes.filter(s => !s.taboo);
            const picked = [...candidates].sort(() => Math.random() - 0.5).slice(0, Math.min(3, candidates.length));
            for (const s of picked) {
                s.taboo = true;
                tabooActiveIds.add(s.id);
            }
            // Clear after 8s
            setTimeout(() => { for (const s of picked) {
                s.taboo = false;
                tabooActiveIds.delete(s.id);
            } }, 8000);
            break;
        }
        case 'clear_skies': {
            for (const s of shapes) {
                s.taboo = false;
            }
            tabooActiveIds.clear();
            break;
        }
        case 'shape_swap': {
            const geos = ['flower', 'seed', 'vesica', 'spiral', 'sri', 'metatron'];
            for (const s of shapes) {
                s.geometry = geos[Math.floor(Math.random() * geos.length)];
            }
            break;
        }
    }
}
//# sourceMappingURL=events.js.map