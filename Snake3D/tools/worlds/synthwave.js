// Level 42 "Synthwave": a hard level in retro neon. A square world, an endless plane (the 56 x 56 tile
// repeats) under a neon grid, with two great setting suns sunk into the floor. The lower half of each sun
// is cut by slits right through the plate, and the road twice runs straight at a sun from the south and
// drops through its lowest slit to the other face; underneath it races back, round a square wave and up
// into the second sun.
//   - the neon grid: lines of boost pads every sixth column and line on top, of slow pads underneath,
//     never right beside the road;
//   - wireframe mountains along the long straights: a zigzag ridge of wall with spikes on the peaks;
//   - palms out on the open floor: a spike for the trunk and fronds of slow pads.
// Colour style, synthwave: a mint road over deep violet, purple mountains, magenta beside the road and
// suns that run from magenta at the top to gold at the bottom.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to each sun
// and the next chain where the snake comes out; launches on the long straights.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const SUNS = [[16, 16], [42, 40]], RS = 7;
const start = [6, 50];
const R = road(g, [...start, 'N'],
  'N14 E5 N8 E5 N5 D'                 // top: up a staircase and straight into the first sun
  + ' S30 E9 N6 E8 S6 E9 N5 D'        // underside: back south, a square wave east and up into the second sun
  + ' S8 W12 N6 W12 S6 W12 N4');      // top: back south, a square wave west and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const wrapd = (a, n) => mod(a + n / 2, n) - n / 2;

// ---- the suns: a disc of radius seven; its slits are the lines 2, 4 and 6 below the centre.
const sunAt = (c, r) => {
  for (const [sc, sr] of SUNS) {
    const dx = wrapd(c - sc, W), dy = wrapd(r - sr, H);
    if (dx * dx + dy * dy <= RS * RS + 2) return {dx, dy};
  }
  return null;
};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const s = sunAt(c, r); if (s && s.dy > 0 && s.dy % 2 === 0) g.hole(c, r); }
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over a slit at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a slit`);

// Stretch lengths: long stretches get mountains.
const lengthOf = new Map();
for (let i = 0; i < R.length; i++) lengthOf.set(R.seg[i], (lengthOf.get(R.seg[i]) || 0) + 1);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the floor, face by face.
const tri = u => Math.abs(mod(u, 8) - 4);                                 // 0..4..0, a ridge
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (q.d >= 2 && (mod(c, 6) === 0 || mod(r, 6) === 0)) ch = side === T ? '>' : '=';   // the neon grid
  if (lengthOf.get(q.s) >= 9 && R.at(q.i).side === side && q.v > 0 && q.d >= 2 && q.d <= 6) {
    const h = 2 + tri(q.u);
    if (q.d === h) ch = h === 6 ? '^' : '#';                               // a wireframe ridge
    else if (q.d < h) ch = '.';
  }
  if (q.d >= 6 && mod(c, 12) === 9 && mod(r, 12) === 3) ch = '^';          // a palm trunk
  if (q.d >= 5 && Math.max(Math.abs(wrapd(c - 9, 12)), Math.abs(wrapd(r - 3, 12))) === 1) ch = '=';   // its fronds
  if (sunAt(c, r)) ch = '.';
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3], launch: 14});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, synthwave: mint, magenta, purple and a gold sunset.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#00ff99' : '#ffffff';
  const s = sunAt(c, r);
  if (s) return s.dy < -2 ? '#ff0088' : s.dy < 2 ? '#cc00ff' : '#ff6600';
  if (q.d === 1) return '#ff0088';
  if (lengthOf.get(q.s) >= 9 && R.at(q.i).side === side && q.v > 0 && q.d >= 2 && q.d <= 2 + tri(q.u)) return '#cc00ff';
  return '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'synthwave', name: 'Level 42', kind: 'Synthwave', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
