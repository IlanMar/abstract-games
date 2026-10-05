// Level 43 "Lava": a hard level in fire. A hex world, an endless plane of basalt (the 48 x 56 tile
// repeats) crossed by three rivers of lava, two cells wide, that wind east to west right through the
// plate. The road crosses the rivers on bridges one cell wide, with the lava open on both sides, and four
// times runs straight into a river and drops through it to the other face, so half the run is underneath.
//   - the banks glow: boost pads along every river, never right beside the road;
//   - basalt columns stand out on the plate: a cluster of seven walls round a spike, the farthest places
//     from the road first, a different set on each face;
//   - lava bombs: spikes scattered over the plate, three cells or more from the road.
// No slow pads: the floor is red. Colour style, fire: a road of hot sand over brick-red rock, gold
// glowing banks, dark chocolate basalt.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to each
// river the road drops into and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 48];
const R = road(g, [...start, 'N'],
  'N20 D'                          // top: north over the south river and into the middle one
  + ' S6 SE6 S5 D'                 // underside: back, south-east and into the south river
  + ' N6 NE8 N25 D'                // top: back, north-east, over the middle river and into the north one
  + ' S8 SE8 S24 D'                // underside: back, south-east, over the middle river into the south one
  + ' N6 NE8 SE2 S16 SW8 NW8 SW8 NW8 N2');   // top: back, over the south river and home in zigzags
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the rivers: lines 6, 24 and 42, swinging up to two cells north and south, two cells wide. Road
// cells on a river are bridges; every other river cell is open through both faces.
const RIVERS = [6, 24, 42];
const swing = c => Math.round(1.6 * Math.sin(c * 2 * Math.PI / 24));
const river = (c, r) => RIVERS.some(y => mod(r - y - swing(c), H) <= 1);
const roadCell = new Set(R.cells.filter(p => !p.hole).map(p => key(p.c, p.r)));
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (river(c, r) && !roadCell.has(key(c, r))) g.hole(c, r);
for (const p of R.cells) if (p.hole && !river(p.c, p.r)) throw new Error(`the dive at ${p.c},${p.r} misses the river`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- basalt columns, the farthest places from the road on each face, nine cells apart.
const columns = {top: [], bottom: []};
for (const side of [T, B]) {
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const d = R.local(side, c, r).d;
    if (d >= 4 && g.disk(c, r, 1).every(q => g.get(T, ...q) !== ' ')) cand.push([c, r, d]);
  }
  cand.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
  for (const [c, r] of cand) if (!columns[side].some(m => g.disk(...m, 8).some(q => q[0] === c && q[1] === r))) columns[side].push([c, r]);
}
const columnAt = {top: new Map(), bottom: new Map()};
for (const side of [T, B]) columns[side].forEach(m => g.disk(...m, 1).forEach((q, j) => columnAt[side].set(key(...q), j)));
const bank = (c, r) => !river(c, r) && R.nbrs(c, r).some(q => g.get(T, ...q) === ' ');

// ---- the rock, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (bank(c, r) && q.d >= 2) ch = mod(c, 2) ? '>' : '.';                   // glowing banks
  const col = columnAt[side].get(key(c, r));
  if (col !== undefined) ch = col === 0 ? '^' : '#';                        // a basalt column
  else if (q.d >= 3 && hash(c * 3 + (side === T ? 0 : 1), r) < 0.035) ch = '^';   // lava bombs
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: no launches, they end in a slow pad.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, fire: hot sand on brick-red rock.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300';
  if (bank(c, r)) return '#ff6600';
  if (columnAt[side].has(key(c, r))) return '#993300';
  if (q.d <= 2) return '#ff1111';
  return mod(Math.floor(q.d / 2), 2) ? '#993300' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'lava', name: 'Level 43', kind: 'Lava', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
