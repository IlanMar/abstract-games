// Level 45 "Red Star": a hard level in the style of the Soviet Union. A square world, an endless red
// parade square (the 56 x 52 tile repeats) with a moat along its north side under the Kremlin wall, and in
// the middle a great five-pointed gold star whose heart is an open shaft through both faces. The road runs
// the square from end to end: three times it runs north straight into the moat and drops through it, and
// three times it runs into the heart of the star (from the west underneath, from the north underneath and
// from the south on top), so half the run is underneath.
//   - the Kremlin wall: a battlement of wall along the south bank of the moat, with a tower every
//     fourteen columns and a ruby star (a spike) on every tower;
//   - the parade: ranks of soldiers (walls) on a grid of four, each with a bayonet (a spike) in front,
//     a different rank underneath, never right beside the road;
//   - the long straights step aside in a marching jog.
// No slow pads: the floor is red. Colour style, Soviet: a gold road over red, a gold star, a dark brick
// wall and a darker red underneath.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to the moat
// and the star and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 52, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const MOAT = [6, 7], STAR = [30, 30], SR = 11, TOWERS = [13, 27, 55];
g.hole(0, MOAT[0], W - 1, MOAT[1]);
g.hole(STAR[0] - 1, STAR[1] - 1, STAR[0] + 1, STAR[1] + 1);
const start = [6, 46];
const R = road(g, [...start, 'N'],
  'N12 E5 N12 W5 N14 D'          // top: north up the square in a marching jog, into the moat
  + ' S12 E14 S11 E8 D'          // underside: back, east and into the heart of the star from the west
  + ' W8 N10 E20 N12 D'          // top: back out of the star, east and north into the moat
  + ' S10 W11 S11 D'             // underside: back, west and down into the star from the north
  + ' N6 E14 S20 W14 N11 D'      // top: back up, round to the south and into the star from below
  + ' S10 E20 N10 W5 N12 E5 N11 D'   // underside: back down, east and north in a jog into the moat
  + ' S12 E4 S14 W4 S15 E12 N2');    // top: back south in a jog and round into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the moat or the star`);

// ---- the star: five points, outer radius SR, inner radius 0.42 SR, one point to the north.
const inStar = (c, r) => {
  const x = c - STAR[0], y = STAR[1] - r, rr = Math.hypot(x, y);
  if (rr > SR + 0.5) return false;
  const a = mod(Math.atan2(x, y), 2 * Math.PI / 5) - Math.PI / 5;   // 0 between two points
  const ri = 0.42 * SR, t = Math.abs(a) / (Math.PI / 5);            // 0 at the notch, 1 at a point
  // The edge from the notch (radius ri) out to a point (radius SR), in polar terms.
  const ax = ri * Math.cos(Math.PI / 5), ay = ri * Math.sin(Math.PI / 5), bx = SR, by = 0;
  const th = Math.PI / 5 - Math.abs(a), dx = bx - ax, dy = by - ay;
  const den = Math.sin(th) * dx - Math.cos(th) * dy;
  const edge = (ax * dy - ay * dx) / -den;
  return t >= 0 && rr <= Math.abs(edge) + 0.5;
};
const wall = r => r === MOAT[1] + 1 || r === MOAT[1] + 2;          // the Kremlin wall, south of the moat
const tower = c => TOWERS.some(t => Math.abs(c - t) <= 1);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the square, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const o = side === T ? 0 : 2;
  let ch = '.';
  if (inStar(c, r)) ch = '.';
  else if (wall(r)) ch = r === MOAT[1] + 1 || mod(c, 3) !== 1 ? '#' : '.';                 // the battlement
  else if (r === MOAT[1] + 3 && tower(c)) ch = TOWERS.includes(c) ? '^' : '#';   // a tower, its star
  else if (q.d >= 2 && mod(r, 4) === 0 && mod(c + o, 4) === 1) ch = '#';                     // a soldier
  else if (q.d >= 2 && mod(r, 4) === 3 && mod(c + o, 4) === 1 && r > MOAT[1] + 4) ch = '^';  // a bayonet
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: no launches, they end in a slow pad.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, Soviet: a gold road on red, a gold star, a brick wall.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (inStar(c, r)) return '#ff6600';
  if (wall(r) || (r === MOAT[1] + 3 && tower(c)) || r === MOAT[0] - 1) return '#993300';
  if (q.d === 1) return '#ff1111';
  return side === T ? '#ff0000' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'red-star', name: 'Level 45', kind: 'Red Star', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
