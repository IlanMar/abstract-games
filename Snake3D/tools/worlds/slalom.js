// Level 101 "Slalom": a hard level, a long one, with relief. A square world of 64 x 80 cells, an endless
// mountain: the plane rises to a ridge in the north and falls to a valley in the middle, so the road runs
// downhill on top and uphill underneath. Two slalom pistes zigzag down the slope on top, turning every four
// cells through gates; at the foot of each the road drops through the lift station to the underside and
// rides a long ski lift back up the hill, the last one round over the edge of the world to the start. The
// thread is uneven: stages wait up to the edge of sight, crystals lead on down the pistes and up the lifts,
// and at some bends only the painted road shows the turn.
//   - relief: a long wave from the ridge to the valley with moguls (small bumps) on it, rounded to quarter
//     cells, so that no step is steeper than half a cell (the script prints the steepest);
//   - the pistes: a gate (two flags, spikes) two cells out on either side of every bend, ropes of slow pads
//     three cells out along the pistes, pine trees (walls) in clumps off the pistes;
//   - the lifts: a pylon (a wall) every eighth cell three cells out, a cable of boost pads two cells out
//     on one side, snowdrifts (slow pads) here and there;
//   - the lift stations: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: a ski slope at dusk. On top a gold piste over violet snow with dark teal pines,
// underneath a pale blue lift track over rose snow; the stations glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 80, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 4];
const zig = 'E6 S4 W6 S4 E6 S4 W6 S4 E6 S4 W6 S4 E6 S4 W6 S4';
const R = road(g, [...start, 'S'],
  `S12 ${zig} E6 S6 D`         // top: the first piste, down the slope through eight gates and into a lift station
  + ' N40 E18 D'               // underside: the first lift back up and east to the top of the second piste
  + ` W6 S4 ${zig} E6 S5 D`    // top: the second piste down
  + ' N6 E39 N50 D'            // underside: east round the edge of the world and the long lift up to the start
  + ' S4');                    // top: down into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- relief: the ridge at row 12, the valley at row 52, moguls all over.
const t = 2 * Math.PI;
const rise = r => Math.cos(t * (r - 12) / H);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) =>
  Math.round((4.25 + 3.9 * rise(r) + 0.12 * Math.sin(t * c / 8) * Math.sin(t * r / 8)) * 4) / 4));

// ---- the lift stations: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a station at ${p.c},${p.r}`);
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
const bendNear = i => R.corners.some(k => Math.abs(k - i) <= 1 && R.at(k).side === R.at(i).side);

// ---- the slope and the lifts.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (q.d === 2 && bendNear(q.i)) ch = '^';                                                         // a gate
    else if (q.d === 3 && mod(q.u, 2) === 0) ch = '=';                                                 // the rope
    else if (q.d >= 5 && hash(Math.floor(c / 4) * 37 + Math.floor(r / 4) * 11) < 0.35 && n < 0.45) ch = '#';  // pines
    else if (q.d >= 4 && n < 0.03) ch = '^';                                                           // a rock
  } else {
    if (q.d === 3 && mod(q.u, 8) === 0 && mod(c + r, 2) === 0) ch = '#';                                // a pylon
    else if (q.d === 2 && q.v > 0 && mod(q.u, 3) !== 0) ch = '>';                                      // the cable
    else if (q.d >= 3 && hash(Math.floor(c / 5) * 7 + Math.floor(r / 5) * 3) < 0.2 && n < 0.6) ch = '='; // a drift
    else if (q.d >= 4 && n < 0.04) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap; the lifts get a run-up.
const {stages, pads} = autoStages(R, {lengths: [12, 14], lead: [4, 3], launch: 30, gate: i => mod(i, 2) === 0,
  gaps: [4, 9, 11, 3, 7, 10], crumbs: 2, steps: [5, 11, 8, 6, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a ski slope at sunrise.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(key(c, r))) return '#ff0066';
  if (side === B) return '#b41e46';
  if (q.d >= 5 && hash(Math.floor(c / 4) * 37 + Math.floor(r / 4) * 11) < 0.35) return '#444444';
  return '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'slalom', name: 'Level 101', kind: 'Slalom', start: [...start, 'S'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [a, b] of [[1, 0], [0, 1]]) worst = Math.max(worst, Math.abs(height[r][c] - height[mod(r + b, H)][mod(c + a, W)]));
  console.log('steepest step', worst, 'top', Math.max(...height.flat()), 'low', Math.min(...height.flat()));
}
