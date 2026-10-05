// Level 46 "Stars and Stripes": a hard level in the style of America. A square world, an endless flag
// (the 60 x 52 tile repeats): thirteen stripes, red and white, four cells each, and in the corner the
// canton with its fifty stars, and every star is a hole right through both faces. The road runs the
// stripes like a highway and threads the canton between the stars, and four times it drops through a star
// on the rim of the canton: from the east on top, from the south underneath, from the south on top and
// from the west underneath, so half the run is underneath.
//   - lane dividers: dashed walls along the edges of the stripes, never right beside the road;
//   - fireworks: bursts of spikes out on the stripes, a different show underneath;
//   - the canton itself is the hard part: fifty holes, one cell each, three cells apart.
// No slow pads: the floor is red. Colour style, America: a gold road over red and white stripes and a
// deep blue-violet canton.
// Stages: long chains along the stripes, one chain through every pair of close bends, a lead-in chain
// right up to each star the road drops through and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 60, H = 52, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const CW = 24, CH = 28;                                   // the canton: columns 0..23, lines 0..27
// Fifty stars: nine lines three apart, six and five in turn, four apart.
const STARS = [];
for (let j = 0; j < 9; j++) for (let i = 0; i < (j % 2 ? 5 : 6); i++) STARS.push([(j % 2 ? 4 : 2) + 4 * i, 2 + 3 * j]);
for (const s of STARS) g.hole(...s);
const start = [41, 47];
const R = road(g, [...start, 'N'],
  'N17 W13 N16 W5 D'                     // top: up the stripes and west into the canton's east star
  + ' E8 S26 W24 N13 D'                  // underside: back, down, west and up into its south-west star
  + ' S6 E5 N19 E8 N9 W8 N8 E7 N21 D'    // top: back, up through the canton between the stars, round and into a south star
  + ' S6 W5 N31 W16 S7 E4 D'             // underside: back, up through the canton, round over the edge and into a west star
  + ' W7 S41 W14 N2');                   // top: back and down the stripes into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const canton = (c, r) => c < CW && r < CH;
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over a star at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a star`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the flag, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ' || canton(c, r)) continue;
  const q = R.local(side, c, r);
  if (q.d < 2) continue;
  const o = side === T ? 0 : 4;
  let ch = '.';
  if (mod(r, 4) === 0 && mod(c + o, 8) < 3) ch = '#';                                  // a lane divider
  else {
    // Fireworks: a burst every so often, a spike at the centre and four round it.
    const bx = Math.floor((c + o) / 10), by = Math.floor(r / 8), cx = bx * 10 + 5 - o, cy = by * 8 + 2;
    if (hash(bx, by * 7 + (side === T ? 0 : 3)) < 0.45) {
      const dx = c - cx, dy = r - cy;
      if ((dx === 0 && dy === 0) || (Math.abs(dx) + Math.abs(dy) === 2 && dx * dy === 0)) ch = '^';
    }
  }
  if (/[#^]/.test(ch) && runout[side].has(key(c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: no launches, they end in a slow pad.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, America: a gold road over red and white stripes, a blue-violet canton.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (canton(c, r)) return side === T ? '#6600cc' : '#444444';
  const red = mod(Math.floor(r / 4), 2) === 0;
  if (side === T) return red ? '#ff0000' : '#ffffff';
  return red ? '#b41e46' : '#999999';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'stars-stripes', name: 'Level 46', kind: 'Stars and Stripes', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
