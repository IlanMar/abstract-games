// Level 121 "Delta": a very hard level, a long one. A hex world of 64 x 88 cells, an endless plane: the
// mouth of a great river, where it breaks into a braid of channels round low islands. The channels are
// holes through the world, so every island is cut off from the next and the road crosses the channels on
// narrow causeways; a missed turn ends in the water. Reed beds line the banks, herons stand on the islands,
// fishing huts here and there, and the road goes down four times into the water to run the riverbed under
// the islands. The thread is uneven: stages wait up to the edge of sight, crystals lead on over the
// causeways, and at some bends only the painted road shows the turn.
//   - the channels: seven waving lines down the world, each its own sine of the row (so the world repeats),
//     a cell and a half wide; where two meet they braid; holes wherever they are two cells or more from
//     the road, so the road crosses on a causeway three cells wide;
//   - lagoons: holes of radius one or two on the islands away from the road;
//   - the banks: reeds (slow pads) on cells next to the water, herons (spikes) and huts (2 x 2 walls) on the
//     islands, sandbars (boost pads) in stripes across the bigger ones;
//   - underneath: the riverbed, roots (walls) in strands, eels (spikes);
//   - the dives: the dive cell and its neighbours that are not road, open through both faces.
// Colour concept: a delta at dusk. On top a gold road over violet islands with wine reed beds and dark teal
// sandbars, underneath a pale blue road over the chocolate riverbed; the water's edge glows raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 88, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 80];
const R = road(g, [...start, 'N'],
  'N22 NE10 N16 NE8 N6 NW14 N6 NE20 SE10 S20 D'   // top: up the west over the islands, a crook, the lean north-east and down into a channel
  + ' N8 NE12 SE10 S28 SW10 S18 SE8 S6 D'         // the riverbed: back, east and the long way south to the second
  + ' N14 NW12 N12 NW10 SW8 S20 D'                // top: up the east, across the middle and down into the third
  + ' N6 NW2 SW22 S10 D'                          // the riverbed: back, a crook and the long lean south-west to the last
  + ' N6');                                       // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const SX = Math.sqrt(3) / 2, WX = W * SX;

// ---- the water.
const CH = Array.from({length: 7}, (_, k) => ({x: (k + 0.5) * WX / 7, a: 2.5 + hash(k * 5 + 1) * 3, f: 1 + Math.floor(hash(k * 5 + 2) * 3), p: hash(k * 5 + 3) * 6.28}));
const water = (c, r) => {
  const X = c * SX, Y = r + mod(c, 2) / 2;
  return CH.some(k => Math.abs(mod(X - k.x - k.a * Math.sin(2 * Math.PI * k.f * Y / H + k.p) + WX / 2, WX) - WX / 2) < 0.8);
};
const gap = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (water(c, r) && near(c, r) >= 2) gap.add(key(c, r));
for (let n = 0; n < 60; n++) {
  const c = Math.floor(hash(n * 3 + 301) * W), r = Math.floor(hash(n * 3 + 302) * H), rad = 1 + (n % 2);
  if (g.disk(c, r, rad + 2).every(q => near(...q) >= 3)) g.disk(c, r, rad).forEach(q => gap.add(key(...q)));   // a lagoon
}
for (const p of R.cells) if (p.hole) {
  gap.add(key(p.c, p.r));
  for (const o of R.nbrs(p.c, p.r)) if (!R.has(T, ...o) && !R.has(B, ...o)) gap.add(key(...o));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs into the water at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const bank = new Set();
for (const k of gap) for (const q of g.disk(...k.split(',').map(Number), 1)) if (!gap.has(key(...q))) bank.add(key(...q));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the islands and the riverbed.
const hut = new Set();
for (let n = 0; n < 200; n++) {
  const c = Math.floor(hash(n * 3 + 901) * W), r = Math.floor(hash(n * 3 + 902) * H), cells = [[c, r], g.step(c, r, 'S'), g.step(c, r, 'NE'), g.step(c, r, 'SE')];
  if (cells.every(q => R.local(T, ...q).d >= 3 && !bank.has(key(...q)) && !gap.has(key(...q)) && !runout.top.has(key(...q)))) cells.forEach(q => hut.add(key(...q)));
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (hut.has(k)) ch = '#';
    else if (bank.has(k)) ch = n < 0.5 ? '=' : '.';                                                   // reeds
    else if (q.d >= 3 && n < 0.06) ch = '^';                                                          // a heron
    else if (q.d >= 2 && mod(Math.round(2 * r + mod(c, 2)) - c, 9) === 0) ch = '>';                 // a sandbar
  } else {
    if (q.d >= 2 && mod(3 * c + 2 * r + Math.floor(hash(Math.floor(c / 8) + 77) * 9), 17) === 0) ch = '#';   // a root
    else if (q.d >= 3 && n < 0.04) ch = '^';                                                          // an eel
    else if (bank.has(k) && n < 0.3) ch = '=';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {first: 13, lengths: [11, 14], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [7, 3, 10, 5, 11, 8], crumbs: 2, steps: [10, 6, 9, 11], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a delta at dusk.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (bank.has(k)) return side === T ? '#b41e46' : '#ff0066';
  if (side === B) return '#993300';
  if (hut.has(k)) return '#444444';
  return mod(Math.round(2 * r + mod(c, 2)) - c, 9) === 0 ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'delta', name: 'Level 121', kind: 'Delta', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
