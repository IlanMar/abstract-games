// Level 74 "Cipher": a very hard square level. A square world of 48 x 48: a two-dimensional code of 41 x 41
// modules in a frame of void, read cell by cell. Three corners carry the code's finder marks, nested
// squares seven cells across: a ring of walls, a ring of floor and, in the middle, a hole three by three
// right through. Between them the timing lines run in alternate cells, and the data is scattered dark
// modules everywhere else. The road decodes it: on top it drops into the north-west mark, underneath it
// drops into the north-east mark, on top it runs off the south edge, underneath it drops into the
// south-west mark, and on top it comes home.
//   - dark modules: walls on top, slow pads underneath, never within two cells of the road; the
//     finder rings are walls on both faces, broken only where the road comes in;
//   - the timing lines: spikes on top, boost pads underneath, in alternate cells;
//   - an alignment mark near the south-east corner: a ring of spikes round a boost pad;
//   - long chains, '>=' gates between chains.
// Colour style, a screen at night: violet modules with pink finder squares, a gold road; underneath the
// same darker with a pink road.
// Stages: long chains, a chain through every bend, lead-in chains to the marks and the edge.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 44;                                           // the code: cells 4..44 both ways
g.floor(X0, X0, X1, X1);
const FINDERS = [[7, 7], [41, 7], [7, 41]];                      // centres of the finder marks
for (const [c, r] of FINDERS) g.hole(c - 1, r - 1, c + 1, r + 1);
const start = [28, 40];
const R = road(g, [...start, 'N'],
  'N20 W21 N11 D'          // top: up the middle, west and into the north-west mark
  + ' S6 E34 N5 D'         // underside: east along the top and into the north-east mark
  + ' S31 W10 S5 D'        // top: down the east and off the south edge
  + ' N6 W14 S2 W8 D'      // underside: west along the bottom and into the south-west mark
  + ' E20 N1');            // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cheb = (c, r, [a, b]) => Math.max(Math.abs(c - a), Math.abs(r - b));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const finder = (c, r) => { for (const f of FINDERS) { const d = cheb(c, r, f); if (d <= 4) return d; } return -1; };
const ALIGN = [36, 36];

// ---- the code, face by face.
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) {
  if (g.get(T, c, r) === ' ') continue;
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const f = finder(c, r), a = cheb(c, r, ALIGN);
    if (f >= 0) ch = f === 3 ? '#' : '.';                                                   // the finder marks
    else if (a <= 2) ch = a === 2 ? (side === T ? '^' : '=') : a === 0 ? '>' : '.';         // the alignment mark
    else if (r === 10 || c === 10) ch = mod(c + r, 2) === 0 ? (side === T ? '^' : '>') : '.';   // the timing lines
    else if (q.d >= 3 && hash(c, r) < 0.3) ch = side === T ? '#' : '=';                     // the data
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

// ---- colours, a screen at night: violet modules, pink finder squares, a gold road.
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ' && (c < X0 || r < X0 || c > X1 || r > X1)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  const f = finder(c, r);
  if (f >= 0 && f <= 3) return side === T ? '#ff0088' : '#b41e46';
  if (cheb(c, r, ALIGN) <= 2) return side === T ? '#ff0088' : '#b41e46';
  return side === T ? (hash(r, c) < 0.5 ? '#6600cc' : '#550077') : '#550077';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'cipher', name: 'Level 74', kind: 'Cipher', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
