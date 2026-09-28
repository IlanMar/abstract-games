// Level 10 "Kite Parade": a cheerful, one-sided hex garden of kites and flowers.
// The tile repeats without holes. A winding ribbon climbs through two different
// halves of the garden; every turn is threaded by a collectible chain.
const {Grid} = require('../grid');
const W = 40, H = 44, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [4, 40];
const runs = 'N14 NE8 N4 NW3 N5 NE8 N3 NW3 N5 NE9 N7 NE6 N7 NW6 N7 NE11 N4 NE10';
const route = g.route(start, runs), L = route.length;
const dirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const key = (c, r) => `${c},${r}`;

const segment = [];
const corners = [];
let section = 0;
for (let i = 1; i <= L; i++) {
  segment[i % L] = section;
  if (i < L && route.heading(i + 1) !== route.heading(i)) { corners.push(i); section++; }
}

// Distance from the ribbon, with wraparound. A whole neighbouring hex ring stays
// clear, including at bends, so the numerous decorations remain forgiving.
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
const mod = (n, m) => (n % m + m) % m;
const pattern = [
  // Daisy dots, a braided fence, tiny pinwheels, and scattered bunting.
  (u, d, c, r) => mod(u, 6) === 0 && d === 2 ? '^' : mod(u + d, 5) === 0 && d >= 4 ? '#' : '.',
  (u, d) => d === 2 + mod(u, 3) ? '#' : d > 4 && mod(u - d, 5) === 0 ? '^' : '.',
  (u, d) => mod(u, 5) === 0 && d >= 2 ? '^' : mod(u + 2 * d, 6) === 0 ? '#' : '.',
  (u, d) => d >= 2 && mod(u + d, 4) === 0 ? '^' : d >= 4 && mod(u - d, 6) === 0 ? '#' : '.',
  (u, d) => d === 2 && mod(u, 4) < 2 ? '#' : d >= 4 && mod(u + d, 5) === 0 ? '^' : '.',
  (u, d) => d >= 2 && mod(u - 2 * d, 5) === 0 ? '^' : d >= 5 && mod(u, 7) === 0 ? '#' : '.'
];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const {d, i} = nearest.get(key(c, r));
  if (d < 2) continue;
  const ch = pattern[segment[i] % pattern.length](i, d, c, r);
  if (ch !== '.') g.set(T, c, r, ch);
}

// Draw friendly flowers, diamond kites with tails, and six-point stars in the
// wider pockets. Only free, safely distant cells take part in each motif.
function mark(c, r, ch) {
  c = mod(c, W); r = mod(r, H);
  if (nearest.get(key(c, r)).d >= 2) g.set(T, c, r, ch);
}
for (const [c, r] of [[13, 34], [20, 27], [7, 18], [32, 13], [23, 5], [36, 39], [11, 8]]) {
  for (const p of g.ring(c, r, 2)) mark(...p, '^');
  for (const p of g.ring(c, r, 1)) mark(...p, '=');
  mark(c, r, '#');
}
for (const [c, r] of [[8, 27], [19, 39], [31, 32], [17, 17], [35, 5]]) {
  for (const p of g.ring(c, r, 2)) mark(...p, '#');
  mark(c, r, '=');
  let tail = [c, r];
  for (let n = 0; n < 4; n++) { tail = g.step(...tail, 'S'); mark(...tail, n % 2 ? '^' : '='); }
}
for (const [c, r] of [[1, 12], [27, 20], [37, 20], [12, 3], [28, 2]]) {
  mark(c, r, '>');
  for (const m of dirs) { const p = g.step(c, r, m); mark(...p, '^'); }
}

// Keep three safe cells straight on at bends if a player misses a turn.
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) { p = g.step(...p, route.heading(k)); if (!route.has(...p)) g.set(T, ...p, '.'); }
}
for (const [c, r] of route.cells) for (const m of dirs) {
  const p = g.step(c, r, m);
  if (/[#^]/.test(g.get(T, ...p))) throw new Error(`hazard beside road at ${p}`);
}

// Crystals lead across straights; each bend sits inside a short chain.
const stages = [];
let pos = 11, variety = 0;
const end = L + 8;
const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
const clusters = [];
for (const k of bends) {
  const last = clusters.at(-1);
  if (last && k - last[1] <= 5) last[1] = k;
  else clusters.push([k, k]);
}
for (const [first, last] of clusters) {
  if (last + 2 > end) break;
  while (first - 2 - pos >= 3) {
    const room = first - 2 - pos;
    if (room >= 8 && variety % 3 === 0) { stages.push([['gems', pos, pos + 3, pos + 6]]); pos += 8; }
    else if (room >= 6 && variety % 3 === 1) { stages.push([['chain', pos, pos + 3]]); pos += 5; }
    else { stages.push([['gem', pos]]); pos += 2; }
    variety++;
  }
  stages.push([['chain', Math.min(pos, first - 2), last + 2]]);
  pos = last + 4;
}
while (pos <= end) {
  if (end - pos >= 4) { stages.push([['gems', pos, pos + 2, pos + 4]]); pos += 6; }
  else { stages.push([['gem', pos]]); pos += 2; }
}
g.routeStages(route, T, stages);

// A warm yellow ribbon winds through alternating pink, peach and lilac meadows.
const meadow = ['#ff0088', '#ff44aa', '#ff7700', '#ff00ff', '#ff5a28', '#ee33aa',
  '#ff9900', '#ff0066', '#dd66ff', '#ff3300', '#ff99cc', '#ff00bb'];
const road = new Map(route.cells.map((p, i) => [key(...p), i]));
const colorOf = (c, r) => road.has(key(c, r))
  ? (road.get(key(c, r)) % 4 < 2 ? '#ffff00' : '#ffbb22')
  : meadow[segment[nearest.get(key(c, r)).i] % meadow.length];
const colors = {top: g.layers(colorOf), bottom: [['#ff44aa', '#ff9900', 'r']]};
module.exports = {key: 'kite-parade', name: 'Level 10', kind: 'Kite Parade', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
