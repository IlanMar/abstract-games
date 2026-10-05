// Level 51 "Furnace": a very hard level in the colours of the classic Vents and Colour Check. A square
// world of 56 x 56: a furnace floor of 48 x 48 in a frame of void with nine vents, open shafts of three
// by three on a grid of fourteen. The road weaves between the vents on top, drops into four of them,
// comes back out underneath and drops into the next, and at the end runs off the south edge home.
//   - every vent is ringed like a classic vent: spikes on the octagon three cells out, slow pads four
//     cells out (cleared where the road passes);
//   - Queue corridors along the road: walls two cells out with a gap every fourth cell, a spike in each
//     gap three cells out; runway lights '>..>' between them on the side away from the walls;
//   - out on the floor, Wave ladders: diagonal bands of slow pads with boost beads, offset underneath.
// Colour style, classic fire (Vents): bands two lines high from dark red at the edges of the floor to
// orange in the middle, wine and amber rings round the vents, a bright orange road.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to each
// vent and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 51, VENTS = [14, 28, 42];
g.floor(X0, X0, X1, X1);
for (const vc of VENTS) for (const vr of VENTS) g.hole(vc - 1, vr - 1, vc + 1, vr + 1);
const start = [7, 44];
const R = road(g, [...start, 'N'],
  'N37 E14 S14 E7 N5 D'         // top: up the west, along the north, down and up into the north vent
  + ' S6 E14 N5 D'              // underside: back down, east and up into the north-east vent
  + ' S6 E7 S14 W7 N5 D'        // top: back down, east, south and up into the east vent
  + ' S6 W14 S5 D'              // underside: back down, west and down into the south vent
  + ' N6 W7 N7 W5 D'            // top: back up, west, north and west into the west vent
  + ' E6 S21 W14 S2 D'          // underside: back east, all the way south, west and off the south edge
  + ' N8');                     // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const cheb = (c, r) => Math.min(...VENTS.flatMap(vc => VENTS.map(vr => Math.max(Math.abs(c - vc), Math.abs(r - vr)))));
const oct = (c, r) => Math.min(...VENTS.flatMap(vc => VENTS.map(vr => { const a = Math.abs(c - vc), b = Math.abs(r - vr); return Math.max(a, b, Math.ceil((a + b) * 0.75)); })));
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the furnace floor, face by face.
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const o = side === T ? 0 : 5;
  const wallSide = mod(q.s, 2) ? 1 : -1;                                   // the corridor wall swaps sides
  let ch = '.';
  if (q.d === 2 && q.v === wallSide) ch = mod(q.u, 4) === 3 ? '.' : '#';   // Queue: walls with gaps
  else if (q.d === 3 && q.v === wallSide) ch = mod(q.u, 4) === 3 ? '^' : '.';
  else if (q.d === 2) ch = mod(q.u, 3) === 0 ? '>' : '.';                  // runway lights
  else if (q.d >= 4) {
    const t = mod(c + r + o, 12);
    if (t < 2) ch = mod(c - r + o, 6) === 0 ? '>' : '=';                   // Wave ladders
  }
  const v = oct(c, r);
  if (v === 3) ch = '^';                                                   // the vent rings
  else if (v === 4) ch = '=';
  else if (v === 2) ch = '.';
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = q.d <= 1 ? '.' : '=';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 16, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, classic fire: the Vents palette in bands two lines high, dark at the edges.
const FIRE = ['#bb0000', '#bb1100', '#cc1100', '#cc2200', '#dd3300', '#dd4400', '#ee4400', '#ee5500', '#ff6600'];
const RINGS = ['#ee9922', '#ee9922', '#cc3355', '#bb0077'];
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  if (c < X0 || c > X1 || r < X0 || r > X1) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff8800' : '#ff7700';
  const v = cheb(c, r);
  if (v <= 4) return RINGS[Math.min(3, v - 1)];
  const band = Math.max(Math.abs(r - 27.5), Math.abs(c - 27.5)) | 0;
  return FIRE[Math.max(0, 8 - (band >> 1) - (side === B ? 2 : 0))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'furnace', name: 'Level 51', kind: 'Furnace', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
