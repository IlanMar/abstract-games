// Level 63 "Ripple": a hard hex level in the manner of the middle classic levels Wave and Honeycomb. A hex
// world of 48 x 56, an endless plane with no holes: everything happens on top. The road winds over it in
// sixteen runs, turning both ways.
//   - Wave's ladders: diagonal bands of slow pads two cells wide cross the whole plane every nine lines,
//     with a boost bead every fourth cell, so the road crosses a ladder every few cells;
//   - every chain lies in a pod: slow pads on both sides of it (Wave's '=ii='), so a chain is
//     always taken slowly and the boosts between pods have to be timed;
//   - Honeycomb's cells: rings of walls two cells round with a spike in the middle, on the places
//     farthest from the road;
//   - short chains with hooks, one group a stage, as in the middle classics.
// Colour style, candy pink: bands of magenta, raspberry and lilac between the ladders, a white road.
// Stages: short chains, a chain through every bend.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [10, 44];
const R = road(g, [...start, 'N'], 'N14 NE8 N8 NW6 N6 NE12 SE10 S8 SE6 S12 SW8 S6 SW10 NW6 SW4 NW2');
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Past every corner three cells straight on stay clear, with the cells round them.
const runout = new Set();
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout.add(key(...o)); }
}

// ---- stages first: the pods go round the chains.
const {stages, pads} = autoStages(R, {lengths: [8, 10], lead: [4, 2], launch: 0, gate: i => mod(i, 2) === 0});
const chainCells = new Set();
for (const s of stages) for (const [kind, a, b] of s) if (kind === 'chain') for (let i = a; i <= b; i++) chainCells.add(mod(i, R.length));

// ---- the plane.
const ladder = (c, r) => mod(Math.floor(r + c * 0.5), 9);
const cells = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const q = R.local(T, c, r); if (q.d >= 5) cells.push([c, r, q.d]); }
cells.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
const combs = [];
for (const [c, r] of cells) if (combs.length < 10 && combs.every(([a, b]) => Math.abs(a - c) + Math.abs(b - r) > 9)) combs.push([c, r]);
const comb = new Map();
for (const [c, r] of combs) { comb.set(key(c, r), '^'); for (const q of g.ring(c, r, 2)) comb.set(key(...q), '#'); }
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = R.local(T, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (q.d === 1 && chainCells.has(q.i)) ch = '=';                                   // the pods
  else if (comb.has(key(c, r))) ch = comb.get(key(c, r));
  else if (ladder(c, r) <= 1) ch = mod(c, 4) === 0 ? '>' : '=';                      // the ladders
  if (/[#^]/.test(ch) && (q.d <= 1 || runout.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const p of R.cells) for (const q of R.nbrs(p.c, p.r)) if (/[#^]/.test(g.get(T, ...q))) throw new Error(`an obstacle at ${q} stands next to the road`);
// The road itself crosses the ladders: slow pads on it, boosts where a bead falls on it.
placeStages(g, R, stages);
putPads(g, R, pads);
for (const p of R.cells) if (g.get(T, p.c, p.r) === '.' && ladder(p.c, p.r) <= 1 && !chainCells.has(R.local(T, p.c, p.r).i)) g.set(T, p.c, p.r, mod(p.c, 4) === 0 ? '>' : '=');

// ---- colours, candy pink: a band per ladder gap, a white road.
const BANDS = ['#ff0088', '#ff0066', '#ff44aa', '#cc00ff', '#ff0066'];
const colorOf = (c, r) => {
  const q = R.local(T, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd';
  return BANDS[mod(Math.floor(Math.floor(r + c * 0.5) / 9), BANDS.length)];
};
const colors = {top: g.layers(colorOf), bottom: g.layers(() => '#6600cc')};
module.exports = {key: 'ripple', name: 'Level 63', kind: 'Ripple', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
