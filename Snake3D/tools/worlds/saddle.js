// Level 56 "Saddle": a very hard hex level with relief. A hex world of 48 x 56, all void but a hexagonal
// island nineteen cells round, bent into a saddle (the shape of a crisp): high in the east and the west,
// low in the north and the south, a pass in the middle. Every straight across it climbs and falls: north
// and south runs go over the pass and down to the low rims, the diagonal runs climb towards the ridges.
// The road crosses the pass on top, climbs the east ridge, runs off the south rim, comes back across the
// island underneath and drops off the south rim again to the start.
//   - contour lines: slow pads where the height crosses a step of one and a half cells, like the lines
//     of a map, so every climb and drop is a band of brakes;
//   - the road is lit like a train line: boost pads where it climbs, slow pads where it runs down;
//   - rocks on the ridges (a ring of walls round a spike), spikes in the valleys;
//   - long chains, '>=' gates between chains.
// Colour style, map: hypsometric tints, violet in the valleys through wine, raspberry and caramel to gold
// on the ridges; a white road. Underneath the same, darker.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to the rim
// and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const C = [24, 28], RIM = 19;
const start = [20, 40];
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const dist = new Map();
for (let k = 0; k <= RIM + 1; k++) for (const q of g.ring(...C, k)) if (!dist.has(key(...q))) dist.set(key(...q), k);
const dOf = (c, r) => (dist.has(key(c, r)) ? dist.get(key(c, r)) : 99);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (dOf(c, r) <= RIM) g.set('both', c, r, '.');
const R = road(g, [...start, 'N'],
  'N24 NE6 SE8 S18 SW8 S7 D'          // top: north over the pass, up the east ridge, down and off the south rim
  + ' N12 NE8 N14 NW6 SW8 S27 D'      // underside: back across the island and off the south rim again
  + ' N6');                           // top: home
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the island at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// ---- relief: a saddle, k (x^2 - z^2) round the middle height; its slope is under half a cell per cell.
const K = 0.0118, MID = 4.25;
const xz = (c, r) => [(c - C[0]) * 0.866, r + 0.5 * (c & 1) - C[1] - 0.5 * (C[0] & 1)];
const surf = (c, r) => { const [x, z] = xz(c, r); return Math.max(0, Math.min(8.75, MID + K * (x * x - z * z))); };
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (g.get(T, c, r) === ' ' ? 0 : Math.round(surf(c, r) * 4) / 4)));
const hAt = (c, r) => height[r][c];
const band = (c, r) => Math.floor(surf(c, r) / 1.5);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the island, face by face.
const rocks = {top: new Set(), bottom: new Set()};
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (dOf(c, r) > RIM - 2 || hash(c * 5 + (side === T ? 0 : 3), r) > 0.08) continue;
  if (surf(c, r) < 5) continue;
  if (g.disk(c, r, 2).some(q => R.local(side, ...q).d <= 1)) continue;
  for (const q of g.disk(c, r, 1)) rocks[side].add(key(...q));
  rocks[side].add(`${key(c, r)}*`);
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (g.get(T, c, r) === ' ') continue;
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (q.d === 1) {
      const a = R.at(q.i), b = R.at(q.i + 1);
      const rise = a.hole || b.hole ? 0 : surf(b.c, b.r) - surf(a.c, a.r);
      if (mod(q.u, 2) === 0) ch = rise > 0.05 ? '>' : rise < -0.05 ? '=' : '.';
    } else if (rocks[side].has(`${key(c, r)}*`)) ch = '^';
    else if (rocks[side].has(key(c, r))) ch = '#';
    else if (R.nbrs(c, r).some(o => g.get(T, ...o) !== ' ' && band(...o) < band(c, r))) ch = side === T ? '=' : '>';   // contour lines
    else if (surf(c, r) < 2.5 && q.d >= 2 && hash(c, r * 3 + (side === T ? 0 : 1)) < 0.2) ch = '^';                 // the valleys
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 16, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, map: hypsometric tints, a white road.
const TINTS = {top: ['#6600cc', '#b41e46', '#ff0066', '#ff3300', '#ff6600', '#ff6600'], bottom: ['#330066', '#6600cc', '#b41e46', '#993300', '#ff3300', '#ff3300']};
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  return TINTS[side][Math.min(5, band(c, r))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'saddle', name: 'Level 56', kind: 'Saddle', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let i = 0; i < R.length; i++) { const a = R.at(i), b = R.at(i + 1); if (!a.hole && !b.hole) worst = Math.max(worst, Math.abs(hAt(b.c, b.r) - hAt(a.c, a.r))); }
  console.log('steepest step on the road:', worst, 'heights', Math.min(...height.flat().filter((v, i) => g.get(T, i % W, (i / W) | 0) !== ' ')), Math.max(...height.flat()));
}
