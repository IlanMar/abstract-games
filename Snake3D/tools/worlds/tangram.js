// Level 84 "Tangram": a very hard level. A square world of 52 x 52 cells, mostly void: the seven pieces of
// a tangram, pulled apart, float over the dark as islands, and the road runs on from piece to piece over
// narrow bridges. It climbs a staircase across the big triangles, drops off the east edge, crosses under
// the square, and four dives take it over and under, so half the run is on the underside. The thread is
// uneven: stages wait up to the edge of sight, crystals lead on across the long pieces, and at some bends
// only the painted road shows the turn.
//   - every piece has its own pattern on each face: stripes of wall on the big triangles, spikes on the
//     medium one, slow pads on the square, boost pads on the parallelogram, a ring of spikes on the small
//     triangles;
//   - bridges: the land one cell either side of the road between the pieces, bare;
//   - the edges where the road dives: the dive cell, the cell past it and the cells either side stay void.
// Colour concept: a lacquered puzzle. On top a gold road over pieces in violet, wine, chocolate and bright
// purple, underneath a pale pink road over the same pieces darker.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 52, H = 52, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [6, 45];
const R = road(g, [...start, 'N'],
  'N11 E6 N6 E6 N6 E6 N6 E14 D'    // top: up and a staircase north-east across the big triangles, east off the edge
  + ' W6 S20 E12 N24 D'            // underside: back, down past the square, east and up the east side
  + ' S8 W8 S20 W14 D'             // top: down, a step west, down and west off the parallelogram
  + ' E6 S6 W22 S5 D'              // underside: back, down, west along the south and down off the edge
  + ' N6');                        // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const wrap = (c, r) => [mod(c, W), mod(r, H)];
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the pieces of a 32-cell tangram square, each pushed 3 cells out from the centre and inset by one.
const PIECES = [
  {name: 'big', pts: [[0, 0], [32, 0], [16, 16]]},
  {name: 'big', pts: [[0, 0], [16, 16], [0, 32]]},
  {name: 'small', pts: [[32, 0], [32, 16], [24, 8]]},
  {name: 'square', pts: [[24, 8], [32, 16], [24, 24], [16, 16]]},
  {name: 'small', pts: [[16, 16], [24, 24], [8, 24]]},
  {name: 'para', pts: [[0, 32], [8, 24], [24, 24], [16, 32]]},
  {name: 'medium', pts: [[32, 16], [32, 32], [16, 32]]},
];
const OX = 8, OY = 7;
PIECES.forEach((p, n) => {
  const cx = p.pts.reduce((s, q) => s + q[0], 0) / p.pts.length, cy = p.pts.reduce((s, q) => s + q[1], 0) / p.pts.length;
  const len = Math.hypot(cx - 16, cy - 16) || 1, sx = 3 * (cx - 16) / len, sy = 3 * (cy - 16) / len;
  p.n = n;
  p.poly = p.pts.map(([x, y]) => [x + sx + OX, y + sy + OY]);
});
const inside = (poly, x, y) => {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
    const cross = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / Math.hypot(bx - ax, by - ay);
    if (Math.abs(cross) < 1) return false;
    if (!sign) sign = Math.sign(cross); else if (Math.sign(cross) !== sign) return false;
  }
  return true;
};
const pieceAt = new Map();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const p of PIECES) if (inside(p.poly, c + 0.5, r + 0.5)) pieceAt.set(key(c, r), p);

// ---- the land: the pieces and the bridges (one cell either side of the road on either face).
const land = new Set(pieceAt.keys());
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const q of [[p.c, p.r], g.move(p.c, p.r, p.h)]) for (const [dx, dy] of [[0, 0], ...across]) pit.add(key(...wrap(q[0] + dx, q[1] + dy)));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a dive edge at ${p.c},${p.r}`);
for (const k of pit) { land.delete(k); pieceAt.delete(k); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the patterns, piece by piece and face by face. Nothing sharp next to the road on its own face.
const pattern = (p, side, c, r) => {
  const flip = side === B;
  switch (p.name) {
    case 'big': return (flip ? mod(c, 4) : mod(r, 4)) === 0 && mod(c + r, 7) !== 0 ? '#' : '.';
    case 'medium': return mod(c, 3) === 0 && mod(r, 3) === (flip ? 1 : 0) ? '^' : '.';
    case 'square': return mod(c + r, 2) === 0 ? '=' : '.';
    case 'para': return mod(flip ? c - r : c + r, 4) === 0 ? (flip ? '=' : '>') : '.';
    case 'small': return mod(c + 2 * r, 5) === 0 ? '^' : '.';
  }
  return '.';
};
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const p = pieceAt.get(k);
  if (!p) continue;
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = pattern(p, side, c, r);
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [8, 3, 11, 5, 2, 9], crumbs: 2, steps: [9, 4, 11, 6], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a lacquered puzzle.
const TOP = ['#6600cc', '#b41e46', '#cc00ff', '#993300', '#ff0066', '#cc00ff', '#b41e46'];
const BOTTOM = ['#993300', '#6600cc', '#b41e46', '#444444', '#6600cc', '#993300', '#444444'];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), p = pieceAt.get(key(c, r));
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (p) return (side === T ? TOP : BOTTOM)[p.n];
  return side === T ? '#b41e46' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'tangram', name: 'Level 84', kind: 'Tangram', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
