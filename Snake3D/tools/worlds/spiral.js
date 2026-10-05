// Level 3 "Spiral": an easy-to-medium level on a giant lollipop. A square world, an endless candy plate
// (the 36 x 36 tile repeats) with a square spiral swirled into it, arms six cells apart, and a hole at
// the heart. The road winds into the spiral on top, drops through the heart, winds back out along the
// same swirl underneath and comes up through a hole by the start.
//   - the swirl: a candy wall between the arms, three cells from the road on either side, broken into
//     short sticks with a sprinkle (a spike) in every gap;
//   - the long straights get a crystal, a boost strip and a long chain; the arms shorten as the spiral
//     tightens, so the bends come quicker and quicker towards the heart.
// Colour style, lollipop: a gold road over a swirl of pink and rose, with a white candy line between the
// arms; underneath a grape swirl of violet and purple with a pink line.
// Stages: long chains along the arms, a chain round every bend, a lead-in chain right up to each hole
// and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 36, H = 36, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [4, 32];
const runs =
  'N28 E28 S28 W22 N22 E16 S16 W10 N8 D'         // top: into the spiral and down through the heart
  + ' S9 E10 N16 W16 S22 E22 N28 W28 S29 D'      // underside: back out along the same swirl, down through the hole
  + ' N2';                                       // top: up into the start
// The holes: three cells across and two along, at the dive cells.
const probe = road(new Grid(W, H), [...start, 'N'], runs);
const holes = new Set();
for (const p of probe.cells) if (p.hole) {
  const [ac, ar] = g.move(p.c, p.r, p.h), across = p.h === 'N' || p.h === 'S' ? 'E' : 'N', back = {E: 'W', N: 'S'}[across];
  for (const q of [[p.c, p.r], [ac, ar]]) for (const o of [q, g.move(...q, across), g.move(...q, back)]) { g.hole(...o); holes.add(o.join(',')); }
}
const R = road(g, [...start, 'N'], runs);
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over a hole at ${p.c},${p.r}`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the swirl, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (R.nbrs(c, r).some(o => holes.has(o.join(',')))) ch = '=';           // round a hole
  else if (q.d === 3) ch = mod(q.u, 6) < 3 ? '#' : mod(q.u, 6) === 4 ? '^' : '.';   // a candy stick, a sprinkle
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [9, 12], lead: [7, 4], launch: 16});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, lollipop: pink and rose on top, grape underneath, a candy line between the arms.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (q.d >= 3) return side === T ? '#ffffff' : '#ff0088';
  if (side === T) return mod(q.s, 2) ? '#ff0088' : '#ff44aa';
  return mod(q.s, 2) ? '#6600cc' : '#cc00ff';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'spiral', name: 'Level 3', kind: 'Spiral', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
