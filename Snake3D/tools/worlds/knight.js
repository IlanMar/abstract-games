// Level 67 "Knight": a very hard square level. A square world of 48 x 48: a chessboard of eight by eight
// squares of five cells in a frame of void, with six squares missing (captured), and the road rides it like
// a knight, two squares one way and one the other. On top it climbs the board in knight's moves to the east
// edge and drops off it; underneath it comes back down in knight's moves and drops into a captured square;
// on top it rides north and off the north edge; underneath it runs round the west of the board and off the
// south edge home.
//   - the pieces stand on the board in walls, white on top on the south rows, black underneath on the
//     north rows, each a glyph of five by five with spikes on the crowns, cleared near the road;
//   - the squares glow: a boost pad at the heart of every light square, a slow pad on every dark one;
//   - the captured squares are ringed with slow pads;
//   - on the long straights walls right beside the road, clear near the bends (Absolute's staircase on
//     top, Zig-Zag's tunnel underneath);
//   - long chains, '>=' gates between chains, two chains at once on every third stage.
// Colour style, a chessboard: pink and violet squares on top, wine and chocolate underneath, a gold road.
// Stages: long chains, a chain through every bend, lead-in chains to the edges and the captured square.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const S = 5, O = 4;                                // square size, board offset
g.floor(O, O, O + 8 * S - 1, O + 8 * S - 1);
const CAPTURED = [[1, 3], [5, 5], [6, 7], [7, 4], [2, 5], [4, 1]];
for (const [i, j] of CAPTURED) g.hole(O + i * S, O + j * S, O + i * S + S - 1, O + j * S + S - 1);
const start = [21, 42];
const R = road(g, [...start, 'N'],
  'N11 E5 N10 E5 N10 E12 D'        // top: knight's moves up to the north-east and off the east edge
  + ' W8 S5 W10 S5 W12 D'          // underside: knight's moves back down and into a captured square
  + ' E8 N10 W5 N7 D'              // top: north and off the north edge
  + ' S8 W10 S25 E15 S7 D'         // underside: round the west and off the south edge
  + ' N2');                        // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const sq = (c, r) => [Math.floor((c - O) / S), Math.floor((r - O) / S)];
const onBoard = (c, r) => c >= O && r >= O && c < O + 8 * S && r < O + 8 * S;

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const turn = i => R.corners.includes(mod(i, R.length)) || R.at(i).hole || R.at(i + 1).hole;
const shielded = i => { for (let n = -3; n <= 4; n++) if (turn(i + n)) return false; return true; };

// ---- the pieces: glyphs of five by five.
const GLYPH = {
  R: ['#.#.#', '#####', '.###.', '.###.', '#####'],
  N: ['.##..', '####.', '..##.', '.###.', '#####'],
  B: ['..^..', '.#^#.', '.###.', '..#..', '.###.'],
  Q: ['#.#.#', '.###.', '..#..', '.###.', '#####'],
  K: ['..^..', '.###.', '..#..', '.###.', '#####'],
  P: ['.....', '..^..', '.###.', '..#..', '.###.'],
};
const piece = new Map();                           // 'side,c,r' -> ch
const putPiece = (side, i, j, p, flip) => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const ch = GLYPH[p][flip ? S - 1 - y : y][x];
    if (ch !== '.') piece.set(`${side},${O + i * S + x},${O + j * S + y}`, ch);
  }
};
'RNBQKBNR'.split('').forEach((p, i) => { putPiece(T, i, 7, p, false); putPiece(T, i, 6, 'P', false); putPiece(B, i, 0, p, true); putPiece(B, i, 1, 'P', true); });
// A piece stands only on a square the road leaves wholly clear on that face.
const clearSquare = (side, i, j) => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const c = O + i * S + x, r = O + j * S + y;
    if (g.get(side, c, r) === ' ' || R.local(side, c, r).d <= 1) return false;
  }
  return true;
};
const ringOf = (c, r) => CAPTURED.some(([i, j]) => {
  const x0 = O + i * S, y0 = O + j * S;
  return c >= x0 - 1 && c <= x0 + S && r >= y0 - 1 && r <= y0 + S;
});

// ---- the board, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (g.get(T, c, r) === ' ') continue;
  const [i, j] = sq(c, r), light = mod(i + j, 2) === 0;
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const pc = piece.get(`${side},${c},${r}`);
    if (pc && clearSquare(side, i, j)) ch = pc;
    else if (ringOf(c, r)) ch = '=';
    else if (q.d === 1 && shielded(q.i) && (side === B || q.v === (mod(q.s, 2) ? -1 : 1))) ch = mod(q.u, 5) === 0 ? '^' : '#';
    else if (mod(c - O, S) === 2 && mod(r - O, S) === 2) ch = light ? '>' : '=';
    if (/[#^]/.test(ch) && runout[side].has(key(c, r))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}

// ---- stages: two chains together every third stage, never across a dive.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
const merged = [];
for (let k = 0; k < stages.length; k++) {
  const a = stages[k], b = stages[k + 1];
  if (k % 3 === 1 && b && a.every(gr => gr[0] === 'chain') && b.every(gr => gr[0] === 'chain')
    && !R.dives.some(d => d > a[0][1] && d < b[0][1])) { merged.push([...a, ...b]); k++; }
  else merged.push(a);
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, a chessboard: pink and violet on top, wine and chocolate underneath, a gold road.
const colorOf = side => (c, r) => {
  if (!onBoard(c, r)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  const [i, j] = sq(c, r), light = mod(i + j, 2) === 0;
  return side === T ? (light ? '#ff0066' : '#550077') : (light ? '#b41e46' : '#993300');
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'knight', name: 'Level 67', kind: 'Knight', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
