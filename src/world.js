// Game rules: level state, movement, rotation, abilities, stairs, falling and winning.
// No drawing or DOM code here, so this file can be tested on its own.

// World directions, indexed clockwise: 0 = north, 1 = east, 2 = south, 3 = west.
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Which character each player controls, which view (screen half) is theirs, and their abilities.
const PLAYERS = [
  { id: "sol", name: "Sol", view: 0, pressesPlates: true, walksOnMist: false },   // P1, left half
  { id: "luna", name: "Luna", view: 1, pressesPlates: false, walksOnMist: true }, // P2, right half
];

// Scenery that occupies its whole tile and blocks movement. Other decor is purely visual.
const SOLID_DECOR = new Set(["tree", "blossom", "pine", "rock", "crystal", "monolith"]);

function key(x, y) {
  return x + "," + y;
}

// `level` defaults to LEVELS[levelIndex]; tests pass modified copies.
function createWorld(levelIndex, level = LEVELS[levelIndex]) {
  const heights = new Map(); // "x,y" -> h; later entries override earlier ones
  for (const [x, y, h] of level.tiles) heights.set(key(x, y), h);

  const world = {
    levelIndex,
    level,
    heights,
    mist: new Set((level.mist || []).map(([x, y]) => key(x, y))),
    stairs: new Map((level.stairs || []).map(([x, y, dir]) => [key(x, y), dir])),
    solid: new Set((level.decor || []).filter(([type]) => SOLID_DECOR.has(type)).map(([, x, y]) => key(x, y))),
    plates: level.plates || [],
    chars: {},
    rotations: [0, 0],
  };
  resetPositions(world);
  return world;
}

// Put both characters back on their start tiles and both views back to 0°.
function resetPositions(world) {
  for (const p of PLAYERS) {
    const [x, y] = world.level.start[p.id];
    world.chars[p.id] = { x, y, facing: 1 }; // facing is a world direction; start facing east
  }
  world.rotations = [0, 0];
}

// A plate is pressed while a character who can press plates (Sol) stands on it.
function isPlateActive(world, plateIndex) {
  const [x, y] = world.plates[plateIndex].at;
  return PLAYERS.some((p) => p.pressesPlates && world.chars[p.id].x === x && world.chars[p.id].y === y);
}

function activePlates(world) {
  return world.plates.map((_, i) => i).filter((i) => isPlateActive(world, i));
}

// The tile at (x, y) as { h, kind, solid, dir }, or undefined for empty space.
// kind is "ground", "mist", "plate", "stairs" (climbs one unit toward world direction `dir`),
// or "bridge" (exists only while its plate is pressed). solid = blocked by scenery.
function tileAt(world, x, y) {
  const k = key(x, y);
  const h = world.heights.get(k);
  if (h !== undefined) {
    const solid = world.solid.has(k);
    if (world.mist.has(k)) return { h, kind: "mist", solid };
    if (world.stairs.has(k)) return { h, kind: "stairs", dir: world.stairs.get(k), solid };
    if (world.plates.some((p) => p.at[0] === x && p.at[1] === y)) return { h, kind: "plate", solid };
    return { h, kind: "ground", solid };
  }
  for (const i of activePlates(world)) {
    for (const [bx, by, bh] of world.plates[i].bridge) {
      if (bx === x && by === y) return { h: bh, kind: "bridge", solid: false };
    }
  }
  return undefined;
}

function heightAt(world, x, y) {
  const tile = tileAt(world, x, y);
  return tile && tile.h; // undefined = empty space
}

// Height a character's feet are drawn at: halfway up a staircase, otherwise the tile's top.
function standHeight(world, x, y) {
  const tile = tileAt(world, x, y);
  return tile.h + (tile.kind === "stairs" ? 0.5 : 0);
}

// Can a character step from tile `a` to the neighbouring tile `b` in world direction `dir`?
// Same height is always fine; stairs bridge exactly one unit, in their own direction.
function heightsConnect(a, b, dir) {
  if (a.h === b.h) return true;
  if (a.kind === "stairs" && a.dir === dir && b.h === a.h + 1) return true;
  if (b.kind === "stairs" && b.dir === (dir + 2) % 4 && a.h === b.h + 1) return true;
  return false;
}

function canStandOn(player, tile) {
  return tile !== undefined && (tile.kind !== "mist" || player.walksOnMist);
}

// Rotation is stored in 90° steps (0..3). delta = +1 clockwise, -1 counter-clockwise.
function rotateView(world, view, delta) {
  world.rotations[view] = (world.rotations[view] + delta + 4) % 4;
}

// Converts a key press on a player's screen into a world direction.
// Rotating the view clockwise by k steps makes world direction i appear as
// screen direction i + k, so screen direction s is world direction s - k.
function screenToWorldDir(screenDir, rotationSteps) {
  return (screenDir - rotationSteps + 4) % 4;
}

// If an active illusion connection leaves (x, y) in world direction dir,
// returns its far end; otherwise null. Connections work in both directions,
// and the two ends must share a row or column.
function illusionTarget(world, x, y, dir, rotationSteps) {
  for (const c of world.level.connections) {
    if (c.rotation !== rotationSteps * 90) continue;
    for (const [a, b] of [[c.from, c.to], [c.to, c.from]]) {
      if (a[0] !== x || a[1] !== y) continue;
      const dx = Math.sign(b[0] - a[0]);
      const dy = Math.sign(b[1] - a[1]);
      if (dx === DIRS[dir][0] && dy === DIRS[dir][1]) return b;
    }
  }
  return null;
}

// Works out what pressing a screen direction (0..3) would do, without changing anything.
// Returns { result, dir, x, y }, where result is:
//   "moved"   - a normal step
//   "jumped"  - crossed an illusion connection
//   "blocked" - the tile is at a different height (with no stairs) or has solid scenery
//   "mist"    - the tile is mist and this character can't walk on mist
//   "fell"    - there is no tile
// dir is the world direction, and (x, y) is the tile the character would end up on
// (or, when the move fails, the tile they tried to step onto).
function previewMove(world, playerIndex, screenDir) {
  const player = PLAYERS[playerIndex];
  const ch = world.chars[player.id];
  const steps = world.rotations[player.view];
  const dir = screenToWorldDir(screenDir, steps);

  const jump = illusionTarget(world, ch.x, ch.y, dir, steps);
  if (jump) {
    const [x, y] = jump;
    const tile = tileAt(world, x, y);
    if (!tile || tile.solid) return { result: "blocked", dir, x, y };
    if (!canStandOn(player, tile)) return { result: "mist", dir, x, y };
    return { result: "jumped", dir, x, y };
  }

  const x = ch.x + DIRS[dir][0];
  const y = ch.y + DIRS[dir][1];
  const tile = tileAt(world, x, y);
  if (!tile) return { result: "fell", dir, x, y };
  if (!canStandOn(player, tile)) return { result: "mist", dir, x, y };
  if (tile.solid || !heightsConnect(tileAt(world, ch.x, ch.y), tile, dir)) return { result: "blocked", dir, x, y };
  return { result: "moved", dir, x, y };
}

// Moves a player's character one step in a screen direction (0..3) and turns it
// to face that way. Returns the previewMove() result. The caller handles restarting.
function tryMove(world, playerIndex, screenDir) {
  const move = previewMove(world, playerIndex, screenDir);
  const ch = world.chars[PLAYERS[playerIndex].id];
  ch.facing = move.dir;
  if (move.result === "moved" || move.result === "jumped") {
    ch.x = move.x;
    ch.y = move.y;
  }
  return move;
}

// Ids of characters no longer standing on anything, e.g. Luna on a bridge
// after Sol steps off its plate. These characters fall.
function strandedCharacters(world) {
  return PLAYERS
    .filter((p) => !canStandOn(p, tileAt(world, world.chars[p.id].x, world.chars[p.id].y)))
    .map((p) => p.id);
}

function isOnExit(world, id) {
  const [ex, ey] = world.level.exits[id];
  const ch = world.chars[id];
  return ch.x === ex && ch.y === ey;
}

function isWon(world) {
  return PLAYERS.every((p) => isOnExit(world, p.id));
}
