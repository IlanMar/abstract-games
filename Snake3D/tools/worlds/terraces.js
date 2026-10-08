// Level 90 "Terraces": a hard level, a big one, with relief. A square world of 76 x 76 cells, an endless
// plane of farmland with two terraced hills of rice paddies. Each hill climbs in four terraces, one cell
// each, with a two-cell ramp between them; a well (a hole) on each summit takes the road to the underside.
// The road runs up the west plain, climbs the first hill straight over its terraces into the summit well,
// comes back underneath, crosses to the second hill and drops into its well, then out over the plain,
// into a pond and back to the start. The thread is uneven: stages wait up to the edge of sight, crystals
// lead on up the slopes, and at some bends only the painted road shows the turn.
//   - relief: the terrace height depends on the rounded distance from the nearer summit (round terraces),
//     so neighbouring cells differ by at most one ring, half a cell;
//   - paddies: on top rows of water (slow pads) on the flat terraces, a dike (walls with gaps) along the
//     top of every ramp, scarecrows (spikes) here and there;
//   - the plain: hedges of wall in short runs, stones (spikes);
//   - underneath: roots (walls) in veins and stones;
//   - the wells and the ponds: the dive cell and its neighbours across the road, open through both faces.
// Colour concept: rice terraces at sunset. A gold road; the terraces in olive and rose by level, the plain
// violet; underneath a pale pink road over dark grey soil; the wells glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 76, H = 76, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 68];
const R = road(g, [...start, 'N'],
  'N40 E17 D'                   // top: up the west plain and east up the first hill into its summit well
  + ' W7 N10 E34 S31 D'         // underside: back down, north, across and south up the second hill into its well
  + ' N8 E14 S20 W25 D'         // top: down the north slope, east, south over the plain and west into a pond
  + ' E8 S8 W41 S4 D'           // underside: back, south, the long way west and down into the ditch
  + ' N7');                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- relief: two hills centred on the first two dives.
const dives = R.cells.filter(p => p.hole);
const HILLS = [dives[0], dives[1]].map(p => [p.c, p.r]);
const dist = (c, r, [x, y]) => { let dx = Math.abs(c - x), dy = Math.abs(r - y); dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); return Math.hypot(dx, dy); };
const ringOf = (c, r) => Math.round(Math.min(...HILLS.map(h => dist(c, r, h))));
const BOUNDS = [26, 20, 14, 8];                           // a ramp runs over the two rings inside each bound
const heightOf = ring => BOUNDS.reduce((s, b) => s + Math.min(1, Math.max(0, (b - ring) * 0.5)), 0);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => heightOf(ringOf(c, r))));
const flat = (c, r) => { const k = ringOf(c, r); return BOUNDS.every(b => k >= b || k <= b - 2); };
const dikeTop = (c, r) => BOUNDS.some(b => ringOf(c, r) === b - 2);
const onHill = (c, r) => ringOf(c, r) < BOUNDS[0];

// ---- the wells and the ponds: the dive cell and its two neighbours across the road.
const well = new Set();
for (const p of dives) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) well.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && well.has(key(p.c, p.r))) throw new Error(`the road runs over a well at ${p.c},${p.r}`);
for (const k of well) g.hole(...k.split(',').map(Number));
const glow = new Set();
for (const k of well) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the farmland, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (well.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (onHill(c, r)) {
      if (dikeTop(c, r)) ch = mod(c + 2 * r, 7) === 0 ? '.' : '#';                    // the dike along the top of a ramp
      else if (flat(c, r) && mod(r, 3) === 0 && mod(c, 4) !== 0) ch = '=';             // rows of water
      else if (flat(c, r) && n < 0.03) ch = '^';                                        // a scarecrow
    } else {
      if (mod(r, 9) === 4 && mod(c, 12) < 5) ch = '#';                                  // hedges
      else if (n < 0.03) ch = '^';                                                      // stones
    }
  } else {
    if (mod(3 * c + 5 * r, 13) === 0 && n < 0.7) ch = '#';                              // roots
    else if (n < 0.04) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 18, gate: i => mod(i, 3) === 0,
  gaps: [4, 9, 2, 11, 6, 3], crumbs: 2, steps: [6, 10, 8, 11], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: rice terraces at sunset.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(key(c, r))) return '#ff0066';
  if (side === B) return '#444444';
  if (!onHill(c, r)) return '#6600cc';
  return Math.floor(heightOf(ringOf(c, r))) % 2 ? '#b41e46' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'terraces', name: 'Level 90', kind: 'Terraces', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [a, b] of [[1, 0], [0, 1]]) worst = Math.max(worst, Math.abs(height[r][c] - height[mod(r + b, H)][mod(c + a, W)]));
  console.log('steepest step', worst, 'top', Math.max(...height.flat()));
}
