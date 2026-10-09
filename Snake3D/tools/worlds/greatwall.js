// Level 116 "Great Wall": a very hard level, a long one, with relief. A square world of 80 x 80 cells, an
// endless plane of mountains, and the road is the walkway along the top of a great wall that winds over
// them, climbing the ridges and dropping into the passes. The wall has battlements on both sides, a merlon
// on two cells of every three, so the walkway is a corridor: a missed turn runs into stone. Every 22 cells
// a watchtower closes in round the walkway with a beacon on it, and four times the walkway goes down a
// stair through a gate to run the tunnels in the rammed earth under the wall. The thread is uneven: stages
// wait up to the edge of sight, crystals lead on along the walkway, and at some bends only the painted road
// shows the turn.
//   - the mountains: two crossing waves, periodic over the world, in quarter cells (the script prints the
//     steepest step);
//   - the battlements: walls two cells either side of the road, a gap every third cell; the towers: solid
//     walls two and three cells out for five cells of every 22, a beacon (spike) three cells out;
//   - the slopes: pines (spikes), rocks (walls) in clusters on the heights, terraces (slow pads) in the
//     valleys;
//   - underneath: the rammed earth in courses of wall with gaps, lamps (boost pads) along the tunnels;
//   - the gates: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: the wall at sunset. On top a caramel walkway between olive battlements over dark teal
// valleys, violet slopes and rose peaks, underneath a pale blue road through chocolate earth; the gates
// glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 80, H = 80, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 74];
const R = road(g, [...start, 'N'],
  'N24 E12 N16 E14 S8 E16 N26 W10 N7 D'     // top: up the west, east over the ridges, a dip, north and down a gate
  + ' S10 E30 S30 W12 S16 E14 N7 D'         // underneath: back, the long tunnel east, south and up the second
  + ' S8 W20 N10 W16 S16 W20 N7 D'          // top: back, west along the south, a bastion and down the third
  + ' S10 W8 S5 D'                          // underneath: back and west to the last
  + ' N4');                                 // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tau = 2 * Math.PI;

// ---- the mountains.
const M = (c, r) => 0.6 * Math.sin(tau * (2 * c / W + r / H) + 0.4) + 0.4 * Math.cos(tau * (c / W - 2 * r / H) + 1.1);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => Math.round((2.5 + 2.2 * M(c, r)) * 4) / 4));

// ---- the gates: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a gate at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const glow = new Set();
for (const k of gap) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const tower = (side, q) => side === T && mod(q.i, 22) <= 4 && q.d <= 3;
const merlon = (side, q) => side === T && q.d === 2;

// ---- the wall, the mountains and the earth under them.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919)), m = M(c, r);
  let ch = '.';
  if (side === T) {
    if (tower(side, q) && q.d >= 2) ch = q.d === 3 && mod(q.i, 22) === 2 ? '^' : '#';                      // a watchtower and its beacon
    else if (merlon(side, q)) ch = mod(q.i, 3) === 0 ? '.' : '#';                                            // the battlements
    else if (q.d >= 3 && m > 0.45 && hash(Math.floor(c / 3) * 7 + Math.floor(r / 3) * 13) < 0.25) ch = n < 0.6 ? '#' : '.';   // rocks
    else if (q.d >= 3 && m < -0.35 && mod(r, 3) === 0) ch = mod(c, 5) === 0 ? '.' : '=';             // a terrace
    else if (q.d >= 3 && n < 0.05) ch = '^';                                                           // a pine
  } else {
    if (q.d >= 2 && mod(r, 6) === 0) ch = mod(c + 3 * mod(Math.floor(r / 6), 2), 7) === 0 ? '.' : '#';   // a course of rammed earth
    else if (q.d === 1 && mod(q.i, 6) === 0) ch = '>';                                                // a lamp
    else if (q.d >= 3 && n < 0.03) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [8, 3, 11, 6, 10, 2], crumbs: 2, steps: [7, 11, 9, 6], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: the wall at sunset.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#993300';
  if (q.d >= 2 && (merlon(side, q) || tower(side, q))) return '#993300';
  const m = M(c, r);
  return m < -0.3 ? '#444444' : m < 0.4 ? '#6600cc' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'greatwall', name: 'Level 116', kind: 'Great Wall', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [a, b] of [[1, 0], [0, 1]]) worst = Math.max(worst, Math.abs(height[r][c] - height[mod(r + b, H)][mod(c + a, W)]));
  console.log('steepest step', worst, 'top', Math.max(...height.flat()), 'low', Math.min(...height.flat()));
}
