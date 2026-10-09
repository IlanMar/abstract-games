// Level 126 "Molecule": a very hard hex level in the manner of the late classic levels Circuit and
// Skeletal, over the void. A hex world of 80 x 72 cells, all void but a ball-and-stick model of a
// molecule: four benzene rings in a row (across the edge of the world), joined by single bonds one cell
// wide, with hydrogens all round. On top the road runs the upper half of every ring and the bonds between
// them, out along a bond with nothing at its
// end and off it; underneath it comes back along the lower halves and off the other loose bond; on top it
// comes back up that bond to the first ring. On each face the half of a ring the road does not take is
// blocked. The thread is uneven: stages wait up to the edge of sight, crystals lead on along the bonds, and
// at some bends only the painted road shows the turn.
//   - the rings: hex rings of radius 5 (the road's sides of five cells, every turn 60°, so one chain takes
//     a half ring through three bends), three cells wide, an atom (a disk of radius 2) at every corner;
//     inside each, the aromatic circle, an island ring of radius 2 in boost pads;
//   - the bonds: one cell wide, sixteen cells between the rings, twelve on the loose ends; crystals four cells
//     apart along them, leading into the chain round the next ring;
//   - the hydrogens: a bond of walls four cells long straight out from every free corner and an atom of
//     radius one, a spike in a ring of slow pads;
//   - the half ring off the road on a face: walls along its middle, slow pads either side.
// Colour concept: a model kit on a dark desk. On top a gold road over violet bonds and dark teal carbon
// atoms, the aromatic circles raspberry, the hydrogens pale blue; underneath a pale blue road over wine.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 80, H = 72, T = 'top', B = 'bottom';
const {mod, key, unkey} = kit;
const K = 5;
const start = [18, 56];
const runs =
  'NE14 N5 NE5 SE5 NE16 N5 NE5 SE5 NE16 N5 NE5 SE5 NE12 D'                     // top: along the first bond, the upper halves of the rings and off the loose end
  + ' SW13 S5 SW5 NW5 SW16 S5 SW5 NW5 SW16 S5 SW5 NW5 SW16 S5 SW5 NW5 SW12 D'  // underneath: back along the lower halves and off the other loose end
  + ' NE13 N5 NE5 SE5 NE2';                       // top: up the loose bond and the upper half of the first ring
const g0 = new Grid(W, H, true);
const probe = road(g0, [...start, 'NE'], runs);
// The rings: the centres are K steps north-east of each lower-left corner (6,62), (32,49), (58,36), (4,23).
const RINGS = [[6, 62], [32, 49], [58, 36], [4, 23]].map(v => { let q = v; for (let n = 0; n < K; n++) q = g0.step(...q, 'NE'); return q; });
const CORNERS = ['SW', 'NW', 'N', 'NE', 'SE', 'S'];          // outward at each corner, from the lower left round
const cornerOf = (ctr, n) => { let q = ctr; for (let s = 0; s < K; s++) q = g0.step(...q, CORNERS[n]); return q; };
const BONDED = [[0, 3], [0, 3], [0, 3], [0, 3]];                     // corners with a bond: the lower left and upper right

// ---- the land.
const land = new Set(), band = new Set(), rings = new Map(), atoms = new Set(), circles = new Set(), hydrogens = new Map();
RINGS.forEach((ctr, n) => {
  for (const rad of [K - 1, K, K + 1]) for (const q of g0.ring(...ctr, rad)) { land.add(key(...q)); band.add(key(...q)); if (rad === K) rings.set(key(...q), n); }
  for (const q of g0.ring(...ctr, 2)) { land.add(key(...q)); circles.add(key(...q)); }
  for (let v = 0; v < 6; v++) {
    const cv = cornerOf(ctr, v);
    for (const q of g0.disk(...cv, 2)) { land.add(key(...q)); atoms.add(key(...q)); }
    if (BONDED[n].includes(v)) continue;
    let q = cv;
    for (let s = 0; s < 6; s++) { q = g0.step(...q, CORNERS[v]); land.add(key(...q)); if (s >= 2) hydrogens.set(key(...q), 'bond'); }
    for (const o of g0.disk(...q, 1)) { land.add(key(...o)); hydrogens.set(key(...o), o[0] === q[0] && o[1] === q[1] ? 'H' : 'ring'); }
  }
});
for (const p of probe.cells) if (!p.hole) land.add(key(p.c, p.r));
for (const p of probe.cells) if (p.hole && land.has(key(p.c, p.r))) throw new Error(`the dive at ${p.c},${p.r} is not over the void`);
const g = new Grid(W, H, true);
for (const k of land) g.set('both', ...unkey(k), '.');
const R = road(g, [...start, 'NE'], runs);
const tight = i => { const p = R.at(i); return !band.has(key(p.c, p.r)); };
const runout = kit.runouts(g, R);

// ---- the model, face by face: the half ring off the road blocked.
kit.paint(g, R, {cells: land, runout}, (side, c, r, q, n) => {
  const k = key(c, r);
  if (circles.has(k)) return side === T ? '>' : '=';
  if (hydrogens.has(k)) return {bond: '#', H: '^', ring: '='}[hydrogens.get(k)];
  if (atoms.has(k)) return q.d >= 2 && n < 0.15 ? '^' : '.';
  if (rings.has(k)) return q.d >= 2 ? '#' : '.';
  return q.d >= 2 && band.has(k) ? '=' : '.';
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread round the rings, trails of crystals along the bonds, two chains at once.
let {stages, pads} = autoStages(R, {first: 11, lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [6, 10, 3, 8, 11, 5], crumbs: 3, steps: [9, 7, 11, 6], rails: 3});
// A chain that begins on a bond takes the bond as a trail of crystals and begins two cells short of the ring.
stages = stages.map(s => s.flatMap(gr => {
  const [kind, a, b] = gr;
  if (kind !== 'chain') return [gr];
  let m = a;
  while (m <= b && tight(m)) m++;
  if (m - a < 8 || b - m < 3) return [gr];
  const gems = [];
  for (let x = a; x < m - 3; x += 4) gems.push(x);
  return [gems.length > 1 ? ['gems', ...gems] : ['gem', gems[0]], ['chain', m - 2, b]];
}));
const bond = i => tight(i) && !R.dives.some(d => mod(d - i, R.length) <= 6);   // not the lead-in to a dive
stages = kit.merge(R, kit.trails(stages, bond, 5));
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a model kit on a dark desk.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (circles.has(k)) return '#ff0066';
  if (hydrogens.has(k)) return hydrogens.get(k) === 'bond' ? '#993300' : '#ff99cc';
  if (side === B) return atoms.has(k) ? '#444444' : '#b41e46';
  return atoms.has(k) ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'molecule', name: 'Level 126', kind: 'Molecule', start: [...start, 'NE'], colors, grid: g};
if (require.main === module) console.log(g.print());
