// Level 73 "Canals": a very hard square level with relief, a city of canals. A square world of 56 x 56, an
// endless city: islands of nine by nine in a grid of fourteen, between them canals five cells wide (the
// void), and a humpbacked bridge three cells wide wherever the road crosses a canal, rising a cell and a
// half over the water. The road tours the city on top over seven bridges and drops into a canal; underneath
// it crosses five more, drops into another canal and comes back on top over the last bridge home.
//   - the bridges have railings: walls right beside the road on both sides, the hump of the bridge
//     always clear;
//   - houses on the islands: blocks of walls two by three with a spike for a chimney, in rows along the
//     streets, cleared near the road; underneath, the cellars: blocks of slow pads;
//   - the quays: a line of boost pads along the edge of every island;
//   - long chains, '>=' gates between chains.
// Colour style, Venice at dusk: raspberry and wine islands, pink bridges, a gold road; underneath
// chocolate and violet with a pink road.
// Stages: long chains, a chain through every bend, lead-in chains to the canals.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const P = 14, ISLE = 9;                              // pitch, island size: islands at 14 i + 2 .. 14 i + 10
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const isle = (c, r) => mod(c - 2, P) < ISLE && mod(r - 2, P) < ISLE;
const start = [6, 50];
const runs =
  'N16 E28 N14 W14 N4 D'            // top: up and across the city, into the canal north of the second island
  + ' S6 E28 S31 W4 D'              // underside: back down, east and south, into the canal west of the corner island
  + ' E19 N2';                      // top: east over the last bridge, round the world, home

// ---- the land: the islands and a bridge under every crossing of a canal.
const probe = road(new Grid(W, H), [...start, 'N'], runs);
const land = new Set(), bridge = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (isle(c, r)) land.add(key(c, r));
for (const p of probe.cells) if (!p.hole && !isle(p.c, p.r)) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
  const k = key(mod(p.c + a, W), mod(p.r + b, H));
  if (!isle(mod(p.c + a, W), mod(p.r + b, H))) { land.add(k); bridge.add(k); }
}
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); bridge.delete(key(p.c, p.r)); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a canal`);

// ---- relief: the islands flat, every bridge a hump over the water, its height by how far into the canal.
const into = (c, r) => {                              // 1..3 cells into the canal, the hump in the middle
  const x = mod(c - 2, P), y = mod(r - 2, P);
  const a = x >= ISLE ? Math.min(x - ISLE + 1, P - x) : 0, b = y >= ISLE ? Math.min(y - ISLE + 1, P - y) : 0;
  return Math.max(a, b);
};
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (bridge.has(key(c, r)) ? 0.5 * into(c, r) : 0)));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the city, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const x = mod(c - 2, P), y = mod(r - 2, P);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (bridge.has(k)) { if (q.d === 1 && into(c, r) < 3) ch = '#'; }                        // the railings
    else if (x === 0 || y === 0 || x === ISLE - 1 || y === ISLE - 1) ch = mod(x + y, 2) === 0 ? '>' : '.';   // the quays
    else if ((x === 2 || x === 3 || x === 5 || x === 6) && y >= 2 && y <= 6 && y !== 4) {      // the houses
      ch = side === T ? ((x === 2 || x === 6) && (y === 2 || y === 6) ? '^' : '#') : '=';
    }
    if (/[#^]/.test(ch) && !bridge.has(k) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (/[#^]/.test(ch) && bridge.has(k) && runout[side].has(k)) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, Venice at dusk: raspberry and wine islands by block, pink bridges, a gold road.
const ISLES = {top: ['#b41e46', '#ff0066'], bottom: ['#993300', '#6600cc']};
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  if (bridge.has(k)) return side === T ? '#ff44aa' : '#b41e46';
  return ISLES[side][mod(Math.floor((c - 2) / P) + Math.floor((r - 2) / P), 2)];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'canals', name: 'Level 73', kind: 'Canals', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (land.has(key(c, r)))
    for (const [a, b] of [[1, 0], [0, 1]]) if (land.has(key(mod(c + a, W), mod(r + b, H)))) worst = Math.max(worst, Math.abs(height[r][c] - height[mod(r + b, H)][mod(c + a, W)]));
  console.log('steepest step:', worst);
}
