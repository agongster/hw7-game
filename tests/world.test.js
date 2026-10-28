// Rule tests for src/world.js and src/tutorial.js, using small fixture levels so they
// don't break when the real levels change. Run from the repo root: node tests/world.test.js
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const ctx = vm.createContext({ console });
for (const f of ["levels.js", "world.js", "input.js", "tutorial.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8"), ctx);
}

vm.runInContext(`
let fails = 0;
function check(name, cond) {
  if (!cond) fails++;
  console.log(cond ? "ok  " : "FAIL", name);
}
// Screen direction that means world direction w when the view is rotated k steps.
const s = (w, k) => (w + k) % 4;
const N = 0, E = 1, S = 2, W = 3;

// Row 0: ground (0..2) at h0, gap at 3, h1 tiles at 4..5. Pillar (h1) at (1,1). Tree at (2,1).
// Stairs at (0,2) climbing east to (1,2) at h1. Connection (2,0)->(4,0) at 90°.
const BASIC = {
  name: "basic",
  tiles: [...rect(0, 0, 2, 1, 0), [1, 1, 1], ...rect(4, 0, 5, 0, 1), [0, 2, 0], [1, 2, 1]],
  stairs: [[0, 2, E]],
  decor: [["tree", 2, 1], ["flowers", 0, 0]],
  start: { sol: [0, 0], luna: [0, 1] },
  exits: { sol: [5, 0], luna: [4, 0] },
  connections: [{ from: [2, 0], to: [4, 0], rotation: 90 }],
};
// Plate at (0,0) raises bridge (1,2); mist at (2,2).
const ABILITIES = {
  name: "abilities",
  tiles: [...rect(0, 0, 2, 0, 0), [0, 2, 0], [2, 2, 0], [3, 2, 0]],
  mist: [[2, 2]],
  plates: [{ at: [0, 0], bridge: [[1, 2, 0]] }],
  start: { sol: [1, 0], luna: [0, 2] },
  exits: { sol: [2, 0], luna: [3, 2] },
  connections: [],
};
let w;
const put = (id, x, y) => Object.assign(w.chars[id], { x, y });

// Movement and rotation
w = createWorld(-1, BASIC);
check("step east", tryMove(w, 0, s(E, 0)).result === "moved" && w.chars.sol.x === 1);
check("pillar (different height) blocks", tryMove(w, 0, s(S, 0)).result === "blocked" && w.chars.sol.y === 0);
check("failed move still turns the character", w.chars.sol.facing === S);
check("walking into empty space falls", tryMove(w, 0, s(N, 0)).result === "fell" && w.chars.sol.y === 0);
put("sol", 2, 0);
check("solid scenery blocks", tryMove(w, 0, s(S, 0)).result === "blocked");
put("sol", 0, 1);
check("decorative scenery doesn't block", previewMove(w, 0, s(N, 0)).result === "moved");
rotateView(w, 0, 1);
check("rotation is per view", w.rotations[0] === 1 && w.rotations[1] === 0);
for (let i = 0; i < 3; i++) rotateView(w, 0, 1);
check("four turns return to 0", w.rotations[0] === 0);

// Illusion connections
w = createWorld(-1, BASIC);
put("sol", 2, 0);
check("connection inactive at 0° -> fall", previewMove(w, 0, s(E, 0)).result === "fell");
w.rotations[1] = 1;
check("partner's rotation doesn't open my connection", previewMove(w, 0, s(E, 0)).result === "fell");
w.rotations[0] = 1;
check("connection active at 90°", tryMove(w, 0, s(E, 1)).result === "jumped" && w.chars.sol.x === 4);
check("connections work both ways", previewMove(w, 0, s(W, 1)).result === "jumped");

// Stairs
w = createWorld(-1, BASIC);
put("sol", 0, 2);
check("stairs climb one unit in their direction", tryMove(w, 0, s(E, 0)).result === "moved" && w.chars.sol.x === 1);
check("and back down", tryMove(w, 0, s(W, 0)).result === "moved" && w.chars.sol.x === 0);
check("characters stand halfway up stairs", standHeight(w, 0, 2) === 0.5);

// Abilities
w = createWorld(-1, ABILITIES);
check("no bridge without Sol on the plate", tileAt(w, 1, 2) === undefined);
put("luna", 0, 0);
check("Luna on a plate does nothing", tileAt(w, 1, 2) === undefined && activePlates(w).length === 0);
put("luna", 0, 2); put("sol", 0, 0);
check("Sol on the plate raises the bridge", tileAt(w, 1, 2).kind === "bridge");
check("Luna can walk onto the bridge", tryMove(w, 1, s(E, 0)).result === "moved" && w.chars.luna.x === 1);
put("sol", 1, 0);
check("Sol leaving the plate strands Luna", strandedCharacters(w).join() === "luna");
put("sol", 0, 0);
check("Luna can walk onto mist", tryMove(w, 1, s(E, 0)).result === "moved" && w.chars.luna.x === 2);
put("sol", 1, 2);
check("Sol is stopped by mist, not dropped", tryMove(w, 0, s(E, 0)).result === "mist" && w.chars.sol.x === 1);
put("sol", 2, 0); put("luna", 3, 2);
check("win needs both on their exits", isWon(w));

// Tips
w = createWorld(0);
const prog = newProgress();
check("tutorial asks P1 to move first", tipFor(w, prog, 0).includes("W A S D"));
prog.moved[0] = true;
check("then to rotate", tipFor(w, prog, 0).includes("Q / E"));
w = createWorld(-1, ABILITIES);
put("sol", 0, 0); put("luna", 1, 2);
check("Sol warned while Luna is on the bridge", tipFor(w, newProgress(), 0).startsWith("Hold still"));
check("no unfilled placeholders", !tipFor(w, newProgress(), 1).includes("{"));

console.log(fails ? fails + " failures" : "all passed");
`, ctx);
