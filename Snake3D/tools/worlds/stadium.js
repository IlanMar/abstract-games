// Level 119 "Stadium": a very hard level, a long one, with relief. A square world of 88 x 60 cells, an endless
// plane: a football stadium on match night. The pitch lies flat in the middle with its lines in chalk and
// two teams lined up on it, and the stands rise round it in tiers, so the road climbs into the stands and
// drops back to the pitch. It goes into both goals: it scores in the west goal, comes back under the pitch
// and out of the east one, then goes down a players' tunnel and runs the corridors under the stands. The
// thread is uneven: stages wait up to the edge of sight, crystals lead on across the pitch, and at some
// bends only the painted road shows the turn.
//   - the pitch: touchlines, goal lines, the halfway line, the centre circle, the penalty and goal areas in
//     slow pads, the penalty spots and the corner flags in walls; the goals behind the goal lines are holes
//     (their nets), the road dives through their mouths;
//   - the teams: two sides of eleven (spikes) in formation, the ball (a wall) on the centre spot;
//   - the stands: a quarter cell higher for every cell out from the run-off, rows of seats (walls) on every
//     other tier with aisles, the advertising boards (boost pads) round the run-off;
//   - underneath: dressing rooms and corridors (walls with doors), benches (slow pads);
//   - the tunnel: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: a floodlit match. On top a gold road over a pitch striped dark teal and violet, wine
// stands, underneath a pale blue road over chocolate corridors; the goals and the tunnel glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 88, H = 60, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [44, 56];
const R = road(g, [...start, 'N'],
  'N8 E16 N30 W36 S12 W10 D'         // top: up from the south stand, east, the length of the pitch, west and into the west goal
  + ' E8 S20 E50 N20 E3 D'           // under the pitch: back, south, the long way east and up out of the east goal
  + ' W6 S16 E12 N30 W10 N7 D'       // top: out of the goal, south, up into the east stand, north and down the tunnel
  + ' S6 W30 N16 W6 D'               // the corridors: back, west, north under the north stand and round to the last
  + ' E10 N2');                      // top: east and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the stands: Chebyshev distance out from the run-off (columns 10 to 78, rows 4 to 56), a quarter cell a step.
const out = (c, r) => Math.max(c < 10 ? 10 - c : c > 78 ? c - 78 : 0, r < 4 ? 4 - r : r > 56 ? r - 56 : 0);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => out(c, r) / 4));

// ---- the goals and the tunnel.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const [x0, x1] of [[11, 13], [75, 77]]) for (let r = 27; r <= 33; r++) for (let c = x0; c <= x1; c++) gap.add(key(c, r));   // the nets
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a hole at ${p.c},${p.r}`);
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

// ---- the markings and the teams.
const pitch = (c, r) => c >= 14 && c <= 74 && r >= 8 && r <= 52;
const line = (c, r) => {
  if (!pitch(c, r)) return false;
  if (c === 14 || c === 74 || r === 8 || r === 52 || c === 44) return true;
  if (Math.abs(Math.hypot(c - 44, r - 30) - 7) < 0.5) return true;
  for (const [x0, s] of [[14, 1], [74, -1]]) {
    const x = (c - x0) * s;
    if ((x === 12 && r >= 18 && r <= 42) || ((r === 18 || r === 42) && x >= 0 && x <= 12)) return true;   // the penalty area
    if ((x === 5 && r >= 25 && r <= 35) || ((r === 25 || r === 35) && x >= 0 && x <= 5)) return true;     // the goal area
  }
  return false;
};
const SIDE = [[17, 30], [22, 14], [22, 24], [22, 36], [22, 46], [31, 12], [31, 24], [31, 36], [31, 48], [39, 25], [39, 35]];
const player = new Set();
for (const [x, y] of SIDE) { player.add(key(x, y)); player.add(key(88 - x, 60 - y)); }
const fixed = new Set([key(23, 30), key(65, 30), key(44, 30), key(14, 8), key(74, 8), key(14, 52), key(74, 52)]);   // the spots, the ball and the flags

// ---- the stadium and the corridors under it.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919)), o = out(c, r);
  let ch = '.';
  if (side === T) {
    if (fixed.has(k)) ch = '#';
    else if (player.has(k)) ch = '^';
    else if (line(c, r)) ch = '=';
    else if (o === 0 && !pitch(c, r) && (c === 10 || c === 78 || r === 4 || r === 56) && mod(c + r, 4) !== 0) ch = '>';   // the boards
    else if (o >= 2 && mod(o, 2) === 0) ch = mod(o > 2 && (c < 10 || c > 78) ? r : c, 8) === 3 ? '.' : '#';             // a row of seats
  } else {
    if (q.d >= 2 && (mod(c, 11) === 0 || mod(r, 10) === 0) && mod(c + r, 5) !== 2) ch = '#';                  // the walls of a room
    else if (q.d >= 2 && mod(r, 10) === 3 && mod(c, 11) >= 3 && mod(c, 11) <= 8) ch = '=';                    // a bench
    else if (q.d >= 3 && n < 0.03) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [10, 5, 8, 2, 11, 7], crumbs: 2, steps: [6, 10, 8, 11], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a floodlit match.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#993300';
  if (out(c, r) > 0) return '#b41e46';
  return mod(Math.floor((c - 14) / 6), 2) ? '#6600cc' : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'stadium', name: 'Level 119', kind: 'Stadium', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) console.log(g.print());
