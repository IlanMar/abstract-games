// Level 75 "Pyramids": a hard square level with relief. A square world of 54 x 54, an endless desert: a grid
// of square pyramids thirteen cells across, three cells high at the apex, with streets five cells wide
// between them. Four of the nine pyramids have a burial shaft at the apex, a hole right through. The road
// runs along the streets, turns up the middle of a face, climbs to the apex and drops down the shaft; it
// comes out on the other face, runs down that face, along the streets to the next pyramid and up into its
// shaft, four times, then home along the streets on top.
//   - the faces are stepped: a band of slow pads every third step of the pyramid, cleared on the road;
//   - the pyramids without a shaft carry a capstone spike, and an obelisk (a wall with a spike on top)
//     stands at every corner of every pyramid;
//   - palms along the streets: spikes in the middle of the street crossings, clear near the road;
//   - underneath, the tomb corridors: lines of boost pads along the middle of every street;
//   - long chains, '>=' gates between chains.
// Colour style, a desert at dusk: every face its own shade of sand (lit east, shaded west), violet
// streets, a gold road; underneath the same darker with a pink road.
// Stages: long chains, a chain up every face to a shaft, lead-in chains to the shafts.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 54, H = 54, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const P = 18, HALF = 6;                          // pitch; a pyramid spans its centre +- 6
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const centre = v => Math.floor(v / P) * P + HALF;
const SHAFTS = [[24, 24], [42, 6], [6, 24], [24, 42]];
for (const [c, r] of SHAFTS) g.hole(c, r);
const start = [15, 45];
const R = road(g, [...start, 'N'],
  'N12 E9 N8 D'                  // top: up the street and up the south face of the middle pyramid
  + ' S8 E27 N17 W9 N8 D'        // underside: down, east, north and up into the north-east pyramid
  + ' S8 W36 S9 D'               // top: down, west along the street and up into the west pyramid
  + ' N8 E9 S35 E9 N8 D'         // underside: down, south and up into the south pyramid
  + ' S8 W9 N5');                // top: down and home

// ---- relief: a square pyramid on every block, its height half a cell for every step in from the edge.
const ring = (c, r) => Math.max(Math.abs(c - centre(c)), Math.abs(r - centre(r)));    // 0 at the apex
const onPyramid = (c, r) => mod(c, P) <= 2 * HALF && mod(r, P) <= 2 * HALF;
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (onPyramid(c, r) ? 0.5 * (HALF - ring(c, r)) : 0)));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const shaft = (c, r) => SHAFTS.some(([a, b]) => a === centre(c) && b === centre(r));

// ---- the desert, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (g.get(T, c, r) === ' ') continue;
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const x = mod(c, P), y = mod(r, P);
    if (onPyramid(c, r)) {
      const k = ring(c, r);
      if (k === 0) ch = shaft(c, r) ? '.' : '^';                                         // capstones
      else if (k === HALF && (x === 0 || x === 2 * HALF) && (y === 0 || y === 2 * HALF)) ch = '#';   // obelisks
      else if (side === T && k > 0 && k < HALF && mod(k, 3) === 0) ch = '=';             // the steps
    } else if (side === T && mod(c, P) === 15 && mod(r, P) === 15) ch = '^';             // palms at the crossings
    else if (side === B && (x === 15 || y === 15) && mod(c + r, 2) === 0) ch = '>';      // tomb corridors
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, a desert at dusk: a sand shade per face, violet streets, a gold road.
const FACE = {top: {N: '#ff3300', E: '#ff5a28', S: '#b41e46', W: '#993300', apex: '#ff3300'},
  bottom: {N: '#993300', E: '#b41e46', S: '#993300', W: '#550077', apex: '#993300'}};
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  if (!onPyramid(c, r)) return side === T ? '#6600cc' : '#550077';
  const dx = c - centre(c), dy = r - centre(r);
  const face = !dx && !dy ? 'apex' : Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'E' : 'W') : (dy > 0 ? 'S' : 'N');
  return FACE[side][face];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'pyramids', name: 'Level 75', kind: 'Pyramids', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const [a, b] of [[1, 0], [0, 1]]) worst = Math.max(worst, Math.abs(height[r][c] - height[mod(r + b, H)][mod(c + a, W)]));
  console.log('steepest step:', worst);
}
