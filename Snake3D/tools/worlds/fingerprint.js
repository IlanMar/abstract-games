// Level 105 "Fingerprint": a very hard level, a long one, with relief. A square world of 68 x 68 cells, an
// endless plane: a thumb print pressed in ink. Four whorls turn round their cores, two clockwise and two
// the other way, and where they meet the ridges bend into deltas, as in a real print. Every ridge is raised
// half a cell, so the road rides over the ridges like a washboard; two cells off the road the ridges turn
// to walls, broken by pores, and the road runs a narrow lane cut across the whorls. It dives into four ink
// blots and runs the back of the print underneath. The thread is uneven: stages wait up to the edge of
// sight, crystals lead on across the ridges, and at some bends only the painted road shows the turn.
//   - the ridges: a spiral of pitch three round the nearest core, one cell wide; walls from two cells out
//     with a pore (a gap) here and there, and a spike in some pores;
//   - the back: the same ridges smudged, slow pads, and stray spikes;
//   - the blots: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: ink on skin. On top a gold road over rose skin with dark teal ridges, underneath a pale
// blue road over violet with chocolate smudges; the blots glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 68, H = 68, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 60];
const R = road(g, [...start, 'N'],
  'N30 E20 S8 E16 N26 W8 D'        // top: up the west, east across the whorls, a dip, north and west into a blot
  + ' E8 N6 E20 S30 W10 S12 D'     // back: back, the long way round the north-east and south into the second
  + ' N6 E10 S14 W20 D'            // top: back, east, south and west into the third
  + ' E6 S6 W40 S2 D'              // back: back and the long way west into the last
  + ' N6');                        // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wrapS = (a, b, n) => { let d = mod(a - b, n); return d > n / 2 ? d - n : d; };

// ---- the ridges: a spiral round the nearest core.
const CORES = [[17, 17, 1], [51, 17, -1], [17, 51, -1], [51, 51, 1]];
const ridge = (c, r) => {
  let best = null;
  for (const [x, y, s] of CORES) { const dx = wrapS(c, x, W), dy = wrapS(r, y, H), d = Math.hypot(dx, dy); if (!best || d < best.d) best = {d, dx, dy, s}; }
  const f = best.d + best.s * 3 * Math.atan2(best.dy, best.dx) / (2 * Math.PI);
  return mod(f, 3) < 1;
};
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => ridge(c, r) ? 0.5 : 0));

// ---- the blots: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a blot at ${p.c},${p.r}`);
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

// ---- the print and its back.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (ridge(c, r) && q.d >= 2) ch = n < 0.1 ? '.' : n < 0.16 ? '^' : '#';                     // a ridge with its pores
  } else {
    if (ridge(c, r) && q.d >= 2 && n < 0.45) ch = '=';                                             // a smudge
    else if (q.d >= 3 && n < 0.035) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [10, 4, 7, 11, 2, 6], crumbs: 2, steps: [6, 10, 8, 11], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: ink on skin.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(key(c, r))) return '#ff0066';
  if (side === T) return ridge(c, r) ? '#444444' : '#b41e46';
  return ridge(c, r) ? '#993300' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'fingerprint', name: 'Level 105', kind: 'Fingerprint', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) console.log(g.print());
