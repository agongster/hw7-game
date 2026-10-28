// Drawing one view of the level: isometric projection into one half of the screen.
// Positions and angles come from animation.js so motion is drawn smoothly.
// Whole-screen drawing (backgrounds, HUD, menus) lives in screens.js.

const FONT = '"Quicksand", "Avenir Next", "Segoe UI", sans-serif';

// Colours written as "r, g, b" are used with varying alpha via rgba().
const COLORS = {
  text: "#ffffff",
  dimText: "rgba(255, 255, 255, 0.72)",
  bridgeTop: "#fff1d6",
  bridgeGhost: "255, 226, 160",
  plate: "#e3cfae",
  plateLit: "#ffd98a",
  illusion: "255, 222, 140",
  fall: "255, 90, 90",
};

const CHARACTER_STYLES = {
  sol: { color: "#ffa76b", light: "#ffe0c4", glow: "255, 167, 107" },
  luna: { color: "#8fcff2", light: "#e6f6ff", glow: "143, 207, 242" },
};

// Per-level look of the platforms. `left`/`right` are side-face shades; `speckle` dots
// the tops (grass seeds, moss, or stars); `mist` tints mist tiles (stardust in the cosmos).
const THEMES = {
  meadow: { top: "#e6f3d2", edge: "rgba(255, 255, 255, 0.7)", left: "236, 208, 198", right: "210, 178, 180", speckle: "rgba(120, 175, 110, 0.45)", mist: "205, 228, 255" },
  forest: { top: "#cfe6da", edge: "rgba(235, 255, 245, 0.6)", left: "166, 186, 200", right: "132, 154, 174", speckle: "rgba(70, 125, 100, 0.45)", mist: "220, 240, 244" },
  cosmos: { top: "#3e3274", edge: "rgba(170, 225, 255, 0.85)", left: "96, 76, 166", right: "66, 50, 128", speckle: "rgba(255, 255, 255, 0.9)", mist: "210, 175, 255" },
};

function themeOf(world) {
  return THEMES[world.level.theme] || THEMES.meadow;
}

// Deterministic pseudo-random number in [0, 1) for a tile, so decorations don't flicker.
function hash(x, y, i = 0) {
  const v = Math.sin(x * 127.1 + y * 311.7 + i * 74.7) * 43758.5453;
  return v - Math.floor(v);
}

// Key-hint badge colours, by previewMove() result.
const HINT_STYLES = {
  moved: { fill: "rgba(255, 255, 255, 0.92)", text: "#3a2f5c" },
  jumped: { fill: "#ffd166", text: "#3a2f5c" },
  blocked: { fill: "rgba(255, 255, 255, 0.25)", text: "rgba(255, 255, 255, 0.75)" },
  mist: { fill: "rgba(205, 228, 255, 0.35)", text: "rgba(255, 255, 255, 0.85)" },
  fell: { fill: "rgba(255, 110, 110, 0.85)", text: "#ffffff" },
};

// Columns are drawn down to this height and fade out, so platforms seem to float.
const BASE_HEIGHT = -2.5;

function rgba(triple, alpha) {
  return `rgba(${triple}, ${alpha})`;
}

// Rotates a grid point around the level centre by `angle` quarter turns clockwise.
// `angle` may be fractional while a rotation is animating.
function rotatePoint(x, y, angle, cx, cy) {
  const a = (angle * Math.PI) / 2;
  const dx = x - cx;
  const dy = y - cy;
  return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)];
}

// Size of one tile on screen, chosen so the whole level fits in one half.
function tileMetrics(level, halfW, h) {
  const points = [...level.tiles, ...(level.plates || []).flatMap((p) => p.bridge)];
  const xs = points.map((t) => t[0]);
  const ys = points.map((t) => t[1]);
  const spanX = Math.max(...xs) - Math.min(...xs) + 1;
  const spanY = Math.max(...ys) - Math.min(...ys) + 1;
  // A level is at most hypot(spanX, spanY) tiles across at any angle, including mid-rotation.
  const tw = Math.min(70, (0.8 * halfW) / Math.hypot(spanX, spanY), h / 7);
  return {
    tw,
    th: tw / 2,
    hz: tw * 0.35, // pixels per unit of height
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

// Screen position of the centre of a tile's top face, relative to the view centre.
function project(x, y, h, angle, m) {
  const [rx, ry] = rotatePoint(x, y, angle, m.cx, m.cy);
  return {
    sx: ((rx - ry) * m.tw) / 2,
    sy: ((rx + ry) * m.th) / 2 - h * m.hz,
    depth: rx + ry, // larger = closer to the viewer
  };
}

// Outline of the world-space rectangle [x0..x1] x [y0..y1] at height h. Mid-rotation it's
// no longer an axis-aligned diamond, so the four corners are projected individually.
function rectPath(ctx, x0, y0, x1, y1, h, angle, m) {
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => project(x, y, h, angle, m));
  ctx.beginPath();
  corners.forEach((c, i) => (i ? ctx.lineTo(c.sx, c.sy) : ctx.moveTo(c.sx, c.sy)));
  ctx.closePath();
  return corners;
}

function tilePath(ctx, x, y, h, angle, m, inset = 0) {
  const s = 0.5 - inset;
  return rectPath(ctx, x - s, y - s, x + s, y + s, h, angle, m);
}

// A box from height `bottom` up to `top` over a world rectangle. Side faces fade out
// toward the bottom when `fade` is set, so full-height columns seem to float.
function drawPrism(ctx, [x0, y0, x1, y1], top, bottom, angle, m, theme, topColor, fade) {
  const corners = rectPath(ctx, x0, y0, x1, y1, top, angle, m);
  const centre = project((x0 + x1) / 2, (y0 + y1) / 2, top, angle, m);
  const colH = (top - bottom) * m.hz;

  // Of the four side faces, only the ones facing the viewer (nearer than the centre) show.
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    if ((a.depth + b.depth) / 2 <= centre.depth) continue;
    const shade = (a.sx + b.sx) / 2 > centre.sx ? theme.right : theme.left;
    if (fade) {
      const g = ctx.createLinearGradient(0, Math.min(a.sy, b.sy), 0, Math.max(a.sy, b.sy) + colH);
      g.addColorStop(0, rgba(shade, 1));
      g.addColorStop(0.55, rgba(shade, 0.55));
      g.addColorStop(1, rgba(shade, 0));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = rgba(shade, 1);
    }
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.lineTo(b.sx, b.sy + colH);
    ctx.lineTo(a.sx, a.sy + colH);
    ctx.closePath();
    ctx.fill();
  }

  rectPath(ctx, x0, y0, x1, y1, top, angle, m);
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = theme.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// A floating column: a top face (with a few theme speckles) and fading sides.
function drawBlock(ctx, x, y, h, angle, m, theme, top = theme.top, now = 0) {
  drawPrism(ctx, [x - 0.5, y - 0.5, x + 0.5, y + 0.5], h, BASE_HEIGHT, angle, m, theme, top, true);
  if (top !== theme.top) return;
  for (let i = 0; i < 4; i++) {
    const p = project(x + (hash(x, y, i) - 0.5) * 0.8, y + (hash(y, x, i) - 0.5) * 0.8, h, angle, m);
    ctx.globalAlpha = theme === THEMES.cosmos ? 0.4 + 0.6 * Math.abs(Math.sin(now / 900 + i + x * y)) : 1;
    ctx.fillStyle = theme.speckle;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, Math.max(0.8, m.tw * 0.018), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Stairs: a column at height h with three steps rising one unit toward world direction dir.
function drawStairs(ctx, x, y, h, dir, angle, m, theme) {
  drawBlock(ctx, x, y, h, angle, m, theme);
  // Draw the far steps (taller) first, so nearer steps overlap them correctly from any angle.
  const steps = [0, 1, 2].map((i) => {
    const f = (i + 1) / 3; // this step covers the last (1 - i/3) of the tile toward dir
    const lo = -0.5 + i / 3;
    let r;
    if (dir === 1) r = [x + lo, y - 0.5, x + 0.5, y + 0.5];
    else if (dir === 3) r = [x - 0.5, y - 0.5, x - lo, y + 0.5];
    else if (dir === 2) r = [x - 0.5, y + lo, x + 0.5, y + 0.5];
    else r = [x - 0.5, y - 0.5, x + 0.5, y - lo];
    return { r, top: h + f, depth: project((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, h, angle, m).depth };
  });
  steps.sort((a, b) => a.depth - b.depth);
  for (const st of steps) drawPrism(ctx, st.r, st.top, h, angle, m, theme, theme.top, false);
}

// Mist (stardust in the cosmos): a translucent tile with slow wisps drifting over it.
function drawMist(ctx, x, y, h, angle, m, now, theme) {
  tilePath(ctx, x, y, h, angle, m);
  ctx.fillStyle = rgba(theme.mist, 0.3);
  ctx.fill();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = rgba(theme.mist, 0.65);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  for (let i = 0; i < 3; i++) {
    const phase = now / 1400 + i * 2.1 + x * 1.3 + y * 0.7;
    const p = project(x + 0.22 * Math.sin(phase), y + 0.22 * Math.cos(phase * 0.8), h + 0.15, angle, m);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.16 + 0.1 * Math.sin(phase * 1.7)})`;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, m.tw * 0.24, m.th * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Pressure plate: an inset disc that glows while Sol stands on it.
function drawPlate(ctx, p, lit, m, now) {
  if (lit) {
    const r = m.tw * (0.65 + 0.05 * Math.sin(now / 300));
    const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r);
    g.addColorStop(0, "rgba(255, 217, 138, 0.7)");
    g.addColorStop(1, "rgba(255, 217, 138, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(p.sx - r, p.sy - r, r * 2, r * 2);
  }
  ctx.fillStyle = lit ? COLORS.plateLit : COLORS.plate;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy + (lit ? 1 : 0), m.tw * 0.25, m.th * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// A plate's bridge: a dashed ghost outline while down, a solid warm block while up.
function drawPlateBridge(ctx, x, y, h, angle, m, alpha, theme) {
  if (alpha < 1) {
    tilePath(ctx, x, y, h, angle, m, 0.06);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = rgba(COLORS.bridgeGhost, 0.55 * (1 - alpha));
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (alpha > 0) {
    ctx.save();
    ctx.globalAlpha = alpha;
    drawBlock(ctx, x, y, h - (1 - alpha) * 0.4, angle, m, theme, COLORS.bridgeTop);
    ctx.restore();
  }
}

// Exit: a pulsing ring in the character's colour with a soft beam of light above it.
function drawExit(ctx, p, id, m, now, occupied) {
  const style = CHARACTER_STYLES[id];
  const pulse = 0.5 + 0.5 * Math.sin(now / 600);
  const beamH = m.tw * 2.4;
  const beamW = m.tw * 0.34;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(0, p.sy, 0, p.sy - beamH);
  g.addColorStop(0, rgba(style.glow, (occupied ? 0.55 : 0.3) * (0.75 + 0.25 * pulse)));
  g.addColorStop(1, rgba(style.glow, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, beamW, beamW / 2, 0, 0, Math.PI);
  ctx.lineTo(p.sx - beamW, p.sy - beamH);
  ctx.lineTo(p.sx + beamW, p.sy - beamH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, m.tw * 0.3, m.th * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.5 * (1 - pulse);
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, m.tw * (0.3 + 0.12 * pulse), m.th * (0.3 + 0.12 * pulse), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// A golden path drawn across an active illusion connection.
function drawIllusionCell(ctx, x, y, h, angle, m, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = rgba(COLORS.illusion, 0.9);
  ctx.shadowBlur = 14;
  tilePath(ctx, x, y, h, angle, m, 0.04);
  ctx.fillStyle = rgba(COLORS.illusion, 0.8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 246, 214, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// A faint twinkle marking one end of an illusion connection while it's inactive.
function drawSparkle(ctx, p, m, now, alpha) {
  const r = m.tw * 0.12 * (0.7 + 0.3 * Math.sin(now / 350 + p.sx));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba(COLORS.illusion, 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.sx - r, p.sy - m.th * 0.6);
  ctx.lineTo(p.sx + r, p.sy - m.th * 0.6);
  ctx.moveTo(p.sx, p.sy - m.th * 0.6 - r);
  ctx.lineTo(p.sx, p.sy - m.th * 0.6 + r);
  ctx.stroke();
  ctx.restore();
}

// A small robed figure with a halo. (sx, sy) is the point between its feet; tw is the
// tile width it's sized against; (fx, fy) is the unit screen direction it faces.
function drawFigure(ctx, id, sx, sy, tw, fx, fy, now, alpha = 1) {
  const style = CHARACTER_STYLES[id];
  const bob = Math.sin(now / 450 + (id === "sol" ? 0 : 1.7)) * tw * 0.025;
  const bodyH = tw * 0.36;
  const w = tw * 0.17;
  const r = tw * 0.11;
  const headY = sy - bodyH - r * 0.6 + bob;

  ctx.save();
  ctx.globalAlpha = alpha;

  const halo = ctx.createRadialGradient(sx, headY, 0, sx, headY, tw * 0.75);
  halo.addColorStop(0, rgba(style.glow, 0.45));
  halo.addColorStop(1, rgba(style.glow, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(sx - tw * 0.75, headY - tw * 0.75, tw * 1.5, tw * 1.5);

  ctx.fillStyle = "rgba(40, 20, 60, 0.22)";
  ctx.beginPath();
  ctx.ellipse(sx, sy, w * 1.1, w * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ground arrow showing which way the figure faces.
  ctx.fillStyle = rgba(style.glow, 0.75);
  const tipX = sx + fx * tw * 0.42;
  const tipY = sy + fy * tw * 0.42;
  const baseX = sx + fx * tw * 0.24;
  const baseY = sy + fy * tw * 0.24;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(baseX - fy * tw * 0.08, baseY + fx * tw * 0.04);
  ctx.lineTo(baseX + fy * tw * 0.08, baseY - fx * tw * 0.04);
  ctx.closePath();
  ctx.fill();

  // Robe: a rounded cone.
  const robe = ctx.createLinearGradient(0, sy - bodyH, 0, sy);
  robe.addColorStop(0, style.light);
  robe.addColorStop(1, style.color);
  ctx.fillStyle = robe;
  ctx.beginPath();
  ctx.moveTo(sx - w, sy - 1);
  ctx.quadraticCurveTo(sx, sy + w * 0.45, sx + w, sy - 1);
  ctx.lineTo(sx + w * 0.32, sy - bodyH + bob);
  ctx.lineTo(sx - w * 0.32, sy - bodyH + bob);
  ctx.closePath();
  ctx.fill();

  // Head, with a sun crown for Sol and a crescent for Luna.
  ctx.fillStyle = style.light;
  ctx.beginPath();
  ctx.arc(sx, headY, r, 0, Math.PI * 2);
  ctx.fill();
  if (id === "sol") {
    ctx.strokeStyle = style.color;
    ctx.lineWidth = Math.max(1, tw * 0.02);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * r * 1.25, headY + Math.sin(a) * r * 1.25);
      ctx.lineTo(sx + Math.cos(a) * r * 1.65, headY + Math.sin(a) * r * 1.65);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.arc(sx, headY, r, Math.PI * 0.6, Math.PI * 1.4);
    ctx.arc(sx - r * 0.35, headY, r * 0.75, Math.PI * 1.35, Math.PI * 0.65, true);
    ctx.closePath();
    ctx.fill();
  }

  // Eye, looking the way the figure faces.
  ctx.fillStyle = "#3a2f5c";
  ctx.beginPath();
  ctx.arc(sx + fx * r * 0.5, headY + fy * r * 0.25, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCharacter(ctx, id, pose, facing, angle, m, now, offsetX) {
  const p = project(pose.x, pose.y, pose.h, angle, m);
  const ahead = project(pose.x + DIRS[facing][0], pose.y + DIRS[facing][1], pose.h, angle, m);
  const len = Math.hypot(ahead.sx - p.sx, ahead.sy - p.sy) || 1;
  drawFigure(ctx, id, p.sx + offsetX, p.sy, m.tw, (ahead.sx - p.sx) / len, (ahead.sy - p.sy) / len, now, pose.alpha);
}

// Cells strictly between the ends of an illusion connection, with t = 0..1 along it.
function bridgeCells(conn) {
  const [ax, ay] = conn.from;
  const [bx, by] = conn.to;
  const n = Math.abs(bx - ax) + Math.abs(by - ay);
  const cells = [];
  for (let i = 1; i < n; i++) cells.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, i / n]);
  return cells;
}

// How visible a connection's bridge is: 1 at its rotation, fading to 0 a third of a turn away.
function bridgeAlpha(conn, angle) {
  const target = conn.rotation / 90;
  const d = (((angle - target) % 4) + 4) % 4;
  return Math.max(0, 1 - Math.min(d, 4 - d) * 3);
}

// Small key labels on the tiles around a player's own character, showing where each key goes.
function drawKeyHints(ctx, world, playerIndex, angle, m) {
  const ch = world.chars[PLAYERS[playerIndex].id];
  const h = standHeight(world, ch.x, ch.y);
  const r = Math.max(8, Math.min(16, m.tw * 0.16));
  for (let s = 0; s < 4; s++) {
    const move = previewMove(world, playerIndex, s);
    const p = project(ch.x + DIRS[move.dir][0] * 0.85, ch.y + DIRS[move.dir][1] * 0.85, h, angle, m);
    const style = HINT_STYLES[move.result];
    const y = p.sy - m.th * 0.35;
    ctx.fillStyle = style.fill;
    ctx.shadowColor = "rgba(30, 20, 60, 0.35)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(p.sx, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = style.text;
    ctx.font = `700 ${Math.round(r * 1.15)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(MOVE_LABELS[playerIndex][s], p.sx, y + 1);
  }
}

// Draws the whole level as seen from one view into the rectangle starting at x0.
function drawView(ctx, game, view, x0, w, h, now, showHints) {
  const { world, anims } = game;
  const camera = game.cameras[view];
  const base = tileMetrics(world.level, w, h);
  const m = { ...base, tw: base.tw * camera.zoom, th: base.th * camera.zoom, hz: base.hz * camera.zoom };
  const angle = viewAngle(anims, world, view, now);
  const theme = themeOf(world);
  const items = [];
  const add = (x, y, hgt, layer, draw) => items.push({ depth: project(x, y, hgt, angle, m).depth, layer, draw });

  for (const [k, th] of world.heights) {
    const [x, y] = k.split(",").map(Number);
    const tile = tileAt(world, x, y);
    if (tile.kind === "mist") add(x, y, th, 0, () => drawMist(ctx, x, y, th, angle, m, now, theme));
    else if (tile.kind === "stairs") add(x, y, th, 0, () => drawStairs(ctx, x, y, th, tile.dir, angle, m, theme));
    else add(x, y, th, 0, () => drawBlock(ctx, x, y, th, angle, m, theme, theme.top, now));
    if (tile.kind === "plate") {
      const i = world.plates.findIndex((p) => p.at[0] === x && p.at[1] === y);
      add(x, y, th, 1, () => drawPlate(ctx, project(x, y, th, angle, m), isPlateActive(world, i), m, now));
    }
  }

  world.plates.forEach((plate, i) => {
    const alpha = plateBridgeAlpha(anims, world, i, now);
    for (const [bx, by, bh] of plate.bridge) add(bx, by, bh, 0, () => drawPlateBridge(ctx, bx, by, bh, angle, m, alpha, theme));
  });

  // Scenery is drawn upright (like a sprite) at its spot on the tile, sorted by depth.
  for (const [type, x, y, ox = 0, oy = 0] of world.level.decor || []) {
    const th = heightAt(world, x, y);
    add(x + ox, y + oy, th, 1.5, () => DECOR[type](ctx, project(x + ox, y + oy, th, angle, m), m.tw, now, x * 7 + y * 13));
  }

  for (const c of world.level.connections) {
    const alpha = bridgeAlpha(c, angle);
    const ha = heightAt(world, ...c.from);
    const hb = heightAt(world, ...c.to);
    if (alpha > 0) {
      for (const [x, y, t] of bridgeCells(c)) {
        const bh = ha + (hb - ha) * t;
        add(x, y, bh, 1, () => drawIllusionCell(ctx, x, y, bh, angle, m, alpha));
      }
    }
    if (alpha < 1) {
      for (const [[x, y], eh] of [[c.from, ha], [c.to, hb]]) {
        add(x, y, eh, 1, () => drawSparkle(ctx, project(x, y, eh, angle, m), m, now, 0.6 * (1 - alpha)));
      }
    }
  }

  for (const pl of PLAYERS) {
    const [ex, ey] = world.level.exits[pl.id];
    const eh = heightAt(world, ex, ey);
    add(ex, ey, eh, 1, () => drawExit(ctx, project(ex, ey, eh, angle, m), pl.id, m, now, isOnExit(world, pl.id)));
  }

  // When both characters share a tile, nudge them apart so both stay visible.
  const { sol, luna } = world.chars;
  const shared = sol.x === luna.x && sol.y === luna.y && !anims.fall;
  for (const pl of PLAYERS) {
    const pose = characterPose(anims, world, pl.id, now);
    const offsetX = shared ? (pl.id === "sol" ? -0.2 : 0.2) * m.tw : 0;
    add(pose.x, pose.y, pose.h, 2, () => drawCharacter(ctx, pl.id, pose, world.chars[pl.id].facing, angle, m, now, offsetX));
  }

  // Painter's algorithm: far things first; on the same depth, tiles before decorations before characters.
  items.sort((a, b) => a.depth - b.depth || a.layer - b.layer);

  // Shake the view of the player whose character is falling.
  let shake = 0;
  if (anims.fall && PLAYERS.find((p) => p.id === anims.fall.id).view === view) {
    shake = Math.sin(now / 25) * 8 * fallFlash(anims, now);
  }

  // Camera: as the view zooms in, its centre slides from the level's centre to the player's character.
  const playerIndex = PLAYERS.findIndex((p) => p.view === view);
  const me = characterPose(anims, world, PLAYERS[playerIndex].id, now);
  const follow = cameraFollow(camera);
  const focus = project(m.cx + (me.x - m.cx) * follow, m.cy + (me.y - m.cy) * follow, me.h * follow, angle, m);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, 0, w, h);
  ctx.clip();
  ctx.translate(x0 + w / 2 + shake - focus.sx, h * 0.54 - focus.sy);
  for (const item of items) item.draw();
  if (showHints && !isPlayerBusy(anims, playerIndex, now)) drawKeyHints(ctx, world, playerIndex, angle, m);
  ctx.restore();
}

// ---------- Scenery ----------
// Each drawer gets the screen point of its spot on the tile (p), the tile width (s) to size
// against, the time, and a per-item seed so neighbouring items don't sway in sync.
// Solid types (see SOLID_DECOR in world.js) fill their tile; the rest are small accents.

function drawTree(ctx, p, s, now, seed, leaves) {
  const sway = Math.sin(now / 1100 + seed) * s * 0.025;
  ctx.fillStyle = "#b8938a";
  ctx.fillRect(p.sx - s * 0.04, p.sy - s * 0.42, s * 0.08, s * 0.42);
  const cy = p.sy - s * 0.62;
  for (const [ox, oy, r, c] of [[-0.15, 0.07, 0.2, 0], [0.15, 0.05, 0.19, 1], [0, -0.1, 0.25, 2]]) {
    ctx.fillStyle = leaves[c];
    ctx.beginPath();
    ctx.arc(p.sx + ox * s + sway, cy + oy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.beginPath();
  ctx.arc(p.sx - s * 0.07 + sway, cy - s * 0.17, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function drawPine(ctx, p, s, now, seed) {
  const sway = Math.sin(now / 1300 + seed) * s * 0.02;
  ctx.fillStyle = "#8a7066";
  ctx.fillRect(p.sx - s * 0.035, p.sy - s * 0.2, s * 0.07, s * 0.2);
  ["#6fa896", "#86bba8", "#9fcfbd"].forEach((color, i) => {
    const base = p.sy - s * (0.15 + i * 0.22);
    const half = s * (0.24 - i * 0.05);
    const lean = sway * (i + 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p.sx - half, base);
    ctx.lineTo(p.sx + half, base);
    ctx.lineTo(p.sx + lean, base - s * 0.34);
    ctx.closePath();
    ctx.fill();
  });
}

function drawRock(ctx, p, s) {
  const g = ctx.createLinearGradient(0, p.sy - s * 0.35, 0, p.sy);
  g.addColorStop(0, "#e4dcee");
  g.addColorStop(1, "#a99cbe");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(p.sx - s * 0.28, p.sy);
  ctx.bezierCurveTo(p.sx - s * 0.32, p.sy - s * 0.3, p.sx - s * 0.05, p.sy - s * 0.42, p.sx + s * 0.1, p.sy - s * 0.32);
  ctx.bezierCurveTo(p.sx + s * 0.3, p.sy - s * 0.22, p.sx + s * 0.3, p.sy - s * 0.05, p.sx + s * 0.26, p.sy);
  ctx.closePath();
  ctx.fill();
}

function drawFlowers(ctx, p, s, now, seed) {
  const colors = ["#ffd1dc", "#fff3b0", "#d7c6ff", "#ffffff"];
  for (let i = 0; i < 4; i++) {
    const fx = p.sx + (hash(seed, i) - 0.5) * s * 0.3;
    const fy = p.sy + (hash(i, seed) - 0.5) * s * 0.12;
    const tip = fy - s * (0.08 + hash(seed, i, 2) * 0.06);
    ctx.strokeStyle = "#8fbf86";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.sin(now / 900 + i + seed) * s * 0.015, tip);
    ctx.stroke();
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(fx + Math.sin(now / 900 + i + seed) * s * 0.015, tip, Math.max(1.5, s * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrass(ctx, p, s, now, seed) {
  ctx.strokeStyle = "#94c48a";
  ctx.lineWidth = Math.max(1, s * 0.015);
  for (let i = 0; i < 5; i++) {
    const bx = p.sx + (i - 2) * s * 0.035;
    const bend = Math.sin(now / 800 + seed + i) * s * 0.03 + (i - 2) * s * 0.02;
    ctx.beginPath();
    ctx.moveTo(bx, p.sy);
    ctx.quadraticCurveTo(bx, p.sy - s * 0.1, bx + bend, p.sy - s * (0.13 + (i % 2) * 0.04));
    ctx.stroke();
  }
}

function drawMushroom(ctx, p, s, now, seed) {
  const glow = 0.25 + 0.15 * Math.sin(now / 700 + seed);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(p.sx, p.sy - s * 0.1, 0, p.sx, p.sy - s * 0.1, s * 0.25);
  g.addColorStop(0, `rgba(255, 170, 200, ${glow})`);
  g.addColorStop(1, "rgba(255, 170, 200, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(p.sx - s * 0.25, p.sy - s * 0.35, s * 0.5, s * 0.5);
  ctx.restore();
  ctx.fillStyle = "#fbf3ec";
  ctx.fillRect(p.sx - s * 0.02, p.sy - s * 0.1, s * 0.04, s * 0.1);
  ctx.fillStyle = "#f49ab0";
  ctx.beginPath();
  ctx.arc(p.sx, p.sy - s * 0.1, s * 0.07, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(p.sx - s * 0.025, p.sy - s * 0.13, s * 0.012, 0, Math.PI * 2);
  ctx.arc(p.sx + s * 0.03, p.sy - s * 0.12, s * 0.01, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrystal(ctx, p, s, now, seed) {
  const pulse = 0.5 + 0.5 * Math.sin(now / 800 + seed);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(p.sx, p.sy - s * 0.35, 0, p.sx, p.sy - s * 0.35, s * 0.6);
  g.addColorStop(0, `rgba(140, 220, 255, ${0.25 + 0.2 * pulse})`);
  g.addColorStop(1, "rgba(140, 220, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(p.sx - s * 0.6, p.sy - s * 0.95, s * 1.2, s * 1.2);
  ctx.restore();
  for (const [ox, scale] of [[0.12, 0.6], [-0.04, 1]]) {
    const cx = p.sx + ox * s;
    const fill = ctx.createLinearGradient(0, p.sy - s * 0.8 * scale, 0, p.sy);
    fill.addColorStop(0, "rgba(220, 245, 255, 0.95)");
    fill.addColorStop(1, "rgba(150, 120, 255, 0.85)");
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(cx, p.sy - s * 0.8 * scale);
    ctx.lineTo(cx + s * 0.13 * scale, p.sy - s * 0.38 * scale);
    ctx.lineTo(cx + s * 0.08 * scale, p.sy);
    ctx.lineTo(cx - s * 0.08 * scale, p.sy);
    ctx.lineTo(cx - s * 0.13 * scale, p.sy - s * 0.42 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, p.sy - s * 0.8 * scale);
    ctx.lineTo(cx, p.sy);
    ctx.stroke();
  }
}

function drawMonolith(ctx, p, s, now, seed) {
  const h = s * 0.95;
  ctx.fillStyle = "#231a46";
  ctx.beginPath();
  ctx.moveTo(p.sx - s * 0.13, p.sy);
  ctx.lineTo(p.sx + s * 0.13, p.sy);
  ctx.lineTo(p.sx + s * 0.1, p.sy - h);
  ctx.lineTo(p.sx - s * 0.1, p.sy - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(170, 225, 255, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // Glowing runes that pulse one after another.
  for (let i = 0; i < 3; i++) {
    const a = 0.3 + 0.7 * Math.max(0, Math.sin(now / 500 - i * 0.9 + seed));
    ctx.fillStyle = `rgba(150, 230, 255, ${a})`;
    ctx.fillRect(p.sx - s * 0.035, p.sy - h * (0.3 + i * 0.22), s * 0.07, s * 0.04);
  }
}

function drawOrb(ctx, p, s, now, seed) {
  const cy = p.sy - s * (0.6 + 0.06 * Math.sin(now / 700 + seed));
  const r = s * 0.11;
  const g = ctx.createRadialGradient(p.sx - r * 0.4, cy - r * 0.4, 0, p.sx, cy, r);
  g.addColorStop(0, "#ffe9f4");
  g.addColorStop(1, seed % 2 ? "#c49cff" : "#ff9fc4");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.sx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 240, 220, 0.8)";
  ctx.lineWidth = Math.max(1, s * 0.015);
  ctx.beginPath();
  ctx.ellipse(p.sx, cy, r * 1.8, r * 0.45, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawStardust(ctx, p, s, now, seed) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 4; i++) {
    const a = Math.max(0, Math.sin(now / 600 + i * 1.7 + seed));
    const sx = p.sx + (hash(seed, i) - 0.5) * s * 0.35;
    const sy = p.sy - s * (0.05 + hash(i, seed) * 0.3);
    const r = s * 0.04 * (0.5 + a);
    ctx.strokeStyle = `rgba(255, 245, 255, ${a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - r, sy);
    ctx.lineTo(sx + r, sy);
    ctx.moveTo(sx, sy - r);
    ctx.lineTo(sx, sy + r);
    ctx.stroke();
  }
  ctx.restore();
}

const DECOR = {
  tree: (ctx, p, s, now, seed) => drawTree(ctx, p, s, now, seed, ["#a5d6a0", "#bfe5b2", "#8fc893"]),
  blossom: (ctx, p, s, now, seed) => drawTree(ctx, p, s, now, seed, ["#f6c3d6", "#fde0eb", "#eca7c3"]),
  pine: drawPine,
  rock: drawRock,
  flowers: drawFlowers,
  grass: drawGrass,
  mushroom: drawMushroom,
  crystal: drawCrystal,
  monolith: drawMonolith,
  orb: drawOrb,
  stardust: drawStardust,
};
