// Level 6 "Blocks": the easy square world, packed with obstacles, in the bright colours of Hexagone.
// An endless plane (the 36 x 36 tile repeats) with no holes, so the snake never leaves the top face. It
// is a town of 3 x 3 blocks of walls and spikes between 3-wide streets. The route runs down the middle
// of some streets, two cells from every obstacle; the other streets are alleys whose middle lane stays
// open, so a missed turn runs on down an alley and hits nothing. Chains lead the snake round every
// corner, and each stage lies a cell or two past the end of the previous one.
const {Grid} = require('../grid');
const W = 36, H = 36, P = 6;   // a block and the street beside it: streets on columns and lines 0-2 mod 6
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const T = 'top';

// ---- the route, along the middle of the streets (columns and lines 1 mod 6). It climbs the tile
// twice and crosses it once from west to east, turning only at crossings and never twice in a row
// the same way.
const route = g.route([1, 31], 'N18 E12 N12 E6 N6 W6 N12 E12 N12 E12 N12');
const L = route.length;

// ---- blocks: every 3 x 3 square between the streets, in five patterns.
const patterns = [
  ['###', '###', '###'],
  ['^^^', '^^^', '^^^'],
  ['###', '#^#', '###'],
  ['^^^', '^#^', '^^^'],
  ['^#^', '###', '^#^']
];
for (let by = 0; by < H / P; by++) for (let bx = 0; bx < W / P; bx++) {
  const pattern = patterns[(bx * 2 + by * 3) % patterns.length];
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) g.set(T, bx * P + 3 + x, by * P + 3 + y, pattern[y][x]);
}
// ---- alleys: a street stretch between two crossings that the route does not take gets a row of
// walls or spikes along each kerb; its middle lane stays open.
for (let by = 0; by < H / P; by++) for (let bx = 0; bx < W / P; bx++) {
  const c = bx * P + 1, r = by * P + 1, ch = (bx + by) % 2 ? '#' : '^';
  if (!route.has(c, r + 3)) for (let y = r + 2; y <= r + 4; y++) { g.set(T, c - 1, y, ch); g.set(T, c + 1, y, ch); }         // north-south stretch
  if (!route.has(c + 3, r)) for (let x = c + 2; x <= c + 4; x++) { g.set(T, x, r - 1, ch); g.set(T, x, r + 1, ch); }   // east-west stretch
}
// Nothing may stand next to the route, diagonals included.
for (const [c, r] of route.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  const x = (c + dx + W) % W, y = (r + dy + H) % H;
  if (g.get(T, x, y) !== '.') throw new Error(`an obstacle at ${x},${y} stands next to the route`);
}

// ---- stages, by route index: each begins a cell or two past the end of the previous one, on the line
// the snake is already on, and every corner is taken inside a chain.
g.routeStages(route, T, [
  [['gem', 11]],                                 // 1  after the run-up
  [['chain', 13, 16]],                           // 2
  [['chain', 18, 21]],                           // 3  first corner, to the east
  [['gem', 23]],                                 // 4
  [['gems', 25, 27]],                            // 5
  [['chain', 29, 33]],                           // 6  back to the north
  [['gem', 35]],                                 // 7
  [['gems', 37, 39]],                            // 8
  [['chain', 41, 45]],                           // 9  a short step east...
  [['chain', 47, 51]],                           // 10 ...and north
  [['chain', 53, 57]],                           // 11 the only turn to the west
  [['chain', 59, 63]],                           // 12 and north again
  [['gem', 65]],                                 // 13
  [['gems', 67, 69]],                            // 14
  [['chain', 71, 75]],                           // 15
  [['gem', 77]],                                 // 16
  [['gems', 79, 81]],                            // 17
  [['chain', 83, 87]],                           // 18
  [['gem', 89]],                                 // 19
  [['gems', 91, 93]],                            // 20
  [['chain', 95, 99]],                           // 21
  [['gem', 101]],                                // 22
  [['gems', 103, 105]],                          // 23
  [['chain', 107, 111]],                         // 24 onto the start street
  [['gems', 113, 115, 117]],                     // 25
  [['chain', 119, L + 3]],                       // 26
  [['gems', L + 5, L + 7, L + 9]]                // 27 on the run-up, just before stage 1
]);

// Bright bands as on Hexagone: red at the north and south rims of the tile, through orange to yellow in
// the middle (the colour grading turns yellow into vivid green, orange into olive and red into salmon),
// and the route painted red across them like Hexagone's red trails, so the road through the town shows.
// Both repeat without a seam. The underside is never seen but has to be drawn.
const band = r => { const d = Math.abs(r - (H - 1) / 2); return d < 4 ? '#ffff00' : d < 7 ? '#ffcc00' : d < 10 ? '#ff9900' : d < 13 ? '#ff5511' : '#ff1111'; };
const bands = [];
for (let r = 0; r < H; r++) {
  const last = bands[bands.length - 1];
  if (last && last[0] === band(r)) last[3][3] = r; else bands.push([band(r), band(r), 'y', [0, r, W - 1, r]]);
}
// The road in as few rectangles as possible: runs down the columns, then what is left along the lines.
const road = [], single = new Set();
for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) {
  if (!route.has(c, r) || (r > 0 && route.has(c, r - 1))) continue;
  let r1 = r; while (r1 + 1 < H && route.has(c, r1 + 1)) r1++;
  if (r1 > r) road.push(['#ff1111', '#ff1111', 'y', [c, r, c, r1]]); else single.add(`${c},${r}`);
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (!single.has(`${c},${r}`) || single.has(`${c - 1},${r}`)) continue;
  let c1 = c; while (single.has(`${c1 + 1},${r}`)) c1++;
  road.push(['#ff1111', '#ff1111', 'x', [c, r, c1, r]]);
}
const colors = {top: [...bands, ...road], bottom: bands};
module.exports = {key: 'blocks', name: 'Level 6', kind: 'Blocks', start: [1, 31, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
