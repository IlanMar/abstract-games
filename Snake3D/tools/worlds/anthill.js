// Level 91 "Anthill": a hard level, a big one. A square world of 72 x 72 cells, an endless plane: a meadow
// on top and an ant colony underneath it. The road runs the meadow along the ant trails, goes down into the
// nests through four entrances (holes, each ringed by its mound) and runs the tunnels of the colony on the
// underside. The thread is uneven: stages wait up to the edge of sight, crystals lead on along the trails
// like crumbs an ant would follow, and at some bends only the painted road shows the turn.
//   - the meadow: tufts of grass (slow pads) and pebbles (walls), and a mound of spikes round every
//     entrance, the road's own and four more out in the grass;
//   - the colony: the road runs a tunnel between walls three cells out, with a side gallery every ninth
//     cell; at every bend a chamber (a square of radius four) opens up, walled round, with eggs (spikes)
//     and stores of food (slow pads) inside;
//   - the entrances: the dive cell and its neighbours across the road, open through both faces.
// Colour concept: a meadow at dusk over dark soil. On top a pink road over olive grass with rose flowers,
// underneath a gold road down chocolate tunnels through dark grey soil, the chambers rose; the entrances
// glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 72, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 64];
const R = road(g, [...start, 'N'],
  'N20 E10 N14 E16 N12 D'       // meadow: up the west trail, east, north and into the first nest
  + ' S8 E14 S20 W10 S12 D'     // colony: down the gallery, east, south and up the second shaft
  + ' N6 E20 N31 D'             // meadow: east and the long north trail into the third nest
  + ' S6 E6 S40 W56 S4 D'       // colony: down, the long east tunnel south and the long south tunnel west
  + ' N7');                     // meadow: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cheb = (c, r, x, y) => { let dx = Math.abs(c - x), dy = Math.abs(r - y); return Math.max(Math.min(dx, W - dx), Math.min(dy, H - dy)); };

// ---- the entrances: the road's four and four more out in the grass, far from the road on both faces.
const nests = [];
const hole = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) hole.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
  nests.push([p.c, p.r]);
}
for (let r = 4; r < H && nests.length < 8; r += 3) for (let c = 4; c < W && nests.length < 8; c += 3) {
  if (Math.min(R.local(T, c, r).d, R.local(B, c, r).d) >= 7 && nests.every(([x, y]) => cheb(c, r, x, y) >= 12)) { nests.push([c, r]); hole.add(key(c, r)); }
}
for (const p of R.cells) if (!p.hole && hole.has(key(p.c, p.r))) throw new Error(`the road runs over an entrance at ${p.c},${p.r}`);
for (const k of hole) g.hole(...k.split(',').map(Number));
const mound = (c, r) => nests.some(([x, y]) => cheb(c, r, x, y) === 3);
const glow = (c, r) => nests.some(([x, y]) => cheb(c, r, x, y) <= 2);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
// The chambers: a square of radius four round every bend of the road underneath.
const chambers = R.corners.filter(k => R.at(k).side === B).map(k => [R.at(k).c, R.at(k).r]);
const chamber = (c, r) => chambers.reduce((m, [x, y]) => Math.min(m, cheb(c, r, x, y)), Infinity);

// ---- the meadow and the colony.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (hole.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (mound(c, r)) ch = '^';
    else if (glow(c, r)) ch = '.';
    else if (hash(Math.floor(c / 3) * 17 + Math.floor(r / 3) * 29) < 0.3) ch = n < 0.5 ? '=' : '.';   // tufts of grass
    else if (n < 0.04) ch = '#';                                                                      // pebbles
  } else {
    const ch4 = chamber(c, r);
    if (ch4 <= 4) {
      if (ch4 === 4) ch = q.d >= 2 && mod(c + r, 5) !== 0 ? '#' : '.';                              // the chamber wall
      else if (q.d >= 2) ch = n < 0.2 ? '^' : n < 0.45 ? '=' : '.';                                   // eggs and food
    } else if (q.d === 3) ch = mod(q.u, 9) === 0 ? '.' : '#';                                         // the tunnel wall
    else if (q.d >= 4 && n < 0.05) ch = '^';                                                           // stones in the soil
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 20, gate: i => mod(i, 3) === 0,
  gaps: [3, 8, 11, 5, 2, 10], crumbs: 2, steps: [4, 7, 11, 5, 9], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a meadow at dusk over dark soil.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28');
  if (glow(c, r)) return '#ff0066';
  if (side === T) return hash(Math.floor(c / 5) * 13 + Math.floor(r / 5) * 7) < 0.15 ? '#b41e46' : '#993300';
  if (chamber(c, r) <= 4) return '#b41e46';
  return q.d <= 2 ? '#993300' : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'anthill', name: 'Level 91', kind: 'Anthill', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
