// Level 4 "Hive": a medium level in a honeycomb. A hex world, an endless comb (the 36 x 48 tile repeats)
// of six-sided cells, each three steps across, with walls of wax between them. The road cuts across the
// comb through doorways in the walls, on long slants that turn 60 degrees at a time, and twice drops
// through a well in the comb to the other face.
//   - the wax walls stand everywhere but beside the road, so the snake always runs through a doorway;
//   - in the cells: honey (slow pads), nectar (boost pads) and bees (spikes), a different mix on each
//     face; some cells away from the road are open wells, right through both faces;
//   - every well the road drops through is ringed by honey.
// Colour style, honey: a white road over gold comb with caramel wax; underneath dark chocolate comb with
// rose wax.
// Stages: long chains along the slants, a chain round every bend, a lead-in chain right up to each well
// and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 36, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 42];
const runs =
  'N14 NE10 SE10 NE6 N10 D'          // top: up, across the comb in slants and up into a well
  + ' S16 SE6 S8 SW10 NW10 N6 D'     // underside: back down, round to the east and south and up into a well
  + ' S9 SW6 NW6 N1';                // top: back down and round into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the comb: cell centres six steps apart (six north, or six north-east), radius three.
const centres = [];
for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) {
  let p = [0, 0];
  for (let n = 0; n < 6 * i; n++) p = g.step(...p, 'N');
  for (let n = 0; n < 6 * j; n++) p = g.step(...p, 'NE');
  centres.push(p);
}
const dist = new Map();                                     // cell -> [nearest, second] distances
const owner = new Map();
centres.forEach((m, k) => [0, 1, 2, 3, 4].forEach(rad => g.ring(...m, rad).forEach(q => {
  const id = key(...q), d = dist.get(id) || [9, 9];
  if (rad < d[0]) { dist.set(id, [rad, d[0]]); owner.set(id, k); } else if (rad < d[1]) dist.set(id, [d[0], rad]);
})));
const wax = (c, r) => { const d = dist.get(key(c, r)); return d[0] === d[1] || d[0] >= 3; };
const centreOf = (c, r) => dist.get(key(c, r))[0] === 0;

// The wells the road drops through: the cell past the dive and the ring round it.
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
const holes = new Set(), roadWells = new Set();
for (const p of probe.cells) if (p.hole) for (const q of g.disk(...g.step(p.c, p.r, p.h), 1)) { g.hole(...q); holes.add(key(...q)); roadWells.add(key(...q)); }
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over a well at ${p.c},${p.r}`);
// Open wells: cells of the comb far from the road on both faces.
for (const m of centres) {
  const far = g.disk(...m, 2).every(q => R.local(T, ...q).d >= 3 && R.local(B, ...q).d >= 3);
  if (far && hash(...m) < 0.4) for (const q of g.disk(...m, 1)) { g.hole(...q); holes.add(key(...q)); }
}

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the comb, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  const k = owner.get(key(c, r)), roll = hash(k * 7 + (side === T ? 0 : 3), 11);
  if (R.nbrs(c, r).some(o => roadWells.has(key(...o)))) ch = '=';                  // honey round a well
  else if (wax(c, r)) ch = q.d >= 2 ? '#' : '.';                                   // wax, a doorway by the road
  else if (centreOf(c, r) && q.d >= 2) ch = roll < 0.3 ? '^' : roll < 0.6 ? '=' : roll < 0.8 ? '>' : '.';   // a bee, honey, nectar
  else if (dist.get(key(c, r))[0] === 1 && q.d >= 2 && roll >= 0.3 && roll < 0.6) ch = '=';   // a pool of honey
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [9, 12], lead: [6, 4]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, honey: gold comb and caramel wax on top, chocolate and rose underneath.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd';
  if (wax(c, r)) return side === T ? '#ff3300' : '#b41e46';
  if (centreOf(c, r)) return side === T ? '#ff5a28' : '#ff0066';
  return side === T ? '#ff6600' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'hive', name: 'Level 4', kind: 'Hive', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
