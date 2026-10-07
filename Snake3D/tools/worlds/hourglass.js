// Level 77 "Hourglass": a very hard hex level. A hex world of 48 x 56, all void but an hourglass: two glass
// bulbs, hexes nine cells round, joined by a neck one cell wide and seven long. On top the road runs up
// through the neck, winds across the upper bulb and drops off its top; underneath it winds back down the
// upper bulb the other way, comes down through the same neck, winds across the lower bulb and drops off
// its foot, coming back on top to jink up the lower bulb home. The neck is the road itself: one cell over
// the void, taken once on each face.
//   - the glass: a wall round the rim of both bulbs, broken where the road passes, so a missed bend
//     inside a bulb ends against the glass, not in the void;
//   - the sand: slow pads heaped in the bottom of each bulb on top; underneath the hourglass is upside
//     down, and the sand lies in the other end of each bulb;
//   - grains: lone spikes scattered on the glass far from the road;
//   - the falling sand: boost pads on the free cells of the road through the neck, on top;
//   - long chains, '>=' gates between chains.
// Colour style, an hourglass at night: violet glass, chocolate sand, a gold road; underneath darker with a
// pink road.
// Stages: long chains, a chain through every run of close bends, lead-in chains to the ends.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const BULBS = [[24, 15], [24, 41]], RAD = 9;
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the hourglass: the bulbs, and the neck under the road.
const bulbOf = new Map();                                     // cell -> [bulb, distance from its middle]
BULBS.forEach((b, n) => { for (let k = 0; k <= RAD; k++) for (const q of g.ring(...b, k)) bulbOf.set(key(...q), [n, k]); });
for (const k of bulbOf.keys()) g.set('both', ...k.split(',').map(Number), '.');
const start = [24, 35];
const runs =
  'N10 NE6 N6 NW6 N7 D'                         // top: up through the neck and across the upper bulb
  + ' S7 SW6 S6 SE6 S14 SE4 S2 SW4 S6 D'        // underside: down the upper bulb, the neck and the lower bulb
  + ' N8 NW4 N2 NE4 N2';                        // top: up the lower bulb, jinking, home
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
for (const p of probe.cells) if (!p.hole) g.set('both', p.c, p.r, '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (g.get(T, c, r) !== ' ') land.add(key(c, r));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
// Sand lies in the bottom of a bulb on top and in its top underneath.
const sand = (side, c, r) => { const b = bulbOf.get(key(c, r)); if (!b) return false; const dy = r - BULBS[b[0]][1]; return side === T ? dy >= 4 : dy <= -4; };

// ---- the glass, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const b = bulbOf.get(k);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (b && b[1] === RAD) ch = '#';                                                     // the glass
    else if (b && sand(side, c, r)) ch = mod(c + r, 2) === 0 ? '=' : '.';                // the sand
    else if (b && q.d >= 3 && hash(c, r + (side === T ? 0 : 99)) < 0.07) ch = '^';       // grains
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages, then the falling sand down the neck.
const {stages, pads} = autoStages(R, {first: 9, lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);
for (const p of R.cells) if (p.side === T && !p.hole && !bulbOf.has(key(p.c, p.r)) && g.get(T, p.c, p.r) === '.') g.set(T, p.c, p.r, '>');

// ---- colours, an hourglass at night: violet glass, chocolate sand, a gold road.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  const b = bulbOf.get(k);
  if (b && b[1] === RAD) return side === T ? '#cc00ff' : '#6600cc';
  if (sand(side, c, r)) return side === T ? '#993300' : '#b41e46';   // caramel #ff3300 came out brighter than the road
  return side === T ? (b && b[1] <= 4 ? '#6600cc' : '#550077') : '#550077';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'hourglass', name: 'Level 77', kind: 'Hourglass', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
