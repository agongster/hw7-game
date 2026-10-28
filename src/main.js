// Entry point: owns the game state and connects input, rules, animation, sound and drawing.
//
// Screens: "title" -> "play" (levels 1..N) -> "end" -> back to "title".

const LEVEL_COMPLETE_MS = 2600;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const game = {
  screen: "title",
  screenSince: 0,       // when the current screen (or level) appeared; drives the fade-in
  world: createWorld(0),
  anims: createAnimations(),
  cameras: createCameras(), // per-view zoom; see animation.js
  progress: newProgress(),
  levelSince: 0,        // drives the level title card
  completeSince: 0,     // non-zero while "Level Complete" shows; input is ignored
  fallReason: "",
  showHints: true,
  stats: { startedAt: 0, falls: 0, finishedMs: 0 },
  size: { w: 0, h: 0 }, // in CSS pixels
};

function setScreen(screen, now) {
  game.screen = screen;
  game.screenSince = now;
}

function loadLevel(index, now) {
  game.world = createWorld(index);
  game.anims = createAnimations();
  game.cameras = createCameras();
  game.progress = newProgress();
  game.levelSince = now;
  game.completeSince = 0;
  setScreen("play", now);
}

function startGame(now) {
  game.stats = { startedAt: now, falls: 0, finishedMs: 0 };
  loadLevel(0, now);
  playSound("start");
}

function restartLevel() {
  resetPositions(game.world);
  game.anims = createAnimations();
}

// Loads the next level, or shows the end screen after the last one.
function advanceLevel(now) {
  const next = game.world.levelIndex + 1;
  if (next < LEVELS.length) {
    loadLevel(next, now);
  } else {
    game.completeSince = 0;
    game.stats.finishedMs = now - game.stats.startedAt;
    setScreen("end", now);
    playSound("finale");
  }
}

function beginFall(id, from, dir, reason, now) {
  startFall(game.anims, id, from, dir, now);
  game.fallReason = reason;
  game.stats.falls++;
  playSound("fall");
}

function handleAction(action) {
  const now = performance.now();
  if (action.toggleMute) {
    toggleMute();
    return;
  }

  if (game.screen === "title") {
    if (action.confirm) {
      unlockAudio(); // browsers only allow sound after a key press
      startGame(now);
    }
    return;
  }
  if (game.screen === "end") {
    if (action.confirm) setScreen("title", now);
    return;
  }

  if (action.menu) {
    setScreen("title", now);
    return;
  }
  if (action.toggleHints) {
    game.showHints = !game.showHints;
    playSound("toggle");
    return;
  }
  // Zooming never affects the rules, so it works even mid-animation.
  if (action.zoom || action.zoomBy) {
    zoomCamera(game.cameras[PLAYERS[action.player].view], action.zoomBy || Math.pow(ZOOM_STEP, action.zoom));
    game.progress.zoomed[action.player] = true;
    return;
  }
  if (game.completeSince || isFalling(game.anims, now)) return;
  if (action.restart) {
    restartLevel();
    return;
  }
  if (action.player === undefined) return;
  // Spec: a player's keys are ignored while their own view turns or their character moves.
  if (isPlayerBusy(game.anims, action.player, now)) return;

  if (action.rotate) {
    const view = PLAYERS[action.player].view;
    startRotation(game.anims, view, game.world.rotations[view], action.rotate, now);
    rotateView(game.world, view, action.rotate);
    game.progress.rotated[action.player] = true;
    playSound("rotate");
  } else if (action.move !== undefined) {
    handleMove(action.player, action.move, now);
  }
}

function handleMove(playerIndex, screenDir, now) {
  const { world, anims } = game;
  const player = PLAYERS[playerIndex];

  // Where everyone stands before the move, for animations and falls.
  const before = {};
  for (const p of PLAYERS) {
    const ch = world.chars[p.id];
    before[p.id] = { x: ch.x, y: ch.y, h: standHeight(world, ch.x, ch.y) };
  }
  const platesBefore = activePlates(world);

  const move = tryMove(world, playerIndex, screenDir);
  game.progress.moved[playerIndex] = true;

  if (move.result === "fell") {
    beginFall(player.id, before[player.id], move.dir, `${player.name} stepped into the void.`, now);
    return;
  }
  if (move.result === "blocked" || move.result === "mist") {
    startBump(anims, player.id, before[player.id], move.dir, now);
    playSound(move.result === "mist" ? "mistBlocked" : "blocked");
    return;
  }

  const ch = world.chars[player.id];
  const landed = tileAt(world, ch.x, ch.y);
  startGlide(anims, player.id, before[player.id], { x: ch.x, y: ch.y, h: standHeight(world, ch.x, ch.y) }, now);
  playSound(move.result === "jumped" ? "jump" : landed.kind === "mist" ? "mistStep" : "step");

  const platesAfter = activePlates(world);
  world.plates.forEach((_, i) => {
    if (platesBefore.includes(i) === platesAfter.includes(i)) return;
    markPlateChanged(anims, i, now);
    playSound(platesAfter.includes(i) ? "plateOn" : "plateOff");
  });

  // Stepping off a plate can pull a bridge out from under the other character.
  const stranded = strandedCharacters(world);
  if (stranded.length > 0) {
    const victim = PLAYERS.find((p) => p.id === stranded[0]);
    beginFall(victim.id, before[victim.id], null, `The bridge vanished when ${player.name} left the plate.`, now);
    return;
  }

  if (isWon(world)) {
    game.completeSince = now;
    playSound("complete");
  }
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  game.size = { w: window.innerWidth, h: window.innerHeight };
  canvas.width = Math.round(game.size.w * dpr);
  canvas.height = Math.round(game.size.h * dpr);
  canvas.style.width = game.size.w + "px";
  canvas.style.height = game.size.h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels; sharp on high-DPI screens
}

let lastFrame = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  updateMotes(game.completeSince ? dt * 6 : dt); // motes rush upward to celebrate
  updateCameras(game.cameras, dt);

  if (game.screen === "play") {
    if (game.completeSince && now - game.completeSince >= LEVEL_COMPLETE_MS) advanceLevel(now);
    else if (game.anims.fall && !isFalling(game.anims, now)) restartLevel();
  }
  drawFrame(ctx, game, now);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
resize();
listenForInput(handleAction);
requestAnimationFrame(frame);
