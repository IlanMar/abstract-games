// Level 35 "Kaleidoscope": an easy-to-middle level. A one-sided hex world, an endless plane (the 48 x 48
// tile repeats) of coloured glass. The road climbs the west side, zigzags across the north in a row of
// teeth, runs down the east side and zigzags back along the south. Everything is six-fold:
//   - rosettes on the open glass, the farthest places first: a wall at the heart, a ring of boost pads,
//     slow pads at the six corners of the next ring and, three cells out, a spike at each corner with
//     boost pads between;
//   - mirrored trim along the road: boost pads two cells out and slow pads three cells out, the same on
//     both sides, so the road runs down the mirror line;
//   - shards: a scatter of boost and slow pads over the rest.
// Colour concept: stained glass at night. A caramel road over violet glass, the rosettes in magenta and
// raspberry, wine beside the road.
// Stages: chains of seven and nine cells, every second corner stage a crystal and a chain through the bend.
const {Grid} = require('../grid');
const {road, autoStages, placeStages} = require('../road');
const W = 48, H = 48, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 42];
const R = road(g, [...start, 'N'], 'N18 NE8 N6 NE8 SE8 NE8 SE6 S18 SW8 NW8 SW8 S8 SW8 NW6 N2');
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Past every corner three cells straight on stay clear, with the cells round them.
const runout = new Set();
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout.add(key(...o)); }
}

// ---- rosettes: the farthest cells from the road, at least nine apart.
const rosettes = [];
{
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cand.push([c, r, R.local(T, c, r).d]);
  cand.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
  for (const [c, r, d] of cand) {
    if (d < 6) break;
    if (rosettes.some(m => g.disk(...m, 8).some(q => q[0] === c && q[1] === r))) continue;
    rosettes.push([c, r]);
  }
}
const petal = new Map();
rosettes.forEach(m => { for (let k = 0; k <= 3; k++) g.ring(...m, k).forEach((q, j) => petal.set(key(...q), {k, corner: k === 0 || j % k === 0})); });

for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = R.local(T, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  const p = petal.get(key(c, r));
  if (p) ch = p.k === 0 ? '#' : p.k === 1 ? '>' : p.k === 2 ? (p.corner ? '=' : '.') : (p.corner ? '^' : '>');
  else if (q.d === 2) ch = mod(q.u, 4) === 0 ? '>' : '.';                     // mirrored trim
  else if (q.d === 3) ch = mod(q.u, 4) === 2 ? '=' : '.';
  else if (q.d >= 4) { const x = hash(c, r); ch = x < 0.05 ? '>' : x < 0.1 ? '=' : '.'; }   // shards
  if (/[#^]/.test(ch) && (q.d < 3 || runout.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const p of R.cells) for (const q of g.disk(p.c, p.r, 2))
  if (/[#^]/.test(g.get(T, ...q))) throw new Error(`an obstacle at ${q} stands within two cells of the road`);

// ---- stages.
const {stages} = autoStages(R, {first: 12, lengths: [7, 9], lead: [5, 3], pair: 2});
placeStages(g, R, stages);

// ---- colours: stained glass at night.
const colorOf = (c, r) => {
  const q = R.local(T, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300';
  const p = petal.get(key(c, r));
  if (p) return p.k % 2 ? '#ff00ff' : '#ff0066';
  if (q.d === 1) return '#b41e46';
  return mod(Math.floor(q.d / 2), 2) ? '#6600cc' : '#b41e46';
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#b41e46', 'r']]};
module.exports = {key: 'kaleidoscope', name: 'Level 35', kind: 'Kaleidoscope', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
