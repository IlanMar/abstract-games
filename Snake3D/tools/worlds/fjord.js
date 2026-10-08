// Level 86 "Fjord": a hard level. A hex world, an endless plane (the 48 x 56 tile repeats) of rocky coast
// cut by four fjords: long inlets of open water (void) running north from the sea. The road goes up the
// west shore of a fjord, round its head, down the east shore and dives into the sea, comes back up on the
// underside and takes the next fjord there; the four fjords alternate top and underside, and the coast
// repeats, so the road goes round the world and back to its start. The thread is uneven: stages wait up to
// the edge of sight, crystals lead on along the long shores, and at some bends only the painted road shows
// the turn.
//   - the water: the sea along the south (six rows) and the fjords, three columns wide from row 28 down;
//   - on top rocks (spikes) on the shore at the water's edge, pine woods (walls) inland, wet meadows (slow
//     pads) between;
//   - underneath caves: stalagmites (walls) in rows, a thin glow of boost pads along the shore.
// Colour concept: a northern dawn. On top a pink road with a violet verge over dark rock and grey-turquoise
// snow further off, underneath an ice road over violet; the shore glows wine.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 42];
const unit = 'NE4 N18 NE4 SE4 S25 D N6';   // across to the next west shore, up it, round the head and down into the sea
const R = road(g, [...start, 'N'],
  'N18 NE4 SE4 S25 D N6'                   // top: the first fjord
  + ` ${unit} ${unit} ${unit} NE4`);         // underside, top, underside: the next three; top: across into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the water.
const water = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (r >= 50 || (r >= 28 && [0, 12, 24, 36].some(f => Math.abs(mod(c - f + W / 2, W) - W / 2) <= 1))) water.add(key(c, r));
}
for (const p of R.cells) if (!p.hole && water.has(key(p.c, p.r))) throw new Error(`the road runs into the water at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && !water.has(key(p.c, p.r))) throw new Error(`the dive at ${p.c},${p.r} is not in the water`);
for (const k of water) g.hole(...k.split(',').map(Number));
const shore = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!water.has(key(c, r)) && R.nbrs(c, r).some(q => water.has(key(...q)))) shore.add(key(c, r));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the coast, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (water.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d <= 1) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (shore.has(k)) ch = n < 0.45 ? '^' : '.';
    else if (q.d >= 3) ch = hash(Math.floor(c / 3) * 17 + Math.floor(r / 3) * 29) < 0.35 ? (n < 0.6 ? '#' : '.') : (n < 0.15 ? '=' : '.');
    else ch = n < 0.2 ? '=' : '.';
  } else {
    if (shore.has(k)) ch = '>';
    else if (q.d >= 2 && mod(r, 4) === 0 && mod(c + r, 3) === 0) ch = '#';
    else if (n < 0.1) ch = '^';
  }
  if (/[#^]/.test(ch) && runout[side].has(k)) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [5, 10, 3, 11, 7, 2], crumbs: 2, steps: [6, 11, 8, 4, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a northern dawn.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd');
  if (shore.has(k)) return '#b41e46';
  if (side === T) return q.d === 1 ? '#6600cc' : q.d >= 4 ? '#999999' : '#444444';
  return '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'fjord', name: 'Level 86', kind: 'Fjord', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
