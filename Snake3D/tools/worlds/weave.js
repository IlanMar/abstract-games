// Level 2 "Weave": an easy level on a bright tartan. A square world, an endless plaid cloth (the 48 x 48
// tile repeats) with two buttonholes cut through it. The road is a gold thread sewn through the cloth:
// it runs a wide zigzag on top, goes down through the first buttonhole, comes back underneath and up
// through the second one. Long straights and wide bends, every bend at least six cells from the next.
//   - stitches: short dashed walls along the fine lines of the plaid, well away from the road;
//   - pins: a few spikes stuck in the cloth, three cells or more from the road;
//   - every buttonhole is ringed with slow pads, so the snake slows down before it goes through;
//   - the long straights get a crystal, a boost strip and a long chain.
// Colour style, tartan: a gold thread over crimson, pink and violet checks, with fine lilac lines.
// Stages: long chains, a chain round every bend, a lead-in chain right up to each buttonhole and the
// next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 42];
const runs =
  'N18 E12 S8 E12 N14 D'         // top: a zigzag east and up through the first buttonhole
  + ' S20 E10 N26 W30 S6 D'      // underside: back down, round the east and west and down through the second
  + ' N20 W4 N4';                // top: back up and round into the start
// The buttonholes: three cells across and two along, at the dive cells.
const probe = road(new Grid(W, H), [...start, 'N'], runs);
const holes = new Set();
for (const p of probe.cells) if (p.hole) {
  const [ac, ar] = g.move(p.c, p.r, p.h), across = p.h === 'N' || p.h === 'S' ? 'E' : 'N', back = {E: 'W', N: 'S'}[across];
  for (const q of [[p.c, p.r], [ac, ar]]) for (const o of [q, g.move(...q, across), g.move(...q, back)]) { g.hole(...o); holes.add(o.join(',')); }
}
const R = road(g, [...start, 'N'], runs);
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over a buttonhole at ${p.c},${p.r}`);
const nearHole = (c, r) => R.nbrs(c, r).some(q => holes.has(q.join(',')));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the cloth, face by face.
const fine = (c, r) => mod(c, 12) === 8 || mod(r, 12) === 8;
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (nearHole(c, r)) ch = '=';                                                       // round a buttonhole
  else if (q.d >= 3 && fine(c, r) && mod(c + r, 4) < 2) ch = '#';                       // stitches
  else if (q.d >= 3 && hash(c * 2 + (side === T ? 0 : 1), r) < 0.02) ch = '^';         // pins
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [9, 12], lead: [7, 4], launch: 16});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, tartan: crimson, pink and violet checks, fine lilac lines, a gold thread.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (fine(c, r)) return '#ff44aa';
  const a = mod(c, 12) < 4, b = mod(r, 12) < 4;
  if (side === T) return a && b ? '#ff0066' : a || b ? '#ff0088' : '#6600cc';
  return a && b ? '#cc00ff' : a || b ? '#6600cc' : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'weave', name: 'Level 2', kind: 'Weave', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
