# Game Spec: Eclipse

## 1. The Game

**What it is:** A two-player cooperative puzzle game for one keyboard. The levels are built from impossible geometry in the spirit of Monument Valley, and the core mechanic is rotating the level. Each player controls a character with different abilities, and a level is solved only when both of them work together, the way Fireboy & Watergirl does it.

**What the players do:**
- The screen is split down the middle. The left half is Player 1's view of the level and the right half is Player 2's view.
- Both halves show the same level and the same two characters, but each player rotates their own view independently.
- Rotating your view changes which paths connect *for you*. A gap that is impassable from one angle lines up into a walkable path from another.
- Players use their characters' abilities to open the way for each other.
- **Win:** the level is complete when both characters are standing on their own exit tiles at the same time.
- **Fail:** if either character walks off the edge of the level, the level restarts for both players.

**Why it's fun:** It brings together the mind-bending "aha" of a perspective puzzle game and an ethereal art style like Monument Valley's, and it adds a collaborative side that makes it a social experience. Players have to talk to each other, because each one can see connections the other can't.

## 2. Controls

| Action        | Player 1 (left half) | Player 2 (right half) |
|---------------|----------------------|-----------------------|
| Move          | W A S D              | Arrow keys            |
| Rotate view   | Q / E                | , / .                 |
| Restart level | R (either player)    | R (either player)     |

Movement is relative to the player's current view: "up" always moves toward the top of that player's half of the screen.

## 3. Characters & Abilities

| Character        | Player | Ability                                                                                          | Restriction                         |
|------------------|--------|--------------------------------------------------------------------------------------------------|-------------------------------------|
| **Sol** (warm)   | P1     | Standing on a **pressure plate** raises its linked bridge for as long as Sol stays on the plate. | Cannot walk on **mist tiles**.      |
| **Luna** (cool)  | P2     | Can walk on **mist tiles** (translucent tiles).                                                  | Does not trigger pressure plates.   |

## 4. How Rotation Works (implementation model)

So that a stranger can build this without real 3D, rotation is modelled like this:

- A level is a 3D grid of blocks (x, y, height), drawn isometrically.
- Each player's view has a rotation of 0°, 90°, 180° or 270° around the vertical axis. Q/E (or , / .) changes it by 90°.
- Ordinary movement goes between adjacent tiles at the same height.
- **Illusion connections** are listed explicitly in the level data as `{ from: tile, to: tile, rotation: deg }`. A character can move between `from` and `to` only while *their own player's* view is at that rotation. This is how "impossible" paths work.
- A character can't rotate while they're walking between tiles. Rotation only happens while they're standing still.

## 5. Full Intended Feature Set

This is the complete vision. The build is scoped to **about three hours of building with AI coding assistance**. Items marked *(core)* or *(in scope)* fit in that time, items marked *(stretch)* are only for leftover time, and items marked *(out of scope)* won't be built.

- Split-screen view, with each player rotating independently *(core)*
- Illusion connections that only work at certain rotations *(core)*
- Two characters with distinct abilities: pressure plates and mist tiles *(core)*
- A win condition (both on their exits) and falling off restarts the level *(core)*
- Three levels that get harder in sequence, with a "Level Complete" message between them *(core)*
- A title screen showing the controls, and an end screen *(in scope)*
- Smooth rotation and movement animation instead of instant snaps *(in scope)*
- An ethereal art style: soft pastel palette, gradient background, a distinct colour per character *(in scope)*
- Gentle ambient motion, such as floating particles *(in scope)*
- Sound effects for rotating, plates and finishing a level *(in scope)*
- A fourth level built around a new object, a sliding platform *(stretch)*
- A level select screen *(stretch)*
- More interactive objects: rotating cranks, moving staircases *(out of scope)*
- Ambient music and saved progress *(out of scope)*
- Online multiplayer instead of a shared keyboard *(out of scope)*
- A level editor *(out of scope)*

## 6. Acceptance Criteria

Each item can be checked by playing the game or reading the level data. Item numbers match the priority tiers in Section 7.

**Screens & layout**
1. Launching the game shows a title screen with the game's title and both players' controls. Pressing Enter starts Level 1.
2. During play, the screen is split vertically into two halves of equal size, with a visible divider between them.
3. Both halves show the same level, with both characters at their start tiles. Sol and Luna are different colours and easy to tell apart.
4. Each half shows a label for its player (e.g. "P1 · Sol") and the current level number.

**Movement**
5. Player 1 moves Sol one tile at a time with W/A/S/D, and Player 2 moves Luna one tile at a time with the arrow keys. Each key moves the character in the direction it points on that player's own half of the screen.
6. Both players can hold keys at once and both characters respond. Neither player's input blocks the other's.
7. A character cannot move onto a tile at a different height unless an illusion connection allows it.
8. A character glides between tiles over about 0.15 s instead of jumping. A move key pressed during a glide is ignored.

**Rotation**
9. Pressing Q/E rotates only the left view by 90° counter-clockwise/clockwise, and pressing , / . rotates only the right view. The other half does not change.
10. After four presses in the same direction, a view is back at its starting orientation.
11. A character can cross an illusion connection only while their own player's view is at the rotation the connection requires. At any other rotation, the move is blocked.
12. A rotation animates smoothly over about 0.3 s. While it plays, that player's move and rotate keys are ignored, but the other player is unaffected.

**Abilities**
13. While Sol stands on a pressure plate, its linked bridge tiles appear and can be walked on by either character. When Sol steps off, the bridge disappears.
14. When Luna stands on a pressure plate, nothing happens.
15. Luna can walk onto mist tiles. Sol cannot: Sol's move onto a mist tile is blocked, and Sol stays where they are without falling.

**Win / fail / progression**
16. Walking a character off the edge of the level (onto a position with no tile) restarts the level. Both characters go back to their start tiles and both views go back to 0°.
17. Pressing R restarts the current level the same way.
18. When both characters are on their own exit tiles at the same time, a "Level Complete" message appears for about 2 s, and then the next level loads.
19. There are exactly three levels, and each one can be completed:
    - **Level 1** teaches rotation. It has at least one illusion connection and no plates or mist tiles.
    - **Level 2** introduces abilities. It needs Sol to hold a plate for Luna and Luna to cross mist tiles.
    - **Level 3** combines everything. It needs both abilities, and each player has to cross at least one illusion connection.
20. After Level 3, an end screen appears. Pressing Enter returns to the title screen.

**Art & sound**
21. The game uses a consistent soft pastel palette with a gradient background, and each character has a distinct accent colour.
22. The background has subtle, continuous ambient motion, such as drifting particles, that doesn't affect gameplay.
23. A sound plays when a player rotates, presses a plate, and completes a level.

**Stretch content**
24. *(Stretch)* A Level 4 appears after Level 3. It contains a sliding platform that moves back and forth between two tiles every 2 s and carries any character standing on it. Level 4 needs the platform to be completed.
25. *(Stretch)* The title screen has a level select option that lists every level. Choosing one starts that level.

## 7. Priorities

The time budget assumes about three hours with AI coding assistance. The AI can generate code quickly, so most of the real time goes into puzzle design, playtesting and fixing bugs. Leave at least 30 minutes for playing through every level start to finish.

**Must have (≈ first 45 min, without these it's not a game):** 2, 3, 5, 9, 11, 16, 18
One level with split screen, movement, independent rotation, a working illusion connection, falling restarts it, and it can be won.

**Should have (≈ by 1 h 45 min, what makes it *this* game):** 6, 7, 10, 13, 14, 15, 17, 19
The two abilities, simultaneous play, and all three levels designed and playtested.

**Nice to have (≈ by 2 h 30 min, polish):** 1, 4, 8, 12, 20, 21, 22, 23
Title and end screens, the HUD, animation, the pastel art style, ambient motion and sound.

**Stretch (only if everything above passes):** 24, 25
A fourth level with a sliding platform, and level select.

**If time runs short, cut in this order:**
1. Level select (25) and Level 4 (24)
2. Sound (23) and ambient motion (22)
3. Movement glide (8); characters can snap from tile to tile
4. Title and end screens (1, 20); start straight into Level 1 and loop back to it after Level 3
5. Rotation animation (12); an instant snap is fine
6. Art polish (21); flat colours are fine
7. Level 3 (part of 19); two solid levels are better than three broken ones
8. Never cut the illusion connection (11) or the two abilities (13–15). They are the reason the game exists.

## 8. Known Issues / Notes for the Next Developer

