// Animation timing: rotation turns, movement glides, bumps, plate bridges and falls.
// The world (world.js) always holds the *final* state immediately; this file
// only works out where things should be *drawn* while they catch up.

const ROTATE_MS = 300;
const GLIDE_MS = 150;       // per tile travelled, so illusion jumps take a little longer
const BUMP_MS = 180;        // nudge toward a tile you can't enter
const FALL_MS = 1100;
const PLATE_FADE_MS = 280;  // plate bridges fading in and out

function createAnimations() {
  return {
    views: [null, null], // per view: { from, to, start } in quarter turns
    chars: {},           // per character id: { from, to, start, duration, bumpDir? }
    plates: {},          // per plate index: { since } — when it last turned on or off
    fall: null,          // { id, from: {x, y, h}, dir (null = straight down), start }
  };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function progress(start, duration, now) {
  return Math.min(1, Math.max(0, (now - start) / duration));
}

function startRotation(anims, view, fromSteps, delta, now) {
  anims.views[view] = { from: fromSteps, to: fromSteps + delta, start: now };
}

function startGlide(anims, id, from, to, now) {
  const tiles = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
  anims.chars[id] = { from, to, start: now, duration: GLIDE_MS * Math.max(1, tiles) };
}

function startBump(anims, id, at, dir, now) {
  anims.chars[id] = { from: at, to: at, start: now, duration: BUMP_MS, bumpDir: dir };
}

function startFall(anims, id, from, dir, now) {
  anims.fall = { id, from, dir, start: now };
}

function markPlateChanged(anims, plateIndex, now) {
  anims.plates[plateIndex] = { since: now };
}

function isRotating(anims, view, now) {
  const a = anims.views[view];
  return !!a && now - a.start < ROTATE_MS;
}

function isGliding(anims, id, now) {
  const a = anims.chars[id];
  return !!a && now - a.start < a.duration;
}

function isFalling(anims, now) {
  return !!anims.fall && now - anims.fall.start < FALL_MS;
}

// A player can act only when their view isn't turning and their character isn't moving.
function isPlayerBusy(anims, playerIndex, now) {
  const p = PLAYERS[playerIndex];
  return isRotating(anims, p.view, now) || isGliding(anims, p.id, now);
}

// The view's rotation to draw, in (possibly fractional) quarter turns.
function viewAngle(anims, world, view, now) {
  const a = anims.views[view];
  if (!isRotating(anims, view, now)) return world.rotations[view];
  return a.from + (a.to - a.from) * easeInOut(progress(a.start, ROTATE_MS, now));
}

// 0..1 visibility of a plate's bridge, fading after the plate changes state.
function plateBridgeAlpha(anims, world, plateIndex, now) {
  const on = isPlateActive(world, plateIndex);
  const a = anims.plates[plateIndex];
  if (!a) return on ? 1 : 0;
  const t = progress(a.since, PLATE_FADE_MS, now);
  return on ? t : 1 - t;
}

// Where to draw a character: { x, y, h, alpha }, with fractional x/y/h mid-animation.
function characterPose(anims, world, id, now) {
  const f = anims.fall;
  if (f && f.id === id) {
    // Step out over the edge (unless falling straight down), then drop and fade.
    const t = progress(f.start, FALL_MS, now);
    const out = f.dir === null ? 0 : Math.min(1, t / 0.2);
    const drop = Math.max(0, t - 0.12) / 0.88;
    return {
      x: f.from.x + (f.dir === null ? 0 : DIRS[f.dir][0] * out),
      y: f.from.y + (f.dir === null ? 0 : DIRS[f.dir][1] * out),
      h: f.from.h - 7 * drop * drop,
      alpha: 1 - drop,
    };
  }

  const ch = world.chars[id];
  const h = standHeight(world, ch.x, ch.y);
  const g = anims.chars[id];
  if (!isGliding(anims, id, now)) return { x: ch.x, y: ch.y, h, alpha: 1 };

  const raw = progress(g.start, g.duration, now);
  if (g.bumpDir !== undefined) {
    const s = Math.sin(Math.PI * raw) * 0.16;
    return { x: g.from.x + DIRS[g.bumpDir][0] * s, y: g.from.y + DIRS[g.bumpDir][1] * s, h: g.from.h, alpha: 1 };
  }
  const t = easeInOut(raw);
  return {
    x: g.from.x + (g.to.x - g.from.x) * t,
    y: g.from.y + (g.to.y - g.from.y) * t,
    h: g.from.h + (g.to.h - g.from.h) * t,
    alpha: 1,
  };
}

// 0..1 strength of the red "you fell" flash, strongest at the start of the fall.
function fallFlash(anims, now) {
  if (!isFalling(anims, now)) return 0;
  return 1 - progress(anims.fall.start, FALL_MS, now);
}

// ---------- Cameras (one per view) ----------
// zoom eases toward target; 1 = the whole level fits the half. Zooming in also moves
// the camera toward that player's own character, so they never zoom away from themselves.

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2.8;
const ZOOM_STEP = 1.25; // per key press

function createCameras() {
  return [{ zoom: 1, target: 1 }, { zoom: 1, target: 1 }];
}

function zoomCamera(camera, factor) {
  camera.target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, camera.target * factor));
}

function updateCameras(cameras, dt) {
  for (const c of cameras) c.zoom += (c.target - c.zoom) * (1 - Math.exp(-dt * 10));
}

// 0 at zoom <= 1 (centred on the level), 1 at full zoom (centred on the character).
function cameraFollow(camera) {
  return Math.min(1, Math.max(0, (camera.zoom - 1) / (ZOOM_MAX - 1)));
}
