// Level 57 "Tetris": a hard square level, the well of a falling-block game. A square world of 40 x 56: a
// tall well of 28 x 52 in a frame of void, with tetrominoes everywhere, each mino two cells by two. The
// road climbs the well, zigzags down it, drops into an O-shaped hole, runs underneath round the well,
// drops into an I-shaped hole near the floor and comes home along the bottom on top.
//   - the pieces are of three kinds: stone blocks (walls), lit pieces of boost pads and lit pieces of
//     slow pads, plus painted pieces on the floor; all seven shapes in four turns, never within a cell
//     of the road (pads and paint may lie beside it) and never touching each other;
//   - underneath, the pieces turn over: stone becomes spikes round a wall, pads swap;
//   - long chains, '>=' gates between chains.
// Colour style, arcade: a white road on a deep violet well, the painted pieces in the seven arcade
// colours of the pink family (magenta, gold, purple, caramel, sand, raspberry, lilac).
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to each
// hole and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 40, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 6, X1 = 33, Y0 = 2, Y1 = 53;
g.floor(X0, Y0, X1, Y1);
g.hole(22, 31, 25, 34);                     // the O
g.hole(12, 50, 19, 51);                     // the I
const start = [9, 46];
const R = road(g, [...start, 'N'],
  'N36 E20 S12 W16 S10 E8 D'          // top: up the well, zigzag down and into the O
  + ' W12 N16 E18 S34 W8 D'           // underside: back west, up, east, down the well and into the I
  + ' E8 S2 W18 N6');                 // top: out of the I and home along the bottom
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a hole`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the pieces: seven shapes, four turns, minos of two by two cells.
const SHAPES = {
  I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]],
  L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};
const NAMES = Object.keys(SHAPES);
const turn = (ms, t) => ms.map(([x, y]) => { for (let k = 0; k < t; k++) [x, y] = [-y, x]; return [x, y]; });
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pieces = {top: [], bottom: []};
const used = {top: new Set(), bottom: new Set()};
for (const side of [T, B]) {
  for (let attempt = 0; attempt < 4000; attempt++) {
    const name = NAMES[Math.floor(rnd() * 7)];
    const ms = turn(SHAPES[name], Math.floor(rnd() * 4));
    const ox = X0 + 1 + Math.floor(rnd() * (X1 - X0)), oy = Y0 + 1 + Math.floor(rnd() * (Y1 - Y0));
    const cells = [];
    for (const [mx, my] of ms) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) cells.push([ox + mx * 2 + a, oy + my * 2 + b]);
    const kind = ['stone', 'boost', 'paint', 'slow', 'paint'][pieces[side].length % 5];
    const gap = kind === 'stone' ? 2 : 1;               // stone never beside the road, pads and paint may be
    const ok = cells.every(([c, r]) => c > X0 && c < X1 && r > Y0 && r < Y1 && g.get(T, c, r) !== ' '
      && R.local(side, c, r).d >= gap && !(kind === 'stone' && runout[side].has(key(c, r)))
      && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => !used[side].has(key(c + a, r + b))));
    if (!ok) continue;
    pieces[side].push({name, cells, kind});
    for (const [c, r] of cells) used[side].add(key(c, r));
  }
}
const paint = {top: new Map(), bottom: new Map()};
for (const side of [T, B]) for (const {name, cells, kind} of pieces[side]) {
  for (const [c, r] of cells) {
    let ch = '.';
    if (kind === 'stone') ch = side === T ? '#' : ((c + r) % 2 ? '^' : '#');
    else if (kind === 'boost') ch = side === T ? '>' : '=';
    else if (kind === 'slow') ch = side === T ? '=' : '>';
    else paint[side].set(key(c, r), name);
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 18, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, arcade: white road, deep violet well, painted pieces in the pink family.
const ARCADE = {I: '#ff0088', O: '#ff6600', T: '#cc00ff', S: '#ff3300', Z: '#ff5a28', J: '#ff0066', L: '#ff44aa'};
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ' || c < X0 || c > X1 || r < Y0 || r > Y1) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd';
  if (paint[side].has(key(c, r))) return ARCADE[paint[side].get(key(c, r))];
  if (q.d === 1) return side === T ? '#993300' : '#444444';
  return side === T ? '#6600cc' : '#330066';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'tetris', name: 'Level 57', kind: 'Tetris', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), pieces.top.length, pieces.bottom.length);
