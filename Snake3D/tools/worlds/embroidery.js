// Level 113 "Embroidery": a hard level, a long one. A square world of 72 x 72 cells, an endless plane of
// canvas stretched in an embroidery hoop. The road is a line of running stitches across the cloth; round it
// are cross-stitch motifs (hearts, flowers and stars), needles left lying on the cloth, pins stuck in it, and
// the hoop itself, a great ring of wall with a gap where the road passes. The road goes through the cloth at
// four needle holes and runs the tangled back of the work. The thread is uneven: stages wait up to the edge
// of sight, crystals lead on along the stitches, and at some bends only the stitching shows the turn.
//   - the hoop: a ring of radius thirty round the middle of the world, walls on both faces, open near the
//     road;
//   - the motifs: a 7 x 7 pattern on every twelfth cell where the whole motif stands two cells clear of
//     the road; its stitches are crosses, slow pads on one diagonal of every pair of cells, and a knot
//     (a spike) in the middle;
//   - needles: lines of wall nine cells long with an eye (a gap) near one end; pins: lone spikes;
//   - running stitches: dashes of boost pads along the cloth's weave;
//   - the back: loose threads (slow pads) in long strands, knots (spikes);
//   - the needle holes: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: needlework on dark canvas. On top a gold road over dark teal canvas with raspberry,
// violet and rose motifs and an olive hoop, underneath a pale blue road over the chocolate back of the
// work; the needle holes glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 72, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 64];
const R = road(g, [...start, 'E'],
  'E24 N20 W12 N16 E14 N4 E8 S4 E8 S8 E9 D'   // top: east, north, west, north, a stitch over a bump and into a needle hole
  + ' W8 N20 W10 S4 W10 N4 W10 S8 D'          // the back: back, north and west in a wavering line, down a hole
  + ' N10 W12 S30 E5 D'                       // top: up, west, the long way south and into the third
  + ' W8 S19 W6 D'                            // the back: back, south and west to the last
  + ' E7');                                   // top: east into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the needle holes: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a needle hole at ${p.c},${p.r}`);
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
const clear = (c, r) => R.local(T, c, r).d >= 2 && !runout.top.has(key(c, r)) && !glow.has(key(c, r));

// ---- the motifs.
const MOTIFS = [
  ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...', '.......'],   // a heart
  ['..#.#..', '.#####.', '##.#.##', '.#####.', '..#.#..', '...#...', '..###..'],   // a flower
  ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],   // a star
];
const motif = new Map();                                     // cell -> {kind, knot}
for (let j = 0; j < H / 12; j++) for (let i = 0; i < W / 12; i++) {
  const kind = Math.floor(hash(i * 7 + j * 13 + 3) * 3), m = MOTIFS[kind], x0 = 12 * i + 3, y0 = 12 * j + 3;
  const cells = [];
  m.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') cells.push([x0 + x, y0 + y, x === 3 && y === 3]); }));
  if (cells.every(([c, r]) => clear(c, r))) cells.forEach(([c, r, knot]) => motif.set(key(c, r), {kind, knot}));
}
// ---- needles and the hoop.
const needle = new Map();
for (let n = 0; n < 8; n++) {
  const c0 = Math.floor(hash(n * 2 + 41) * W), r0 = Math.floor(hash(n * 2 + 42) * H), across = n % 2 === 0;
  const cells = Array.from({length: 9}, (_, s) => across ? [mod(c0 + s, W), r0] : [c0, mod(r0 + s, H)]);
  if (cells.every(([c, r]) => clear(c, r) && !motif.has(key(c, r)))) cells.forEach(([c, r], s) => needle.set(key(c, r), s === 1 ? '.' : '#'));
}
const hoop = (c, r) => Math.abs(Math.hypot(c - 35.5, r - 35.5) - 30) < 0.7;

// ---- the cloth and its back.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (hoop(c, r)) ch = '#';
  else if (side === T) {
    const m = motif.get(k);
    if (m) ch = m.knot ? '^' : mod(c + r, 2) === 0 ? '=' : '.';                                   // a cross stitch
    else if (needle.has(k)) ch = needle.get(k);
    else if (q.d >= 2 && mod(r, 6) === 0 && mod(c, 6) <= 2) ch = '>';                              // a running stitch
    else if (q.d >= 3 && n < 0.02) ch = '^';                                                        // a pin
  } else {
    if (q.d >= 2 && mod(c + 2 * r + Math.floor(hash(Math.floor(r / 5)) * 7), 11) === 0) ch = '=';  // a loose thread
    else if (q.d >= 2 && n < 0.05) ch = '^';                                                        // a knot
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [7, 3, 11, 5, 9, 2], crumbs: 2, steps: [8, 11, 6, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: needlework on dark canvas.
const THREAD = ['#ff0066', '#cc00ff', '#b41e46'];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  if (hoop(c, r)) return '#993300';
  if (side === B) return '#993300';
  const m = motif.get(k);
  if (m) return THREAD[m.kind];
  return mod(c + r, 2) === 0 ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'embroidery', name: 'Level 113', kind: 'Embroidery', start: [...start, 'E'], colors, grid: g};
if (require.main === module) console.log(g.print());
