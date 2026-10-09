// Level 97 "Sawmill": a hard level, a long one. A square world of 64 x 64 cells, an endless plane: the
// floor of a sawmill. The road runs the gangways between the machines on top, drops down four chutes to
// the cellar underneath and comes back up, so half the run is on the underside. The thread is uneven:
// stages wait up to the edge of sight, crystals lead on down the long gangways, and at some bends only the
// painted road shows the turn.
//   - saw blades: a ring of spikes round a wall hub, out on the floor;
//   - log piles: stacks of walls seven cells long, two logs high, with a gap between the stacks;
//   - conveyor belts: lines of boost pads two cells off the road along every second gangway, so a snake
//     that drifts is carried on;
//   - sawdust (slow pads) in drifts;
//   - the cellar: beams of wall every tenth row with a gap every eighth cell, posts (spikes) between them,
//     and sawdust under the chutes;
//   - the chutes: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: timber in the shade. On top a beige road over dark teal boards with caramel logs and
// violet blades, underneath a pale blue road over the chocolate cellar with rose beams; the chutes glow
// raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 64, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 58];
const R = road(g, [...start, 'E'],
  'E12 N3 E8 S3 E10 N12 W10 N14 E24 N10 D'   // top: east past the first saw, north, west, north, east and into a chute
  + ' S7 W30 N16 E26 N6 D'                    // cellar: back, west, north, east and up a chute
  + ' S8 W30 S30 W6 D'                        // top: back, the long gangway west, south and into a third
  + ' E8 S15 W17 D'                           // cellar: back, south and west up the last
  + ' E7');                                   // top: east into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cheb = (c, r, x, y) => { let dx = Math.abs(c - x), dy = Math.abs(r - y); return Math.max(Math.min(dx, W - dx), Math.min(dy, H - dy)); };

// ---- the chutes: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a chute at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const glow = new Set();
const rim = new Set();
for (const k of gap) { const [c, r] = k.split(',').map(Number); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { glow.add(key(mod(c + dx, W), mod(r + dy, H))); if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) rim.add(key(mod(c + dx, W), mod(r + dy, H))); } }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- saw blades: out on the floor, well clear of the road on top.
const saws = [];
for (let r = 4; r < H; r += 3) for (let c = 4; c < W; c += 3) {
  if (R.local(T, c, r).d >= 5 && !glow.has(key(c, r)) && saws.every(([x, y]) => cheb(c, r, x, y) >= 10)) saws.push([c, r]);
}
const saw = (c, r) => saws.reduce((m, [x, y]) => Math.min(m, cheb(c, r, x, y) + (Math.abs(c - x) === 2 && Math.abs(r - y) === 2 ? 1 : 0)), 9);
const logs = (c, r) => mod(r, 6) <= 1 && mod(c, 9) <= 6 && hash(Math.floor(c / 9) * 7 + Math.floor(r / 6) * 13) < 0.45;

// ---- the floor and the cellar.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    const s = saw(c, r);
    if (s === 0) ch = '#';                                                         // the hub
    else if (s === 2) ch = '^';                                                    // the teeth
    else if (s === 1) ch = '.';
    else if (q.d === 2 && mod(q.s, 2) === 0 && mod(q.u, 3) !== 2) ch = '>';        // a conveyor belt
    else if (q.d >= 3 && logs(c, r)) ch = '#';                                     // a log pile
    else if (hash(Math.floor(c / 4) * 19 + Math.floor(r / 4) * 23) < 0.18 && n < 0.6) ch = '=';  // sawdust
  } else {
    if (mod(r, 10) === 5) ch = mod(c, 8) === 0 ? '.' : '#';                        // a beam
    else if (mod(r, 10) === 0 && mod(c, 6) === 3) ch = '^';                        // a post
    else if (glow.has(k) && n < 0.5) ch = '=';                                     // sawdust under a chute
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [9, 3, 11, 5, 7, 2], crumbs: 2, steps: [7, 11, 5, 9], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: timber.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (rim.has(key(c, r))) return '#ff0066';
  if (side === T) {
    if (saw(c, r) <= 2) return '#6600cc';
    if (q.d >= 3 && logs(c, r)) return '#ff3300';
    return '#444444';
  }
  return mod(r, 10) === 5 ? '#b41e46' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'sawmill', name: 'Level 97', kind: 'Sawmill', start: [...start, 'E'], colors, grid: g};
if (require.main === module) console.log(g.print());
