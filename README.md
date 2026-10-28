# Eclipse

A two-player co-op puzzle game on one keyboard. Each player rotates (and zooms) their own half of a split screen, and paths that are impassable from one angle connect from another. Sol can hold down pressure plates that raise bridges, and Luna can walk on mist. Both have to reach their glowing rings, through a dawn meadow, a misty forest and finally the cosmos. See [SPEC.md](SPEC.md) for the full design and the acceptance criteria.

## Running it

Open `index.html` in a browser. There's no build step, no server and no dependencies. The Quicksand font loads from Google Fonts when you're online, and the game falls back to system fonts offline. Sound starts after the first Enter press, because browsers block audio until a key is pressed.

Tests (need Node):

```
node tests/world.test.js    # rules, abilities and tips
node tests/levels.test.js   # every level can be solved and needs its mechanics (search-based solver)
```

## Controls

| Action           | Player 1 (Sol, warm, left half) | Player 2 (Luna, cool, right half) |
|------------------|---------------------------------|-----------------------------------|
| Move             | W A S D                         | Arrow keys                        |
| Rotate view      | Q / E                           | , / .                             |
| Zoom out / in    | Z / X, or scroll over your half | [ / ], or scroll over your half   |
| Start / continue | Enter (or Space)                | Enter (or Space)                  |
| Restart level    | R                               | R                                 |
| Hints on/off     | H                               | H                                 |
| Sound on/off     | M                               | M                                 |
| Back to title    | Esc                             | Esc                               |

## What players see

- **Title screen:** the eclipse emblem, both players' controls and gifts, three lines on how to play, and "Press Enter to begin".
- **Level title card:** each level opens with its name and a one-line idea, e.g. "Sol's weight raises bridges. Luna is light enough to walk on mist."
- **Tutorial and tips:** a tip bar at the bottom of each half. On Level 1 it walks each player through moving, then rotating. After that it reacts to the situation, in [src/tutorial.js](src/tutorial.js):
  - "Hold still! Luna is on your bridge."
  - "Mist can't hold you. Only Luna can cross it."
  - "A hidden path connects from this angle…"
  - Otherwise it falls back to the level's own tip.
- **Key labels** around your own character show where each key goes:
  - **White:** a normal step.
  - **Gold:** crosses a hidden path.
  - **Red:** walks off the edge.
  - **Grey:** blocked by a height difference.
  - **Pale blue:** mist your character can't walk on.

  H hides the labels and tips.
- **HUD:** each half shows the player's name, the level, and a small dial with the view's current angle, zoom level and keys.
- **Zoom:** each player zooms their own half, from ×0.7 to ×2.8. As a view zooms in, its camera eases from the level's centre toward that player's own character, so you never zoom away from yourself. Zoom resets on each new level.
- **Feedback:**
  - A soft "bump" when a move is blocked.
  - A plate glows and its bridge rises (a dashed outline shows where it will appear).
  - Hidden-path ends twinkle until you find the right angle.
  - When someone falls, their half shakes, the screen flashes red, and a banner says why, e.g. "The bridge vanished when Sol left the plate."
  - Finishing a level shows a small eclipse and the next level's name, and the motes of light rush upward.
- **End screen:** the moon slides over the sun, with the total time and number of falls. Enter returns to the title.
- **Themes:** each level has its own look.

  | Level | Theme | Platforms | Scenery | Background | Particles |
  |-------|-------|-----------|---------|------------|-----------|
  | 1 · First Light | Meadow at dawn | Grassy tops, clay sides | Trees, blossom trees, a rock, flowers, grass | Low sun, drifting clouds, rolling hills | Pollen |
  | 2 · Mist and Stone | Misty forest | Mossy tops, stone sides | Pines, a boulder, glowing mushrooms, grass | Light shafts, fog, layered pine silhouettes | Blinking fireflies |
  | 3 · Eclipse | Cosmos | Deep violet tops with twinkling stars, glowing edges | Crystals, a rune monolith, floating ringed orbs, stardust | Nebulae, starfield, a ringed planet, shooting stars | Stardust |

  In the cosmos, mist is drawn as violet stardust; the rules are the same.
- **Art and sound:**
  - A pastel gradient sky per level, and drifting motes of light.
  - Floating columns that fade into the sky, shimmering mist, light beams over the exits, and small robed figures with halos (a sun crown for Sol, a crescent for Luna).
  - Synthesized sound effects with no audio files: steps, rotations, plates, crossings, falls and chimes.

## Status against SPEC.md acceptance criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Title screen with controls; Enter starts Level 1 | Done |
| 2 | Split screen with divider | Done |
| 3 | Same level in both halves, distinct characters | Done |
| 4 | Player label and level number per half | Done (plus the view-angle dial) |
| 5 | WASD / arrows, relative to each view | Done (see Known Issues, item 1) |
| 6 | Simultaneous input | Done |
| 7 | Height differences block movement | Done |
| 8 | Glide between tiles (≈0.15 s); input ignored meanwhile | Done |
| 9 | Independent rotation | Done |
| 10 | Four presses return to start | Done |
| 11 | Illusion connections need the owner's rotation | Done |
| 12 | Rotation animates ≈0.3 s; only that player is locked | Done |
| 13 | Sol on a plate raises its bridge; stepping off removes it | Done. If Luna is on the bridge when it vanishes, she falls. Level 3 has two plates. |
| 14 | Luna on a plate does nothing | Done |
| 15 | Luna walks on mist; Sol is blocked without falling | Done |
| 16 | Falling restarts the level | Done (≈1.1 s fall animation first) |
| 17 | R restarts | Done |
| 18 | "Level Complete" ≈2 s, then the next level | Done (2.6 s) |
| 19 | Exactly three levels with the required mechanics | Done, verified by `tests/levels.test.js` |
| 20 | End screen; Enter returns to title | Done |
| 21 | Pastel palette, gradient background, distinct accents | Done |
| 22 | Ambient motion | Done (drifting motes, mist wisps, pulsing exits, breathing characters) |
| 23 | Sounds for rotate, plate and level complete | Done (plus steps, crossings, bumps and falls) |
| 24 | *(Stretch)* Level 4 with a sliding platform | Not started |
| 25 | *(Stretch)* Level select | Not started |

### Beyond the spec

These go past the acceptance criteria:
- **Zoom:** per-view zoom with a camera that follows the player (keys, scroll wheel or trackpad pinch).
- **Stairs:** a staircase tile lets characters climb or descend exactly one unit, in the staircase's direction only.
- **Solid scenery:** trees, pines, rocks, crystals and monoliths block movement, so scenery shapes the paths. Flowers, grass, mushrooms, orbs and stardust are decoration only.
- **Themes:** a meadow, forest and cosmos look per level (see "Themes" above).

### Level solutions (spoilers)

- **1 · First Light (meadow):**
  - Both players weave between the trees to the staircase at the east edge of the meadow and climb to the terrace.
  - Each rotates to 90° and crosses east to the hilltop, then rotates to 180° and crosses south to the garden.
  - Sol's ring is at the garden's north-east corner, and Luna's at the south-east corner.
- **2 · Mist and Stone (forest):**
  - Sol climbs the stairs to the ridge and stops on the plate. Luna crosses the bridge that appears to the mossy island, goes around the boulder and onto the mist, then climbs the stairs to her outcrop.
  - Sol walks to the end of the ridge, rotates to 270° and crosses to his outcrop.
- **3 · Eclipse (cosmos):**
  - Sol climbs the stairs to the upper deck and stands on the first plate (south-east corner). Luna crosses the first bridge to the moon island.
  - Sol walks to the deck's north-east corner, rotates to 90° and crosses to the spire, then goes around the monolith to the second plate.
  - Luna crosses the second bridge onto the stardust, rotates to 180° and crosses north to her ledge.
  - Sol steps back to the middle of the spire's east side, rotates to 270° and crosses to his ledge, then goes around the crystal to his ring.

## Code layout

The scripts are plain `<script>` tags, not ES modules, so the game runs from `file://`. They share globals and load in this order:

| File | Responsibility |
|------|----------------|
| [src/levels.js](src/levels.js) | Level data (`LEVELS`) and the `rect()` helper |
| [src/world.js](src/world.js) | Game rules: tiles, mist, plates and bridges, stairs, solid scenery, movement, rotation, illusion connections, falling, winning. No DOM code. |
| [src/input.js](src/input.js) | Key bindings → actions, plus on-screen key labels |
| [src/animation.js](src/animation.js) | Animation timing (rotations, glides, bumps, plate-bridge fades, falls) and the per-view zoom cameras. The world updates instantly, and this file works out where to *draw* things. |
| [src/tutorial.js](src/tutorial.js) | Chooses each player's tip line. Reads the world and never changes it. |
| [src/audio.js](src/audio.js) | Synthesized sound effects (Web Audio API) |
| [src/effects.js](src/effects.js) | Ambient motes (pollen, fireflies or stardust, by theme) |
| [src/render.js](src/render.js) | Drawing one view of the level: themed tiles, stairs, mist, plates, bridges, exits, scenery sprites, characters, key labels, camera |
| [src/screens.js](src/screens.js) | Whole-screen drawing: skies and themed backgrounds, title and end screens, HUD, tips, banners, fades |
| [src/main.js](src/main.js) | Game state and screen flow (title → play → end), turns key presses into rules + animations + sounds |
| [tests/](tests/) | Node tests; see "Running it" |

### How the rules work

- **Rotation:** each view's rotation is stored as quarter turns (0–3) in `world.rotations[view]`.
- **Directions:** directions are numbered clockwise: 0 = up/north, 1 = right/east, 2 = down/south, 3 = left/west. `screenToWorldDir()` turns a key's *screen* direction into a *world* direction.
- **Tiles:** `tileAt(world, x, y)` returns `{ h, kind, solid, dir }`, where kind is `"ground"`, `"mist"`, `"plate"`, `"stairs"` or `"bridge"`. Bridge tiles only exist while a character with `pressesPlates` (Sol) stands on their plate. `solid` means solid scenery stands there (`SOLID_DECOR` in `world.js`).
- **Stairs:** `heightsConnect()` allows a step between different heights only from a staircase toward its `dir` (up one unit), or onto a staircase from one unit above in the opposite direction. Characters stand halfway up a staircase (`standHeight()`).
- **Moves:** `previewMove()` says what a key would do without changing anything (the key labels and tips use it), and `tryMove()` applies it. In order:
  1. Is an illusion connection active in that direction? Then the character jumps to its far end.
  2. Is there no tile? Then the character falls.
  3. Is it mist, and this character can't walk on mist? Then the result is `"mist"`, a blocked move.
  4. Is there solid scenery, or a height difference that no staircase bridges? Then the move is blocked.
  5. Otherwise, the character moves.
- **Vanishing bridges:** after each move, `strandedCharacters()` finds anyone left standing on nothing (e.g. Luna on a bridge after Sol steps off its plate), and `main.js` makes them fall.
- **Abilities:** these are data on `PLAYERS` (`pressesPlates`, `walksOnMist`), not checks on character ids, so swapping or adding abilities only touches `world.js`.
- **Busy players:** a player's keys are ignored while their own view turns or their character moves (`isPlayerBusy()`). Everyone's keys are ignored during a fall or the "Level Complete" banner.

### Level format

```js
{
  name: "Mist and Stone",
  theme: "forest",                            // "meadow" | "forest" | "cosmos": tiles, background, particles
  intro: "Shown on the level's title card.",
  sky: ["#top", "#middle", "#bottom"],       // background gradient
  tutorial: true,                             // optional: step-by-step move/rotate tips
  tips: { sol: "…", luna: "…" },              // fallback tips; {partner}, {move}, {rotate} are filled in
  tiles: [[x, y, h], ...],                    // one tile per (x, y); later entries override earlier ones
  mist: [[x, y], ...],                        // optional: tiles (already in `tiles`) that are mist
  plates: [{ at: [x, y], bridge: [[x, y, h], ...] }], // optional: bridge tiles are NOT in `tiles`
  stairs: [[x, y, dir], ...],                 // optional: tile (in `tiles`) climbs one unit toward dir (0 N, 1 E, 2 S, 3 W)
  decor: [[type, x, y, ox, oy], ...],         // optional scenery; ox/oy nudge it within the tile (-0.5..0.5)
                                              // solid: tree blossom pine rock crystal monolith
                                              // visual: flowers grass mushroom orb stardust
  start: { sol: [x, y], luna: [x, y] },
  exits: { sol: [x, y], luna: [x, y] },
  connections: [{ from: [x, y], to: [x, y], rotation: 90 }], // ends must share a row or column
}
```

To add a level, append it to `LEVELS`, then add expectations for it in `tests/levels.test.js`. The solver tells you whether it can be completed, and a scenery check makes sure no solid scenery covers a start, exit, plate, staircase or hidden-path end.

To add a scenery type, write a drawer in the "Scenery" section of `render.js`, add it to `DECOR`, and add it to `SOLID_DECOR` in `world.js` if it should block movement.

## Known Issues

1. **Movement keys follow the isometric diagonals, not the screen axes.** "Up" moves up-right on screen, "right" moves down-right, and so on. SPEC.md criterion 5 says each key moves "in the direction it points", and this is the closest an isometric grid can get. The key labels show exactly where each key goes, which should cover most of the confusion, but it still needs playtesting with real people.
2. **Hints can give away solutions.** Red and gold key labels, plus the "A hidden path connects from this angle" tip, reveal part of each puzzle. Players can turn them off with H, but they're on by default. If playtesters find the levels too easy, consider showing gold and red only on Level 1.
3. **The illusion isn't a true optical illusion.** When a connection is active, a golden path fades in across the gap, but the two ends don't actually line up geometrically in that view. Making them line up (the real Monument Valley effect) would take level design where tile heights overlap on screen at that rotation.
4. **Halfway through a rotation, the level looks top-down for a moment.** At 45°, an isometric view of a grid looks like a flat map. That's mathematically correct and lasts about 0.1 s, but it can feel abrupt.
5. **The draw order is approximate.** Everything is sorted by the depth of its centre (painter's algorithm). That's right for flat ground, but tall blocks and tall scenery (crystals, monoliths, trees) can overlap neighbours wrongly at some angles. For example, in Level 3 a crystal can be drawn over a character standing just behind it. If something looks wrong, this is the likely cause; the fix is to sort per face, or to split tall columns into unit cubes.
6. **Scenery is drawn as upright sprites.** Trees, crystals and so on face the screen and don't turn with the view, which is a deliberate stylistic choice. They also can't be walked behind properly (see item 5).
7. **Characters can be hidden behind tall blocks or scenery.** Your own key labels are drawn on top, so you can find your own character, but not always your partner's. Zooming in helps. A fix is to draw a faint silhouette of each character on top of everything.
8. **Zoom can crop your partner or the goal out of view.** At high zoom the camera follows *your* character, so your partner, or a ring across the map, can be off-screen. Zoom out (Z or [) to see the whole level.
9. **Cooperation only goes one way.** Sol helps Luna (plates raise bridges for her), but Luna's gift (mist) never helps Sol. Level design is limited by this: any path Sol can walk, Luna can walk too. A future ability that lets Luna help Sol (e.g. she can rotate a platform, or carry a light that reveals Sol's paths) would make the co-op more mutual.
10. **The background doesn't rotate.** Hills, pines and planets are a shared backdrop for both halves; only the level turns.
11. **Esc goes straight to the title without asking**, and progress in the current level is lost.
12. **Performance needs a watch.** Each frame builds dozens of canvas gradients (tile sides, halos, glows, motes). The cosmos nebulae were so expensive in headless Chrome, which has no GPU, that screenshots stalled. They are now drawn once into an offscreen canvas (`cachedLayer()` in `screens.js`). Other large soft glows could be cached the same way if frame rates drop on slower machines. Nothing has been measured on real hardware.
13. **Testing so far:**
    - `tests/world.test.js` uses small test-only levels to cover the rules, stairs, solid scenery, abilities and tips.
    - `tests/levels.test.js` uses a search-based solver to prove that each level can be solved and that removing any of its mechanics (each connection, each plate, the mist, the stairs) makes it impossible. It also checks that solid scenery never covers anything a player must stand on.
    - A headless-Chrome replay pressed the solver's key sequences through the real game (plus zoom keys), going title → Level 1 → 2 → 3 → end screen with no falls.
    - Screenshots were checked for all three themed levels, a zoomed view and the title.

    **Not yet done:**
    - Nobody has played it with two real people.
    - Nobody has listened to the sounds; headless Chrome has no audio output.
    - It hasn't been run in Safari or Firefox.
    - Scroll-to-zoom hasn't been tried with a real mouse or trackpad.
    - The game hasn't been watched in motion. Every screenshot was a frozen moment.
