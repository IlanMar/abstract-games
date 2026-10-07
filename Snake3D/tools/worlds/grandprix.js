// Level 76 "Grand Prix": a very hard hex level, a racing circuit over the void. A hex world of 48 x 56, all
// void but the track, three cells wide, and the pit garages beside the start straight. On top the circuit
// runs up the start straight, sweeps right into turn one, climbs to a hairpin, comes down through a
// chicane (left, right, left a cell apart), sweeps round the south and up the back straight with its boost
// zone, and runs off the end of the track into the tunnel: underneath it winds back south-west under the
// circuit and comes up at the foot of the start straight. Off the track there is only the void.
//   - kerbs: boost and slow pads in turn on the outside of every bend;
//   - the boost zone: boost pads beside the back straight on top, every third cell;
//   - the pit lane: a strip beside the start straight with a slow-pad speed limit and garages of walls;
//   - grandstands: blocks of walls out beside the long straights, joined to nothing;
//   - long chains, '>=' gates between chains.
// Colour style, a night race: a gold racing line on a violet track (on wine the gold comes out olive),
// raspberry pits and stands; underneath darker with a pink line.
// Stages: long chains, a chain through every run of close bends, lead-in chains to the tunnel.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [8, 44];
const runs =
  'N16 NE6 N8 NE2 SE2 S6 SE2 S2 SW2 S4 SE8 NE8 N20 D'   // top: the lap, off the end of the back straight
  + ' S8 SW12 S6 SW14 S12 D'                             // underside: the tunnel, under the circuit
  + ' N6';                                               // top: up onto the start straight
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the land: the track, the pit lane and the grandstands.
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
const land = new Set();
for (const p of probe.cells) if (!p.hole) for (const q of g.disk(p.c, p.r, 1)) land.add(key(...q));
const PIT = [], STANDS = [];
for (let r = 30; r <= 42; r++) PIT.push([4, r]);                      // the pit lane, west of the start straight
for (let r = 31; r <= 41; r += 2) STANDS.push([2, r]);                 // its garages
for (let r = 14; r <= 26; r++) STANDS.push([38, r]);                   // a grandstand east of the back straight
for (const [c, r] of [...PIT, ...STANDS]) land.add(key(c, r));
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.step(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the track at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const nearCorner = i => R.corners.some(k => Math.abs(k - i) <= 1 || Math.abs(k - i - R.length) <= 1 || Math.abs(k - i + R.length) <= 1);
const pit = new Set(PIT.map(p => key(...p))), stands = new Set(STANDS.map(p => key(...p)));

// ---- the circuit, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (stands.has(k)) ch = '#';
    else if (pit.has(k)) ch = mod(r, 3) === 0 ? '=' : '.';
    else if (q.d === 1 && nearCorner(q.i)) ch = mod(c + r, 2) === 0 ? '>' : '=';            // kerbs
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages, then the boost zone beside the back straight.
const {stages, pads} = autoStages(R, {first: 9, lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);
const back = R.cells.findLastIndex((p, i) => i > 0 && p.side === T && p.h === 'N' && R.at(i - 1).h === 'NE');   // the back straight
for (let i = back + 2; i < back + 18; i += 3) for (const q of R.nbrs(R.at(i).c, R.at(i).r))
  if (g.get(T, ...q) === '.' && R.local(T, ...q).d === 1) g.set(T, ...q, '>');

// ---- colours, a night race: a gold racing line on a violet track, raspberry pits and stands.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  if (stands.has(k) || pit.has(k)) return side === T ? '#ff0066' : '#b41e46';
  return side === T ? '#6600cc' : '#550077';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'grandprix', name: 'Level 76', kind: 'Grand Prix', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
