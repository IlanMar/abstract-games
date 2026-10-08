// Level 83 "Ladders": a hard level. A square world of 50 x 50 cells, an endless plane printed as a board
// game of ladders and snakes. The road plays the board on top square by square, row after row up the
// west half, falls off the top row through the end square to the underside, plays back down the east half
// underneath and comes up through the start square. The thread is uneven: stages wait up to the edge of
// sight, crystals lead on along the long rows, and at some turns only the painted road shows the way.
//   - ladders: two rails of boost pads climbing the board, with walls for rungs between them, crossing
//     the road rows; a ladder taken along its rails throws the snake up the board;
//   - snakes: wavy lines of slow pads down the board with a fang (a spike) at the head;
//   - the board squares: 6 x 6, centred on the road rows; underneath a pip (a spike) in the middle of
//     every square far from the road;
//   - the end squares: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: an old board game. On top a gold road over violet and wine squares, underneath a pale
// pink road over chocolate and wine; the end squares glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 50, H = 50, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 46];
const R = road(g, [...start, 'E'],
  'E26 N6 W26 N6 E26 N6 W26 N14 D'   // top: four rows up the board, west to east and back, and up off the top
  + ' S6 E30 S8 W12 S8 E12 S11'      // underside: back, across the board and down the east half
  + ' W36 D'                         // underside: the bottom row west and out through the start square
  + ' E7');                          // top: into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the end squares: the dive cell and its two neighbours across the road.
const end = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) end.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && end.has(key(p.c, p.r))) throw new Error(`the road runs over an end square at ${p.c},${p.r}`);
for (const k of end) g.hole(...k.split(',').map(Number));
const glow = new Set();
for (const k of end) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the board.
const square = (c, r) => (Math.floor((c + 3) / 6) + Math.floor((r + 3) / 6)) % 2;
// Ladders: rails at columns x and x + 2, rows from r0 up to r1.
const LADDERS = [[13, 47, 27], [25, 41, 21], [37, 35, 15], [19, 23, 3], [43, 11, 1]];
const ladder = (c, r) => {
  for (const [x, r0, r1] of LADDERS) if (r <= r0 && r >= r1) {
    if (c === x || c === x + 2) return 'rail';
    if (c === x + 1 && mod(r, 2) === 0) return 'rung';
  }
  return null;
};
// Snakes: a wave of slow pads from a head at row r1 down to row r0.
const SNAKES = [[31, 46, 26], [6, 33, 13], [45, 30, 8], [28, 18, 4]];
const snake = (c, r) => {
  for (const [x, r0, r1] of SNAKES) if (r <= r0 && r >= r1 && c === x + Math.round(1.5 * Math.sin((r - r1) / 2))) return r === r1 ? 'head' : 'body';
  return null;
};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (end.has(key(c, r))) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (side === T) {
    const l = ladder(c, r), s = snake(c, r);
    if (l === 'rail') ch = '>';
    else if (l === 'rung') ch = '#';
    else if (s) ch = s === 'head' ? '^' : '=';
  } else {
    const x = mod(c + 3, 6), y = mod(r + 3, 6);
    if (x === 3 && y === 3 && q.d >= 3) ch = '^';
    else if ((x === 0 || y === 0) && square(c, r) && q.d >= 2) ch = mod(c + r, 3) === 0 ? '#' : '=';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)) || glow.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 4) === 0,
  gaps: [4, 11, 2, 8, 6, 10], crumbs: 2, steps: [7, 11, 4, 9, 5], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: an old board game.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(key(c, r))) return '#ff0066';
  if (side === T) return square(c, r) ? '#6600cc' : '#b41e46';
  return square(c, r) ? '#993300' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'ladders', name: 'Level 83', kind: 'Ladders', start: [...start, 'E'], colors, grid: g};
if (require.main === module) console.log(g.print());
