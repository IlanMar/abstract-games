// Level 48 "Ziggurat": a hard level with relief, the first world that is not flat. A square world of 40 x
// 40 cells, all void but a stepped pyramid: three terraces three cells wide and a crown, each a storey
// (1.5 cells) above the one below, joined by ramps two cells long. The road runs round the second
// terrace, climbs a ramp onto the third like a train up a hill, runs round it, climbs onto the crown and
// drops into the shaft at the top; underneath it slides down the inside of the west face, runs round the
// base, climbs once more and drops off the south foot; on top it comes up the south ramp from the base
// onto the second terrace again.
//   - the relief is only drawn: the play stays on the flat grid (see `height` below and WORLDS.md);
//   - battlements: walls two cells out on the outer side of every terrace, every other cell, with a spike
//     between them, and the same inside on the inner side, offset;
//   - steps: the ramps away from the road are striped with slow pads, like a staircase;
//   - underneath, boost pads streak down the inside of every face.
// Colour style, temple in neon: a gold road; a magenta base, a violet second terrace, a mint third one and
// an ice-white crown, with lighter ramps between them; underneath the same storeys in deep colours.
// Stages: long chains along the terraces, a chain over every climb, a lead-in chain right up to the shaft
// and the edge, and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 40, H = 40, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const C = [20, 20], EDGE = 16, STOREY = 1.5;
const cheb = (c, r) => Math.max(Math.abs(c - C[0]), Math.abs(r - C[1]));
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (cheb(c, r) <= EDGE && cheb(c, r) > 0) g.set('both', c, r, '.');
// Terraces: d 14..16 (storey 0), 9..11 (1), 4..6 (2), the crown 1 round the shaft (3); ramps in between.
const TERRACES = [[14, 16], [9, 11], [4, 6], [0, 1]];
const storey = d => {
  for (let k = 0; k < TERRACES.length; k++) if (d >= TERRACES[k][0] && d <= TERRACES[k][1]) return k;
  return null;                                                    // on a ramp
};
const heightOf = d => {
  const k = storey(d);
  if (k !== null) return k * STOREY;
  const lo = TERRACES.findIndex(([a]) => a < d);                  // the terrace above the ramp
  const top = TERRACES[lo][1];
  return (lo - 1) * STOREY + (TERRACES[lo - 1][0] - d) * STOREY / (TERRACES[lo - 1][0] - top);
};
const start = [10, 26];
const R = road(g, [...start, 'N'],
  'N16 E20 S15'               // top: along the second terrace
  + ' W5 N10 W10 S5'          // top: up the east ramp onto the third terrace and round it
  + ' E4 D'                   // top: up onto the crown and into the shaft
  + ' W15 N15 E30 S30'        // underside: down the inside of the west face, round the base
  + ' W9 N5 W6 S6 D'          // underside: up and back down the south face, off its foot
  + ' N7 W10 N4');            // top: straight up the south ramp onto the second terrace, round to the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the pyramid at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the pyramid, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r), d = cheb(c, r), k = storey(d);
  if (q.d === 0) continue;
  let ch = '.';
  if (side === T) {
    if (k === null) ch = q.d >= 2 && mod(d, 2) === 0 ? '=' : '.';                          // steps
    else if (k === 3) ch = '.';                                                              // the crown
    else if (d === TERRACES[k][1]) ch = mod(c + r, 2) ? '#' : (q.d >= 3 ? '^' : '.');      // outer battlement
    else if (d === TERRACES[k][0] && k > 0) ch = mod(c + r, 2) ? '.' : '#';                 // inner battlement
    else if (q.d >= 2 && hash(c, r) < 0.06) ch = '^';
  } else {
    if (q.d >= 2 && (Math.abs(c - C[0]) === Math.abs(r - C[1]) || mod(c + r, 6) === 0) && d > 2) ch = '>';   // streaks
    else if (q.d >= 3 && hash(c * 3 + 1, r) < 0.05) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [5, 3], launch: 20});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- relief: the height of every cell, in cells.
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (g.get(T, c, r) === ' ' ? 0 : heightOf(cheb(c, r)))));

// ---- colours, temple in neon: a gold road on magenta, violet, mint and ice-white storeys.
const TOP_COL = ['#ff0088', '#cc00ff', '#00ff99', '#ffffff'], RAMP_COL = ['#ff44aa', '#ff00ff', '#ffff00'];
const BOTTOM_COL = ['#6600cc', '#b41e46', '#444444', '#999999'];
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  const q = R.local(side, c, r), d = cheb(c, r), k = storey(d);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (side === B) return BOTTOM_COL[k === null ? TERRACES.findIndex(([a]) => a < d) - 1 : k];
  return k === null ? RAMP_COL[TERRACES.findIndex(([a]) => a < d) - 1] : TOP_COL[k];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'ziggurat', name: 'Level 48', kind: 'Ziggurat', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  console.log(height.map(row => row.map(v => Math.round(v * 4).toString(36)).join('')).join('\n'));
}
