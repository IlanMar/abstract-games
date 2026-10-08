// Level 82 "Bamboo": a very hard level. A square world of 48 x 56 cells, mostly void: a grove of bamboo
// over the dark. The land is the stalks the road climbs, three cells wide, joined by short leaf bridges,
// with bare stalks and leaves standing between them as decoys. The road climbs a stalk, crosses a bridge,
// slides down the next, drops off a stalk top into the void and climbs back underneath, so half the run is
// on the underside. No boost pads: the grove is slow and narrow. The thread is uneven: stages wait up to
// the edge of sight, crystals lead on up the long stalks, and at some bends only the painted stalk shows
// the turn.
//   - nodes: every sixth cell up a stalk a slow pad on both edges;
//   - leaves: a three-cell twig off a node into the void, slanting away, with a thorn (a spike) at its tip;
//   - bare stalks: decoy stalks halfway between the road's stalks, ringed with spikes at their nodes;
//   - the stalk tops: the dive cell, the cell past it and the cells either side of both stay void.
// Colour concept: a bamboo grove by moonlight. On top a mint road (there are no boost pads) up dark grey
// stalks with wine nodes, underneath a pale pink road up violet stalks; the leaves glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [6, 48];
const R = road(g, [...start, 'N'],
  'N30 E8 S20 E8 N30 D'         // top: up the first stalk, a bridge, down the second, up the third and off its top
  + ' S12 E8 N8 E8 S30 D'       // underside: back down, across, up a short stalk, across and down the fifth
  + ' N8 W8 S14 D'              // top: back up, a bridge west and down the fourth
  + ' N6 W24 S11 D'             // underside: up, the fallen stalk west and down the first
  + ' N7');                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const wrap = (c, r) => [mod(c, W), mod(r, H)];
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// Past every corner five cells straight on stay clear of leaves and decoys.
const runout = {top: new Set(), bottom: new Set()};
const runoutAny = new Set();
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 5; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) { runout[p.side].add(key(...o)); runoutAny.add(key(...o)); } }
}

// ---- the land: the stalks (one cell either side of the road on either face), leaves and bare stalks.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
const leaf = new Set(), thorn = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (!land.has(key(c, r)) || mod(r, 6) !== 0 || near(c, r) !== 1) continue;
  // A twig slants off the stalk edge, up and away from the road.
  const out = R.local(T, c - 1, r).d > R.local(T, c + 1, r).d || R.local(B, c - 1, r).d > R.local(B, c + 1, r).d ? -1 : 1;
  const cells = [1, 2, 3].map(s => wrap(c + out * s, r - s));
  if (cells.every(q => !land.has(key(...q)) && !runoutAny.has(key(...q)) && near(...q) >= 2)) {
    cells.forEach(q => leaf.add(key(...q)));
    thorn.add(key(...cells[2]));
  }
}
const bare = new Set();
for (const c of [10, 18, 26, 34, 42]) for (let r = 4; r < H - 4; r++) for (const dc of [0, 1]) {
  const q = [c + dc, r];
  if (near(...q) >= 3 && !runoutAny.has(key(...q)) && !leaf.has(key(...q))) bare.add(key(...q));
}
for (const k of [...leaf, ...bare]) land.add(k);
// The stalk tops stay void: the dive cell, the cell past it and the cells either side of both.
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const q of [[p.c, p.r], g.move(p.c, p.r, p.h)]) for (const [dx, dy] of [[0, 0], ...across]) pit.add(key(...wrap(q[0] + dx, q[1] + dy)));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a stalk top at ${p.c},${p.r}`);
for (const k of pit) { land.delete(k); leaf.delete(k); bare.delete(k); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- what grows on the land, face by face. Nothing sharp next to the road on its own face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (thorn.has(k)) ch = '^';
    else if (bare.has(k)) ch = mod(r, 6) === 0 ? '^' : mod(r, 6) === 3 ? '=' : '.';
    else if (q.d === 1 && mod(r, 6) === 0) ch = '=';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread, no boost pads.
const {stages} = autoStages(R, {lengths: [13, 16], lead: [5, 3], launch: 0,
  gaps: [6, 11, 3, 9, 2, 7], crumbs: 2, steps: [8, 11, 5, 10, 6], rails: 2});
placeStages(g, R, stages, {bends: 1});

// ---- colours: a bamboo grove by moonlight.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? '#00ff99' : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (leaf.has(k)) return '#ff0066';
  if (mod(r, 6) === 0) return '#b41e46';
  return side === T ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'bamboo', name: 'Level 82', kind: 'Bamboo', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
