// Level 104 "Sunflowers": a hard level. A hex world of 64 x 72 cells, an endless plane: a field of giant
// sunflowers seen from above. Every flower head is a disc of seeds laid out as in nature, one seed per
// golden angle (137.5 degrees) on a widening spiral, so the spikes of the seeds form the crossing spirals of a
// real sunflower, with a crown of petals round it. The road winds between the flowers and dives into the
// heart of four of them, a hole through the field, and runs among the roots underneath. Where the road
// crosses a head it cuts a lane through the seeds, with spikes two cells off on either hand. The thread is
// uneven: stages wait up to the edge of sight, crystals lead on between the flowers, and at some bends only
// the painted road shows the turn.
//   - a head: the heart (a hole of radius one), the seeds (spikes) out to radius five, the petals (slow
//     pads in twelve lobes) at radius six and seven; four flowers round the dives and more wherever a whole
//     flower stands two cells clear of the road;
//   - the field between: leaves (short walls) and bees (pairs of boost pads);
//   - the roots: veins of wall underneath, stones (spikes), tubers (slow pads).
// Colour concept: sunflowers at dusk. On top a pink road over dark teal leaves, gold petals round
// chocolate seed discs, underneath a gold road through chocolate soil with rose roots; the hearts glow
// raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 64, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 64];
const R = road(g, [...start, 'N'],
  'N6 NW4 N6 NE4 NE10 N12 NE8 N10 D'        // top: up the west with a kink, north-east between the flowers and into a heart
  + ' S8 SE10 S14 SE4 NE10 N4 NW6 N4 NE6 N4 D' // roots: back, south-east, south, north-east and up a crooked way into the second
  + ' S8 SE8 S6 SW6 S6 SE6 S2 SW12 D'       // top: back, down the east with a kink and south-west into the third
  + ' NE6 SE21 S3 D'                        // roots: back and the long diagonal over the edge into the last
  + ' N7');                                 // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const wrapS = (a, b, n) => { let d = mod(a - b, n); return d > n / 2 ? d - n : d; };   // signed, wrapped
// The centre of a cell in cell units: x east, y south (odd columns half a cell down).
const offset = (c, r, [hc, hr]) => [wrapS(c, hc, W) * Math.sqrt(3) / 2, wrapS(r + (c % 2) / 2, hr + (hc % 2) / 2, H)];

// ---- the flowers: four round the dives (one step past each), more wherever a whole flower fits.
const heads = R.cells.filter(p => p.hole).map(p => g.step(p.c, p.r, p.h));
for (let r = 3; r < H; r += 3) for (let c = 2; c < W; c += 2) {
  const disk = g.disk(c, r, 7);
  if (disk.every(q => near(...q) >= 2) && heads.every(h => g.disk(...h, 14).every(q => key(...q) !== key(c, r)))) heads.push([c, r]);
}
const SEEDS = [];
for (let k = 1; k <= 90; k++) { const rho = 0.62 * Math.sqrt(k), th = k * 2.39996; SEEDS.push([rho * Math.cos(th), rho * Math.sin(th)]); }
const part = new Map();                                     // cell -> 'heart' | 'seed' | 'disc' | 'petal'
for (const h of heads) {
  for (const q of g.disk(...h, 1)) part.set(key(...q), 'heart');
  for (let rad = 2; rad <= 7; rad++) for (const q of g.ring(...h, rad)) {
    const k = key(...q);
    if (part.has(k)) continue;
    const [x, y] = offset(...q, h);
    if (rad <= 5) part.set(k, SEEDS.some(([u, v]) => Math.hypot(x - u * 1.25, y - v * 1.25) < 0.45) ? 'seed' : 'disc');
    else if (Math.cos(12 * Math.atan2(y, x)) > -0.2) part.set(k, 'petal');
  }
}
const heart = new Set([...part].filter(([, v]) => v === 'heart').map(([k]) => k));
for (const p of R.cells) if (!p.hole && heart.has(key(p.c, p.r))) throw new Error(`the road runs into a heart at ${p.c},${p.r}`);
for (const k of heart) g.hole(...k.split(',').map(Number));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the field and the roots.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (heart.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  const p = part.get(k);
  let ch = '.';
  if (side === T) {
    if (p === 'seed') ch = '^';
    else if (p === 'petal') ch = '=';
    else if (!p && q.d >= 3 && n < 0.06) ch = '#';                                                 // a leaf
    else if (!p && q.d >= 2 && hash(Math.floor(c / 5) * 11 + Math.floor(r / 5) * 7) < 0.12 && n < 0.4) ch = '>';  // bees
  } else {
    if (q.d >= 3 && mod(3 * c + r, 11) === 0 && n < 0.8) ch = '#';                                // a root
    else if (q.d >= 2 && n < 0.04) ch = '^';
    else if (p === 'disc' && n < 0.3) ch = '=';                                                    // a tuber
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3], launch: 0, gate: i => mod(i, 2) === 1,
  gaps: [3, 10, 6, 11, 4, 8], crumbs: 2, steps: [7, 11, 5, 9], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: sunflowers at dusk.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), p = part.get(key(c, r));
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28');
  if (p === 'heart') return '#ff0066';
  if (side === B) return mod(3 * c + r, 11) === 0 ? '#b41e46' : '#993300';
  if (p === 'petal') return '#ff6600';
  if (p) return '#993300';
  return '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'sunflowers', name: 'Level 104', kind: 'Sunflowers', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
