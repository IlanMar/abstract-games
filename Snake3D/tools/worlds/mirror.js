// Level 62 "Mirror": a hard square level in the manner of the middle classic level Flip Side. A square
// world of 32 x 32, an endless plane with three pits of two by two across the middle, and the whole arena
// mirrored four ways: only the road breaks the symmetry. The road runs round the north-east of the arena on
// top and drops into the east pit, rounds the south underneath and climbs into the west pit, and comes
// out on top to run home round the south-west.
//   - on top, Flip Side's outlines of spikes round every quarter with doors in the middle of each side,
//     and pairs of walls inside them;
//   - underneath, Flip Side's arena: a frame of slow pads and walls with boost gates in the middle of
//     every side, and an inner ring of spikes round the pits;
//   - stages of two groups at once on the long sides, as in the middle classics' paired stages.
// Colour style, classic bonus levels: concentric squares from orange in the middle to violet at the edge.
// Stages: long chains, a chain through every bend, lead-in chains to the pits.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 32, H = 32, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const PITS = [[7, 15], [15, 15], [23, 15]];                    // top-left cell of each pit
for (const [c, r] of PITS) g.hole(c, r, c + 1, r + 1);
const start = [4, 26];
const R = road(g, [...start, 'N'],
  'N22 E23 S11 W2 D'          // top: up the west, along the north, down the east and into the east pit
  + ' E6 S12 W22 N10 D'       // underside: out east, round the south and up into the west pit
  + ' S13 W4 N3');            // top: down and round home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const X = c => W - 1 - c, Y = r => H - 1 - r;

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the arena, one quarter drawn and mirrored four ways; cleared near the road.
const put = (side, c, r, ch) => {
  for (const [x, y] of [[c, r], [X(c), r], [c, Y(r)], [X(c), Y(r)]]) {
    if (g.get(side, x, y) !== '.') continue;
    const q = R.local(side, x, y);
    if (q.d === 0 || (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(x, y))))) continue;
    g.set(side, x, y, ch);
  }
};
for (let k = 2; k <= 13; k++) if (k < 7 || k > 8) { put(T, k, 2, '^'); put(T, 2, k, '^'); put(T, k, 13, '^'); put(T, 13, k, '^'); }
for (const [c, r] of [[6, 7], [7, 7], [9, 7], [6, 8], [7, 4], [8, 4], [4, 7], [4, 8], [10, 10], [11, 10]]) put(T, c, r, '#');
for (let k = 0; k <= 15; k++) {
  const frame = k >= 13 ? '>' : (k >= 6 && k <= 11 ? '#' : '=');
  put(B, k, 2, frame); put(B, 2, k, frame);
  if (k >= 5 && k < 13) { put(B, k, 12, '^'); put(B, 5, k, '^'); }
}

// ---- stages: two chains together every third stage.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3], launch: 0, gate: i => mod(i, 2) === 0});
const merged = [];
for (let k = 0; k < stages.length; k++) {
  if (k % 3 === 1 && k + 1 < stages.length && stages[k].every(gr => gr[0] === 'chain') && stages[k + 1].every(gr => gr[0] === 'chain')
    && !R.dives.some(d => d > stages[k][0][1] && d < stages[k + 1][0][1])) { merged.push([...stages[k], ...stages[k + 1]]); k++; }
  else merged.push(stages[k]);
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, classic bonus: concentric squares, orange in the middle to violet at the edge; the road
// gold on top, lilac underneath.
const RINGS = ['#ff4400', '#ff4400', '#ff3300', '#b41e46', '#cc00ff', '#6600cc', '#550077', '#550077'];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  const d = Math.max(Math.abs(c - 15.5), Math.abs(r - 15.5)) | 0;
  return RINGS[Math.min(RINGS.length - 1, (d >> 1) + (side === B ? 1 : 0))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'mirror', name: 'Level 62', kind: 'Mirror', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
