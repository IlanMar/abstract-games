// Level 95 "Crossword": a very hard level, a long one. A square world of 60 x 60 cells, an endless plane:
// a crossword puzzle of 15 x 15 squares, each square four cells. The black squares are holes through the
// paper wherever they stand clear of the road, so a missed turn can drop the snake through to the back of
// the page. The road runs the white answers on top, dives through four black squares and runs the columns
// of print on the back of the page. The thread is uneven: stages wait up to the edge of sight, crystals
// lead on along the answers, and at some bends only the painted road shows the turn.
//   - the puzzle: the black squares are chosen in pairs symmetric about the middle, as in a real crossword;
//     every white square that starts an answer carries its clue number (a spike) in the corner, and
//     pencilled letters (slow pads) fill some of the answers;
//   - the back of the page: lines of print, words of wall with gaps, every third row; a column rule of
//     slow pads every fifteenth column;
//   - the dives: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: a puzzle page in red ink. On top a gold road over rose squares with dark grey rules,
// underneath a pale blue road over chocolate paper with dark grey print; the holes glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 60, H = 60, T = 'top', B = 'bottom', N = 15;
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 54];
const R = road(g, [...start, 'N'],
  'N30 E12 N10 E20 S8 E10 D'         // top: up the west answer, east, north, along the top and into a black square
  + ' W8 N12 E14 S34 W20 N8 D'       // back: back, north, east and the long column south, west and up into another
  + ' S6 W12 S10 E24 N4 D'           // top: back, west, south and the long answer east into a third
  + ' S8 W41 S4 D'                   // back: back and the long line of print west into the last
  + ' N5');                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the dives: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
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

// ---- the puzzle: a black square is a hole if all its cells stand two cells clear of the road on both faces.
const black = new Set();
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const a = y * N + x, b = (N - 1 - y) * N + (N - 1 - x);
  if (hash(Math.min(a, b) * 13 + 5) >= 0.3) continue;
  let ok = true;
  for (let r = 4 * y; r < 4 * y + 4 && ok; r++) for (let c = 4 * x; c < 4 * x + 4 && ok; c++)
    ok = near(c, r) >= 2 && !runout.top.has(key(c, r)) && !runout.bottom.has(key(c, r)) && !glow.has(key(c, r));
  if (ok) black.add(key(x, y));
}
const isBlack = (x, y) => black.has(key(mod(x, N), mod(y, N)));
for (const k of black) { const [x, y] = k.split(',').map(Number); for (let r = 4 * y; r < 4 * y + 4; r++) for (let c = 4 * x; c < 4 * x + 4; c++) gap.add(key(c, r)); }
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a hole at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const rule = (c, r) => mod(c, 4) === 0 || mod(r, 4) === 0;
const numbered = (x, y) => !isBlack(x, y) && (isBlack(x - 1, y) || isBlack(x, y - 1));
const pencil = (x, y) => hash(x * 31 + y * 17 + 101) < 0.3;

// ---- the page, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const x = Math.floor(c / 4), y = Math.floor(r / 4);
  let ch = '.';
  if (side === T) {
    if (mod(c, 4) === 1 && mod(r, 4) === 1 && numbered(x, y)) ch = '^';                          // a clue number
    else if (!rule(c, r) && pencil(x, y) && mod(c + r, 2) === 0 && q.d >= 2) ch = '=';           // a pencilled letter
  } else {
    if (mod(c, 15) === 7 && q.d >= 2) ch = '=';                                                   // a column rule
    else if (mod(r, 3) === 1 && hash(Math.floor(c / 4) * 7 + r * 131) < 0.55 && mod(c, 4) !== 3) ch = '#';  // a word of print
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 16], lead: [5, 4], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [4, 11, 6, 2, 9, 8], crumbs: 3, steps: [8, 11, 6, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: newsprint.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(key(c, r))) return '#ff0066';
  if (side === T) return rule(c, r) ? '#444444' : '#b41e46';
  return mod(r, 3) === 1 ? '#444444' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'crossword', name: 'Level 95', kind: 'Crossword', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
