// Level 36 "Sieve": a middle level. A square world, an endless plane (the 48 x 48 tile repeats) laid out on
// a grid of eight: lanes run along every eighth column and line (4, 12, 20 ...), and at every other
// crossing of the gaps between them, in a chequer, the plate is pierced by a square hole of three by
// three. The road runs along the lanes and four times turns off into a hole: it drops through it, comes
// back on the other face under its own spur, crosses the lane and runs on through the gap where no hole
// is, up to the next lane. Half the run is underneath.
//   - every hole has a rim of slow pads two cells out and a spike at each corner three cells out;
//   - where the chequer leaves no hole there is a plug: on top a block of wall round a boost pad, underneath
//     a cross of boost pads with slow pads in its corners;
//   - lanes the road does not take carry a dashed line of boost pads on top, of slow pads underneath.
// Colour concept: a copper sieve. On top a pale pink road over violet plate and wine lanes, underneath a
// caramel road over chocolate and wine; the rims raspberry on both.
// Stages: long chains along the lanes, a lead-in chain right up to each hole and the next chain where the
// snake comes out; '>=' gates between stages on top and a launch on the long lanes.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [4, 36];
const R = road(g, [...start, 'N'],
  'N16 E4 S2 D'                // top: up the west lane, east and down into the first hole
  + ' N11 E16 N2 D'            // underside: back up through the gap, east along a lane, up into the second
  + ' S11 E8 S10 D'            // top: down through the gap, east, down into the third
  + ' N11 E8 S2 D'             // underside: up through the gap, east, down into the fourth
  + ' N11 E4 S32 E8 N8');      // top: up through the gap, the long east lane south and round into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// Holes and plugs, centred where the gaps between lanes cross: a hole where (i + j) is even.
const cheb = (c, r, cc, cr) => Math.max(Math.abs(mod(c - cc + W / 2, W) - W / 2), Math.abs(mod(r - cr + H / 2, H) - H / 2));
const centreOf = (c, r) => [Math.round(c / 8) * 8 % W, Math.round(r / 8) * 8 % H];
const isHole = ([cc, cr]) => (cc / 8 + cr / 8) % 2 === 0;
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const ctr = centreOf(c, r);
  if (isHole(ctr) && cheb(c, r, ...ctr) <= 1) g.hole(c, r);
}
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over a hole at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a hole`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the plate, face by face.
const lane = (c, r) => mod(c, 8) === 4 || mod(r, 8) === 4;
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const ctr = centreOf(c, r), ring = cheb(c, r, ...ctr), dx = Math.abs(mod(c - ctr[0] + W / 2, W) - W / 2), dy = Math.abs(mod(r - ctr[1] + H / 2, H) - H / 2);
  let ch = '.';
  if (isHole(ctr)) {
    if (ring === 2) ch = '=';
    else if (ring === 3 && dx === 3 && dy === 3) ch = '^';
  } else if (ring <= 1) {
    if (side === T) ch = ring === 0 ? '>' : '#';
    else ch = dx === 0 || dy === 0 ? '>' : '=';
  }
  if (ch === '.' && lane(c, r) && q.d >= 2 && mod(c + r, 3) === 0) ch = side === T ? '>' : '=';
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 12], lead: [6, 4], launch: 18, pair: 3, gate: i => R.at(i).side === T});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: a copper sieve.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  const ctr = centreOf(c, r);
  if (isHole(ctr) && cheb(c, r, ...ctr) <= 3) return '#ff0066';
  if (lane(c, r)) return '#b41e46';
  return side === T ? '#6600cc' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'sieve', name: 'Level 36', kind: 'Sieve', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
