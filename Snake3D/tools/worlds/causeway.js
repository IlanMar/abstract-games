// Level 11 "Causeway": an easy hex world in the manner of the late classic levels (Shrivel, Zig-Zag,
// Absolute): a causeway of three-lane bridges over the void, joining small islands. One lap, one side:
// every item lies on top, and a missed turn only rolls the snake over an edge onto the bare underside.
//   - a starting causeway, then a chain up onto a flowered island;
//   - a zig-zag ribbon across the north (slow pads on one lane, boost pads on the other, as in Zig-Zag),
//     every bend threaded by a short chain of its own;
//   - a walled tunnel through a fortress island (the '#x#' tunnels of the classic levels) with a boost
//     rush between crystals and a slow pad before the exit;
//   - a spike garden, then a long single-lane bridge back west with a trail of crystals.
// Hazards keep a cell clear of the road (the tunnel walls excepted: they run alongside it) and past
// every corner three cells straight on are floor, so a missed turn has room.
const {Grid} = require('../grid');
const W = 44, H = 52, T = 'top';
const g = new Grid(W, H, true);
const start = [5, 42];
const route = g.route(start, 'N18 NE6 N8 NE3 SE3 NE3 SE3 NE3 SE4 S14 SW6 S8 SW15 NW4 N2'), L = route.length;
const dirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const key = (c, r) => `${c},${r}`;
const mod = (n, m) => (n % m + m) % m;
const corners = [];
for (let i = 1; i < L; i++) if (route.heading(i + 1) !== route.heading(i)) corners.push(i);

// Distance from the road and the road cell each cell hangs from (breadth first, round the world).
const nearest = new Map();
let fringe = route.cells.map((cell, i) => [cell, i]);
for (const [cell, i] of fringe) nearest.set(key(...cell), {d: 0, i});
for (let d = 1; fringe.length; d++) {
  const next = [];
  for (const [[c, r], i] of fringe) for (const m of dirs) {
    const p = g.step(c, r, m), k = key(...p);
    if (!nearest.has(k)) { nearest.set(k, {d, i}); next.push([p, i]); }
  }
  fringe = next;
}
const near = (c, r) => nearest.get(key(c, r));

// ---- land: the three-lane causeway, one lane on the long bridge west, and the islands.
const THIN = [83, 91];                       // the single-lane stretch of the bridge west
const islands = [
  {at: 0, radius: 3, kind: 'plaza'},         // the start
  {at: 28, radius: 4, kind: 'flowers'},
  {at: 58, radius: 5, kind: 'fortress'},
  {at: 75, radius: 4, kind: 'garden'},
  ...corners.filter(k => k < 33 || k > 50).map(k => ({at: k, radius: 2, kind: 'corner'}))
];
for (const [c, r] of route.cells) g.set('both', c, r, '.');
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const {d, i} = near(c, r);
  if (d === 1 && !(i >= THIN[0] && i <= THIN[1])) g.set('both', c, r, '.');
}
const islandOf = new Map();
for (const isl of islands) for (const p of g.disk(...route.at(isl.at), isl.radius)) {
  g.set('both', ...p, '.');
  if (!islandOf.has(key(...p)) || isl.kind !== 'corner') islandOf.set(key(...p), isl);
}
// Three cells straight on past every corner.
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) { p = g.step(...p, route.heading(k)); g.set('both', ...p, '.'); }
}

// ---- the islands' decorations, all at least two cells off the road.
function deco(c, r, ch) { if (near(c, r).d >= 2 && g.get(T, c, r) === '.') g.set(T, c, r, ch); }
{
  // Flowered island: a spike flower on each side of the road, a wall at its heart.
  const [c, r] = route.at(28);
  for (const [dc, m] of [[-3, 'NW'], [3, 'SE']]) {
    const f = [c + dc, r];
    deco(...f, '#');
    for (const q of g.ring(...f, 1)) deco(...q, '^');
    void m;
  }
}
{
  // Fortress island: the tunnel walls run beside the road, spike battlements stand outside them.
  for (let i = 55; i <= 61; i++) for (const m of dirs) {
    const p = g.step(...route.at(i), m);
    if (!route.has(...p)) g.set(T, ...p, '#');
  }
  for (const p of g.ring(...route.at(58), 4)) if (mod(p[1] + p[0], 2) === 0) deco(...p, '^');
}
{
  // Spike garden: rows of spikes across the island, every other cell.
  for (const p of g.disk(...route.at(75), 4)) {
    const {d, i} = near(...p);
    if (d >= 2 && mod(i + d, 3) === 0) deco(...p, '^');
  }
}
// Zig-zag ribbon: slow pads on its west lane, boost pads on its east lane (running over them only
// changes speed, and the snake keeps to the middle).
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const {d, i} = near(c, r);
  if (d !== 1 || i < 34 || i > 49 || route.has(c, r) || g.get(T, c, r) !== '.') continue;
  const [rc, rr] = route.at(i);
  if (g.hex && Math.abs(c - rc) <= 1 && corners.includes(i)) continue;
  g.set(T, c, r, r < rr || (r === rr && c < rc) ? '=' : '>');
}
route.cells.forEach(([c, r], i) => { for (const m of dirs) {
  const p = g.step(c, r, m), ch = g.get(T, ...p);
  if (ch === '^' || (ch === '#' && !(i >= 54 && i <= 62))) throw new Error(`hazard ${ch} beside the road at ${p}`);
} });

// ---- stages: crystals on the straights, a chain round every bend (one bend each through the zig-zag),
// a boost rush through the tunnel and a trail of crystals over the single-lane bridge.
g.routeStages(route, T, [
  [['gem', 11]], [['gems', 13, 15]], [['chain', 17, 21]], [['chain', 23, 27]], [['gem', 29]],
  [['chain', 31, 34]], [['chain', 35, 37]], [['chain', 38, 40]], [['chain', 41, 43]], [['chain', 44, 46]],
  [['chain', 47, 49]], [['chain', 50, 53]], [['gems', 55, 58, 60]], [['chain', 63, 67]],
  [['gem', 69]], [['chain', 70, 74]], [['gem', 76]], [['chain', 78, 82]], [['gems', 84, 87, 90]],
  [['chain', 92, 96]], [['chain', 97, 101]], [['gems', 103, 106, 109]]
]);
// The rush: boost pads between the tunnel crystals, a slow pad before the corner chain.
for (let i = 54; i <= 59; i++) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '>');
g.set(T, ...route.at(62), '=');

// ---- colours: a sand road over bridges of pink, violet and raspberry, islands in their own tones.
const bridges = ['#ff0088', '#ff00ff', '#ff0066', '#ff44aa'];
const isle = {plaza: '#ff44aa', flowers: '#ff99cc', fortress: '#993300', garden: '#ff3300', corner: '#b41e46'};
const colorOf = (c, r) => {
  const {d, i} = near(c, r);
  if (d === 0) return mod(i, 4) < 2 ? '#ff5a28' : '#ff3300';
  const isl = islandOf.get(key(c, r));
  if (isl && d >= 1 && isl.kind !== 'corner') return isle[isl.kind];
  return bridges[corners.filter(k => k < i).length % bridges.length];
};
const colors = {top: g.layers(colorOf), bottom: [['#ff44aa', '#b41e46', 'r']]};
module.exports = {key: 'causeway', name: 'Level 11', kind: 'Causeway', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
