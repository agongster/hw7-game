// Ambient motes drifting up the screen: pollen in the meadow, fireflies in the forest,
// stardust in the cosmos. Purely decorative: they never affect gameplay.
// Positions are stored as fractions of the screen (0..1) so resizing needs no extra work.

const MOTE_COUNT = 70;
const MOTE_STYLES = {
  meadow: { tints: ["255, 236, 214", "255, 250, 220", "255, 214, 230"], blink: false },
  forest: { tints: ["220, 255, 150", "190, 255, 170"], blink: true },
  cosmos: { tints: ["214, 236, 255", "255, 255, 255", "230, 200, 255"], blink: false },
};

function newMote(anywhere) {
  return {
    x: Math.random(),
    y: anywhere ? Math.random() : 1.05,
    r: 0.6 + Math.random() * 1.8,               // radius in pixels
    speed: 0.006 + Math.random() * 0.018,       // screen heights per second
    phase: Math.random() * Math.PI * 2,         // for sideways sway and twinkle
    tint: Math.random(),                        // picks a colour from the theme's tints
  };
}

const MOTES = Array.from({ length: MOTE_COUNT }, () => newMote(true));

// dt is in seconds; pass a larger dt to make the motes rush upward (used for celebrations).
function updateMotes(dt) {
  for (const m of MOTES) {
    m.y -= m.speed * dt;
    m.phase += dt * 0.7;
    if (m.y < -0.05) Object.assign(m, newMote(false));
  }
}

function drawMotes(ctx, w, h, theme) {
  const style = MOTE_STYLES[theme] || MOTE_STYLES.meadow;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const m of MOTES) {
    const x = (m.x + Math.sin(m.phase) * 0.01) * w;
    const y = m.y * h;
    // Fireflies blink: mostly dark, with short bright pulses.
    const alpha = style.blink ? 0.9 * Math.pow(Math.max(0, Math.sin(m.phase * 2.3)), 3) : 0.25 + 0.25 * Math.sin(m.phase * 1.7);
    const tint = style.tints[Math.floor(m.tint * style.tints.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 4);
    g.addColorStop(0, `rgba(${tint}, ${alpha})`);
    g.addColorStop(1, `rgba(${tint}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - m.r * 4, y - m.r * 4, m.r * 8, m.r * 8);
  }
  ctx.restore();
}
