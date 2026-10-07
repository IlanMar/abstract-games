// Level 54 "Velodrome": a hard square level with relief, a banked cycle track. A square world of 56 x 40:
// a bowl in a frame of void. The infield in the middle is flat; round it the track banks up, four tenths
// of a cell for every cell out, to a rim four cells high. The road laps the inner lane low down, climbs
// across the banking to the outer lane high up, laps that, runs off the rim at the south-west, comes back
// underneath the bowl, drops into a pit in the infield and comes out on top to the start line.
//   - the fence: a ring of walls halfway up the banking, between the two lanes, broken where the road
//     crosses it, so a missed bend on the inner lane ends against it;
//   - the lanes are lit: boost pads beside the road on the straights, slow pads into every bend;
//   - a blue band of slow pads round the top of the rim, spikes scattered on the infield;
//   - underneath, the ribs of the stand: rings of walls with gaps.
// Colour style, velodrome: a white road on a sand-coloured wooden track, a chocolate infield, a wine rim;
// underneath grey concrete.
// Stages: long chains along the straights with launches, a chain through every bend, a lead-in chain to
// the rim and to the pit and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 40, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const IN = [16, 14, 39, 25];                 // the infield: c0, r0, c1, r1
const PIT = [20, 20];
g.floor(4, 2, 51, 37);
g.hole(PIT[0] - 1, PIT[1] - 1, PIT[0] + 1, PIT[1] + 1);
const start = [24, 27];
const R = road(g, [...start, 'E'],
  'E17 N15 W27 S22'          // top: the inner lane, and down the west banking to the outer lane
  + ' E34 N29 W41 S32 D'     // top: the outer lane, and off the rim at the south-west
  + ' N6 E36 N24 W29 S20 E6 N6 D'   // underside: round under the bowl and up into the pit
  + ' S6 E4');               // top: out of the pit and on to the start line
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// ---- relief: the distance from the infield, four tenths of a cell up per cell, up to four cells.
const dist = (c, r) => Math.hypot(Math.max(IN[0] - c, 0, c - IN[2]), Math.max(IN[1] - r, 0, r - IN[3]));
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (g.get(T, c, r) === ' ' ? 0 : Math.round(Math.min(dist(c, r), 10) * 0.4 * 4) / 4)));
const hAt = (c, r) => height[r][c];

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const toCorner = i => { let n = 0; while (n < 60 && !R.corners.includes(i + n) && !R.at(i + n).hole) n++; return n; };

// ---- the bowl, face by face.
for (let r = 2; r <= 37; r++) for (let c = 4; c <= 51; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const d = dist(c, r);
  let ch = '.';
  if (side === T) {
    if (q.d === 1) {
      const n = toCorner(q.i);
      if (n >= 1 && n <= 3) ch = '=';
      else if (n >= 6 && mod(q.u, 2) === 0) ch = '>';
    } else if (d >= 5 && d < 6) ch = '#';                                  // the fence
    else if (d >= 11) ch = '=';                                             // the blue band
    else if (d === 0 && q.d >= 2 && hash(c, r) < 0.1) ch = '^';             // the infield
  } else if (q.d >= 2) {
    const ring = Math.round(d);
    if (ring >= 2 && mod(ring, 3) === 0 && mod(c + r, 6) !== 0) ch = '#';   // the ribs of the stand
    else if (d === 0 && hash(c * 3 + 1, r) < 0.08) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = q.d <= 1 ? '.' : (side === T ? '.' : '.');
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 18, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, velodrome: white road, sand banking, chocolate infield, wine rim; grey underneath.
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  const d = dist(c, r);
  if (side === B) return mod(Math.round(d), 3) === 0 ? '#444444' : '#999999';
  if (d === 0) return '#993300';
  if (d >= 11) return '#b41e46';
  return mod(Math.floor(d), 2) ? '#ff5a28' : '#ff3300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'velodrome', name: 'Level 54', kind: 'Velodrome', start: [...start, 'E'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let i = 0; i < R.length; i++) { const a = R.at(i), b = R.at(i + 1); if (!a.hole && !b.hole) worst = Math.max(worst, Math.abs(hAt(b.c, b.r) - hAt(a.c, a.r))); }
  console.log('steepest step on the road:', worst);
}
