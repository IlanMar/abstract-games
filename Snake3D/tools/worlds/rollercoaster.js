// Level 53 "Rollercoaster": a very hard square level with relief, in the colours of the classic
// Accelerator. A square world of 48 x 48: a floor of 40 x 40 in a frame of void, rolling in hills and
// dips (a wave of twenty cells each way, up to one and a half cells above and below the middle). The road
// runs up and down over them like a rollercoaster and drops off the edge of the floor four times, so half
// the run is underneath.
//   - Accelerator rings: a square ring of walls three cells round every hilltop, open on the diagonals,
//     a ring of pads inside it and a spike on the top, cleared where the road passes;
//   - the track is lit: boost pads beside the road where it runs downhill, slow pads where it climbs;
//   - tunnels on the long straights: walls two cells out on both sides with a gap every sixth cell;
//   - launches into long chains on the straights, '>=' gates between chains.
// Colour style, classic Accelerator: the floor shades with its height from deep blue in the dips to sea
// green on the hilltops (the blue half of the Accelerator gradient); an orange road.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to each
// edge and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 43;
g.floor(X0, X0, X1, X1);
const start = [12, 40];
const R = road(g, [...start, 'N'],
  'N32 E16 S6 E10 N10 D'        // top: up the west, over the north hills and off the north edge
  + ' S15 W8 S6 E13 D'          // underside: back down, west, south and off the east edge
  + ' W7 S10 W13 S9 D'          // top: back west, south over the dip, west and off the south edge
  + ' N7 W8 N10 W4 S16 D'       // underside: back up, west, north, west and off the south edge
  + ' N4');                     // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// ---- relief: a wave of twenty cells each way; the steepest slope is under half a cell per cell.
const WAVE = 20, AMP = 1.5, MID = 2;
const wave = (c, r) => Math.sin(2 * Math.PI * c / WAVE) * Math.sin(2 * Math.PI * r / WAVE);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (g.get(T, c, r) === ' ' ? 0 : Math.round((MID + AMP * wave(c, r)) * 4) / 4)));
const hAt = (c, r) => height[r][c];
const TOPS = [];
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) if (mod(c - 5, 10) === 0 && mod(r - 5, 10) === 0 && wave(c, r) > 0.9) TOPS.push([c, r]);
const ringOf = (c, r) => Math.min(...TOPS.map(([tc, tr]) => { const a = Math.abs(c - tc), b = Math.abs(r - tr); return a === b ? 99 : Math.max(a, b); }));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const runLen = i => { let a = 0, b = 0; while (a < 40 && !R.corners.includes(i - a - 1) && !R.at(i - a - 1).hole) a++; while (b < 40 && !R.corners.includes(i + b) && !R.at(i + b + 1).hole) b++; return a + b + 1; };

// ---- the floor, face by face.
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) for (const side of [T, B]) {
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  if (q.d === 1) {
    // The track lights: boost where the road runs downhill, slow where it climbs, every other cell.
    const a = R.at(q.i), b = R.at(q.i + 1);
    const rise = a.hole || b.hole ? 0 : hAt(b.c, b.r) - hAt(a.c, a.r);
    if (mod(q.u, 2) === 0) ch = rise < 0 ? '>' : rise > 0 ? '=' : '.';
  } else if (q.d === 2 && runLen(q.i) >= 14) ch = mod(q.u, 6) === 0 ? '.' : '#';   // tunnels
  else if (q.d >= 3) {
    const v = ringOf(c, r);
    if (v === 3) ch = '#';                                                    // Accelerator rings
    else if (v === 2) ch = side === T ? '>' : '=';
    else if (v === 0) ch = '^';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [14, 17], lead: [6, 4], launch: 16, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, classic Accelerator: the floor shades with height, deep blue dips to sea-green hilltops.
// Only the blue half of the Accelerator gradient: its lime and yellow end would hide the boost pads.
const ACC = ['#0044aa', '#0066cc', '#0088ff', '#1199ee', '#2299dd', '#33aacc', '#44aabb', '#55bbaa', '#66bb99'];
const colorOf = side => (c, r) => {
  if (c < X0 || c > X1 || r < X0 || r > X1) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ffaa00';
  const k = Math.round((hAt(c, r) - MID + AMP) / (2 * AMP) * (ACC.length - 1));
  return ACC[Math.max(0, Math.min(ACC.length - 1, side === T ? k : k - 3))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'rollercoaster', name: 'Level 53', kind: 'Rollercoaster', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let i = 0; i < R.length; i++) { const a = R.at(i), b = R.at(i + 1); if (!a.hole && !b.hole) worst = Math.max(worst, Math.abs(hAt(b.c, b.r) - hAt(a.c, a.r))); }
  console.log('steepest step on the road:', worst);
}
