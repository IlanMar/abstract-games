// Level 108 "Weather": a very hard level, a long one, with relief. A square world of 80 x 80 cells, an endless
// plane: a weather map. The air pressure is the relief itself: highs are hills and lows are hollows, so the
// road climbs and drops as it crosses the map, and the isobars, lines of equal pressure, are drawn on it as
// dashed walls that the road has to thread between. A big H stands on every high and an L in every low,
// a cold front and a warm front sweep across the map, and the road dives into four eyes of storms and runs
// the satellite view underneath. The thread is uneven: stages wait up to the edge of sight, crystals lead on
// over the hills, and at some bends only the painted road shows the turn.
//   - the pressure: two crossing waves, periodic over the world; the height is that pressure, rounded to
//     quarter cells (the script prints the steepest step);
//   - the isobars: every sixth of the pressure range, dashed walls from two cells out;
//   - the centres: the letters H and L in walls (5 x 7) on the highs and lows that stand clear of the road;
//   - the fronts: a cold front (a line of slow pads with spikes for its triangles on the warm side) and a
//     warm front (a line of slow pads with half-discs of boost pads), rain (slow pads) round the lows;
//   - underneath: the jet stream (boost pads along the isobars) and storm cells (clusters of spikes);
//   - the eyes: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: a weather chart. On top a pink road over dark teal lows, violet middle ground and olive
// highs with rose isobars, underneath a pale blue road over the same bands darker; the eyes glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 80, H = 80, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 72];
const R = road(g, [...start, 'N'],
  'N36 E24 S10 E24 N30 W10 N9 D'     // top: up the west, east across the map, a dip, east, north and into an eye
  + ' S12 E28 S40 W20 N8 D'          // underneath: back, east, the long way south and up into the second
  + ' S12 W30 S10 E46 N4 D'          // top: back, west, south and the long run east into the third
  + ' S8 W62 S3 D'                   // underneath: back and the long way west into the last
  + ' N6');                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const tau = 2 * Math.PI;

// ---- the pressure, and the relief it makes.
const P = (c, r) => 0.6 * Math.cos(tau * c / W) * Math.cos(tau * r / H) + 0.4 * Math.sin(tau * (2 * c / W - r / H) + 0.7);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => Math.round((2.5 + 2.4 * P(c, r)) * 4) / 4));
const band = (c, r) => Math.floor((P(c, r) + 1) * 3);
const isobar = (c, r) => [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => band(mod(c + dx, W), mod(r + dy, H)) < band(c, r));

// ---- the eyes: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over an eye at ${p.c},${p.r}`);
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
const clear = (c, r) => R.local(T, c, r).d >= 2 && !runout.top.has(key(c, r)) && !glow.has(key(c, r));

// ---- the centres: H on every high, L in every low (a cell above or below all within four cells).
const LETTER = {H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'], L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####']};
const letter = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  let hi = true, lo = true;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    if (!dx && !dy) continue;
    const v = P(mod(c + dx, W), mod(r + dy, H));
    if (v >= P(c, r)) hi = false;
    if (v <= P(c, r)) lo = false;
  }
  if (!hi && !lo) continue;
  const cells = [];
  LETTER[hi ? 'H' : 'L'].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') cells.push(key(mod(c - 2 + x, W), mod(r - 3 + y, H))); }));
  if (cells.every(k => clear(...k.split(',').map(Number)))) cells.forEach(k => letter.add(k));
}

// ---- the fronts.
const coldAt = c => Math.round(44 + 9 * Math.sin(tau * c / W * 2));
const warmAt = c => Math.round(12 + 5 * Math.sin(tau * c / W + 1));

// ---- the chart and the satellite view.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    const cf = mod(r - coldAt(c), H), wf = mod(r - warmAt(c), H);
    if (letter.has(k)) ch = '#';
    else if (cf === 0 || wf === 0) ch = q.d >= 2 ? '=' : '.';                                   // a front
    else if (cf === 1 && mod(c, 6) === 0) ch = '^';                                              // a triangle of the cold front
    else if (wf === 1 && mod(c, 7) <= 2) ch = '>';                                               // a half-disc of the warm front
    else if (isobar(c, r) && q.d >= 2) ch = mod(c + r, 5) === 0 ? '.' : '#';                    // an isobar
    else if (P(c, r) < -0.55 && n < 0.25) ch = '=';                                              // rain
  } else {
    if (isobar(c, r) && q.d >= 2 && mod(c + r, 3) !== 0) ch = '>';                               // the jet stream
    else if (P(c, r) < -0.4 && q.d >= 3 && n < 0.08) ch = '^';                                   // a storm cell
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [5, 11, 8, 2, 10, 4], crumbs: 2, steps: [9, 6, 11, 8], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a weather chart.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  const b = band(c, r);
  if (side === B) return b < 2 ? '#444444' : b < 4 ? '#6600cc' : '#b41e46';
  if (isobar(c, r) || letter.has(k)) return '#b41e46';
  return b < 2 ? '#444444' : b < 4 ? '#6600cc' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'weather', name: 'Level 108', kind: 'Weather', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [a, b] of [[1, 0], [0, 1]]) worst = Math.max(worst, Math.abs(height[r][c] - height[mod(r + b, H)][mod(c + a, W)]));
  console.log('steepest step', worst, 'top', Math.max(...height.flat()), 'low', Math.min(...height.flat()), 'letters', letter.size);
}
