// Level 103 "Go": a very hard level, a long one. A square world of 76 x 76 cells, an endless plane: a go
// board of 19 x 19 lines, four cells apart, in the middle of a game. The road runs only along the lines,
// turns only at the points, and dives into four black stones; underneath it runs the lines on the back of
// the board. The other stones are scattered over the points in groups as in a real game: the black stones
// are holes through the board, the white ones are walls. The thread is uneven: stages wait up to the edge
// of sight, crystals lead on along the lines, and at some bends only the painted road shows the turn.
//   - a stone: a diamond of five cells on a point, two cells clear of the road on both faces; black (holes)
//     and white (walls with a spike in the middle) by the noise of the game, denser where the fighting is;
//   - the nine star points: a boost pad on each, three per line on the fourth, tenth and sixteenth lines;
//   - the back of the board: the lines again, a slow pad on every third cell of them, and knots in the
//     wood (spikes);
//   - the stones the road dives into: the dive cell, its neighbours across and the cell past it.
// Colour concept: a kaya board. On top a pink road along dark teal lines on a chocolate board, underneath a
// pale blue road along violet lines on dark teal; the stones the road dives into glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 76, H = 76, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 66];
const R = road(g, [...start, 'N'],
  'N24 E16 N12 E20 N12 E12 S7 D'      // top: up and east over the board, step by step, and down into a black stone
  + ' N8 E12 S32 W20 N7 D'            // back: back, east, the long line south, west and up into the second
  + ' S12 E12 S7 D'                   // top: back, south, east and into the third
  + ' N8 W20 S8 W32 S7 D'             // back: back, the long way west and down into the last
  + ' N4');                           // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const line = (c, r) => mod(c, 4) === 2 || mod(r, 4) === 2;
const DIAMOND = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

// ---- the stones the road dives into: the dive cell, its neighbours across and the cell past it.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const past = g.move(p.c, p.r, p.h);
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
  gap.add(key(...past));
}
const glow = new Set();
for (const k of gap) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the game: a stone on a point where the whole diamond stands two cells clear of the road.
const stones = new Map();                                    // cell -> 'black' | 'white' | 'eye' (the middle of a white one)
for (let j = 0; j < 19; j++) for (let i = 0; i < 19; i++) {
  const c = 4 * i + 2, r = 4 * j + 2;
  const fight = hash(Math.floor(i / 4) * 17 + Math.floor(j / 4) * 29 + 3), n = hash(i * 19 + j + 101);
  if (n > 0.15 + 0.45 * fight) continue;
  const cells = DIAMOND.map(([dx, dy]) => [mod(c + dx, W), mod(r + dy, H)]);
  if (!cells.every(([x, y]) => near(x, y) >= 2 && !runout.top.has(key(x, y)) && !runout.bottom.has(key(x, y)) && !glow.has(key(x, y)))) continue;
  const colour = hash(i * 7 + j * 13 + 5) < 0.5 ? 'black' : 'white';
  cells.forEach(([x, y], m) => stones.set(key(x, y), colour === 'white' && m === 0 ? 'eye' : colour));
}
for (const [k, s] of stones) if (s === 'black') gap.add(k);
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a stone at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const star = (c, r) => [3, 9, 15].includes((c - 2) / 4) && [3, 9, 15].includes((r - 2) / 4);

// ---- the board, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  const s = stones.get(k);
  if (side === T) {
    if (s === 'white') ch = '#';
    else if (s === 'eye') ch = '^';
    else if (star(c, r)) ch = '>';
  } else {
    if (line(c, r) && mod(c + r, 3) === 0 && q.d >= 2) ch = '=';
    else if (!line(c, r) && q.d >= 2 && n < 0.04) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 16], lead: [6, 4], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [8, 3, 11, 6, 2, 10], crumbs: 2, steps: [4, 8, 11, 7], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a kaya board.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k) && !stones.has(k)) return '#ff0066';
  if (side === T) return stones.get(k) === 'black' ? '#444444' : line(c, r) ? '#444444' : '#993300';
  return line(c, r) ? '#6600cc' : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'go', name: 'Level 103', kind: 'Go', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
