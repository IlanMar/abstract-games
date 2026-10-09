// Level 94 "Arcade": a hard level, a long one. A square world of 64 x 64 cells, an endless plane: an old
// maze game. On top the road runs the alleys of the maze between solid blocks, past pellets and ghosts; it
// dives through four warp tunnels into the cabinet and runs the circuit board underneath. The thread is
// uneven: stages wait up to the edge of sight, crystals lead on along the alleys like pellets, and at some
// bends only the painted road shows the turn.
//   - the maze: a solid block of wall on every 8 x 8 square where the whole 4 x 4 block is clear of the
//     road, so the alleys the road does not take stay open; pellets (slow pads) on the alley crossings and
//     along them, power pellets (boost pads) on every fourth crossing, ghosts (2 x 2 spikes) here and there;
//   - the cabinet: chips (walls of 5 x 2) in rows, solder (spikes) between them, copper traces (slow pads)
//     along every fourth row;
//   - the warp tunnels: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: an arcade screen. On top a pink road between violet blocks on a dark teal screen,
// underneath a gold road over an olive board with dark teal chips; the tunnels glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 64, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 56];
const R = road(g, [...start, 'N'],
  'N14 E6 N12 W6 N14 E20 S10 E14 N16 D'  // top: up the west alleys with a jog, east, a step south and into the first tunnel
  + ' S6 E16 S30 W12 N8 W10 D'           // cabinet: back, east, the long east trace south and west up into the second
  + ' E6 S14 E14 S8 W10 D'               // top: back, south, east and west into the third
  + ' E6 S2 W42 S1 D'                    // cabinet: back and the long south trace west into the last
  + ' N7');                              // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the warp tunnels: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a tunnel at ${p.c},${p.r}`);
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
const clear = (side, c, r) => R.local(side, c, r).d >= 2 && !runout[side].has(key(c, r)) && !glow.has(key(c, r));

// ---- the maze: a block where the whole 4 x 4 square is clear of the road.
const blocks = new Set();
for (let by = 0; by < H / 8; by++) for (let bx = 0; bx < W / 8; bx++) {
  let ok = true;
  for (let y = 2; y < 6 && ok; y++) for (let x = 2; x < 6 && ok; x++) ok = clear(T, bx * 8 + x, by * 8 + y);
  if (ok) blocks.add(key(bx, by));
}
const inBlock = (c, r) => mod(c, 8) >= 2 && mod(c, 8) <= 5 && mod(r, 8) >= 2 && mod(r, 8) <= 5 && blocks.has(key(Math.floor(c / 8), Math.floor(r / 8)));
const topTile = (c, r, q) => {
  if (inBlock(c, r)) return '#';
  if (q.d === 1) return '.';
  const x = mod(c + 1, 8), y = mod(r + 1, 8);                                         // 0..1 on an alley crossing
  if (x <= 1 && y <= 1) {
    const n = Math.floor((c + 1) / 8) + 8 * Math.floor((r + 1) / 8);
    if (hash(n * 7 + 3) < 0.18) return '^';                                            // a ghost
    if (x === 0 && y === 0) return mod(n, 4) === 0 ? '>' : '=';                       // a power pellet or a pellet
    return '.';
  }
  if ((x <= 1 && mod(r, 3) === 0) || (y <= 1 && mod(c, 3) === 0)) return x === 0 || y === 0 ? '=' : '.';  // pellets along the alleys
  return '.';
};
const bottomTile = (c, r, q) => {
  if (q.d === 1) return '.';
  if (mod(r, 6) >= 2 && mod(r, 6) <= 3 && mod(c, 7) <= 4) return '#';               // a chip
  if (mod(r, 6) === 0 && mod(c, 7) === 2) return '^';                                // solder
  if (mod(r, 12) === 5 && q.d >= 2) return '=';                                      // a trace
  return '.';
};
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (gap.has(key(c, r))) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = side === T ? topTile(c, r, q) : bottomTile(c, r, q);
  if (/[#^]/.test(ch) && !clear(side, c, r)) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [4, 3], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [7, 2, 11, 4, 9, 6], crumbs: 2, steps: [5, 9, 11, 7], rails: 2});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: an arcade screen.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28');
  if (glow.has(key(c, r))) return '#ff0066';
  if (side === T) return inBlock(c, r) ? '#6600cc' : '#444444';
  return mod(r, 6) >= 2 && mod(r, 6) <= 3 && mod(c, 7) <= 4 && q.d >= 2 ? '#444444' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'arcade', name: 'Level 94', kind: 'Arcade', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
