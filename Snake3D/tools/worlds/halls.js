// Level 64 "Halls": a very hard hex level in the manner of the middle classic level Rooms. A hex world of
// 48 x 56, all void but four great halls (hexes five cells round, one four) joined by corridors three cells
// wide. The road turns inside every hall: on top from the west hall to the middle one, to the east one and
// off the end of the south corridor; underneath back up through the east and middle halls to the north
// hall, through the west hall and off the end of the west corridor home.
//   - every hall is walled round, its wall broken only where the road comes in and goes out, so a
//     missed turn inside a hall ends against the wall, not in the void;
//   - inside the halls: on top a ring of spikes round the middle and a scatter of boost pads, underneath
//     a ring of slow pads and spikes in the corners;
//   - the corridors are lit with boost pads, and slow pads at every door;
//   - stages of two chains at once in the halls, as in Rooms.
// Colour style, classic Rooms (Classic 24): the halls in the red-to-orange of its palette, the corridors
// dark wine, a gold road.
// Stages: long chains, a chain through every bend, lead-in chains to the ends.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [8, 48];
const runs =
  'N20 NE14 SE14 S14 D'              // top: the west, middle and east halls, off the south corridor
  + ' N10 NW14 N12 NW2 SW12 S32 D'   // underside: the east, middle, north and west halls, off the west corridor
  + ' N4';                           // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const HALLS = [[8, 24, 5], [22, 23, 5], [36, 30, 5], [22, 13, 4]];

// ---- the halls and corridors.
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
const land = new Set();
for (const p of probe.cells) if (!p.hole) for (const q of g.disk(p.c, p.r, 1)) land.add(key(...q));
const hallOf = new Map();
for (const [c, r, rad] of HALLS) for (let k = 0; k <= rad; k++) for (const q of g.ring(c, r, k)) { land.add(key(...q)); if (!hallOf.has(key(...q))) hallOf.set(key(...q), {k, rad}); }
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.step(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const inHall = i => hallOf.has(key(R.at(i).c, R.at(i).r));

// ---- the halls, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const h = hallOf.get(k);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (h && h.k === h.rad) ch = '#';                                               // the hall wall
    else if (h && side === T && h.k === 2) ch = '^';                                // a ring of spikes
    else if (h && side === T && h.k >= 3 && mod(c * 3 + r, 7) === 0) ch = '>';
    else if (h && side === B && h.k === 3) ch = '=';
    else if (h && side === B && h.k === h.rad - 1 && mod(c + r * 2, 5) === 0) ch = '^';
    else if (!h && q.d === 1) ch = inHall(q.i + 2) || inHall(q.i - 2) ? '=' : (mod(q.u, 3) === 0 ? '>' : '.');   // corridor lights
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: two chains together where both lie in a hall.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 3) === 0});
const merged = [];
for (let k = 0; k < stages.length; k++) {
  const a = stages[k], b = stages[k + 1];
  if (b && a.every(gr => gr[0] === 'chain') && b.every(gr => gr[0] === 'chain') && inHall(a[0][2]) && inHall(b[0][1])
    && !R.dives.some(d => d > a[0][1] && d < b[0][1])) { merged.push([...a, ...b]); k++; }
  else merged.push(a);
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, classic Rooms: red to orange halls, wine corridors, a gold road.
const HALL = ['#ff7700', '#ee5500', '#ee4400', '#dd4400', '#dd3300', '#cc2200'];
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800';
  const h = hallOf.get(key(c, r));
  if (!h) return side === T ? '#b41e46' : '#993300';
  return HALL[Math.min(HALL.length - 1, h.k + (side === B ? 1 : 0))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'halls', name: 'Level 64', kind: 'Halls', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
