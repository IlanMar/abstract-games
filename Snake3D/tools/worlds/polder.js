// Level 111 "Polder": a very hard level, a long one, with relief. A square world of 72 x 72 cells, an endless
// plane of reclaimed land: fields of 12 x 8 cells, each cut off from the next by a ditch, a line of holes
// through the land. The road runs on top of the dikes, raised half a cell above the fields, and crosses the
// ditches on little bridges, so a snake that leaves the dike soon tumbles through a ditch to the other face.
// Windmills turn on the fields, and the road goes down through four sluices and runs the peat underneath.
// The thread is uneven: stages wait up to the edge of sight, crystals lead on along the dikes, and at some
// bends only the painted road shows the turn.
//   - the ditches: every twelfth column and eighth row, holes wherever they stand two cells clear of the
//     road on both faces; nearer the road they are bridged;
//   - the fields: tulips in stripes of two colours, pastures with cows (spikes), greenhouses (ribs of wall
//     with gaps) and plain ploughland;
//   - the windmills: four sails of wall, three cells along each diagonal, round a hub (a spike);
//   - underneath: reeds (walls) along the ditches, eels (spikes), wet peat (slow pads);
//   - the sluices: the dive cell and its two neighbours across the road, open through both faces;
//   - relief: the dike (the road on top and a cell either side) is half a cell high.
// Colour concept: tulip fields at dusk. On top a gold dike over fields striped in raspberry and violet,
// rose and wine, olive pastures and dark teal greenhouses, underneath a pale blue road through chocolate
// peat; the sluices glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 72, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 66];
const R = road(g, [...start, 'N'],
  'N30 E18 N14 E30 S8 E8 N7 D'       // top: up the west dike, east, north, the long dike east, a dip and into a sluice
  + ' S16 W20 S20 E20 N5 D'          // underneath: back, round a square of peat and up the second sluice
  + ' S12 W30 N8 W8 N10 D'           // top: back, south, the long dike west, north and into the third
  + ' S10 W18 S14 D'                 // underneath: back, west and south into the last
  + ' N4');                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => R.local(T, c, r).d <= 1 ? 0.5 : 0));

// ---- the sluices: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
const glow = new Set();
for (const k of gap) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const clear = (c, r) => near(c, r) >= 2 && !runout.top.has(key(c, r)) && !runout.bottom.has(key(c, r)) && !glow.has(key(c, r));

// ---- the ditches.
const ditchLine = (c, r) => mod(c, 12) === 0 || mod(r, 8) === 0;
const ditch = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ditchLine(c, r) && clear(c, r)) ditch.add(key(c, r));
for (const k of ditch) gap.add(k);
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a hole at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));

// ---- the fields and the windmills.
const fieldOf = (c, r) => { const n = hash(Math.floor(c / 12) * 7 + Math.floor(r / 8) * 13 + 2); return n < 0.55 ? 'tulips' : n < 0.75 ? 'pasture' : n < 0.88 ? 'greenhouse' : 'plough'; };
const mill = new Map();
for (let fy = 0; fy < H / 8; fy++) for (let fx = 0; fx < W / 12; fx++) {
  if (hash(fx * 5 + fy * 11 + 7) > 0.35) continue;
  const c = 12 * fx + 6, r = 8 * fy + 4;
  const cells = [[c, r, '^']];
  for (let s = 1; s <= 3; s++) for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) cells.push([c + s * dx, r + s * dy, '#']);
  if (cells.every(([x, y]) => clear(x, y))) cells.forEach(([x, y, ch]) => mill.set(key(x, y), ch));
}

// ---- the land, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    const f = fieldOf(c, r);
    if (mill.has(k)) ch = mill.get(k);
    else if (ditchLine(c, r)) ch = '.';
    else if (f === 'pasture' && q.d >= 2 && n < 0.06) ch = '^';                                   // a cow
    else if (f === 'greenhouse' && mod(c, 3) === 1 && mod(r, 8) !== 4) ch = '#';                  // the ribs of a greenhouse
    else if (f === 'tulips' && mod(r, 2) === 0 && mod(c, 4) === 2) ch = '=';                      // soft soil between the rows
  } else {
    if (q.d >= 2 && R.nbrs(c, r).some(o => ditch.has(key(...o))) && n < 0.5) ch = '#';           // reeds
    else if (q.d >= 3 && n < 0.04) ch = '^';                                                       // an eel
    else if (q.d >= 2 && n > 0.9) ch = '=';                                                        // wet peat
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [8, 3, 11, 6, 2, 10], crumbs: 2, steps: [7, 11, 9, 5], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: tulip fields at dusk.
const STRIPES = [['#ff0066', '#6600cc'], ['#b41e46', '#ff0066'], ['#6600cc', '#b41e46']];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#993300';
  if (q.d === 1 || ditchLine(c, r)) return '#993300';
  const f = fieldOf(c, r);
  if (f === 'tulips') return STRIPES[Math.floor(hash(Math.floor(c / 12) + Math.floor(r / 8) * 9) * 3)][mod(r, 2)];
  if (f === 'pasture' || f === 'plough') return '#993300';
  return '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'polder', name: 'Level 111', kind: 'Polder', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) console.log(g.print());
