// Level 34 "Quilt": an easy level. A one-sided square world, an endless plane (the 48 x 48 tile repeats)
// sewn together from patches of eight by eight cells. The road is a stitched seam: up the west, a dip
// down between two patches and back, over to the east and back along the south. Every patch has its own
// motif, all of pads that only change the speed of a snake that strays onto them:
//   - diamond, ring, cross, dots, stripes and checks, in boost pads or slow pads;
//   - a button (a wall) in the middle of a patch, only four cells or more from the road;
//   - a dashed stitch of slow pads along the seams between patches.
// Nothing sharp stands nearer than four cells to the road, every bend is taken inside a short chain, and
// the straights between hold a crystal, a trail of crystals or a five-cell chain in turn.
// Colour concept: a patchwork quilt by lamplight. A pale lilac road over patches of wine and chocolate,
// pink seams, a raspberry patch now and then.
const {Grid} = require('../grid');
const {road, placeStages} = require('../road');
const W = 48, H = 48, T = 'top';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [4, 42];
const R = road(g, [...start, 'N'], 'N34 E12 S14 E12 N14 E12 S34 W36');
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (a, b) => { let h = a * 374761393 + b * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Past every corner three cells straight on stay clear, with the cells round them.
const runout = new Set();
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout.add(key(...o)); }
}

// ---- the patches: (x, y) inside a patch, 1..7; row and column 0 are the seams.
const MOTIF = [
  (x, y) => Math.abs(x - 4) + Math.abs(y - 4) === 2 ? '>' : '.',            // diamond
  (x, y) => Math.max(Math.abs(x - 4), Math.abs(y - 4)) === 2 ? '=' : '.',   // ring
  (x, y) => (x === 4 || y === 4) && Math.abs(x - 4) + Math.abs(y - 4) <= 3 ? '>' : '.',   // cross
  (x, y) => x % 3 === 1 && y % 3 === 1 ? '>' : '.',                          // dots
  (x, y) => y % 2 === 0 && x >= 2 && x <= 6 ? '=' : '.',                     // stripes
  (x, y) => (x + y) % 2 === 0 && x >= 2 && x <= 6 && y >= 2 && y <= 6 ? '=' : '.'   // checks
];
const patchOf = (c, r) => [Math.floor(c / 8), Math.floor(r / 8)];
const motifOf = (pc, pr) => Math.floor(hash(pc * 7 + 3, pr * 11 + 5) * MOTIF.length);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = R.local(T, c, r);
  if (q.d < 2) continue;
  const x = c % 8, y = r % 8;
  let ch = '.';
  if (x === 0 || y === 0) ch = (x + y) % 3 === 1 ? '=' : '.';               // the stitched seams
  else {
    ch = MOTIF[motifOf(...patchOf(c, r))](x, y);
    if (x === 4 && y === 4 && q.d >= 4) ch = '#';                           // a button
  }
  if (/[#^]/.test(ch) && (q.d < 4 || runout.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const p of R.cells) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++)
  if (/[#^]/.test(g.get(T, mod(p.c + dx, W), mod(p.r + dy, H)))) throw new Error(`an obstacle near the road at ${p.c + dx},${p.r + dy}`);

// ---- stages, the easy way: every bend inside a short chain from three cells before it to two after;
// the straights between hold a crystal, a trail of three crystals or a five-cell chain in turn.
const stages = [];
{
  const L = R.length, first = 11, end = L + first - 3;
  let pos = first, kind = 0;
  const bends = [...R.corners, ...R.corners.map(k => k + L)].filter(k => k > first && k + 2 <= end).sort((a, b) => a - b);
  const straight = limit => {
    while (limit - pos >= 2) {
      const room = limit - pos;
      let to;
      if (room >= 7 && kind % 3 === 1) { stages.push([['chain', pos, pos + 4]]); to = pos + 4; }
      else if (room >= 6 && kind % 3 === 2) { stages.push([['gems', pos, pos + 2, pos + 4]]); to = pos + 4; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      pos = to + 2;
    }
  };
  for (const k of bends) {
    straight(k - 3);
    stages.push([['chain', Math.max(pos, k - 3), k + 2]]);
    pos = k + 4;
  }
  straight(end - 1);
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', Math.min(pos, end)]]);
}
placeStages(g, R, stages);

// ---- colours: a patchwork quilt by lamplight.
const PATCH = ['#b41e46', '#993300', '#b41e46', '#6600cc', '#993300', '#ff0066'];
const colorOf = (c, r) => {
  const q = R.local(T, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa';
  if (q.d === 1) return '#ff0088';
  const x = c % 8, y = r % 8;
  if (x === 0 || y === 0) return '#ff0088';
  const [pc, pr] = patchOf(c, r);
  return PATCH[Math.floor(hash(pc * 13 + 1, pr * 17 + 9) * PATCH.length)];
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#993300', 'r']]};
module.exports = {key: 'quilt', name: 'Level 34', kind: 'Quilt', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
