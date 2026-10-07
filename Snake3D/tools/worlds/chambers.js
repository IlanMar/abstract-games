// Level 60 "Chambers": a very hard square level in the manner of the late classic levels Chamber, Queue
// and Colour Check. A square world of 48 x 48: a solid slab of 40 x 40 in a frame of void, cut by walls
// every eight cells into chambers, both faces. The walls have a door in the middle of every side and
// open wide where the road crosses them; where the road runs along a wall line, the wall runs two cells
// beside it (a Queue corridor). The road runs the chambers on top, drops off the north edge, runs them
// underneath and drops off the south edge home.
//   - Chamber: inside every chamber a rail of slow and boost pads '=>=>=' along one wall and spikes in
//     its corners;
//   - runway lights '>..>' on the open side of the road;
//   - underneath, Colour Check: the chambers are tiled with a checkerboard of boost and slow pads;
//   - stages of several groups at once: every fourth stage takes two chains together.
// Colour style, classic Colour Check and Trail: every chamber its own shade of salmon, wine and raspberry,
// an orange road.
// Stages: long chains with launches, a chain through every bend, lead-in chains to the edges.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 43;
g.floor(X0, X0, X1, X1);
const start = [8, 40];
const R = road(g, [...start, 'N'],
  'N32 E12 S12 E16 N12 E4 N4 D'      // top: up the west, through the northern chambers and off the north edge
  + ' S24 W12 S8 W20 S8 D'           // underside: down the east, west through the southern chambers, off the south edge
  + ' N4');                          // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the chambers: wall lines every eight cells (offset underneath), a door in the middle of each side.
const OFF = {top: 2, bottom: 6};
const line = (side, v) => mod(v - OFF[side], 8) === 0;
const door = (side, v) => mod(v - OFF[side] - 4, 8) === 0 || mod(v - OFF[side] - 3, 8) === 0;
const room = (side, c, r) => [Math.floor((c - OFF[side]) / 8), Math.floor((r - OFF[side]) / 8)];
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) for (const side of [T, B]) {
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  const lc = line(side, c), lr = line(side, r);
  const wc = mod(c - OFF[side], 8), wr = mod(r - OFF[side], 8);      // place inside the chamber, 1..7
  if ((lc && !door(side, r)) || (lr && !door(side, c))) ch = '#';
  else if (lc || lr) ch = '.';
  else if (side === T) {
    if ((wc === 1 || wc === 7) && (wr === 1 || wr === 7)) ch = '^';                       // spikes in the corners
    else if (wr === 1 && wc >= 2 && wc <= 6) ch = mod(c, 2) ? '=' : '>';                 // the rail
    else if (q.d === 2 && mod(q.u, 3) === 0) ch = '>';                                     // runway lights
  } else if (q.d >= 2) {
    if ((wc === 1 || wc === 7) && (wr === 1 || wr === 7)) ch = '^';
    else if (q.d >= 3) ch = (Math.floor(c / 2) + Math.floor(r / 2)) % 2 ? '>' : '=';     // Colour Check
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = q.d <= 1 ? '.' : '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: two chains together every fourth stage.
const {stages, pads} = autoStages(R, {lengths: [14, 17], lead: [6, 4], launch: 16, gate: i => mod(i, 3) === 0});
const merged = [];
for (let k = 0; k < stages.length; k++) {
  if (k % 4 === 2 && k + 1 < stages.length && stages[k].every(gr => gr[0] === 'chain') && stages[k + 1].every(gr => gr[0] === 'chain')
    && !R.dives.some(d => d > stages[k][0][1] && d < stages[k + 1][0][1])) { merged.push([...stages[k], ...stages[k + 1]]); k++; }
  else merged.push(stages[k]);
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, classic Colour Check: a shade per chamber, salmon to raspberry, an orange road.
// The salmon and raspberry shades of Colour Check and Trail: the olive of Queue would hide the boost pads.
const CHAMBER = ['#dd5555', '#dd6655', '#cc7744', '#bb0077', '#b41e46', '#cc3355', '#ee3377', '#dd4466', '#993300'];
const colorOf = side => (c, r) => {
  if (c < X0 || c > X1 || r < X0 || r > X1) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800';
  const [a, b] = room(side, c, r);
  return CHAMBER[mod(a + b + (side === T ? 0 : 4), CHAMBER.length)];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'chambers', name: 'Level 60', kind: 'Chambers', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
