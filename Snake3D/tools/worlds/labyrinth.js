// Level 55 "Labyrinth": a very hard square level. A square world of 48 x 48: a stone slab of 40 x 40 in a
// frame of void, filled with a maze of walls on both faces. The corridors run on a lattice of four cells
// and are three cells wide: the road down the middle of one, a cell of floor either side, and walls two
// cells out. The road runs through the maze on top, drops into a shaft, runs through a different maze
// underneath, drops into a second shaft and comes home on top.
//   - false turnings: at the road's crossroads blind corridors branch off, one or two lattice steps
//     long, and every one ends in a spike; past every corner the corridor runs on three cells into a
//     dead end, so a missed turn costs no length, but the player must find the way back;
//   - the walls are the whole rest of the slab: nothing but the corridors is open;
//   - long chains along the corridors, '>=' gates between chains.
// Colour style, temple: a gold road over sand corridors, the walls' floor chocolate; underneath violet
// corridors and a lilac road.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to each
// shaft and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 43;
const SHAFTS = [[38, 23], [10, 35]];
g.floor(X0, X0, X1, X1);
for (const [c, r] of SHAFTS) g.hole(c - 1, r - 1, c + 1, r + 1);
const start = [6, 38];
const R = road(g, [...start, 'N'],
  'N28 E8 S8 E12 N8 E12 S11 D'               // top: through the north of the maze into the east shaft
  + ' N8 W8 S16 W12 N8 W8 S11 D'             // underside: back north, through the middle and into the west shaft
  + ' N8 E12 S8 E12 S8 W28 N4');             // top: back north, through the south and home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a shaft`);

// ---- the corridors of each face: the road, the run-out past every corner and the false turnings.
const node = v => mod(v - 2, 4) === 0 && v >= 6 && v <= 42;
const STEP = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const open = {top: new Set(), bottom: new Set()};      // corridor centre lines
const tips = {top: [], bottom: []};
const carve = (side, cells) => { for (const [c, r] of cells) open[side].add(key(c, r)); };
for (const p of R.cells) if (!p.hole) open[p.side].add(key(p.c, p.r));
for (const k of R.corners) {                           // three cells straight on past every corner
  const p = R.at(k), [dc, dr] = STEP[p.h];
  carve(p.side, [1, 2, 3].map(n => [p.c + dc * n, p.r + dr * n]));
}
const shaft = (c, r) => SHAFTS.some(([sc, sr]) => Math.max(Math.abs(c - sc), Math.abs(r - sr)) <= 2);
let seed = 0;
for (const p of R.cells) {
  if (p.hole || !node(p.c) || !node(p.r)) continue;
  for (const [m, [dc, dr]] of Object.entries(STEP)) {
    if (hash(p.c * 7 + seed++, p.r) < 0.3) continue;
    const len = hash(p.c, p.r * 5 + seed) < 0.5 ? 4 : 8;
    const cells = [];
    let ok = true;
    for (let n = 1; n <= len; n++) {
      const c = p.c + dc * n, r = p.r + dr * n;
      if (c < 6 || c > 42 || r < 6 || r > 42 || shaft(c, r)) { ok = false; break; }
      // A false turning must not touch another corridor of the same face, except where it starts.
      if (n >= 2 && [[0, 0], [dr, dc], [-dr, -dc], [dc, dr]].some(([a, b]) => open[p.side].has(key(c + a, r + b)) && !(a === dc && b === dr && n === len))) { ok = false; break; }
      cells.push([c, r]);
    }
    if (!ok || cells.length < 4) continue;
    carve(p.side, cells);
    tips[p.side].push(cells[cells.length - 1]);
  }
}

// ---- the maze: walls everywhere but within one cell of a corridor line.
const near = (side, c, r) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (open[side].has(key(c + a, r + b))) return true; return false; };
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d <= 1) continue;
  if (shaft(c, r) && q.d >= 2) { g.set(side, c, r, '='); continue; }       // a ring of slow pads round a shaft
  if (!near(side, c, r)) g.set(side, c, r, '#');
}
for (const side of [T, B]) for (const [c, r] of tips[side]) if (R.local(side, c, r).d >= 2) g.set(side, c, r, '^');
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [5, 3], launch: 20, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, temple: gold road, sand corridors, chocolate under the walls; violet underneath.
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ' || c < X0 || c > X1 || r < X0 || r > X1) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff7700') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  if (g.get(side, c, r) === '#') return side === T ? '#993300' : '#330066';
  if (q.d === 1) return side === T ? '#ff5a28' : '#cc00ff';
  return side === T ? '#ff3300' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'labyrinth', name: 'Level 55', kind: 'Labyrinth', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
