// Level 29 "Lattice": a late classic level in the manner of Rooms, Shrivel and Shielded. A hex world of
// 48 x 56 cells, mostly void: one-cell girders over the dark, hex rooms at the bends and shielded
// galleries on the long straights. The road falls off the end of a girder four times and comes back under
// it, so half the run is on the underside, and it climbs the tile once round the east edge.
//   - girders: the road alone, one cell wide;
//   - galleries: five wide on the long straights, a shield of wall two cells out on the road's face with
//     a boost-pad gate every fourth cell, slow pads and spikes on the other face (Shielded);
//   - rooms: a hex of radius two at six bends, a ring of wall with doors and a spike in every other
//     door on the face the road does not take there, slow pads round the middle (Rooms, Shrivel).
// Colour concept: rusted iron at dusk. On top a caramel road over chocolate and wine iron, underneath a
// pale blue road over violet iron; the rooms glow raspberry on both faces.
// Stages: long chains, a launch on the long straights, a lead-in chain right up to every girder's end
// and the next chain where the snake comes out on the other face. Crystals only on the launches.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [6, 50];
const R = road(g, [...start, 'N'],
  'N16 NE6 N10 D'                   // top: up the west, a lean north-east, up to the first end
  + ' S7 SE10 NE6 N14 D'            // underside: back, south-east, north-east and up to the second end
  + ' S8 SE6 S12 SW8 D'             // top: back, down the middle, a swerve south-west to the third end
  + ' NE9 SE6 S10 D'                // underside: back, south-east and down to the fourth end
  + ' N8 NE7 N20 NE7 N22');         // top: up the east, round the east edge and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const OTHER = {top: B, bottom: T};

// Stretch lengths by stretch number; long stretches become galleries.
const lengthOf = new Map();
for (let i = 0; i < R.length; i++) lengthOf.set(R.seg[i], (lengthOf.get(R.seg[i]) || 0) + 1);
const gallery = s => lengthOf.get(s) >= 12 && s % 2 === 0;

// ---- the land.
const land = new Set();
for (const p of R.cells) if (!p.hole) land.add(key(p.c, p.r));
const ROOMS = [1, 3, 5, 7, 9, 11].map(n => R.at(R.corners[n % R.corners.length]));
const roomAt = new Map();
ROOMS.forEach((p, n) => { for (let k = 0; k <= 2; k++) g.ring(p.c, p.r, k).forEach((q, j) => roomAt.set(key(...q), {n, k, j, side: p.side})); });
for (const k of roomAt.keys()) land.add(k);
for (const side of [T, B]) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = R.local(side, c, r);
  if (q.d <= 2 && gallery(q.s) && R.at(q.i).side === side) land.add(key(c, r));
}
for (const p of R.cells) if (p.hole) land.delete(key(p.c, p.r));
// A dive needs void straight on: the cell past each girder's end, and the one after it.
for (const p of R.cells) if (p.hole && land.has(key(...g.step(p.c, p.r, p.h)))) land.delete(key(...g.step(p.c, p.r, p.h)));
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- what stands on the land.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r), o = R.local(OTHER[side], c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const room = roomAt.get(k);
    if (room) {
      if (room.k === 2) ch = mod(room.j, 3) === 0 ? (mod(room.j, 6) === 0 ? '^' : '.') : '#';
      else if (room.k === 1) ch = '=';
      else ch = '>';
    } else if (gallery(o.s) && R.at(o.i).side === OTHER[side] && o.d <= 2) {
      ch = o.d === 1 ? (mod(o.u, 3) === 0 ? '^' : '=') : '.';                         // under a gallery
    } else if (gallery(q.s) && R.at(q.i).side === side) {
      ch = q.d === 2 ? (mod(q.u, 4) === 0 ? '>' : '#') : '.';                          // the shield
    }
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = q.d <= 1 ? '.' : '=';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [6, 3], launch: 16});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: rusted iron at dusk.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (roomAt.has(key(c, r))) return roomAt.get(key(c, r)).k % 2 ? '#ff0066' : '#b41e46';
  return side === T ? (q.d === 1 ? '#b41e46' : '#993300') : (q.d === 1 ? '#ff00ff' : '#6600cc');
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'lattice', name: 'Level 29', kind: 'Lattice', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
