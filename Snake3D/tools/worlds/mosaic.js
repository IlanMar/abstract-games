// Level 12 "Mosaic": a bright one-sided hex world, a medley of motifs from the late classic levels.
// An endless plane (the 48 x 56 tile repeats) with no holes, so the snake never leaves the top face.
// The road heads north, north-east, south-east, north-west and south-west, turning both ways, and
// every stretch borrows a figure from the classic levels, drawn beside the road in its own colours:
//   - lanterns: walls and boost-pad lights in a row (the lit corridors of Absolute);
//   - rails: a wall rail beside each side of the road with gaps and a boost lane beyond (Shielded);
//   - capsules: short wall shells round the road, a spike at every seam (Shielded);
//   - zig-zags: two horizontal zig-zags whose lanes carry slow pads on one side and boost pads on the
//     other (Zig-Zag), every bend threaded by a short chain of its own;
//   - chevrons of spikes with boost-pad tips, a checker of slow pads, spike confetti;
//   - a speed tunnel: wall sides two cells out and a boost rush on the road (the '#x#' tunnels);
//   - hex spirals of walls in the open spaces between the stretches (Spiral).
// No wall or spike stands next to the road (speed pads may: they only change the speed), and past every
// corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 48, H = 56, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 1];
const route = g.route(start, 'N15 NE6 SE4 NE3 SE3 NE3 SE3 NE4 N10 NW6 N6 NW4 SW3 NW3 SW3 NW4 N7 NE3 N5 NW6');
const L = route.length;
const dirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const key = (c, r) => `${c},${r}`;
const mod = (n, m) => (n % m + m) % m;

// Stretches: the run of the road each cell belongs to (a corner cell ends its run).
const segment = [];
const corners = [];
let section = 0;
for (let i = 1; i <= L; i++) {
  segment[i % L] = section;
  if (i < L && route.heading(i + 1) !== route.heading(i)) { corners.push(i); section++; }
}
corners.push(L);                              // the last stretch turns north into the start

// Distance d from the road, the road cell u each cell hangs from and its side v (+1 left, -1 right).
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
const xy = (c, r) => [c * 0.866, r + 0.5 * (c & 1)];            // picture space, y down
const delta = (a, b) => { const [ax, ay] = xy(...a), [bx, by] = xy(...b);
  let dx = bx - ax, dy = by - ay;
  dx -= Math.round(dx / (W * 0.866)) * W * 0.866; dy -= Math.round(dy / H) * H;
  return [dx, dy]; };
function local(c, r) {
  const {d, i} = nearest.get(key(c, r));
  const [hx, hy] = delta(route.at(i - 1), route.at(i + 1)), [ox, oy] = delta(route.at(i), [c, r]);
  return {d, u: i, v: hx * oy - hy * ox < 0 ? 1 : -1, s: segment[i]};
}

// ---- the motifs, one per stretch, as functions of (u, d, v).
const M = {
  lanterns: ({u, d}) => d === 3 && mod(u, 4) === 0 ? '#' : d === 3 && mod(u, 4) === 2 ? '>' : d >= 5 && mod(u + d, 3) === 0 ? '^' : '.',
  rails: ({u, d}) => d === 2 ? (mod(u, 6) === 0 ? '.' : '#') : d === 3 ? '>' : d >= 5 && mod(u - d, 4) === 0 ? '^' : '.',
  capsules: ({u, d}) => { const k = mod(u, 5); return d === 2 ? (k === 0 ? '.' : '#') : d === 3 && k === 0 ? '^' : d >= 5 && mod(u + d, 4) === 0 ? '#' : '.'; },
  zigzag: ({u, d, v}) => d === 1 ? (v > 0 ? '=' : '>') : d >= 3 && mod(u + d, 4) === 0 ? '^' : d >= 5 && mod(u, 5) === 0 ? '#' : '.',
  chevrons: ({u, d}) => { const k = mod(u - d, 5); return d >= 2 && k === 0 ? (d === 2 ? '>' : '^') : d >= 4 && k === 2 ? '#' : '.'; },
  checker: ({u, d}) => d === 2 ? (mod(u, 2) ? '=' : '.') : d >= 3 && mod(u + d, 3) === 0 ? '^' : d >= 5 && mod(u - d, 3) === 0 ? '#' : '.',
  confetti: ({u, d, v}) => d >= 2 && mod(3 * u + 5 * d + v, 7) === 0 ? '^' : d >= 4 && mod(u + 2 * d, 9) === 0 ? '#' : '.',
  tunnel: ({u, d}) => d === 2 ? '#' : d === 4 && mod(u, 2) === 0 ? '^' : d >= 6 && mod(u + d, 3) === 0 ? '#' : '.'
};
// Stretch by stretch: N15 NE6 SE4 | zig-zag east (4) | NE4 N10 NW6 N6 NW4 | zig-zag west (3) | NW4 N7 NE3 N5 NW6.
const theme = ['lanterns', 'chevrons', 'checker', 'zigzag', 'zigzag', 'zigzag', 'zigzag', 'confetti', 'rails', 'capsules',
  'chevrons', 'confetti', 'zigzag', 'zigzag', 'zigzag', 'checker', 'tunnel', 'confetti', 'rails', 'capsules'];
if (theme.length !== corners.length) throw new Error(`${corners.length} stretches, ${theme.length} themes`);
const SPIRAL_FROM = 7;                        // the open spaces far from the road take the spirals
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d === 0 || q.d >= SPIRAL_FROM) continue;
  const ch = M[theme[q.s]](q);
  if (ch !== '.') g.set(T, c, r, ch);
}

// ---- hex spirals of walls (Spiral) in the open spaces: rings of radius 1, 3 and 5 with a gap turning
// round, spikes between them.
const far = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (local(c, r).d >= SPIRAL_FROM + 1) far.push([c, r]);
const spirals = [];
for (const p of far.sort((a, b) => local(...b).d - local(...a).d)) {
  if (spirals.some(s => { const [dx, dy] = delta(s, p); return Math.hypot(dx, dy) < 12; })) continue;
  spirals.push(p);
}
function deco(c, r, ch) { if (local(c, r).d >= 2) g.set(T, c, r, ch); }
spirals.forEach((ctr, n) => {
  deco(...ctr, '>');
  for (const radius of [1, 3, 5]) g.ring(...ctr, radius).forEach((p, k, ring) => {
    if (local(...p).d < 4) return;
    const gap = mod(k - radius * (n + 2), ring.length) < Math.max(1, radius - 1);
    if (!gap) deco(...p, '#');
  });
  g.ring(...ctr, 4).forEach((p, k) => { if (k % 4 === n % 4 && local(...p).d >= 4) deco(...p, '^'); });
});

// ---- three clear cells straight on past every corner, and nothing sharp next to the road.
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.step(...p, route.heading(k));
    if (!route.has(...p)) g.set(T, ...p, '.');
    for (const m of dirs) { const q = g.step(...p, m); if (!route.has(...q) && /[#^]/.test(g.get(T, ...q))) g.set(T, ...q, '.'); }
  }
}
for (const [c, r] of route.cells) for (const m of dirs) {
  const p = g.step(c, r, m);
  if (/[#^]/.test(g.get(T, ...p))) throw new Error(`hazard beside the road at ${p}`);
}

// ---- stages. A chain leads round every corner; where the next corner is only three cells on (the
// zig-zags), each bend gets a short chain of its own. The straights between take a crystal, a trail
// of crystals or a short chain in turn.
const stages = [];
let pos = 11, variety = 0;
const end = L + 8;
const bends = [...corners.filter(k => k > 12), ...corners.map(k => k + L)];
bends.forEach((k, n) => {
  if (k + 2 > end) return;
  while (k - 2 - pos >= 3) {
    const room = k - 2 - pos;
    if (room >= 7 && variety % 3 === 0) { stages.push([['gems', pos, pos + 3, pos + 6]]); pos += 8; }
    else if (room >= 5 && variety % 3 === 1) { stages.push([['chain', pos, pos + 3]]); pos += 5; }
    else { stages.push([['gem', pos]]); pos += 2; }
    variety++;
  }
  const tight = bends[n + 1] !== undefined && bends[n + 1] - k <= 4;
  const from = Math.min(pos, k - 1), to = tight ? k + 1 : k + 2;
  stages.push([['chain', from, to]]);
  pos = tight ? to + 1 : to + 2;
});
while (pos <= end) {
  if (end - pos >= 4) { stages.push([['gems', pos, pos + 2, pos + 4]]); pos += 6; }
  else { stages.push([['gem', pos]]); pos += 2; }
}
g.routeStages(route, T, stages);

// ---- boost rushes on the rails and in the tunnel: pads on the road between the items, a slow pad
// before the corner chain.
for (const s of theme.map((t, s) => t === 'tunnel' || t === 'rails' ? s : -1).filter(s => s >= 0)) {
  const cells = [];
  for (let i = 1; i <= L; i++) if (segment[i % L] === s) cells.push(i);
  const corner = cells[cells.length - 1];
  let chainStart = corner;
  while (/[a-z]/.test(g.get(T, ...route.at(chainStart - 1)))) chainStart--;
  for (let i = cells[1]; i < chainStart - 3; i++) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '>');
  for (let i = chainStart - 1; i >= chainStart - 3; i--) if (g.get(T, ...route.at(i)) === '.') { g.set(T, ...route.at(i), '='); break; }
}

// ---- colours: every stretch in its own bright floor with a band of a second colour beside the road
// (as the colour grading shows them: pink, violet, raspberry, lilac, beige, caramel, tomato, light blue,
// indigo). The road is a ribbon of salmon and caramel.
const floors = {
  lanterns: ['#6600cc', '#ff00ff'], chevrons: ['#ff0088', '#ff99cc'], checker: ['#ff00ff', '#ff5a28'],
  zigzag: ['#ff0066', '#ff44aa'], confetti: ['#dd88ff', '#ff0088'], rails: ['#ff99cc', '#6600cc'],
  capsules: ['#ff44aa', '#993300'], tunnel: ['#993300', '#ff3300']
};
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.u, 4) < 2 ? '#ff1111' : '#ff3300';
  const [main, band] = floors[theme[q.s]];
  if (q.d >= SPIRAL_FROM) return mod(q.d, 2) ? '#ff00ff' : '#ff0088';
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#ff0088', '#6600cc', 'r']]};
module.exports = {key: 'mosaic', name: 'Level 12', kind: 'Mosaic', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
