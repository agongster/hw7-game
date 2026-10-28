// Whole-screen drawing: skies, title and end screens, the in-game HUD, tips and overlays.
// The level itself is drawn by render.js.

const INTRO_MS = 3600;   // how long the level title card stays up
const FADE_MS = 700;     // fade-in after changing screen or level

const SKIES = {
  title: ["#241d45", "#5e4b8c", "#ebb4c2"],
  end: ["#120d24", "#40295e", "#d991b2"],
};

const CONTROLS_FOOTER = "R restart  ·  H hints  ·  M sound  ·  Esc menu";

// Text helper. Options: size, weight, color, align, baseline, alpha, spacing (px), glow (css colour).
function drawText(ctx, str, x, y, opts = {}) {
  const { size = 16, weight = 500, color = COLORS.text, align = "center", baseline = "middle", alpha = 1, spacing = 0, glow } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.6;
  }
  ctx.fillText(str, x, y);
  ctx.restore();
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// 0 -> 1 -> 0 over `total` ms: fades in over `fade` ms, holds, then fades out.
function envelope(elapsed, total, fade = 400) {
  if (elapsed < 0 || elapsed > total) return 0;
  return Math.min(1, elapsed / fade, (total - elapsed) / fade);
}

function drawSky(ctx, colors, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.55, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // A soft glow low on the horizon.
  const r = ctx.createRadialGradient(w / 2, h * 0.95, 0, w / 2, h * 0.95, Math.max(w, h) * 0.65);
  r.addColorStop(0, "rgba(255, 240, 230, 0.22)");
  r.addColorStop(1, "rgba(255, 240, 230, 0)");
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, w, h);
}

// ---------- Themed backgrounds ----------
// Shared by both halves and drawn behind the level. Positions come from hash() (render.js)
// so the scenery is the same every frame; only slow drifts depend on time.

// A silhouette band along the bottom: `peak(i)` gives the height of feature i (0..1).
function drawSilhouette(ctx, w, h, baseY, color, count, drift, shape) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  const step = w / count;
  // Scroll by `drift` pixels: shift whole features past the edge (k) plus a sub-step offset,
  // keying each feature's shape on its own index so it doesn't change as it scrolls.
  const k = Math.floor(drift / step);
  const offset = drift - k * step;
  ctx.lineTo(-step + offset, baseY);
  for (let i = -1; i <= count + 1; i++) {
    shape(ctx, i * step + offset, baseY, step, hash(i - k, count));
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

function drawMeadowScenery(ctx, w, h, now) {
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.8, 0, w * 0.5, h * 0.8, h * 0.45);
  sun.addColorStop(0, "rgba(255, 236, 200, 0.55)");
  sun.addColorStop(1, "rgba(255, 236, 200, 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 6; i++) {
    const x = ((hash(i, 1) * w + now * (0.004 + hash(i, 2) * 0.006)) % (w + 300)) - 150;
    const y = h * (0.1 + hash(i, 3) * 0.35);
    const k = 0.6 + hash(i, 4) * 0.8;
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    for (const [ox, oy, rx] of [[0, 0, 60], [45, 8, 45], [-45, 10, 40], [15, -18, 38]]) {
      ctx.beginPath();
      ctx.ellipse(x + ox * k, y + oy * k, rx * k, rx * 0.55 * k, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const hill = (c, x, y, step, r) => c.quadraticCurveTo(x + step / 2, y - 40 - r * 60, x + step, y);
  drawSilhouette(ctx, w, h, h * 0.84, "rgba(255, 214, 226, 0.35)", 4, now * 0.002, hill);
  drawSilhouette(ctx, w, h, h * 0.93, "rgba(180, 222, 186, 0.4)", 5, -now * 0.004, hill);
}

function drawForestScenery(ctx, w, h, now) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const x = w * (0.1 + i * 0.27) + Math.sin(now / 4000 + i) * 20;
    const g = ctx.createLinearGradient(x, 0, x + h * 0.4, h);
    g.addColorStop(0, "rgba(220, 255, 240, 0.1)");
    g.addColorStop(1, "rgba(220, 255, 240, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 60 + h * 0.4, h);
    ctx.lineTo(x + h * 0.4 - 40, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const pine = (c, x, y, step, r) => {
    const top = y - 60 - r * 90;
    c.lineTo(x + step * 0.2, y);
    c.lineTo(x + step * 0.5, top);
    c.lineTo(x + step * 0.8, y);
    c.lineTo(x + step, y);
  };
  drawSilhouette(ctx, w, h, h * 0.86, "rgba(40, 90, 100, 0.35)", 11, now * 0.002, pine);
  drawSilhouette(ctx, w, h, h * 0.95, "rgba(20, 55, 70, 0.45)", 8, -now * 0.003, pine);

  for (let i = 0; i < 3; i++) {
    const y = h * (0.55 + i * 0.13) + Math.sin(now / 3000 + i) * 10;
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, "rgba(235, 250, 250, 0)");
    g.addColorStop(0.5, "rgba(235, 250, 250, 0.12)");
    g.addColorStop(1, "rgba(235, 250, 250, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 30, w, 60);
  }
}

// Static parts of a background, drawn once per screen size into an offscreen canvas.
const layerCache = new Map();
function cachedLayer(name, w, h, draw) {
  const k = `${name}:${w}x${h}`;
  if (!layerCache.has(k)) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    layerCache.set(k, c);
  }
  return layerCache.get(k);
}

function drawNebulae(ctx, w, h) {
  for (const [fx, fy, r, color] of [[0.25, 0.3, 0.45, "255, 120, 200"], [0.75, 0.55, 0.5, "110, 160, 255"], [0.5, 0.15, 0.35, "180, 120, 255"]]) {
    const g = ctx.createRadialGradient(w * fx, h * fy, 0, w * fx, h * fy, Math.max(w, h) * r);
    g.addColorStop(0, `rgba(${color}, 0.16)`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawCosmosScenery(ctx, w, h, now) {
  // Large soft gradients are expensive, so the nebulae are drawn once and reused.
  ctx.drawImage(cachedLayer("nebulae", w, h, drawNebulae), 0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 160; i++) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(now / (900 + hash(i, 5) * 1500) + i));
    ctx.fillStyle = `rgba(255, 255, 255, ${a * (0.4 + hash(i, 6) * 0.6)})`;
    ctx.fillRect(hash(i, 7) * w, hash(i, 8) * h, 1 + hash(i, 9) * 1.5, 1 + hash(i, 9) * 1.5);
  }
  // A shooting star every six seconds, somewhere new each time.
  const cycle = Math.floor(now / 6000);
  const t = (now % 6000) / 700;
  if (t < 1) {
    const sx = w * (0.2 + hash(cycle, 1) * 0.6);
    const sy = h * (0.05 + hash(cycle, 2) * 0.3);
    const ex = sx + 220 * t;
    const ey = sy + 90 * t;
    const g = ctx.createLinearGradient(ex - 120, ey - 50, ex, ey);
    g.addColorStop(0, "rgba(255, 255, 255, 0)");
    g.addColorStop(1, `rgba(255, 255, 255, ${0.9 * (1 - t)})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex - 120, ey - 50);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
  ctx.restore();

  // A ringed planet low on the left, a small moon high on the right.
  const pr = Math.min(w, h) * 0.09;
  const px = w * 0.12;
  const py = h * 0.8;
  // The ring's far half goes behind the planet and its near half in front.
  const ring = (from, to) => {
    ctx.strokeStyle = "rgba(255, 225, 240, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(px, py, pr * 1.9, pr * 0.45, -0.3, from, to);
    ctx.stroke();
  };
  ring(Math.PI, Math.PI * 2);
  const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, 0, px, py, pr);
  pg.addColorStop(0, "#f6c9e8");
  pg.addColorStop(1, "#6b3f9e");
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ring(0, Math.PI);
  const mg = ctx.createRadialGradient(w * 0.9 - 6, h * 0.14 - 6, 0, w * 0.9, h * 0.14, pr * 0.35);
  mg.addColorStop(0, "#e9f6ff");
  mg.addColorStop(1, "#7aa6d8");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(w * 0.9, h * 0.14, pr * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

const SCENERY = { meadow: drawMeadowScenery, forest: drawForestScenery, cosmos: drawCosmosScenery };

// The game's emblem: a warm sun and a cool moon. overlap 0 = apart, 1 = moon fully over the sun.
function drawEclipse(ctx, cx, cy, r, overlap) {
  const sep = r * 2.3 * (1 - overlap);
  const sunX = cx - sep / 2;
  const moonX = cx + sep / 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const corona = ctx.createRadialGradient(sunX, cy, r * 0.8, sunX, cy, r * (3 + overlap));
  corona.addColorStop(0, `rgba(255, 200, 150, ${0.45 + 0.35 * overlap})`);
  corona.addColorStop(1, "rgba(255, 200, 150, 0)");
  ctx.fillStyle = corona;
  ctx.fillRect(sunX - r * 4, cy - r * 4, r * 8, r * 8);
  const moonGlow = ctx.createRadialGradient(moonX, cy, r * 0.8, moonX, cy, r * 2.4);
  moonGlow.addColorStop(0, "rgba(160, 210, 250, 0.35)");
  moonGlow.addColorStop(1, "rgba(160, 210, 250, 0)");
  ctx.fillStyle = moonGlow;
  ctx.fillRect(moonX - r * 3, cy - r * 3, r * 6, r * 6);
  ctx.restore();

  const sun = ctx.createRadialGradient(sunX - r * 0.3, cy - r * 0.3, 0, sunX, cy, r);
  sun.addColorStop(0, "#fff6e4");
  sun.addColorStop(1, CHARACTER_STYLES.sol.color);
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // The moon darkens as it covers the sun, like a real eclipse.
  const moon = ctx.createRadialGradient(moonX - r * 0.3, cy - r * 0.3, 0, moonX, cy, r);
  moon.addColorStop(0, overlap > 0.9 ? "#3a2f5c" : "#eef8ff");
  moon.addColorStop(1, overlap > 0.9 ? "#231a3d" : CHARACTER_STYLES.luna.color);
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(moonX, cy, r * 0.98, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Title screen ----------

function drawPlayerCard(ctx, playerIndex, x, y, w, h, now) {
  const p = PLAYERS[playerIndex];
  const style = CHARACTER_STYLES[p.id];
  roundedRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();

  drawFigure(ctx, p.id, x + 42, y + 78, 62, playerIndex === 0 ? 1 : -1, 0, now);
  const tx = x + 84;
  drawText(ctx, `Player ${playerIndex + 1}  ·  ${p.name}`, tx, y + 28, { size: 18, weight: 700, color: style.color, align: "left" });
  const rows = [
    ["Move", playerIndex === 0 ? "W  A  S  D" : "↑  ←  ↓  →"],
    ["Turn view", ROTATE_LABELS[playerIndex]],
    ["Zoom", `${ZOOM_LABELS[playerIndex]}  or scroll`],
    ["Gift", p.pressesPlates ? "Holds down pressure plates" : "Walks on mist"],
  ];
  rows.forEach(([label, value], i) => {
    const ry = y + 62 + i * 26;
    drawText(ctx, label, tx, ry, { size: 13, color: COLORS.dimText, align: "left" });
    drawText(ctx, value, tx + 74, ry, { size: 14, weight: 700, align: "left" });
  });
}

function drawTitle(ctx, game, now) {
  const { w, h } = game.size;
  drawSky(ctx, SKIES.title, w, h);
  drawCosmosScenery(ctx, w, h, now);
  drawMotes(ctx, w, h, "cosmos");

  const r = Math.min(w, h) * 0.055;
  drawEclipse(ctx, w / 2, h * 0.17, r, 0.35 + 0.25 * Math.sin(now / 1800));

  const titleSize = Math.min(78, w * 0.09);
  drawText(ctx, "ECLIPSE", w / 2, h * 0.32, { size: titleSize, weight: 300, spacing: titleSize * 0.25, glow: "rgba(255, 220, 240, 0.9)" });
  drawText(ctx, "A two-player puzzle about seeing the same world differently", w / 2, h * 0.32 + titleSize * 0.75, { size: 16, color: COLORS.dimText });

  const cardW = Math.min(330, w * 0.42);
  const cardH = 166;
  const cardY = h * 0.45;
  drawPlayerCard(ctx, 0, w / 2 - cardW - 12, cardY, cardW, cardH, now);
  drawPlayerCard(ctx, 1, w / 2 + 12, cardY, cardW, cardH, now);

  const lines = [
    "You each turn your own half of the world.",
    "A gap from one angle can be a path from another, and it only opens in the view that found it.",
    "Lend each other your gifts, and guide both travellers to their glowing rings.",
  ];
  lines.forEach((line, i) => drawText(ctx, line, w / 2, cardY + cardH + 36 + i * 24, { size: 15, color: COLORS.dimText }));

  const pulse = 0.75 + 0.25 * Math.sin(now / 500);
  drawText(ctx, "Press Enter to begin", w / 2, h * 0.88, { size: 22, weight: 600, alpha: pulse, glow: "rgba(255, 255, 255, 0.8)" });
  drawText(ctx, CONTROLS_FOOTER, w / 2, h - 22, { size: 13, color: COLORS.dimText });
}

// ---------- End screen ----------

function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function drawEnd(ctx, game, now) {
  const { w, h } = game.size;
  drawSky(ctx, SKIES.end, w, h);
  drawCosmosScenery(ctx, w, h, now);
  drawMotes(ctx, w, h, "cosmos");

  // The moon slides over the sun during the first few seconds.
  const t = Math.min(1, (now - game.screenSince) / 3000);
  drawEclipse(ctx, w / 2, h * 0.3, Math.min(w, h) * 0.08, easeInOut(t));

  drawText(ctx, "The sun and moon meet.", w / 2, h * 0.52, { size: Math.min(40, w * 0.05), weight: 300, spacing: 2, glow: "rgba(255, 220, 240, 0.8)" });
  drawText(ctx, "You finished Eclipse together.", w / 2, h * 0.52 + 44, { size: 18, color: COLORS.dimText });
  const { finishedMs, falls } = game.stats;
  drawText(ctx, `Time ${formatDuration(finishedMs)}   ·   ${falls} ${falls === 1 ? "fall" : "falls"}`, w / 2, h * 0.52 + 80, { size: 16, weight: 600 });

  const pulse = 0.75 + 0.25 * Math.sin(now / 500);
  drawText(ctx, "Press Enter to return to the title", w / 2, h * 0.86, { size: 20, weight: 600, alpha: pulse });
}

// ---------- Playing ----------

// Player name and level at top-left; a dial showing the view's rotation at top-right.
function drawHud(ctx, game, playerIndex, x0, w, now) {
  const { world, anims } = game;
  const p = PLAYERS[playerIndex];
  const style = CHARACTER_STYLES[p.id];

  drawText(ctx, `P${playerIndex + 1}  ·  ${p.name}`, x0 + 22, 28, { size: 18, weight: 700, color: style.color, align: "left", glow: rgba(style.glow, 0.6) });
  drawText(ctx, `Level ${world.levelIndex + 1} of ${LEVELS.length}  ·  ${world.level.name}`, x0 + 22, 52, { size: 13, color: COLORS.dimText, align: "left" });

  const cx = x0 + w - 44;
  const cy = 40;
  const r = 18;
  const angle = viewAngle(anims, world, p.view, now);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4));
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  const a = (angle * Math.PI) / 2 - Math.PI / 2;
  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
  ctx.lineTo(cx + Math.cos(a + 2.5) * 5, cy + Math.sin(a + 2.5) * 5);
  ctx.lineTo(cx + Math.cos(a - 2.5) * 5, cy + Math.sin(a - 2.5) * 5);
  ctx.closePath();
  ctx.fill();
  const zoom = game.cameras[p.view].target;
  const zoomText = Math.abs(zoom - 1) < 0.01 ? "" : `  ·  ×${zoom.toFixed(1)}`;
  drawText(ctx, `${world.rotations[p.view] * 90}°${zoomText}`, cx - r - 10, cy - 7, { size: 14, weight: 700, align: "right" });
  drawText(ctx, `${ROTATE_LABELS[playerIndex]} turn  ·  ${ZOOM_LABELS[playerIndex]} zoom`, cx - r - 10, cy + 10, { size: 12, color: COLORS.dimText, align: "right" });
}

// The tutorial or tip line at the bottom of a player's half.
function drawTip(ctx, game, playerIndex, x0, w, h) {
  const tip = tipFor(game.world, game.progress, playerIndex);
  if (!tip) return;
  const style = CHARACTER_STYLES[PLAYERS[playerIndex].id];
  ctx.font = `600 15px ${FONT}`;
  const textW = Math.min(ctx.measureText(tip).width, w - 80);
  const pillW = textW + 44;
  const x = x0 + (w - pillW) / 2;
  const y = h - 92;
  roundedRect(ctx, x, y, pillW, 36, 18);
  ctx.fillStyle = "rgba(25, 18, 50, 0.45)";
  ctx.fill();
  ctx.strokeStyle = rgba(style.glow, 0.5);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.arc(x + 18, y + 18, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 28, y, textW + 6, 36);
  ctx.clip();
  drawText(ctx, tip, x + 30, y + 19, { size: 15, weight: 600, align: "left" });
  ctx.restore();
}

// A translucent band across the middle of the screen with a title and a smaller line.
function drawBanner(ctx, w, y, alpha, title, subtitle, titleSize = 34) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(25, 18, 50, 0)");
  g.addColorStop(0.5, "rgba(25, 18, 50, 0.55)");
  g.addColorStop(1, "rgba(25, 18, 50, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 52, w, 104);
  drawText(ctx, title, w / 2, y - 10, { size: titleSize, weight: 300, spacing: 2, glow: "rgba(255, 230, 240, 0.8)" });
  if (subtitle) drawText(ctx, subtitle, w / 2, y + 26, { size: 15, color: COLORS.dimText });
  ctx.restore();
}

function drawPlay(ctx, game, now) {
  const { w, h } = game.size;
  const { world, anims } = game;
  const half = w / 2;
  const busy = game.completeSince || isFalling(anims, now);

  drawSky(ctx, world.level.sky, w, h);
  SCENERY[world.level.theme](ctx, w, h, now);
  drawMotes(ctx, w, h, world.level.theme);
  drawView(ctx, game, 0, 0, half, h, now, game.showHints && !busy);
  drawView(ctx, game, 1, half, half, h, now, game.showHints && !busy);

  // Divider: a thin line of light, fading at both ends.
  const d = ctx.createLinearGradient(0, 0, 0, h);
  d.addColorStop(0, "rgba(255, 255, 255, 0)");
  d.addColorStop(0.5, "rgba(255, 255, 255, 0.6)");
  d.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = d;
  ctx.fillRect(half - 1, 0, 2, h);

  for (let i = 0; i < 2; i++) {
    drawHud(ctx, game, i, i * half, half, now);
    if (game.showHints && !busy) drawTip(ctx, game, i, i * half, half, h);
  }
  drawText(ctx, game.showHints ? CONTROLS_FOOTER : `Hints off  ·  ${CONTROLS_FOOTER}`, w / 2, h - 24, { size: 12, color: COLORS.dimText });

  const flash = fallFlash(anims, now);
  if (flash > 0) {
    ctx.fillStyle = rgba(COLORS.fall, 0.3 * flash);
    ctx.fillRect(0, 0, w, h);
    const who = PLAYERS.find((p) => p.id === anims.fall.id).name;
    drawBanner(ctx, w, h * 0.5, Math.min(1, flash * 3), `${who} fell`, `${game.fallReason}  Restarting…`, 30);
  }

  const sinceLevel = now - game.levelSince;
  drawBanner(ctx, w, h * 0.2, envelope(sinceLevel, INTRO_MS, 500),
    `Level ${world.levelIndex + 1}  ·  ${world.level.name}`, world.level.intro);

  if (game.completeSince) {
    const t = now - game.completeSince;
    const alpha = Math.min(1, t / 400);
    drawEclipse(ctx, w / 2, h * 0.5 - 100, 26, easeInOut(Math.min(1, t / 1400)));
    const last = world.levelIndex === LEVELS.length - 1;
    drawBanner(ctx, w, h * 0.5, alpha, "Level Complete", last ? "The last light aligns…" : `Next: ${LEVELS[world.levelIndex + 1].name}`);
  }
}

// ---------- Frame ----------

function drawFrame(ctx, game, now) {
  if (game.screen === "title") drawTitle(ctx, game, now);
  else if (game.screen === "end") drawEnd(ctx, game, now);
  else drawPlay(ctx, game, now);

  const fade = 1 - Math.min(1, (now - game.screenSince) / FADE_MS);
  if (fade > 0) {
    ctx.fillStyle = `rgba(18, 13, 36, ${fade})`;
    ctx.fillRect(0, 0, game.size.w, game.size.h);
  }
}
