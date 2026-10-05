// Level 33 "Orbit": a hard level. A hex world of 48 x 56 cells, mostly void: three concentric hex rings
// round a planet, at radius 6, 12 and 18, each three cells wide, joined only by the spokes the road lays
// down. The road goes round the outer ring, down a spoke to the middle ring, off its edge onto the
// underside, up a spoke to the inner ring and half round it, out to the middle ring, off its edge again
// and back on top out to the outer ring: a third of the run is underneath, and the rings turn every six
// cells.
//   - on every stretch of ring the road does not take on that face, an orbit current of boost pads runs
//     along the middle and spikes stand on the rim every fourth cell;
//   - the planet: a disc with a ring of wall round slow pads and a boost pad at its heart;
//   - moons: small islands out in the void, a kicker in a ring of slow pads.
// Colour concept: a planetarium at night. On top a caramel road, underneath a pale lilac road; the outer
// ring violet, the middle one wine, the inner one chocolate, the planet raspberry.
// Stages: long chains along the rings, one chain through each run of bends, a lead-in chain right up to
// each edge and the next chain where the snake comes out; a launch on the long straights.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const C = [24, 28];
const start = [6, 27];
const R = road(g, [...start, 'N'],
  'N8 NE18 SE9 S6'                // top: up the outer ring, round its north and down a spoke
  + ' SE3 S12 D'                  // top: the middle ring's east side and off its south-east edge
  + ' N7 NW12 SW6 S12 SE6 D'      // underside: back up, a spoke in, half round the inner ring, a spoke out
                                  // to the middle ring and off its south edge
  + ' NW19 N4');                  // top: back along the middle ring, a spoke out and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const OTHER = {top: B, bottom: T};

// Ring radius of every cell round the planet.
const radius = new Map();
for (let k = 0; k <= 30; k++) for (const q of g.ring(...C, k)) if (!radius.has(key(...q))) radius.set(key(...q), k);
const RINGS = [6, 12, 18];
const ringOf = (c, r) => { const k = radius.get(key(c, r)); return RINGS.find(n => Math.abs(k - n) <= 1); };

// ---- the land: the rings, the road (its spokes), the planet and the moons.
const land = new Set();
for (const [k, n] of radius) if (RINGS.some(m => Math.abs(n - m) <= 1) || n <= 2) land.add(k);
for (const p of R.cells) if (!p.hole) land.add(key(p.c, p.r));
const moons = [];
{
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (land.has(key(c, r))) continue;
    const d = Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
    if (d >= 4 && g.disk(c, r, 2).every(q => !land.has(key(...q)))) cand.push([c, r, d]);
  }
  cand.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
  for (const [c, r] of cand) if (moons.length < 6 && !moons.some(m => g.disk(...m, 7).some(q => q[0] === c && q[1] === r))) moons.push([c, r]);
}
const moonAt = new Map();
moons.forEach(m => g.disk(...m, 1).forEach((q, j) => moonAt.set(key(...q), j)));
for (const k of moonAt.keys()) land.add(k);
// The edges the road falls off: the dive cell and the cell past it are void.
const edge = new Set();
for (const p of R.cells) if (p.hole) for (const q of [[p.c, p.r], g.step(p.c, p.r, p.h)]) edge.add(key(...q));
for (const p of R.cells) if (!p.hole && edge.has(key(p.c, p.r))) throw new Error(`the road runs over an edge at ${p.c},${p.r}`);
for (const k of edge) land.delete(k);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- what stands on the land, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const n = radius.get(k), ring = ringOf(c, r);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (moonAt.has(k)) ch = moonAt.get(k) === 0 ? '>' : '=';
    else if (n <= 2) ch = n === 2 ? (side === T ? '#' : '^') : n === 1 ? '=' : '>';      // the planet
    else if (ring && q.d >= 2) {
      // An orbit current along the middle of the ring, spikes on its rim every fourth cell.
      const j = g.ring(...C, n).findIndex(o => o[0] === c && o[1] === r);
      ch = n === ring ? (mod(j, 2) === 0 ? '>' : '.') : mod(j, 4) === 0 ? '^' : '.';
    }
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {first: 12, lengths: [11, 14], lead: [5, 3], launch: 14});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: a planetarium at night.
const ringColor = {6: '#993300', 12: '#b41e46', 18: '#6600cc'};
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r), n = radius.get(k);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (n <= 2) return '#ff0066';
  if (moonAt.has(k)) return '#6600cc';
  const ring = ringOf(c, r);
  if (ring) return ringColor[ring];
  return side === T ? '#993300' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'orbit', name: 'Level 33', kind: 'Orbit', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
