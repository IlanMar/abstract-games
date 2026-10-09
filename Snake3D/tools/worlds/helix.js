// Level 96 "Helix": a very hard level, a long one. A square world of 60 x 72 cells, all void but a double
// helix: four strands of land three cells wide that wind up and down the sky, bending every six cells,
// and the base pairs between them, rungs of land one cell wide. The road climbs a strand on top, drops off
// its end to the underside, winds down the next strand, and so on round all four, so half the run is on the
// underside. The thread is uneven: stages wait up to the edge of sight, crystals lead on up the strands,
// and at some bends only the painted road shows the turn.
//   - the strands: the road and a cell either side, a slow pad on every third edge cell;
//   - the base pairs: a rung of land every fourth row wherever two strands are less than fourteen cells
//     apart, in two colours (the two kinds of pair), a spike in the middle of every other rung;
//   - the strand ends where the road dives stay void.
// Colour concept: a stained molecule. On top a pale blue road with violet edges, underneath a gold road
// with olive edges; the base pairs raspberry and caramel.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 60, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [6, 63];
const up = 'N6 E5 N6 W5 N6 E5 N6 W5 N6 E5 N6 W5', down = 'S6 E5 S6 W5 S6 E5 S6 W5 S6 E5 S6 W5';
const R = road(g, [...start, 'N'],
  `N13 ${up} N8 D`                // top: up the first strand and off its end
  + ` S8 E12 ${down} S8 D`         // underside: back, over to the second strand, down it and off its end
  + ` N8 E12 ${up} N8 D`           // top: back, over to the third strand, up it and off
  + ` S8 E12 ${down} S11 E24 S8 D` // underside: back, down the fourth strand, east over the edge and off
  + ' N6');                        // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the land: the strands, then the rungs between them.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
// The strand ends where the road dives: the dive cell and the cells round it that are not road stay void.
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  pit.add(key(p.c, p.r));
  for (const o of R.nbrs(p.c, p.r)) if (!R.has(T, ...o) && !R.has(B, ...o)) pit.add(key(...o));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a strand end at ${p.c},${p.r}`);
for (const k of pit) land.delete(k);
// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const rung = new Map();                                   // cell -> {n: rung number, mid}
let rungs = 0;
for (let r = 2; r < H; r += 4) {
  let c = 0;
  while (c < W) {
    if (!land.has(key(c, r)) || land.has(key(c + 1, r))) { c++; continue; }
    let e = c + 1;
    while (e < c + 15 && e < W && !land.has(key(e, r))) e++;
    const cells = [];
    for (let x = c + 1; x < e; x++) cells.push(x);
    const ok = e < W && e < c + 15 && land.has(key(e, r)) && cells.length >= 3
      && cells.every(x => near(x, r) >= 2 && !pit.has(key(x, r)) && !runout.top.has(key(x, r)) && !runout.bottom.has(key(x, r)));
    if (ok) { cells.forEach(x => rung.set(key(x, r), {n: rungs, mid: x === cells[cells.length >> 1]})); rungs++; }
    c = e;
  }
}
for (const k of rung.keys()) land.add(k);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- edges and rungs. Nothing sharp next to the road on its own face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const x = rung.get(k);
    if (x) ch = x.mid && x.n % 2 === 0 ? '^' : '.';
    else if (q.d === 1 && mod(q.u, 3) === 0) ch = '=';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [4, 3], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [3, 10, 6, 11, 2, 8], crumbs: 2, steps: [6, 11, 4, 9], rails: 2});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a stained molecule.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), x = rung.get(key(c, r));
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28');
  if (x) return x.n % 2 ? '#ff3300' : '#ff0066';
  return side === T ? '#cc00ff' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'helix', name: 'Level 96', kind: 'Helix', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
