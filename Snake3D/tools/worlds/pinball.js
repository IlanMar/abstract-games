// Level 32 "Pinball": a middle-to-hard level. A hex world, an endless plane (the 44 x 48 tile repeats)
// made up as a pinball table. The road runs down four drains, each between a pair of flippers, and comes
// back on the other face, so half the run is under the table.
//   - on top the playfield: bumpers (a ring of wall round a kicker, a boost pad, with spikes on three
//     sides) on the open floor, rollover lanes of boost pads beside the road, and a pair of flippers, two
//     short slanting walls, opening towards every drain the road takes on top;
//   - underneath the cabinet: rails of slow pads with boost beads slanting across the floor (the ball
//     return), and the same flippers at the drains the road takes underneath;
//   - the drains: the dive cell and the cell past it, open through both faces.
// Colour concept: a cherry arcade cabinet. On top a pale pink road over wine with raspberry bumpers;
// underneath a caramel road over chocolate with violet rails.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right between the
// flippers into each drain and the next chain where the snake comes out; '>=' gates between stages on top
// and a launch on the long straights, like the plunger.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 44, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 42];
const R = road(g, [...start, 'N'],
  'N16 NE8 N10 D'                      // top: up the west side, a lean north-east and up into the first drain
  + ' S7 SE10 S12 SE6 NE6 N18 D'       // underside: back, south-east, down, a dip and up into the second
  + ' S8 SE5 S12 D'                    // top: down the east side into the third drain
  + ' N7 NE4 SE5 S12 D'                // underside: up, round the east edge and down into the fourth
  + ' N4');                            // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the drains.
const drain = new Set();
for (const p of R.cells) if (p.hole) for (const q of [[p.c, p.r], g.step(p.c, p.r, p.h)]) drain.add(key(...q));
for (const p of R.cells) if (!p.hole && drain.has(key(p.c, p.r))) throw new Error(`the road runs over a drain at ${p.c},${p.r}`);
for (const k of drain) g.hole(...k.split(',').map(Number));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// The flippers: on the face the road dives from, two cells out from the road on the last cells before the
// drain, and three cells out a little further back, so the pair slants open away from the drain.
const flipper = {top: new Set(), bottom: new Set()};
for (const k of R.dives) {
  const side = R.at(k - 1).side;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const q = R.local(side, c, r), back = k - q.u;
    if (Math.abs(q.i - k) > 8 || drain.has(key(c, r))) continue;
    if ((q.d === 2 && back >= 1 && back <= 3) || (q.d === 3 && back >= 3 && back <= 5)) flipper[side].add(key(c, r));
  }
}

// ---- bumpers on the open playfield: the farthest cells from the road, kept apart.
const bumpers = [];
{
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cand.push([c, r, R.local(T, c, r).d]);
  cand.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
  for (const [c, r, d] of cand) {
    if (d < 5) break;
    if ([...drain].some(k => g.disk(c, r, 3).some(q => key(...q) === k))) continue;
    if (bumpers.some(m => g.disk(...m, 6).some(q => q[0] === c && q[1] === r))) continue;
    bumpers.push([c, r]);
  }
}
const bumperAt = new Map();
bumpers.forEach(m => { for (let k = 0; k <= 2; k++) g.ring(...m, k).forEach((q, j) => bumperAt.set(key(...q), {k, j})); });

// ---- the playfield on top.
const xy = (c, r) => [c * 0.866, r + 0.5 * (c & 1)];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (drain.has(key(c, r))) continue;
  const q = R.local(T, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (q.d === 2 && mod(q.u, 5) < 2) ch = '>';                                // rollover lanes
  const bm = bumperAt.get(key(c, r));
  if (bm) ch = bm.k === 0 ? '>' : bm.k === 1 ? '#' : mod(bm.j, 4) === 0 ? '^' : '.';
  if (flipper.top.has(key(c, r))) ch = '#';
  if (/[#^]/.test(ch) && (q.d <= 1 || runout.top.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
// ---- the cabinet underneath: slanting rails of slow pads with boost beads.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (drain.has(key(c, r))) continue;
  const q = R.local(B, c, r);
  if (q.d === 0) continue;
  const [x, y] = xy(c, r), rail = mod(Math.round(y - 0.58 * x), 6);
  let ch = '.';
  if (rail === 0 && q.d >= 2) ch = mod(c, 4) === 0 ? '>' : '=';
  if (q.d === 1 && mod(q.u, 6) === 0) ch = '=';
  if (flipper.bottom.has(key(c, r))) ch = '#';
  if (/[#^]/.test(ch) && (q.d <= 1 || runout.bottom.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(B, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [6, 3], launch: 15, pair: 4, gate: i => R.at(i).side === T});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: a cherry arcade cabinet.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  if (side === T && bumperAt.has(key(c, r))) return '#ff0066';
  if (flipper[side].has(key(c, r))) return '#ff0066';
  if (q.d === 1) return side === T ? '#ff0088' : '#b41e46';
  if (side === T) return mod(Math.floor(q.d / 2), 2) ? '#b41e46' : '#993300';
  const [x, y] = xy(c, r);
  return mod(Math.round(y - 0.58 * x), 6) < 2 ? '#6600cc' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'pinball', name: 'Level 32', kind: 'Pinball', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
