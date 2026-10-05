// Level 28 "Wires": a late classic level in the manner of Skeletal, Circuit and Three Roads. A square
// world of 48 x 48 cells, mostly void: one-cell copper wires strung between square platforms. Half the
// play is on the underside. The road runs along a wire on top to its dead end, falls off it, comes back
// under the same wire and turns away at a junction onto a wire of its own; four dead ends take it over
// and under and back to the start. Colour concept: copper wires in caramel on top, the same wires in
// lilac underneath, the platforms in wine and chocolate, all over the black void.
//   - platforms (5 x 5) at the junctions: a wall at each corner, a rim of boost pads on top, a cross of
//     spikes underneath, where the road does not pass on that face (Skeletal);
//   - the wires the road takes on one face only carry pads on the other: a string of boost pads on top,
//     slow pads underneath (Accelerator, Vents);
//   - stubs: short dead wires off the platforms, decoys that end in the void.
// Stages: long chains along the wires, one chain through every pair of close bends, a lead-in chain
// right up to each dead end and the next chain from the cell where the snake comes out on the other face;
// a launch on the longest straights. No wall or spike stands next to the road on its own face.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [8, 40];
const R = road(g, [...start, 'N'],
  'N20 E18 D'                  // top: up the west wire, east to the first dead end
  + ' W7 S12 E14 N20 D'        // underside: back under it, down, across and up to the north dead end
  + ' S6 E10 S20 W10 D'        // top: down from it, east, down the long east wire, west to a dead end
  + ' E6 S6 W25 N8 D'          // underside: south, the long south wire west, up to a dead end
  + ' S12 W6 N6');             // top: down and round into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const wrap = (c, r) => [mod(c, W), mod(r, H)];

// ---- the land: every road cell, the platforms at six corners and the stubs. Dive cells stay void.
const land = new Set();
for (const p of R.cells) if (!p.hole) land.add(key(p.c, p.r));
const PLAT = [0, 2, 3, 5, 8, 11].map(n => R.corners[n]).map(i => [R.at(i).c, R.at(i).r]);
const platform = new Map();
PLAT.forEach(([pc, pr], n) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) platform.set(key(...wrap(pc + dx, pr + dy)), {n, dx, dy}); });
for (const k of platform.keys()) land.add(k);
// Past every corner five cells straight on stay free of stubs, so a missed turn never runs onto one.
const runout = new Set();
for (const k of R.corners) { let q = [R.at(k).c, R.at(k).r]; for (let n = 0; n < 5; n++) { q = g.move(...q, R.at(k).h); runout.add(key(...q)); } }
// Stubs: three cells off a platform edge into the void, away from the road.
const stubs = [];
PLAT.forEach(([pc, pr], n) => {
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const cells = [3, 4, 5].map(k => wrap(pc + dx * k, pr + dy * k));
    const clear = cells.every(q => !land.has(key(...q)) && !runout.has(key(...q)) && R.local(T, ...q).d >= 2 && R.local(B, ...q).d >= 2);
    if (clear && stubs.length < 2 * (n + 1)) { cells.forEach(q => land.add(key(...q))); stubs.push(...cells); break; }
  }
});
for (const p of R.cells) if (p.hole && land.has(key(p.c, p.r))) throw new Error(`the dive at ${p.c},${p.r} is not in the void`);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- what stands on the land, face by face. Nothing sharp next to the road on its own face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    if (R.has(side, c, r)) continue;
    const pl = platform.get(k), d = R.local(side, c, r).d;
    let ch = '.';
    if (pl) {
      const ring = Math.max(Math.abs(pl.dx), Math.abs(pl.dy));
      if (ring === 2 && Math.abs(pl.dx) === 2 && Math.abs(pl.dy) === 2) ch = '#';
      else if (side === T) ch = ring === 2 ? '>' : '.';
      else ch = (pl.dx === 0 || pl.dy === 0) && ring === 2 ? '^' : ring === 1 && (pl.dx + pl.dy + pl.n) % 2 === 0 ? '=' : '.';
    } else if (R.has(side === T ? B : T, c, r)) {
      // A wire the road takes on the other face only: pads on this one.
      const i = R.local(side === T ? B : T, c, r).i;
      ch = side === T ? (mod(i, 3) === 0 ? '>' : '.') : (mod(i, 2) === 0 ? '=' : '.');
    } else ch = side === T ? '>' : '^';      // the stubs: a boost to nowhere on top, a spike underneath
    if (/[#^]/.test(ch) && d <= 1) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [6, 3], launch: 17, pair: 3});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: caramel copper on top, lilac underneath, the platforms in wine and chocolate.
const colorOf = side => (c, r) => {
  const k = key(c, r), pl = platform.get(k);
  if (R.has(side, c, r)) { const i = R.local(side, c, r).i; return side === T ? (mod(i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(i, 4) < 2 ? '#ff44aa' : '#ff99cc'); }
  if (pl) return Math.max(Math.abs(pl.dx), Math.abs(pl.dy)) % 2 ? (side === T ? '#993300' : '#6600cc') : '#b41e46';
  return side === T ? '#993300' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'wires', name: 'Level 28', kind: 'Wires', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
