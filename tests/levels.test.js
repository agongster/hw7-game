// Level design checks: every level can be completed, and each one actually needs
// the mechanics SPEC.md criterion 19 says it needs. Uses a breadth-first search
// over every reachable (Sol, Luna, rotations) state.
// Run from the repo root: node tests/levels.test.js
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const ctx = vm.createContext({ console });
for (const f of ["levels.js", "world.js"]) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8"), ctx);
}

vm.runInContext(`
let fails = 0;
function check(name, cond) {
  if (!cond) fails++;
  console.log(cond ? "ok  " : "FAIL", name);
}

// Shortest number of key presses to win, or -1 if the level can't be won.
function solve(level) {
  const w = createWorld(-1, level);
  const encode = () => [w.chars.sol.x, w.chars.sol.y, w.chars.luna.x, w.chars.luna.y, ...w.rotations].join(",");
  const load = (s) => {
    const [sx, sy, lx, ly, r0, r1] = s.split(",").map(Number);
    Object.assign(w.chars.sol, { x: sx, y: sy });
    Object.assign(w.chars.luna, { x: lx, y: ly });
    w.rotations = [r0, r1];
  };
  const dist = new Map([[encode(), 0]]);
  const queue = [encode()];
  for (let i = 0; i < queue.length; i++) {
    const s = queue[i];
    load(s);
    if (isWon(w)) return dist.get(s);
    const next = [];
    for (let p = 0; p < 2; p++) {
      for (const d of [1, -1]) { load(s); rotateView(w, PLAYERS[p].view, d); next.push(encode()); }
      for (let dir = 0; dir < 4; dir++) {
        load(s);
        const r = tryMove(w, p, dir).result;
        if ((r === "moved" || r === "jumped") && strandedCharacters(w).length === 0) next.push(encode());
      }
    }
    for (const n of next) if (!dist.has(n)) { dist.set(n, dist.get(s) + 1); queue.push(n); }
  }
  return -1;
}

// Copies of a level with one mechanic taken away.
const without = {
  connections: (l) => ({ ...l, connections: [] }),
  connection: (l, i) => ({ ...l, connections: l.connections.filter((_, j) => j !== i) }),
  plates: (l) => ({ ...l, plates: [] }),
  plate: (l, i) => ({ ...l, plates: l.plates.filter((_, j) => j !== i) }),
  stairs: (l) => ({ ...l, stairs: [] }),
  // Mist becomes empty space, so nobody can use it.
  mist: (l) => ({ ...l, mist: [], tiles: l.tiles.filter(([x, y]) => !(l.mist || []).some(([mx, my]) => mx === x && my === y)) }),
};

const [L1, L2, L3] = LEVELS;
check("exactly three levels", LEVELS.length === 3);
for (const [i, l] of LEVELS.entries()) check("level " + (i + 1) + " is solvable (" + solve(l) + " presses)", solve(l) > 0);

check("L1 has no plates or mist", !(L1.plates || []).length && !(L1.mist || []).length);
check("L1 needs its illusion connections", solve(without.connections(L1)) === -1);
check("L1 needs its stairs", solve(without.stairs(L1)) === -1);

check("L2 needs Sol to hold the plate", solve(without.plates(L2)) === -1);
check("L2 needs Luna to cross mist", solve(without.mist(L2)) === -1);
check("L2 needs its illusion connection", solve(without.connections(L2)) === -1);

for (let i = 0; i < L3.plates.length; i++) check("L3 needs plate " + i, solve(without.plate(L3, i)) === -1);
check("L3 needs the mist", solve(without.mist(L3)) === -1);
for (let i = 0; i < L3.connections.length; i++) {
  check("L3 needs connection " + i, solve(without.connection(L3, i)) === -1);
}

// Scenery sits on real tiles, and solid scenery never covers anything a player must stand on.
for (const [i, l] of LEVELS.entries()) {
  const w = createWorld(i);
  const important = [
    ...Object.values(l.start), ...Object.values(l.exits),
    ...(l.plates || []).map((p) => p.at), ...(l.stairs || []),
    ...l.connections.flatMap((c) => [c.from, c.to]),
  ];
  check("L" + (i + 1) + " scenery is on tiles", (l.decor || []).every(([, x, y]) => w.heights.has(key(x, y))));
  check("L" + (i + 1) + " solid scenery is out of the way", important.every(([x, y]) => !w.solid.has(key(x, y))));
}

console.log(fails ? fails + " failures" : "all passed");
`, ctx);
