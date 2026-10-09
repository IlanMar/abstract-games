// Level 106 "Billiards": a hard level, a long one. A square world of 80 x 60 cells, an endless plane: a
// billiard room with two tables. The road comes in over the carpet, crosses the cushions onto the felt and
// drops into the pockets: it dives into a side pocket of the first table, rolls back underneath the floor
// and comes up out of a corner pocket of the second, crosses it and drops into its far side pocket, then
// runs the long ball return under the room back to the start. The thread is uneven: stages wait up to the
// edge of sight, crystals lead on across the felt, and at some bends only the painted road shows the turn.
//   - a table: a rectangle of cushions (walls) with six pockets (holes, two cells square in the corners,
//     three cells wide at the sides) and sights (slow pads) round the rails;
//   - the balls: crosses of five cells, solids (walls) and stripes (a wall cross with a spike in the
//     middle), a racked triangle on the second table and a scatter on the first, a cue (a long wall) with
//     its tip (a spike);
//   - the room: a carpet of slow-pad diamonds, stools (spikes) here and there;
//   - under the floor: the legs of the tables (3 x 3 walls), the ball return (boost pads) under each
//     table, joists every eighth row with gaps.
// Colour concept: a smoky billiard room. On top a gold road over a rose carpet, dark teal felt in olive
// rails, underneath a pale blue road over violet; the pockets glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 80, H = 60, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [12, 54];
const R = road(g, [...start, 'N'],
  'N26 E16 N12 W8 N9 D'               // top: up over the carpet, onto the first table and into its side pocket
  + ' S12 W10 S18 E35 N2 D'           // under the floor: back, west, south, east and up a corner pocket of the second
  + ' S6 E26 S8 W11 S4 D'             // top: down the side of the second table, across it and into its far side pocket
  + ' N8 E10 S6 E6 S7 W30 N2 W34 S3 D' // under the floor: the long ball return west, a step, and on to the start
  + ' N5');                           // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const TABLES = [[4, 6, 36, 26], [44, 32, 76, 52]];
const tableAt = (c, r) => TABLES.findIndex(([x0, y0, x1, y1]) => c >= x0 && c <= x1 && r >= y0 && r <= y1);
const rail = (c, r) => TABLES.some(([x0, y0, x1, y1]) => ((c === x0 || c === x1) && r >= y0 && r <= y1) || ((r === y0 || r === y1) && c >= x0 && c <= x1));
const sight = (c, r) => tableAt(c, r) < 0 && TABLES.some(([x0, y0, x1, y1]) => c >= x0 - 1 && c <= x1 + 1 && r >= y0 - 1 && r <= y1 + 1);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const clear = (c, r) => near(c, r) >= 2 && !runout.top.has(key(c, r)) && !runout.bottom.has(key(c, r));

// ---- the pockets: the four the road dives into (the dive cell and its neighbours across), the others
// wherever they stand clear of the road.
const pocket = new Set(), dives = [];
for (const p of R.cells) if (p.hole) {
  dives.push([p.c, p.r]);
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) pocket.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const [x0, y0, x1, y1] of TABLES) {
  const xm = (x0 + x1) / 2;
  const shapes = [[[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0 + 1, y0 + 1]], [[x1, y0], [x1 - 1, y0], [x1, y0 + 1], [x1 - 1, y0 + 1]],
    [[x0, y1], [x0 + 1, y1], [x0, y1 - 1], [x0 + 1, y1 - 1]], [[x1, y1], [x1 - 1, y1], [x1, y1 - 1], [x1 - 1, y1 - 1]],
    [[xm - 1, y0], [xm, y0], [xm + 1, y0]], [[xm - 1, y1], [xm, y1], [xm + 1, y1]]];
  for (const s of shapes) {
    if (s.some(([c, r]) => dives.some(([x, y]) => Math.abs(x - c) <= 2 && Math.abs(y - r) <= 2))) continue;   // the road's own pocket
    if (s.every(q => clear(...q))) s.forEach(q => pocket.add(key(...q)));
  }
}
for (const p of R.cells) if (!p.hole && pocket.has(key(p.c, p.r))) throw new Error(`the road runs over a pocket at ${p.c},${p.r}`);
for (const k of pocket) g.hole(...k.split(',').map(Number));
const glow = new Set();
for (const k of pocket) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// ---- the balls: a racked triangle on the second table, a scatter on the first, and the cue.
const spots = [];
for (let row = 0; row < 5; row++) for (let n = 0; n <= row; n++) spots.push([54 + 3 * row, Math.round(42 - 1.5 * row + 3 * n)]);
spots.push([10, 10], [16, 21], [24, 11], [31, 20], [32, 10], [8, 17]);
const ball = new Map();
spots.forEach(([c, r], n) => {
  const cells = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [c + dx, r + dy]);
  if (cells.every(q => clear(...q) && tableAt(...q) >= 0 && !rail(...q) && !glow.has(key(...q)))) cells.forEach((q, m) => ball.set(key(...q), m === 0 && n % 2 ? '^' : '#'));
});
for (let c = 6; c <= 20; c++) if (clear(c, 24)) ball.set(key(c, 24), c === 20 ? '^' : '#');   // the cue

// ---- the room and the floor under it.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (pocket.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  const t = tableAt(c, r);
  let ch = '.';
  if (side === T) {
    if (ball.has(k)) ch = ball.get(k);
    else if (rail(c, r)) ch = '#';                                                             // a cushion
    else if (sight(c, r)) ch = mod(c + r, 4) === 0 ? '=' : '.';                                 // the sights
    else if (t < 0 && mod(c + r, 6) === 0 && mod(c - r, 6) === 0) ch = '=';                     // the carpet
    else if (t < 0 && q.d >= 3 && n < 0.03) ch = '^';                                           // a stool
  } else {
    const leg = TABLES.some(([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].some(([x, y]) => Math.abs(c - x) <= 1 && Math.abs(r - y) <= 1));
    if (leg) ch = '#';
    else if (t >= 0 && r === (TABLES[t][1] + TABLES[t][3]) / 2) ch = '>';                       // the ball return
    else if (mod(r, 8) === 3) ch = mod(c, 9) < 2 ? '.' : '#';                                  // a joist
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [7, 2, 11, 5, 9, 3], crumbs: 2, steps: [8, 11, 6, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a smoky billiard room.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#6600cc';
  if (rail(c, r)) return '#993300';
  return tableAt(c, r) >= 0 ? '#444444' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'billiards', name: 'Level 106', kind: 'Billiards', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
