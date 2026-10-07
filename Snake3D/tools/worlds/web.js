// Level 72 "Web": a very hard hex level. A hex world of 48 x 56, all void but a spider's web: six threads
// one cell wide run out from the middle to twenty cells, and four rings of thread cross them at six, ten,
// fourteen and eighteen cells. The land is the web and nothing else. Every pass of the road comes in
// along one radial thread from its tip, turns onto a ring, runs round to the next radial thread, runs out
// along it and drops off its tip, coming back in along the same thread on the other face: six passes,
// three on each face, each on its own ring. Every crossing of threads is a fork: a missed turn runs off
// along the wrong thread.
//   - the spider in the middle: a ring of walls round a spike;
//   - dewdrops: on the threads the road does not take on that face, spikes on the rings and boost pads
//     on the radial threads, every fourth cell, clear near the road;
//   - crystal trails four cells apart over the long runs out to the tips (Skeletal, Absolute);
//   - long chains, '>=' gates between chains.
// Colour style, a web at night: lilac radial threads and violet rings over the void, a gold road;
// underneath wine and violet with a pink road.
// Stages: a chain through every turn onto and off a ring, crystal trails, lead-in chains to the tips.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const C0 = [24, 28], L = 20, RINGS = [6, 10, 14, 18];
const DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const D = k => DIRS[((k % 6) + 6) % 6];
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the web.
const land = new Set(), radial = new Set(), ringOf = new Map();
for (let k = 0; k < 6; k++) { let p = C0; for (let n = 1; n <= L; n++) { p = g.step(...p, D(k)); land.add(key(...p)); radial.add(key(...p)); } }
for (const r of RINGS) for (const q of g.ring(...C0, r)) { land.add(key(...q)); ringOf.set(key(...q), r); }
const hub = new Map();
for (let k = 0; k <= 2; k++) for (const q of g.ring(...C0, k)) { land.add(key(...q)); hub.set(key(...q), k); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- the road: pass k comes in on thread k to ring R[k], runs round to thread k + 1 and out to its tip.
const RING = [6, 14, 10, 6, 14, 10];
const pass = k => `${D(k + 3)}${L - RING[k] + 1} ${D(k + 2)}${RING[k]} ${D(k + 1)}${L - RING[k]} D`;
// The start: on the way out along thread 1, one cell past the first ring.
let start = C0;
for (let n = 0; n < RING[0] + 1; n++) start = g.step(...start, D(1));
const runs = [`${D(1)}${L - RING[0] - 1} D`, pass(1), pass(2), pass(3), pass(4), pass(5),
  `${D(3)}${L - RING[0] + 1} ${D(2)}${RING[0]} ${D(1)}1`].join(' ');
const R = road(g, [...start, D(1)], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the web at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
// How far along its thread a cell lies, for the dewdrops.
const along = new Map();
for (let k = 0; k < 6; k++) { let p = C0; for (let n = 1; n <= L; n++) { p = g.step(...p, D(k)); along.set(key(...p), n); } }

// ---- the web, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (hub.has(k)) ch = hub.get(k) === 0 ? '^' : hub.get(k) === 1 ? '#' : '.';           // the spider
    else if (radial.has(k)) ch = mod(along.get(k), 4) === 0 && !ringOf.has(k) ? '>' : '.';
    else if (ringOf.has(k) && mod(c + 2 * r, 4) === 0) ch = side === T ? '^' : '=';
    if (/[#^]/.test(ch) && !hub.has(k) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: crystal trails over the long straight runs.
let {stages, pads} = autoStages(R, {first: 3, lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
stages = stages.map(s => s.map(([kind, ...ix]) => {
  if (kind !== 'chain' || ix[1] - ix[0] < 8) return [kind, ...ix];
  for (let i = ix[0]; i <= ix[1]; i++) if (R.corners.includes(mod(i, R.length))) return [kind, ...ix];
  return ['gems', ...[...new Set([...Array.from({length: Math.floor((ix[1] - ix[0]) / 4) + 1}, (_, n) => ix[0] + 4 * n), ix[1]])]];
}));
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, a web at night: lilac radial threads, violet rings, a gold road.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  if (hub.has(k)) return side === T ? '#ff0066' : '#b41e46';
  if (radial.has(k)) return side === T ? '#ff44aa' : '#b41e46';
  return side === T ? '#cc00ff' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'web', name: 'Level 72', kind: 'Web', start: [...start, D(1)], colors, grid: g};
if (require.main === module) console.log(g.print());
