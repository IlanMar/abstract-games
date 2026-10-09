// Level 112 "Aurora": a very hard level, a long one. A hex world of 64 x 80 cells, all void but the polar night
// sky. The road is a ribbon of light three cells wide that sways up and down the sky in long leans, and
// round it hang the curtains of the aurora: long wavy bands of land, apart from the ribbon, that a missed
// turn can land on or miss altogether. The road dives off the ends of the ribbon four times, so half the run
// is on the underside. The thread is uneven: stages wait up to the edge of sight, crystals lead on along the
// ribbon, and at some bends only the glowing ribbon shows the turn.
//   - the ribbon: the road and a cell either side, a boost pad (a flicker) on every fifth edge cell;
//   - the curtains: six bands two cells thick that wave across the sky (each its own sine), kept three
//     cells clear of the road, with a shimmer of slow pads along their lower edge and icicles (spikes);
//   - stars: lone cells of land far from everything;
//   - the ribbon ends where the road dives stay void.
// Colour concept: the northern lights. On top a gold ribbon with pink edges between violet and raspberry
// curtains, underneath a pale blue ribbon with violet edges between wine curtains; the stars ice.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 80, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [8, 72];
const R = road(g, [...start, 'N'],
  'N12 NE10 N8 NW10 N8 NE14 N10 D'                   // top: up the sky in long leans and off the end of the ribbon
  + ' S8 SE10 S10 SW6 S3 SW5 S2 SE5 S2 SE14 S12 D'   // underside: back down, swaying east and off the lower end
  + ' N8 NE10 N4 NE5 N4 NW5 N3 NW8 N12 D'            // top: back up the east, swaying, and off
  + ' S8 SE30 S27 D'                                 // underside: down, the long lean over the edge and down to the start
  + ' N7');                                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// Past every corner three cells straight on stay clear, with the cells round them.
const runout = new Set();
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 4; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout.add(key(...o)); }
}

// ---- the land: the ribbon, the curtains and the stars.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
const curtain = new Map();                                  // cell -> {n, edge}
for (let n = 0; n < 6; n++) {
  const y0 = 6 + 13 * n + hash(n * 3 + 1) * 4, amp = 3 + hash(n * 3 + 2) * 3, ph = hash(n * 3 + 3) * 6.28, k = 1 + (n % 2);
  for (let c = 0; c < W; c++) {
    const y = y0 + amp * Math.sin(2 * Math.PI * k * c / W + ph);
    for (let r = Math.floor(y - 1); r <= Math.ceil(y + 1); r++) {
      const rr = mod(r, H), off = r - y;
      if (off < -1 || off > 1) continue;
      if (near(c, rr) >= 3 && !runout.has(key(c, rr))) curtain.set(key(c, rr), {n, edge: off > 0.3});
    }
  }
}
const star = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) >= 5 && !curtain.has(key(c, r)) && hash(c * 37 + r * 101) < 0.02) star.add(key(c, r));
for (const k of [...curtain.keys(), ...star]) land.add(k);
// The ribbon ends where the road dives: the dive cell and the cells round it that are not road stay void.
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  pit.add(key(p.c, p.r));
  for (const o of R.nbrs(p.c, p.r)) if (!R.has(T, ...o) && !R.has(B, ...o)) pit.add(key(...o));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a ribbon end at ${p.c},${p.r}`);
for (const k of pit) land.delete(k);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- flickers, shimmer and icicles. Nothing sharp next to the road on its own face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const x = curtain.get(k);
    if (x) ch = x.edge ? (mod(c, 5) === 0 ? '^' : mod(c, 2) === 0 ? '=' : '.') : '.';
    else if (q.d === 1 && mod(q.u, 5) === 0) ch = '>';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [5, 11, 2, 8, 3, 10], crumbs: 2, steps: [10, 6, 11, 8], rails: 2});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: the northern lights.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r), x = curtain.get(k);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (x) return side === T ? (x.n % 2 ? '#cc00ff' : '#ff0066') : '#b41e46';
  if (star.has(k)) return '#ffffff';
  return side === T ? '#ff0088' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'aurora', name: 'Level 112', kind: 'Aurora', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
