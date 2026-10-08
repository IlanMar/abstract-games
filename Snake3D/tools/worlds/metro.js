// Level 80 "Metro": a very hard level. A square world of 52 x 52 cells, mostly void: a metro map strung
// over the dark. The land is the line itself, three cells wide, with a station at every bend and dead-end
// sidings off the stations into the void. The road takes the line on top, drops off its four termini to
// run back underneath and comes up again, so half the run is on the underside. The thread is uneven:
// stages wait up to the edge of sight, crystals lead on through long gaps, and at some bends only the
// painted line shows the turn.
//   - stations: a 7 x 7 platform round every bend, with a pillar (a wall) on each corner and slow pads on
//     the platform edge;
//   - sidings: three-cell-wide dead ends off a station into the void, a third rail of spikes down the
//     middle; they never start on the run straight on past a bend;
//   - sleepers: a slow pad on both edges of the line every fifth cell; a string of boost pads along the
//     middle where the road takes the line on the other face only;
//   - the termini: the dive cell, the cell past it and the cells either side of both stay void.
// Colour concept: a night metro map. On top a gold line over violet platforms, underneath a pale pink line
// over wine; the sidings and the termini glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 52, H = 52, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [10, 44];
const R = road(g, [...start, 'N'],
  'N20 E14 N12 E16 D'           // top: up the west line, a step east and north, east to the first terminus
  + ' W8 S20 E12 S10 D'         // underside: back, down the middle line, east and down to the second
  + ' N6 W14 S9 D'              // top: back up, west and down to the third
  + ' N6 W15 S5 W6 S4 D'        // underside: back, the south line west, a step and down to the fourth
  + ' N7');                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const wrap = (c, r) => [mod(c, W), mod(r, H)];
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the land: the line (one cell either side of the road on either face), the stations and sidings.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
const station = new Map();
R.corners.forEach((k, n) => { const p = R.at(k); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) station.set(key(...wrap(p.c + dx, p.r + dy)), {n, dx, dy}); });
for (const k of station.keys()) land.add(k);
// Past every corner five cells straight on stay clear of sidings.
const runout = {top: new Set(), bottom: new Set()};
const runoutAny = new Set();
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 5; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) { runout[p.side].add(key(...o)); runoutAny.add(key(...o)); } }
}
// Sidings: off every other station, the first free direction, six cells into the void, three wide.
const siding = new Set();
R.corners.forEach((k, n) => {
  if (n % 2) return;
  const p = R.at(k);
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const cells = [];
    for (let s = 4; s <= 9; s++) for (const o of [-1, 0, 1]) cells.push(wrap(p.c + dx * s + dy * o, p.r + dy * s + dx * o));
    if (cells.every(q => !land.has(key(...q)) && !runoutAny.has(key(...q)) && near(...q) >= 3)) { cells.forEach(q => siding.add(key(...q))); break; }
  }
});
for (const k of siding) land.add(k);
// The termini stay void: the dive cell, the cell past it and the cells either side of both.
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const q of [[p.c, p.r], g.move(p.c, p.r, p.h)]) for (const [dx, dy] of [[0, 0], ...across]) pit.add(key(...wrap(q[0] + dx, q[1] + dy)));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a terminus at ${p.c},${p.r}`);
for (const k of pit) { land.delete(k); siding.delete(k); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- what stands on the land, face by face. Nothing sharp next to the road on its own face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r), other = R.local(side === T ? B : T, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const st = station.get(k);
    if (siding.has(k)) ch = near(c, r) >= 5 && (mod(c + r, 2) === 0) ? '^' : '=';
    else if (st) {
      const ring = Math.max(Math.abs(st.dx), Math.abs(st.dy));
      if (ring === 3 && Math.abs(st.dx) === 3 && Math.abs(st.dy) === 3) ch = '#';
      else if (ring === 3 && q.d >= 2) ch = '=';
    } else if (q.d === 1 && mod(q.u, 5) === 0) ch = '=';
    else if (other.d === 0 && q.d >= 1 && mod(q.u, 3) !== 0 && near(c, r) === 0) ch = '>';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [7, 3, 11, 5, 9, 2], crumbs: 2, steps: [6, 10, 4, 11, 8], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a night metro map.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (siding.has(k)) return '#ff0066';
  if (station.has(k)) return side === T ? '#6600cc' : '#b41e46';
  return side === T ? '#b41e46' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'metro', name: 'Level 80', kind: 'Metro', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
