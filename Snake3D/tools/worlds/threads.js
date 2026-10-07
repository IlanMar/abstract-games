// Level 65 "Threads": a very hard square level in the manner of the late classic level Three Roads. A square
// world of 56 x 56, all void but threads one cell wide: the land is the road itself and nothing else,
// bar a few platforms. The road wriggles north in tight bends up the west, across the north, down the
// middle and off the end of a thread; underneath it winds back west in long steps and drops off the
// south-west end home. A missed bend means a fall to the other face.
//   - chains run along the threads through several bends at once, as in Three Roads;
//   - crystal trails four cells apart lead over every other long straight thread;
//   - at four bends a platform three by three with a block of walls beside it;
//   - boost and slow gates between chains on the threads.
// Colour style, classic Snaking and Three Roads: every thread a band of gold and ochre, the platforms teal.
// Stages: chains through the runs of close bends, crystal trails, lead-in chains to the ends.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [6, 50];
const runs =
  'N10 E4 N6 W4 N6 E4 N6 W4 N8'      // top: up the west in tight bends
  + ' E10 S4 E6 N4 E10'              // top: across the north
  + ' S8 E6 S6 W6 S8 E12 N4 D'       // top: down the middle and off the end of a thread
  + ' S10 W8 S6 W12 N8 W6 S10 W12 S4 D'   // underside: back west in long steps, off the south-west end
  + ' N4';                           // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the threads: the road and nothing else, bar four platforms.
const probe = road(new Grid(W, H), [...start, 'N'], runs);
const land = new Set();
for (const p of probe.cells) if (!p.hole) land.add(key(p.c, p.r));
const PLATFORMS = [[16, 14], [32, 28], [36, 47], [18, 39]];
for (const [c, r] of PLATFORMS) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) land.add(key(c + a, r + b));
for (const p of probe.cells) if (p.hole) land.delete(key(...g.move(p.c, p.r, p.h)));
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the threads at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// ---- walls beside the platforms: a block of five on the far side, on the face the road takes there.
for (const [c, r] of PLATFORMS) {
  const p = R.cells.find(q => !q.hole && q.c === c && q.r === r);
  const side = p.side;
  // The block lies along the platform's edge, away from the road's other runs.
  for (const [dc, dr] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) {
    const cells = dc ? [-2, -1, 0, 1, 2].map(k => [c + dc, r + k]) : [-2, -1, 0, 1, 2].map(k => [c + k, r + dr]);
    if (cells.every(([x, y]) => g.get(T, x, y) === ' ' && R.local(side, x, y).d >= 2)) {
      for (const [x, y] of cells) { g.set('both', x, y, '.'); g.set(side, x, y, '#'); land.add(key(x, y)); }
      break;
    }
  }
}

// ---- stages: crystal trails over every other long straight, two-cell gates between chains.
let {stages, pads} = autoStages(R, {first: 7, lengths: [12, 15], lead: [4, 3], launch: 0, gate: i => mod(i, 2) === 0});
let straightN = 0;
stages = stages.map(s => s.map(([kind, ...ix]) => {
  if (kind !== 'chain' || ix[1] - ix[0] < 6) return [kind, ...ix];
  for (let i = ix[0]; i < ix[1]; i++) if (R.corners.includes(mod(i, R.length))) return [kind, ...ix];
  if (straightN++ % 2) return [kind, ...ix];
  // The trail ends on the chain's last cell, so the thread to the next stage stays as short.
  return ['gems', ...[...new Set([...Array.from({length: Math.floor((ix[1] - ix[0]) / 4) + 1}, (_, n) => ix[0] + 4 * n), ix[1]])]];
}));
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: a band of gold or ochre per thread, teal platforms.
// Snaking's golds: the yellow-to-lime of Three Roads comes out green in the game and hides the boost pads.
const ROADS = ['#ff6600', '#ff7700', '#ff8800', '#ee5500', '#ff7700', '#ff8800'];
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  if (PLATFORMS.some(([pc, pr]) => Math.max(Math.abs(c - pc), Math.abs(r - pr)) <= 1)) return '#44aabb';
  const q = R.local(side, c, r);
  if (q.d === 0) return ROADS[mod(q.s, ROADS.length)];
  return side === T ? '#66bb99' : '#55bbaa';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'threads', name: 'Level 65', kind: 'Threads', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
