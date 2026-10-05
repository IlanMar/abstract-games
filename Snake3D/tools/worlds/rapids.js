// Level 38 "Rapids": a hard level, a level of speed. A hex world, an endless plane (the 40 x 48 tile
// repeats) of white water. The road shoots down the river on boost pads: every free road cell on a
// straight with a bend or a whirlpool far enough ahead is a boost pad, and before every bend a pool of
// slow pads on the road takes the speed off again. Four whirlpools take the road to the other face and
// back, so half the run is underneath.
//   - the current: dashed streaks of boost pads flowing down the whole plane on top, of slow pads (the
//     undertow) underneath;
//   - canyon walls on every long straight, three cells out on the road's own face, with gaps, and rocks
//     (spikes) two cells out;
//   - every whirlpool (a hole of radius one past the dive) is ringed by an eddy of slow pads.
// Colour concept: white water in a red canyon. On top a pale foam road over violet water and chocolate and
// wine canyon walls, underneath a caramel road over chocolate; the whirlpools glow raspberry.
// Stages: long chains, a launch on most straights, a lead-in chain right up to each whirlpool and the next
// chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 40, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 42];
const R = road(g, [...start, 'N'],
  'N14 NE8 N10 D'                  // top: up the west, a lean north-east and up into the first whirlpool
  + ' S8 SE8 S8 SE6 NE6 N16 D'     // underside: back, down the middle, a dip and up into the second
  + ' S8 SE4 S12 D'                // top: down the east side into the third
  + ' N8 NE4 SE4 S15 D'            // underside: up, round the east edge and down into the fourth
  + ' N5');                        // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const OTHER = {top: B, bottom: T};

// ---- the whirlpools: a disc of radius one one step past each dive, through both faces.
const pools = R.cells.filter(p => p.hole).map(p => g.step(p.c, p.r, p.h));
const poolCell = new Set();
for (const w of pools) for (const q of g.disk(...w, 1)) { g.hole(...q); poolCell.add(key(...q)); }
for (const p of R.cells) if (!p.hole && poolCell.has(key(p.c, p.r))) throw new Error(`the road runs into a whirlpool at ${p.c},${p.r}`);
const eddy = new Set();
for (const w of pools) for (const q of g.ring(...w, 2)) eddy.add(key(...q));

// Stretch lengths; long stretches run between canyon walls.
const lengthOf = new Map();
for (let i = 0; i < R.length; i++) lengthOf.set(R.seg[i], (lengthOf.get(R.seg[i]) || 0) + 1);
const canyon = (side, q) => lengthOf.get(q.s) >= 10 && R.at(q.i).side === side;

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the water, face by face.
const xy = (c, r) => [c * 0.866, r + 0.5 * (c & 1)];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (poolCell.has(key(c, r))) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const [x, y] = xy(c, r);
  let ch = '.';
  if (mod(c, 5) === 0 && mod(Math.round(y) + c, 4) !== 0) ch = side === T ? '>' : '=';   // the current
  if (canyon(side, q)) {
    if (q.d === 3) ch = mod(q.u, 6) === 0 ? '.' : '#';                                  // canyon walls
    else if (q.d === 2) ch = mod(q.u, 7) === 3 ? '^' : '.';                             // rocks
  }
  if (eddy.has(key(c, r))) ch = '=';
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 11});
placeStages(g, R, stages);
putPads(g, R, pads);
// The rapids on the road itself: boost pads on free cells with the next bend or whirlpool eight cells or
// more ahead, a pool of slow pads on the three cells before every bend.
const ahead = i => { for (let k = 1; k < R.length; k++) if (R.corners.includes(mod(i + k, R.length)) || R.at(i + k).hole) return k; return R.length; };
for (let i = 11; i < R.length; i++) {
  const p = R.at(i);
  if (p.hole || g.get(p.side, p.c, p.r) !== '.') continue;
  const k = ahead(i), bend = R.corners.includes(mod(i + k, R.length));
  if (k >= 8) g.set(p.side, p.c, p.r, '>');
  else if (bend && k <= 3) g.set(p.side, p.c, p.r, '=');
}

// ---- colours: white water in a red canyon.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  if (eddy.has(key(c, r))) return '#ff0066';
  if (canyon(side, q) && q.d <= 3) return q.d === 3 ? '#993300' : '#b41e46';
  if (q.d === 1) return '#b41e46';
  return side === T ? '#6600cc' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'rapids', name: 'Level 38', kind: 'Rapids', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
