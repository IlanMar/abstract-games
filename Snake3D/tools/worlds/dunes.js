// Level 98 "Dunes": a hard level, a long one, with relief. A hex world of 64 x 72 cells, an endless plane
// of desert: two systems of dunes cross the plane as long waves, so the road climbs and drops all the way
// and the next item often hides behind a crest. A pink caravan trail winds over the dunes, goes down into
// four oases (holes) and runs the caves of an aquifer underneath. The thread is uneven: stages wait up to
// the edge of sight, crystals lead on over the crests, and at some bends only the trail shows the turn.
//   - relief: the sum of two sine waves across the plane, rounded to quarter cells, so that no step
//     between neighbours is steeper than half a cell (the script prints the steepest);
//   - the sand: ripples (slow pads) along the crests, cacti (spikes) and rocks (small clusters of wall);
//   - the oases: a hole of radius one one step past each dive, a ring of water (slow pads) and a broken
//     ring of palms (spikes) round it;
//   - the aquifer: cave walls in veins, stalagmites (spikes), pools of slow pads in the low ground.
// Colour concept: a desert at noon. On top a pink trail over beige crests, caramel slopes and olive
// hollows, underneath a gold trail through dark teal rock with violet pools; the oases glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 64];
const R = road(g, [...start, 'N'],
  'N6 NE6 N6 NW6 N2 NE10 N3 NW6 N5 NE14 SE8 S10 D'   // top: up and over the west dunes, a lean north-east and down into an oasis
  + ' N8 NE12 N4 NW6 N2 NE6 N2 NW10 D'               // aquifer: back up, north-east, a crook north and off to the north-west
  + ' SE18 S6 SE6 S8 SW6 SW8 S10 D'                  // top: back, the long slope south-east, a dog-leg and down into the third oasis
  + ' N6 NE4 SE6 S10 SE17 S10 D'                     // aquifer: up, over to the east, the long diagonal over the edge and down
  + ' N7');                                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- relief: two crossing systems of dunes, periodic over the world.
const wave = (c, r) => {
  const y = r + (c % 2) * 0.5, t = 2 * Math.PI;
  return Math.sin(t * (2 * c / W + 3 * y / H)) + 0.45 * Math.sin(t * (-3 * c / W + 2 * y / H) + 1.3);
};
const AMP = 0.95;
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => Math.round((1.5 + AMP * wave(c, r)) * 4) / 4));
const crest = (c, r) => wave(c, r) > 0.9, hollow = (c, r) => wave(c, r) < -0.6;

// ---- the oases: a hole of radius one one step past each dive, through both faces.
const oases = R.cells.filter(p => p.hole).map(p => g.step(p.c, p.r, p.h));
const oasis = new Set();
for (const w of oases) for (const q of g.disk(...w, 1)) { g.hole(...q); oasis.add(key(...q)); }
for (const p of R.cells) if (!p.hole && oasis.has(key(p.c, p.r))) throw new Error(`the road runs into an oasis at ${p.c},${p.r}`);
const water = new Set(), palms = new Set();
for (const w of oases) {
  for (const q of g.ring(...w, 2)) water.add(key(...q));
  g.ring(...w, 3).forEach((q, n) => { if (n % 3 === 1) palms.add(key(...q)); });
}

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the desert and the aquifer.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (oasis.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (water.has(k)) ch = q.d >= 1 ? '=' : '.';
  else if (palms.has(k)) ch = '^';
  else if (side === T) {
    if (crest(c, r) && mod(c + r, 2) === 0 && q.d >= 2) ch = '=';                                  // ripples on a crest
    else if (q.d >= 3 && hash(Math.floor(c / 3) * 41 + Math.floor(r / 3) * 59) < 0.07 && n < 0.6) ch = '#';  // rocks
    else if (q.d >= 2 && n < 0.045) ch = '^';                                                        // a cactus
  } else {
    if (q.d >= 3 && mod(2 * c + 3 * r, 13) === 0 && n < 0.75) ch = '#';                              // cave walls
    else if (hollow(c, r) && q.d >= 2 && n < 0.5) ch = '=';                                          // a pool
    else if (q.d >= 2 && n < 0.05) ch = '^';                                                         // a stalagmite
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {first: 14, lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 2) === 1,
  gaps: [2, 11, 6, 8, 3, 10], crumbs: 2, steps: [9, 5, 11, 7], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a desert at noon.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28');
  if (oasis.has(k) || water.has(k)) return '#ff0066';
  if (side === B) return hollow(c, r) ? '#6600cc' : '#444444';
  const v = wave(c, r);
  return v > 0.6 ? '#ff5a28' : v > -0.4 ? '#ff3300' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'dunes', name: 'Level 98', kind: 'Dunes', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const q of R.nbrs(c, r)) worst = Math.max(worst, Math.abs(height[r][c] - height[q[1]][q[0]]));
  console.log('steepest step', worst, 'top', Math.max(...height.flat()), 'low', Math.min(...height.flat()));
}
