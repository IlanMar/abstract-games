// Level 88 "Interchange": a very hard level, a big one. A square world of 80 x 80 cells, an endless plane:
// a two-deck motorway interchange at night. The top face is the upper deck, the underside the lower one;
// the road runs the motorway on top, leaves it down four exit ramps (holes) to the lower deck and climbs
// back, so half the run is underneath. The thread is uneven: stages wait up to the edge of sight, crystals
// lead on along the long carriageways, and at some bends only the lit road shows the way.
//   - the carriageway: three cells either side of the road; lane markings two cells out are dashes of
//     boost pads on top, of slow pads underneath; a crash barrier (walls with gaps) four cells out along
//     every long stretch;
//   - traffic: parked cars (two-cell walls) and cones (spikes) out in the lots and on the hard shoulder;
//   - the toll plaza: on the longest stretch of the upper deck a row of booths (walls) across the
//     carriageway with a '>=' gate on the road at every other stage;
//   - the lower deck: a grid of pillars (walls) every sixth cell, potholes (spikes) between them;
//   - the ramps: the dive cell and its neighbours across the road, open through both decks.
// Colour concept: a motorway under sodium lamps. On top a gold road on dark grey tarmac over violet lots,
// underneath a pale pink road on dark grey over chocolate; the ramps glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 80, H = 80, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [10, 70];
const R = road(g, [...start, 'N'],
  'N50 E12 S6 E8 N16 E30 S12 D'   // upper deck: the long west carriageway, a dog-leg, the north carriageway and the first ramp
  + ' N6 E10 S40 W14 N10 W12 D'   // lower deck: back, the long east carriageway, a loop west and up the second ramp
  + ' E8 S14 W14 D'               // upper deck: east, south and west down the third ramp
  + ' E6 S8 W20 D'                // lower deck: back, south and the south carriageway west up the fourth ramp
  + ' E6 S6 W17 N5');             // upper deck: a slip road round into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the ramps: the dive cell and its two neighbours across the road.
const ramp = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) ramp.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && ramp.has(key(p.c, p.r))) throw new Error(`the road runs over a ramp at ${p.c},${p.r}`);
for (const k of ramp) g.hole(...k.split(',').map(Number));
const glow = new Set();
for (const k of ramp) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const lengthOf = new Map();
for (let i = 0; i < R.length; i++) lengthOf.set(R.seg[i], (lengthOf.get(R.seg[i]) || 0) + 1);
const long = (side, q) => lengthOf.get(q.s) >= 12 && R.at(q.i).side === side;
// The toll plaza: on the longest top stretch, a band four cells deep a third of the way along.
let plaza = null;
{
  let best = -1;
  for (const [s, n] of lengthOf) { const i = R.seg.indexOf(s); if (R.at(i).side === T && n > best) { best = n; plaza = {s, u0: i + Math.floor(n / 3)}; } }
}
const inPlaza = q => plaza && q.s === plaza.s && q.u >= plaza.u0 && q.u < plaza.u0 + 4;

// ---- the decks, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (ramp.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    if (inPlaza(q) && q.d >= 2 && q.d <= 6) ch = mod(q.u - plaza.u0, 4) === 1 ? '#' : '.';           // toll booths
    else if (q.d === 2) ch = mod(q.u, 6) < 2 ? '>' : '.';                                           // lane dashes
    else if (q.d === 4 && long(side, q)) ch = mod(q.u, 9) === 0 ? '.' : '#';                       // crash barrier
    else if (q.d === 3) ch = n < 0.06 ? '^' : '.';                                                  // cones on the shoulder
    else if (q.d >= 6 && mod(r, 4) === 0 && mod(c, 7) < 2 && n < 0.6) ch = '#';                     // parked cars
    else if (q.d >= 6 && n < 0.05) ch = '^';
  } else {
    if (q.d === 2) ch = mod(q.u, 6) < 2 ? '=' : '.';
    else if (q.d >= 2 && mod(c, 6) === 3 && mod(r, 6) === 3) ch = '#';                              // pillars
    else if (q.d >= 3 && n < 0.07) ch = '^';                                                         // potholes
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [14, 17], lead: [6, 4], launch: 20, gate: i => mod(i, 2) === 0,
  gaps: [6, 11, 2, 9, 4, 11, 3], crumbs: 2, steps: [7, 11, 5, 9, 11], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a motorway under sodium lamps.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(key(c, r))) return '#ff0066';
  if (q.d <= 3) return '#444444';
  return side === T ? '#6600cc' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'interchange', name: 'Level 88', kind: 'Interchange', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
