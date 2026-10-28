// Level data. Each level is a plain object; see README.md "Level format".
//
// Coordinates: x grows east, y grows south, h is the height of the tile's top.
// Only one tile per (x, y) column. Directions: 0 = north, 1 = east, 2 = south, 3 = west.

// Every (x, y) in the rectangle [x0..x1] x [y0..y1], all at height h.
function rect(x0, y0, x1, y1, h) {
  const tiles = [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) tiles.push([x, y, h]);
  }
  return tiles;
}

const LEVELS = [
  {
    name: "First Light",
    theme: "meadow",
    intro: "Paths that look broken can connect from the right angle.",
    sky: ["#3b3a78", "#9b7fc0", "#ffc9b5"],
    tutorial: true, // step-by-step move/rotate/zoom tips (see tutorial.js)
    tips: {
      sol: "Each gap opens from a different angle. Keep turning your view.",
      luna: "Each gap opens from a different angle. Keep turning your view.",
    },
    // Meadow (h0) -> stairs -> terrace (h1) -> gap -> hilltop (h3) -> gap -> garden (h2).
    // Each gap is an illusion connection needing a different rotation.
    tiles: [
      ...rect(0, 2, 2, 5, 0),   // starting meadow
      [3, 3, 0],                // stairs up to the terrace
      ...rect(4, 1, 5, 4, 1),   // terrace
      ...rect(7, 1, 8, 3, 3),   // hilltop
      ...rect(7, 5, 9, 6, 2),   // exit garden
    ],
    stairs: [[3, 3, 1]],
    decor: [
      ["tree", 1, 3], ["blossom", 0, 4],
      ["flowers", 0, 2, 0.3, -0.3], ["grass", 2, 5, 0.3, 0.3], ["flowers", 2, 2, 0.3, -0.25],
      ["tree", 5, 1], ["rock", 4, 1], ["flowers", 4, 4, -0.3, 0.3], ["grass", 5, 4, 0.3, 0.25],
      ["blossom", 7, 1], ["flowers", 8, 1, 0.25, -0.3], ["grass", 7, 2, -0.3, 0],
      ["tree", 7, 6], ["flowers", 9, 5, 0.3, -0.3], ["flowers", 8, 6, 0, 0.32], ["grass", 7, 5, -0.3, -0.3],
    ],
    start: { sol: [0, 2], luna: [0, 5] },
    exits: { sol: [9, 5], luna: [9, 6] },
    connections: [
      { from: [5, 3], to: [7, 3], rotation: 90 },
      { from: [8, 3], to: [8, 5], rotation: 180 },
    ],
  },
  {
    name: "Mist and Stone",
    theme: "forest",
    intro: "Sol's weight raises bridges. Luna is light enough to walk on mist.",
    sky: ["#16304a", "#3f6f88", "#bfe0d8"],
    tips: {
      sol: "Stand on the round plate to raise a bridge for {partner}.",
      luna: "Wait for {partner}'s bridge, then cross the mist.",
    },
    // Sol climbs to the ridge and holds the plate; Luna needs the bridge, then the mist.
    // Sol leaves by an illusion (270°); Luna climbs stairs to her ring.
    tiles: [
      ...rect(0, 0, 2, 1, 0),   // Sol's clearing
      [3, 0, 0],                // stairs up to the ridge
      ...rect(4, 0, 7, 0, 1),   // ridge (plate at 6,0)
      ...rect(9, 0, 10, 2, 1),  // Sol's outcrop
      ...rect(0, 4, 1, 6, 0),   // Luna's hollow
      ...rect(4, 4, 5, 6, 0),   // mossy island
      [6, 6, 0], [7, 6, 0],     // mist
      [8, 6, 0],                // stairs up to Luna's outcrop
      ...rect(9, 4, 10, 6, 1),  // Luna's outcrop
    ],
    mist: [[6, 6], [7, 6]],
    stairs: [[3, 0, 1], [8, 6, 1]],
    plates: [{ at: [6, 0], bridge: [[2, 5, 0], [3, 5, 0]] }],
    decor: [
      ["pine", 1, 1], ["mushroom", 0, 1, -0.3, 0.3], ["grass", 2, 0, 0.3, -0.3],
      ["mushroom", 4, 0, 0, -0.32], ["grass", 7, 0, 0.3, -0.3],
      ["pine", 10, 0], ["mushroom", 10, 2, 0.3, 0.3],
      ["pine", 0, 6], ["grass", 1, 4, 0.3, -0.3], ["mushroom", 1, 6, 0.3, 0.3],
      ["rock", 5, 4], ["mushroom", 4, 6, -0.3, 0.3], ["grass", 4, 4, -0.3, -0.3],
      ["pine", 10, 6], ["mushroom", 10, 4, 0.32, 0],
    ],
    start: { sol: [0, 0], luna: [0, 4] },
    exits: { sol: [9, 2], luna: [9, 4] },
    connections: [{ from: [7, 0], to: [9, 0], rotation: 270 }],
  },
  {
    name: "Eclipse",
    theme: "cosmos",
    intro: "Everything you've learned, among the stars. Talk to each other.",
    sky: ["#07061a", "#2a1650", "#7a3f86"],
    tips: {
      sol: "Two plates, two bridges. {partner} needs you at both, in the right order.",
      luna: "Your path needs {partner}'s help twice, the stardust, and the right angle.",
    },
    // Sol: stairs -> upper deck (plate 1) -> illusion (90°) -> spire (plate 2) -> illusion (270°) -> Sol's ledge.
    // Luna: bridge 1 -> moon island -> bridge 2 -> stardust (mist) -> illusion (180°) -> Luna's ledge.
    tiles: [
      ...rect(0, 3, 1, 4, 0),   // launch pad
      [1, 2, 0],                // stairs up to the upper deck
      ...rect(0, 0, 2, 1, 1),   // upper deck (plate 1 at 2,1)
      ...rect(4, 0, 5, 2, 2),   // spire (plate 2 at 5,2)
      ...rect(7, 0, 9, 1, 2),   // Sol's ledge
      ...rect(4, 4, 5, 5, 0),   // moon island
      [8, 5, 0], [9, 5, 0],     // stardust (mist)
      ...rect(8, 2, 9, 3, 1),   // Luna's ledge
    ],
    mist: [[8, 5], [9, 5]],
    stairs: [[1, 2, 0]],
    plates: [
      { at: [2, 1], bridge: [[2, 4, 0], [3, 4, 0]] },
      { at: [5, 2], bridge: [[6, 5, 0], [7, 5, 0]] },
    ],
    decor: [
      ["stardust", 0, 3, -0.3, -0.3], ["orb", 1, 4, 0.3, 0.3],
      ["crystal", 0, 0], ["stardust", 1, 0, 0, -0.3],
      ["crystal", 5, 0], ["monolith", 4, 2], ["stardust", 4, 1, -0.3, 0],
      ["crystal", 8, 0], ["orb", 7, 0, -0.3, -0.3], ["stardust", 9, 1, 0.3, 0.3],
      ["orb", 5, 5, 0.3, 0.3], ["stardust", 4, 4, -0.3, -0.3],
      ["crystal", 9, 2], ["stardust", 8, 3, -0.3, 0.3],
    ],
    start: { sol: [0, 3], luna: [0, 4] },
    exits: { sol: [9, 0], luna: [8, 2] },
    connections: [
      { from: [2, 0], to: [4, 0], rotation: 90 },
      { from: [5, 1], to: [7, 1], rotation: 270 },
      { from: [9, 5], to: [9, 3], rotation: 180 },
    ],
  },
];
