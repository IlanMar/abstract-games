// Level 81 "Minefield": a very hard level. A hex world, an endless plane (the 48 x 56 tile repeats) sown
// with mines. Only the road and the cells beside it are swept; everywhere else every other cell may hold a
// mine (a spike), and a stray turn costs a segment at every step. Four shell craters take the road to the
// other face and back, so half the run is underneath. The thread is uneven: stages wait up to the edge of
// sight, crystals lead on through long gaps, and at some bends only the swept lane shows the turn.
//   - mines: spikes scattered at random from two cells out, thicker further out;
//   - barbed wire: broken lines of wall four cells out along every long stretch, on the road's own face;
//   - mud: slow pads in patches round the craters and in the low ground;
//   - craters: a hole of radius one one step past each dive, ringed by mud.
// Colour concept: a battlefield at dusk. On top a pale tomato lane through chocolate earth with wine mud,
// underneath a pink lane through violet; the craters glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 46];
const R = road(g, [...start, 'N'],
  'N16 NE10 N10 NE4 SE10 S6 D'     // top: up the west, a lean north-east, over the ridge and down into the first crater
  + ' N7 NE6 SE8 S14 D'            // underside: back up, over the east ridge and down the east side
  + ' N7 NW8 SW4 S12 D'            // top: back up, a dog-leg west and down into the third crater
  + ' N6 NW4 SW22 S10 D'           // underside: up, the long diagonal south-west and down into the fourth
  + ' N6');                        // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the craters: a disc of radius one one step past each dive, through both faces.
const craters = R.cells.filter(p => p.hole).map(p => g.step(p.c, p.r, p.h));
const crater = new Set();
for (const w of craters) for (const q of g.disk(...w, 1)) { g.hole(...q); crater.add(key(...q)); }
for (const p of R.cells) if (!p.hole && crater.has(key(p.c, p.r))) throw new Error(`the road runs into a crater at ${p.c},${p.r}`);
const mud = new Set();
for (const w of craters) for (const rad of [2, 3]) for (const q of g.ring(...w, rad)) mud.add(key(...q));

// Stretch lengths; long stretches run between barbed wire.
const lengthOf = new Map();
for (let i = 0; i < R.length; i++) lengthOf.set(R.seg[i], (lengthOf.get(R.seg[i]) || 0) + 1);
const wired = (side, q) => lengthOf.get(q.s) >= 10 && R.at(q.i).side === side;

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the field, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (crater.has(key(c, r))) continue;
  const q = R.local(side, c, r);
  if (q.d <= 1) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (q.d === 2) ch = n < 0.25 ? '^' : '.';
  else if (q.d === 3) ch = n < 0.4 ? '^' : n < 0.5 ? '=' : '.';
  else ch = n < 0.5 ? '^' : n < 0.6 ? '=' : '.';
  if (wired(side, q) && q.d === 4) ch = mod(q.u, 7) === 0 ? '.' : '#';
  if (mud.has(key(c, r))) ch = '=';
  if (/[#^]/.test(ch) && runout[side].has(key(c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [9, 4, 11, 6, 2, 8], crumbs: 2, steps: [5, 9, 11, 7, 4], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a battlefield at dusk.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (mud.has(key(c, r))) return '#ff0066';
  if (q.d === 1) return side === T ? '#b41e46' : '#cc00ff';
  if (wired(side, q) && q.d === 4) return side === T ? '#b41e46' : '#cc00ff';
  return side === T ? '#993300' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'minefield', name: 'Level 81', kind: 'Minefield', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
