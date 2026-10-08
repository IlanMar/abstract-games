// Level 87 "Babylon": a middle classic level in the manner of Queue, Accelerator and Wave. A solid square
// plate of 40 x 40 cells in a frame of void (the 48 x 48 tile repeats), cut in two from north to south by
// the Euphrates, a river of void three cells wide. The road crosses the river on bridges, runs off the
// plate edge twice and dives into the river twice, so half the run is on the underside.
//   - the processional way: on every long stretch a corridor of glazed brick (walls three cells out, a gap
//     every fifth cell with a lion (a spike) in it) and gold runway lights '>..>' two cells out (Queue,
//     Colour Check);
//   - the ziggurat: on each face, in the widest open ground, three concentric squares of wall with a door
//     in each, slow pads on the terraces and a spike shrine on top (Accelerator);
//   - the hanging gardens: underneath, diagonal bands of slow pads with boost-pad beads (Wave);
//   - the bridges: the road and the cells either side of it over the river; the Ishtar Gate: a step in the
//     north road with a '>=' gate on it.
// Colour concept: gold and rubies. A gold road with a dark rose verge, on top over scarlet brick with the
// ziggurat in raspberry ruby rings, underneath over dark rose with raspberry gardens; the bridges are gold.
// Stages: long chains, a chain through every pair of close bends, a lead-in chain right up to each edge
// and the next chain where the snake comes out, a launch on the longest straights; a gently uneven thread.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 43;                         // the plate: columns and lines 4..43
const R0 = 24, R1 = 26;                        // the river: columns 24..26
const start = [9, 40];
const R = road(g, [...start, 'N'],
  'N28 E10 N4 E24 D'            // top: up the west, a step through the Ishtar Gate, east over the river and off the edge
  + ' W8 S18 W9 D'              // underside: back, down the east bank and west into the river
  + ' E7 S17 D'                 // top: back east and down off the south edge
  + ' N6 W12 N4 W12 S9 D'       // underside: up, west over the river, a step and down off the south edge
  + ' N4');                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const OTHER = {top: B, bottom: T};

// ---- the plate, the river and the bridges.
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const river = (c, r) => c >= R0 && c <= R1 && !(near(c, r) <= 1 && R.cells.some(p => !p.hole && p.c >= R0 && p.c <= R1 && Math.abs(p.r - r) <= 1));
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) if (!river(c, r)) g.set('both', c, r, '.');
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not over the void`);
const bridge = new Set();
for (let r = X0; r <= X1; r++) for (let c = R0; c <= R1; c++) if (!river(c, r)) bridge.add(key(c, r));
const bank = (c, r) => c >= R0 - 1 && c <= R1 + 1;

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const lengthOf = new Map();
for (let i = 0; i < R.length; i++) lengthOf.set(R.seg[i], (lengthOf.get(R.seg[i]) || 0) + 1);
const processional = (side, q) => lengthOf.get(q.s) >= 12 && R.at(q.i).side === side;

// ---- ziggurats: on each face the open spot furthest from the road on both faces, away from the river.
const zigs = [];
for (const side of [T, B]) {
  let best = null;
  for (let r = X0 + 6; r <= X1 - 6; r++) for (let c = X0 + 6; c <= X1 - 6; c++) {
    if (c + 6 >= R0 - 1 && c - 6 <= R1 + 1) continue;
    const d = Math.min(R.local(side, c, r).d, R.local(OTHER[side], c, r).d + 3);
    if (!best || d > best.d) best = {side, c, r, d};
  }
  if (best && best.d >= 7) zigs.push(best);
}
const zigAt = (side, c, r) => {
  for (const z of zigs) if (z.side === side) {
    const dx = c - z.c, dy = r - z.r, ring = Math.max(Math.abs(dx), Math.abs(dy));
    if (ring <= 6) return {ring, dx, dy, z};
  }
  return null;
};

// ---- the city, face by face.
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (g.get(side, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  const z = zigAt(side, c, r);
  if (z) {
    const {ring, dx, dy} = z;
    const door = (ring === 2 && dx === 0 && dy < 0) || (ring === 4 && dy === 0 && dx > 0) || (ring === 6 && dx === 0 && dy > 0);
    if (ring === 0) ch = '^';
    else if (ring % 2 === 0) ch = door ? '.' : '#';
    else ch = '=';
  } else if (bridge.has(k) || bank(c, r)) ch = '.';
  else if (side === T) {
    if (processional(side, q) && q.d === 3) ch = mod(q.u, 5) === 0 ? '^' : '#';
    else if (processional(side, q) && q.d === 2) ch = mod(q.u, 3) === 0 ? '>' : '.';
  } else {
    if (q.d >= 2 && mod(c - r, 7) <= 1) ch = mod(c + r, 4) === 0 ? '>' : '=';
    else if (processional(side, q) && q.d === 3) ch = mod(q.u, 6) === 0 ? '.' : '#';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: long chains, a gently uneven thread.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 16, gate: i => mod(i, 3) === 0,
  gaps: [1, 4, 1, 7, 2], crumbs: 3, steps: [5, 8, 4], rails: 4});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: gold and rubies.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), z = zigAt(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (z) return z.ring % 2 ? '#b41e46' : '#ff0066';
  if (bridge.has(key(c, r))) return '#ff6600';
  if (q.d <= 1) return '#b41e46';
  if (side === T) return '#ff0000';
  return mod(c - r, 7) <= 1 && q.d >= 2 ? '#ff0066' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'babylon', name: 'Level 87', kind: 'Babylon', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
