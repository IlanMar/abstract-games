// Level 79 "Parquet": a hard level. A square world of 48 x 48 cells, an endless plane of woven parquet.
// The road runs the long boards on top, drops through four missing boards to the joists underneath and
// comes back up, so half the run is on the underside. The thread is uneven: stages wait up to the edge of
// sight, crystals lead on through long gaps, and at some bends only the painted road shows the turn.
//   - on top the boards are woven in 4 x 4 blocks; the open end of every block is a wall (a seam) and some
//     block corners carry a nail (a spike); wax (slow pads) on every fifth block, polish (boost pads) on
//     the long seams;
//   - underneath, joists (walls with gaps) run north to south every sixth column, nails stick through
//     between them, and a slow pad of glue sits on every crossing of the joists with the battens;
//   - the missing boards: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: lacquered parquet. On top a gold road over violet and wine blocks, underneath a pale
// tomato road over dark wood; the missing boards glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 40];
const R = road(g, [...start, 'N'],
  'N24 E16 D'                   // top: up the west side and east into the first missing board
  + ' W7 N8 E22 S26 D'          // underside: back, up, the north joist east and down the east side
  + ' N7 W10 S12 E8 D'          // top: back up, west, down the middle and east into the third
  + ' W6 S2 W25 S4 D'           // underside: back, the long south batten west and down into the fourth
  + ' N7');                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the missing boards: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a missing board at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const glow = new Set();
for (const k of gap) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the floor, face by face.
const block = (c, r) => ({bx: Math.floor(c / 4), by: Math.floor(r / 4), x: c % 4, y: r % 4, o: (Math.floor(c / 4) + Math.floor(r / 4)) % 2});
const topTile = (c, r, q) => {
  const {bx, by, x, y, o} = block(c, r);
  if (q.d === 1) return '.';
  if (x === 0 && y === 0) return mod(bx * 3 + by, 3) === 0 ? '^' : '.';            // a nail at the corner
  if (q.d >= 2 && (o === 0 ? x === 0 : y === 0)) return '#';                         // the seam at the open end
  if (mod(bx + 2 * by, 5) === 0) return '=';                                          // wax
  if (q.d >= 3 && (o === 0 ? y === 2 : x === 2) && mod(bx - by, 3) === 0) return '>'; // polish along a board
  return '.';
};
const bottomTile = (c, r, q) => {
  if (q.d === 1) return '.';
  if (mod(c, 6) === 3) return mod(r, 8) === 0 || mod(r, 8) === 1 ? '.' : (mod(r, 4) === 2 ? '=' : '#');  // joists and glue
  if (mod(c, 6) === 0 && mod(r, 5) === 0) return '^';                                                      // nails
  if (mod(r, 8) === 4 && q.d >= 2) return '=';                                                             // battens
  return '.';
};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (gap.has(key(c, r))) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = side === T ? topTile(c, r, q) : bottomTile(c, r, q);
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)) || glow.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [5, 9, 3, 11, 7, 2], crumbs: 2, rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: lacquered parquet.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300');
  if (glow.has(key(c, r))) return '#ff0066';
  if (q.d === 1) return side === T ? '#6600cc' : '#b41e46';
  if (side === T) return block(c, r).o ? '#6600cc' : '#b41e46';
  return mod(c, 6) === 3 ? '#b41e46' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'parquet', name: 'Level 79', kind: 'Parquet', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
