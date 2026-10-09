// Level 114 "Sudoku": a very hard level, a long one. A square world of 72 x 72 cells, an endless plane: a
// sudoku puzzle half solved. Its nine by nine cells are eight cells square; the road runs only along the
// middles of the cells and turns only in a cell's middle, crossing the thin lines between cells and the
// thick walls between boxes through gaps. The givens stand in their cells as digits of wall, the empty cells
// are full of pencil marks (spikes), and the road goes down four times through the middle of an empty cell
// to run the scrap paper underneath. The thread is uneven: stages wait up to the edge of sight, crystals
// lead on along the cells, and at some bends only the painted road shows the turn.
//   - the grid: thin lines (slow pads, dashed) every eighth cell, thick lines (walls) every 24th, open from
//     two cells either side of the road;
//   - the givens: a valid solution, a digit (3 x 5 in walls) in every cell the hash picks whose digit stands
//     two cells clear of the road;
//   - the pencil marks: in the other cells, candidates on a 3 x 3 grid of spots, some spikes, some slow pads;
//   - underneath: the scrap paper, the boxes in walls again, sums in boost-pad strokes, crossings-out;
//   - the dives: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: a newspaper puzzle at night. On top a pink road over boxes of violet and dark teal with
// olive thick lines and rose digits, underneath a pale blue road over chocolate; the dives glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 72, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [4, 68];
const R = road(g, [...start, 'N'],
  'N48 E24 N8 E32 S24 W8 S7 D'       // top: up the first column of cells, east, north, east, down and into a cell
  + ' N8 E16 S32 W40 N15 D'          // underneath: back, east, the long way south, west and up into the second
  + ' S8 W16 N32 E32 S15 D'          // top: back, west, north, east and down into the third
  + ' N8 W40 S35 D'                  // underneath: back, the long way west and south to the last
  + ' N4');                          // top: up into the start
const {mod, key, hash} = kit;

// ---- the dives (the dive cell and its two neighbours across the road), the glow round them, and the
// runouts past the corners.
const gap = kit.diveGaps(g, R);
kit.punch(g, R, gap, 'a dive');
const glow = kit.glow(g, gap);
const runout = kit.runouts(g, R);
const clear = (c, r) => R.local(T, c, r).d >= 2 && !runout.top.has(key(c, r)) && !glow.has(key(c, r));

// ---- the puzzle: a valid solution, givens where the hash picks them and the digit stands clear.
const DIGIT = {1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'], 6: ['.##', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.']};
const PERM = [5, 3, 8, 1, 9, 2, 7, 4, 6];
const solution = (i, j) => PERM[(j * 3 + Math.floor(j / 3) + i) % 9];
const digit = new Set(), given = new Set();
for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
  if (hash(i * 17 + j * 29 + 5) > 0.5) continue;
  const cells = [];
  DIGIT[solution(i, j)].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') cells.push([8 * i + 3 + x, 8 * j + 2 + y]); }));
  if (cells.every(q => clear(...q))) { cells.forEach(q => digit.add(key(...q))); given.add(key(i, j)); }
}
const thin = (c, r) => mod(c, 8) === 0 || mod(r, 8) === 0;
const thick = (c, r) => mod(c, 24) === 0 || mod(r, 24) === 0;

// ---- the puzzle and the scrap paper under it.
kit.paint(g, R, {skip: gap, keep: [glow], runout}, (side, c, r, q, n) => {
  const k = key(c, r), x = mod(c, 8), y = mod(r, 8), cell = key(Math.floor(c / 8), Math.floor(r / 8));
  let ch = '.';
  if (side === T) {
    if (thick(c, r)) ch = q.d >= 2 ? '#' : '.';                                                    // a thick line
    else if (thin(c, r)) ch = mod(c + r, 3) === 0 ? '.' : '=';                                       // a thin line
    else if (digit.has(k)) ch = '#';                                                                 // a given
    else if (!given.has(cell) && x % 2 === 0 && y % 2 === 0) ch = n < 0.45 ? '^' : n < 0.7 ? '=' : '.';   // a pencil mark
  } else {
    if (thick(c, r)) ch = mod(c + r, 4) === 0 ? '.' : '#';                                           // the boxes again
    else if (q.d >= 2 && mod(r, 8) === 6 && mod(c, 8) >= 2 && mod(c, 8) <= 5) ch = '>';             // a sum
    else if (q.d >= 2 && mod(c - r, 8) === 0 && n < 0.4) ch = '=';                                   // a crossing-out
    else if (q.d >= 3 && n < 0.03) ch = '^';
  }
  return ch;
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [6, 11, 3, 9, 5, 10], crumbs: 2, steps: [10, 7, 11, 8], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a newspaper puzzle at night.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff0088', '#ff44aa'] : ['#ff99cc', '#ff44aa']);
  if (glow.has(k)) return '#ff0066';
  if (side === B) return thick(c, r) ? '#6600cc' : '#993300';
  if (thick(c, r)) return '#993300';
  if (digit.has(k)) return '#b41e46';
  return (Math.floor(c / 24) + Math.floor(r / 24)) % 2 ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'sudoku', name: 'Level 114', kind: 'Sudoku', start: [...start, 'N'], colors, grid: g};
if (require.main === module) { console.log(g.print()); console.log('givens', given.size); }
