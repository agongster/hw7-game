// Tutorial and tips: picks the one-line tip shown at the bottom of each player's half.
// Reads the world but never changes it, so it can be tested on its own.

// What each player has done so far on this level; drives the step-by-step tutorial.
function newProgress() {
  return { moved: [false, false], rotated: [false, false], zoomed: [false, false] };
}

// Fills {move}, {rotate} and {partner} placeholders for a player.
function fillTip(text, playerIndex) {
  return text
    .replaceAll("{move}", MOVE_KEYS_TEXT[playerIndex])
    .replaceAll("{rotate}", ROTATE_LABELS[playerIndex])
    .replaceAll("{zoom}", ZOOM_LABELS[playerIndex])
    .replaceAll("{partner}", PLAYERS[1 - playerIndex].name);
}

// The most useful tip for this player right now, in priority order:
// danger first, then tutorial steps, then whatever is next to them, then the level's tip.
function tipFor(world, prog, playerIndex) {
  const p = PLAYERS[playerIndex];
  const partner = PLAYERS[1 - playerIndex];
  const me = world.chars[p.id];
  const them = world.chars[partner.id];
  const here = tileAt(world, me.x, me.y);
  const partnerTile = tileAt(world, them.x, them.y);
  const nearby = DIRS.map(([dx, dy]) => tileAt(world, me.x + dx, me.y + dy));
  const near = (kind) => nearby.some((t) => t && t.kind === kind);

  let tip = null;
  if (p.pressesPlates && here.kind === "plate" && partnerTile && partnerTile.kind === "bridge") {
    tip = "Hold still! {partner} is on your bridge.";
  } else if (here.kind === "bridge") {
    tip = "Keep going. This bridge only lasts while {partner} stays on the plate.";
  } else if (isOnExit(world, p.id)) {
    tip = isOnExit(world, partner.id) ? "" : "You're home. Help {partner} reach their ring.";
  } else if (world.level.tutorial && !prog.moved[playerIndex]) {
    tip = "Move with {move}. The little labels show where each key goes.";
  } else if (world.level.tutorial && !prog.rotated[playerIndex]) {
    tip = "Turn your half of the world with {rotate}.";
  } else {
    // Connections work both ways, so this may lead back the way they came; keep it neutral.
    for (let s = 0; s < 4; s++) {
      if (previewMove(world, playerIndex, s).result === "jumped") {
        tip = `A hidden path connects from this angle. Press ${MOVE_LABELS[playerIndex][s]} to cross it.`;
        break;
      }
    }
  }

  if (tip === null && world.level.tutorial && !prog.zoomed[playerIndex]) {
    tip = "Zoom in with {zoom} (or scroll) to get a closer look.";
  }
  if (tip === null) {
    if (p.pressesPlates && here.kind === "plate") tip = "Your weight holds the bridge up. Wait for {partner} to cross.";
    else if (!p.pressesPlates && here.kind === "plate") tip = "Plates only answer to {partner}'s weight.";
    else if (!p.pressesPlates && activePlates(world).length > 0) tip = "{partner}'s bridge is up. Cross while it lasts!";
    else if (!p.walksOnMist && near("mist")) tip = "Mist can't hold you. Only {partner} can cross it.";
    else if (p.walksOnMist && near("mist")) tip = "Mist feels solid beneath you. Step on through.";
    else tip = (world.level.tips && world.level.tips[p.id]) || "";
  }
  return fillTip(tip, playerIndex);
}
