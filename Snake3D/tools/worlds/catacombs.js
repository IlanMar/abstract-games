// Level 31 "Catacombs": a hard level. A square world of 48 x 48 cells: tunnels cut through the dark, the
// rest is void. Every tunnel is three cells wide with walls on both sides, so the snake runs between walls
// all the way; a missed bend runs into the alcove past it and then off into the dark. The road climbs two
// staircases of bends and drops through four pits to the other face and back, so half the run is on the
// underside, along its own tunnels.
//   - the tunnel walls stand two cells from the road, with a niche every sixth cell and a bone (a spike)
//     at the back of it;
//   - where a tunnel of the other face runs, this face is a crypt floor: mud (slow pads) and pillars;
//   - the pits: the dive cell and the cells round it, open through both faces.
// Colour concept: a torchlit crypt. On top a caramel road between chocolate walls on wine stone,
// underneath a pale lilac road between violet walls; the pits glow raspberry.
// Stages: long chains in the tunnels, one chain up each staircase, a lead-in chain right up to each pit and
// the next chain where the snake comes out; a launch on the long tunnels.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [6, 42];
const R = road(g, [...start, 'N'],
  'N14 E5 N5 E5 N13 E12 D'          // top: up the west tunnel, a staircase and east into the first pit
  + ' W7 S12 E5 S5 E5 S10 D'        // underside: back, down, a staircase and down into the second pit
  + ' N7 E8 N16 W6 N8 D'            // top: up, east, the long east tunnel, west and up into the third pit
  + ' S6 E8 S28 W30 N4 D'           // underside: down, east, the long tunnels south and west, up into the fourth
  + ' S9 W6 N2');                   // top: down, west and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const OTHER = {top: B, bottom: T};

// ---- the land: three cells round the road on either face.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (Math.min(R.local(T, c, r).d, R.local(B, c, r).d) <= 3) land.add(key(c, r));
// The pits: the dive cell, the cell past it and the cells either side of both.
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const q of [[p.c, p.r], g.move(p.c, p.r, p.h)]) for (const [dx, dy] of [[0, 0], ...across]) pit.add(key(mod(q[0] + dx, W), mod(q[1] + dy, H)));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a pit at ${p.c},${p.r}`);
for (const k of pit) land.delete(k);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face, with the cells round them: an alcove.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the tunnels, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d <= 1) continue;
    let ch = '.';
    if (q.d === 2) ch = mod(q.u, 6) === 0 ? '.' : '#';                                  // the tunnel wall and its niches
    else if (q.d === 3) ch = mod(q.u, 6) === 0 ? '^' : '#';                             // a bone at the back of a niche
    if (q.d >= 4 || (q.d === 3 && R.local(OTHER[side], c, r).d <= 3 && mod(q.u, 6) !== 0)) {
      // A crypt floor under the other face's tunnel: mud and pillars.
      ch = mod(c, 3) === 0 && mod(r, 3) === 0 ? '#' : mod(c + 2 * r, 5) === 0 ? '=' : '.';
    }
    if (/[#^]/.test(ch) && runout[side].has(k)) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3], launch: 14});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: a torchlit crypt.
const pitGlow = new Set();
for (const k of pit) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) pitGlow.add(key(mod(c + dx, W), mod(r + dy, H))); }
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (pitGlow.has(key(c, r))) return '#ff0066';
  if (q.d === 1) return '#b41e46';
  if (q.d <= 3) return side === T ? '#993300' : '#6600cc';
  return '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'catacombs', name: 'Level 31', kind: 'Catacombs', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
