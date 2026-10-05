// Level 41 "Reactor": a hard level in toxic green. A square world of 48 x 48 cells: a reactor floor of
// 40 x 40 in a frame of void, with the core in the middle, an open shaft of five by five through both
// faces. The road dives into the core four times, from the north on top, from the east underneath, from
// the south on top and from the west underneath, and each time comes back out on the other face; between
// the dives it runs round the floor. No boost pads anywhere: the danger is all walls and spikes.
//   - cooling fins along the road: walls two cells out, left and right in turn every second cell, like
//     the teeth of a zip, and spikes three cells out between them;
//   - the core is ringed by spikes three cells out and a hazard ring of slow pads four cells out;
//   - out on the floor, cooling rods (blocks of wall two by two) on a grid of six and diagonal hazard
//     stripes of slow pads, offset by half a grid underneath.
// Colour style, toxic: an acid-green road (two greens) over olive, dark lead-grey floor, a violet glow
// round the core.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to the core
// and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 43, CORE = [24, 24];
g.floor(X0, X0, X1, X1);
g.hole(CORE[0] - 2, CORE[1] - 2, CORE[0] + 2, CORE[1] + 2);
const start = [8, 36];
const R = road(g, [...start, 'N'],
  'N24 E16 S9 D'            // top: up the west, east along the north and down into the core
  + ' N6 E12 S8 W9 D'       // underside: back up, east, down and west into the core
  + ' E8 S10 W10 N7 D'      // top: back east, down, west along the south and up into the core
  + ' S8 W10 N10 E7 D'      // underside: back down, west, up and east into the core
  + ' W10 S16 W4 N4');      // top: back west, down and round into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const cheb = (c, r) => Math.max(Math.abs(c - CORE[0]), Math.abs(r - CORE[1]));
for (const p of R.cells) if (p.hole && cheb(p.c, p.r) > 2) throw new Error(`the dive at ${p.c},${p.r} misses the core`);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the reactor floor, face by face.
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) for (const side of [T, B]) {
  if (cheb(c, r) <= 2) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const o = side === T ? 0 : 3;                                            // the grid underneath is offset
  let ch = '.';
  if (q.d === 2) ch = mod(q.u + (q.v > 0 ? 0 : 2), 4) === 0 ? '#' : '.';   // cooling fins, a zip
  else if (q.d === 3) ch = mod(q.u + (q.v > 0 ? 0 : 2), 4) === 2 ? '^' : '.';
  else if (q.d >= 4) {
    if (mod(c + o, 6) < 2 && mod(r + o, 6) < 2) ch = '#';                 // cooling rods
    else if (mod(c - r + o, 10) < 2) ch = '=';                             // hazard stripes
  }
  if (cheb(c, r) === 3) ch = '^';                                          // the containment ring
  else if (cheb(c, r) === 4) ch = '=';
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = q.d <= 1 ? '.' : '=';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: no launches and no gates, there are no boost pads in this world.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, toxic: acid green on lead grey.
const colorOf = side => (c, r) => {
  if (c < X0 || c > X1 || r < X0 || r > X1) return '#444444';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffff00' : '#ffcc00';
  if (cheb(c, r) <= 4) return '#cc00ff';
  if (q.d === 1) return '#ff9900';
  const o = side === T ? 0 : 3;
  if (q.d >= 4 && mod(c - r + o, 10) < 2) return '#ff9900';
  return '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'reactor', name: 'Level 41', kind: 'Reactor', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
