// Level 68 "Crater": a very hard hex level with relief, a moon crater. A hex world of 48 x 56, all void but
// a disc twenty-one cells round: a rim four cells high at seventeen cells out, a floor one cell high inside
// it, and a central peak whose summit is a drain right through the moon. The road is a flower of six petals
// round the drain, three on each face: every petal runs out from the drain along one of the six lines
// through the middle, over the floor and up onto the rim, sweeps round the rim, comes back down and in
// along the next line and drops into the drain, coming out on the other face on that same line for the
// next petal. So the road climbs and falls the whole time and turns over six times a lap.
//   - the road is lit like a train line: boost pads beside it where it runs downhill, slow pads where it
//     climbs, every other cell;
//   - boulders on the floor and the slopes, away from the road: a ring of walls round a spike;
//   - the crest of the rim is a ring of slow pads, and a ring of walls runs round the foot of the outer
//     slope, so a missed bend out on the rim ends against it, not in the void;
//   - long chains, '>=' gates between chains.
// Colour style, a moon at night: violet in the basin through purple and magenta to a pink rim, a gold
// road; underneath the same darker with a pink road.
// Stages: long chains, a chain through every bend, lead-in chains to the drain.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const C0 = [24, 28];
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// Hex distance from the middle.
const dist = new Map();
for (let k = 0; k <= 22; k++) for (const q of g.ring(...C0, k)) if (!dist.has(key(...q))) dist.set(key(...q), k);
const dOf = (c, r) => dist.has(key(c, r)) ? dist.get(key(c, r)) : 99;
for (const [k, d] of dist) if (d >= 2 && d <= 21) g.set('both', ...k.split(',').map(Number), '.');

// The start: two cells out along the south-east line.
let start = C0;
for (let n = 0; n < 2; n++) start = g.step(...start, 'SE');
const runs =
  'SE12 NE4 N6 NW8 SW8 D'          // top: out south-east, round the rim, in from the north-east
  + ' NE13 N4 NW6 SW8 S8 D'        // underside: out north-east, in from the north
  + ' N13 NW4 SW6 S8 SE8 D'        // top: out north, in from the north-west
  + ' NW13 SW4 S6 SE8 NE8 D'       // underside: out north-west, in from the south-west
  + ' SW13 S4 SE6 NE8 N8 D'        // top: out south-west, in from the south
  + ' S13 SE4 NE6 N8 NW8 D'        // underside: out south, in from the south-east
  + ' SE1';                        // top: home
const R = road(g, [...start, 'SE'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the drain`);

// ---- relief: the peak falls from the drain to the floor, the floor rises to the rim, the rim falls away.
const hOf = d => d <= 1 ? 0 : d <= 7 ? 3.5 - 0.5 * (d - 2) : d <= 10 ? 1 : d <= 16 ? 1 + 0.5 * (d - 10) : d <= 18 ? 4 : 4 - 0.5 * (d - 18);
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (g.get(T, c, r) === ' ' ? 0 : hOf(dOf(c, r)))));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- boulders, face by face: the places farthest from the road.
const boulder = {top: new Map(), bottom: new Map()};
for (const side of [T, B]) {
  const cells = [];
  for (const [k, d] of dist) if (d >= 4 && d <= 18) { const [c, r] = k.split(',').map(Number); const q = R.local(side, c, r); if (q.d >= 4) cells.push([c, r, q.d]); }
  cells.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
  const at = [];
  for (const [c, r] of cells) if (at.length < 14 && at.every(([a, b]) => Math.abs(a - c) + Math.abs(b - r) > 7)) at.push([c, r]);
  for (const [c, r] of at) { boulder[side].set(key(c, r), '^'); for (const q of g.ring(c, r, 1)) boulder[side].set(key(...q), '#'); }
}

// ---- the moon, face by face.
const climb = i => height[R.at(i + 1).r][R.at(i + 1).c] - height[R.at(i).r][R.at(i).c];
for (const [k, dd] of dist) {
  if (dd < 2 || dd > 21) continue;
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (q.d === 1 && mod(q.u, 2) === 0 && !R.at(q.i).hole && !R.at(q.i + 1).hole && climb(q.i)) ch = climb(q.i) > 0 ? '=' : '>';   // the train line
    else if (boulder[side].has(k)) ch = boulder[side].get(k);
    else if (dd === 17) ch = '=';                                                   // the crest
    else if (dd === 20) ch = '#';                                                   // the foot wall
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {first: 4, lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, a moon at night: by height, violet in the basin to a pink rim; a gold road (white comes out teal, like the chains).
const SHADE = {top: ['#550077', '#6600cc', '#cc00ff', '#ff0088', '#ff44aa'], bottom: ['#550077', '#550077', '#6600cc', '#b41e46', '#ff0066']};
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  return SHADE[side][Math.min(4, Math.floor(height[r][c]))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'crater', name: 'Level 68', kind: 'Crater', start: [...start, 'SE'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let i = 0; i < R.length; i++) if (!R.at(i).hole && !R.at(i + 1).hole) worst = Math.max(worst, Math.abs(climb(i)));
  console.log('steepest step on the road:', worst);
}
