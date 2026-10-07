// Level 78 "Citadel": a very hard square level, a fortress. A square world of 52 x 52: square rings round a
// keep with a well in the middle (a hole two by two). Out from the middle: the keep, its wall (ring 4), the
// inner bailey, the inner curtain wall (ring 9), the moat (rings 12 and 13, the void), the outer bailey,
// the outer curtain wall (ring 18) and the glacis, with the void beyond. The road storms the keep on top
// along the south bailey, through the gates and over a drawbridge, and drops down the well; underneath,
// in the dungeons, it rounds the inner bailey, breaks out north over the other drawbridge and runs off the
// north edge; on top it rides round the north and east baileys and drops into the moat; underneath it
// runs along the foot of the walls and off the west edge, and comes home on top.
//   - the walls are walls on both faces, open only at the gates the road makes;
//   - towers at the corners of both curtain walls: a block of walls round a spike;
//   - on top the inner bailey is a parade ground of boost pads, the outer bailey has rows of tents
//     (slow pads), and caltrops (spikes) are strewn on the glacis; underneath, the dungeon cells are
//     barred with spikes;
//   - long chains, '>=' gates between chains.
// Colour style, a castle at dusk: a raspberry keep, wine and chocolate baileys, a violet glacis, a gold
// road; underneath the same darker with a pink road.
// Stages: long chains, a chain through every bend, lead-in chains to the well, the moat and the edges.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 52, H = 52, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const ring = (c, r) => Math.max(Math.abs(2 * c - 51), Math.abs(2 * r - 51)) >> 1;   // 0 at the well
const LAND = 21, MOAT = [12, 13], WALLS = [4, 9, 18];
const start = [12, 42];
const runs =
  'E13 N15 D'                  // top: along the south bailey, through the gates and down the well
  + ' S6 E7 N13 W13 N15 D'     // underside: round the inner bailey, out north and off the north edge
  + ' S6 E23 S33 W8 N2 D'      // top: round the north and east baileys and into the moat
  + ' S7 W12 N4 W18 D'         // underside: along the foot of the south wall and off the west edge
  + ' E9';                     // top: home

// ---- the land: everything inside the glacis but the moat and the well, and a drawbridge under the road.
const probe = road(new Grid(W, H), [...start, 'E'], runs);
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) { const k = ring(c, r); if (k > 0 && k <= LAND && !MOAT.includes(k)) land.add(key(c, r)); }
const bridge = new Set();
for (const p of probe.cells) if (!p.hole) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
  const k = key(p.c + a, p.r + b);
  if (!land.has(k) && ring(p.c + a, p.r + b) > 0) { land.add(k); bridge.add(k); }
}
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); bridge.delete(key(p.c, p.r)); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'E'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a hole`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
// Towers: the corners of the two curtain walls.
const tower = (c, r) => {
  for (const k of [9, 18]) for (const [x, y] of [[25 - k, 25 - k], [26 + k, 25 - k], [25 - k, 26 + k], [26 + k, 26 + k]])
    if (Math.abs(c - x) <= 1 && Math.abs(r - y) <= 1) return c === x && r === y ? '^' : '#';
  return null;
};

// ---- the fortress, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const n = ring(c, r);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const t = bridge.has(k) ? null : tower(c, r);
    if (t) ch = t;
    else if (WALLS.includes(n) && !bridge.has(k)) ch = '#';                                // the walls
    else if (n >= 5 && n <= 8) ch = side === T ? (mod(c + r, 2) === 0 && mod(c, 2) === 0 ? '>' : '.') : (mod(c, 3) === 0 && mod(r, 3) === 0 ? '^' : '.');
    else if (n >= 14 && n <= 17 && side === T) ch = n === 15 && mod(c + r, 4) === 0 ? '=' : '.';   // tents
    else if (n >= 19 && side === T && mod(c * 3 + r * 5, 7) === 0) ch = '^';               // caltrops
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {first: 9, lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, a castle at dusk: by ring, a raspberry keep out to a violet glacis; a gold road.
const ZONE = {top: ['#ff0066', '#b41e46', '#993300', '#550077'], bottom: ['#b41e46', '#993300', '#550077', '#550077']};
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  if (bridge.has(k)) return side === T ? '#ff44aa' : '#b41e46';
  const n = ring(c, r);
  return ZONE[side][n <= 4 ? 0 : n <= 9 ? 1 : n <= 18 ? 2 : 3];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'citadel', name: 'Level 78', kind: 'Citadel', start: [...start, 'E'], colors, grid: g};
if (require.main === module) console.log(g.print());
