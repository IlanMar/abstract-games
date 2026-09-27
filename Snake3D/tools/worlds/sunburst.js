// Level 9 "Sunburst": a bright, easy, one-sided loop through a patchwork of obstacle gardens.
// The repeating floor has no holes. The route winds in all four directions through stretches of
// different lengths, with a chain guiding every corner. Dense obstacle patterns fill the gardens,
// but the road has a clear one-cell shoulder and a three-cell runout beyond every corner.
const {Grid} = require('../grid');
const W = 44, H = 44;
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const T = 'top';

// The loop climbs one tile while weaving across it. Its last step wraps back to the start.
const start = [4, 41];
const runs = 'N16 E11 N7 W6 N10 E18 S8 E9 N14 E6 N17 W18 S7 W9 S8 W11 N3';
const route = g.route(start, runs);
const L = route.length;
const V = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const wrap = (c, r) => [((c % W) + W) % W, ((r % H) + H) % H];
const key = (c, r) => `${c},${r}`;

// Which straight each road cell belongs to: the straight that reaches it (the corner cell ends a straight).
const seg = [];
{ let s = 0; for (let i = 1; i <= L; i++) { seg[i % L] = s; if (i < L && route.heading(i + 1) !== route.heading(i)) s++; } }
const corners = [];
for (let i = 0; i < L; i++) if (route.heading(i + 1) !== route.heading(i)) corners.push(i);

// ---- every cell off the road gets the nearest road cell (breadth first, 8 neighbours, round the tile):
// its distance d, the road index u it hangs from and its side v (+ left of the heading, - right).
const near = new Map();
{
  let front = route.cells.map((q, i) => [q, i]);
  front.forEach(([q, i]) => near.set(key(...q), {d: 0, i}));
  for (let d = 1; front.length; d++) {
    const next = [];
    for (const [[c, r], i] of front) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const q = wrap(c + dx, r + dy);
      if (near.has(key(...q))) continue;
      near.set(key(...q), {d, i});
      next.push([q, i]);
    }
    front = next;
  }
}
function local(c, r) {
  const {d, i} = near.get(key(c, r));
  const [rc, rr] = route.at(i), [hx, hy] = V[route.heading(i)];
  let dx = c - rc, dy = r - rr;
  if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
  if (dy > H / 2) dy -= H; if (dy < -H / 2) dy += H;
  const along = dx * hx + dy * hy, side = dx * hy - dy * hx;   // side > 0: left of the heading
  return {d, i, u: i + along, v: side, s: seg[i]};
}
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mod = (a, n) => ((a % n) + n) % n;

// Each garden is drawn in road coordinates. The nearest cells are reserved as a forgiving shoulder.
const patterns = [
  // alternating sun rays and wall posts
  ({u, d}) => d === 2 && mod(u, 3) === 0 ? '^' : d >= 4 && mod(u + d, 4) === 0 ? '#' : '.',
  // flower beds: a spike centre inside four wall petals
  ({u, d}) => { const x = mod(u, 6) - 3, y = mod(d - 2, 6) - 3, a = Math.abs(x) + Math.abs(y); return a === 0 ? '^' : a === 1 ? '#' : '.'; },
  // zigzag ribbons with small breaks
  ({u, d}) => d === 2 + Math.abs(mod(u, 8) - 4) && mod(u, 7) !== 0 ? '^' : d >= 5 && mod(u + d, 5) === 0 ? '#' : '.',
  // colourful stepping stones between hazard rows
  ({u, d}) => d === 2 && mod(u, 3) === 0 ? '>' : d >= 3 && mod(u + d, 3) === 0 ? '^' : d >= 5 && mod(u - d, 5) === 0 ? '#' : '.',
  // staggered square flower pots
  ({u, d}) => { const x = mod(u + 2 * Math.floor(d / 4), 5), y = mod(d - 2, 4); return x < 2 && y < 2 ? '#' : x === 3 && y === 2 ? '^' : '.'; },
  // paired bunting: two diagonal spike strings
  ({u, d}) => mod(u - d, 6) === 0 || mod(u + d, 6) === 0 ? '^' : mod(u, 7) === 0 && d >= 4 ? '#' : '.',
  // scalloped wall arches with open centres
  ({u, d}) => { const x = mod(u, 8) - 4; return d === 3 + Math.round(Math.sqrt(Math.max(0, 16 - x * x)) / 2) ? '#' : d >= 6 && mod(u + d, 4) === 0 ? '^' : '.'; },
  // dotted spike meadow, with a few tall stems
  ({d}, c, r) => { const h = hash(c, r); return d >= 2 && h < 0.38 ? '^' : d >= 3 && h > 0.88 ? '#' : '.'; },
  // wheels with a safe glowing hub
  ({u, d}) => { const x = mod(u, 7) - 3, y = mod(d - 2, 7) - 3, a = x * x + y * y; return a === 0 ? '>' : a >= 8 && a <= 13 ? '^' : a <= 2 ? '#' : '.'; },
  // orange-grove rows of wall and spikes
  ({u, d}) => d >= 2 && mod(u, 4) === 0 ? '#' : d >= 2 && mod(u + 2 * d, 4) === 2 ? '^' : '.',
  // diagonal lattice with clear diamonds
  ({u, d}) => mod(u + d, 7) === 0 ? '#' : mod(u - d, 7) === 0 ? '^' : '.',
  // wave of spikes with wall buoys
  ({u, d}) => { const w = 4 + Math.round(2 * Math.sin(u * Math.PI / 5)); return d === w || d === w + 1 ? '^' : d === 2 && mod(u, 5) === 0 ? '#' : '.'; },
  // checker flowers
  ({u, d}) => mod(u + d, 2) === 0 ? '^' : mod(u, 5) === 0 && d >= 3 ? '#' : '.',
  // alternating wall fences and open gates
  ({u, d}) => d === 2 && mod(u, 5) !== 0 ? '#' : d >= 4 && mod(u + d, 3) === 0 ? '^' : '.',
  // pinwheel arms
  ({u, d}) => { const x = mod(u, 6) - 3, y = mod(d - 2, 6) - 3; return (x === 0 && y >= 0 && y < 3) || (y === 0 && x <= 0 && x > -3) ? '#' : (x === y && x > 0) || (x === -y && x < 0) ? '^' : '.'; },
  // sunbeams along both shoulders
  ({u, d}) => d === 2 && mod(u, 4) < 2 ? '^' : d >= 4 && mod(u - d, 4) === 0 ? '#' : '.',
  // lanterns at the finish
  ({u, d}) => d === 3 && mod(u, 6) === 0 ? '#' : d === 3 && mod(u, 6) === 3 ? '>' : d >= 5 && mod(u + d, 3) === 0 ? '^' : '.'
];
const segments = runs.split(' ').length;
if (patterns.length !== segments) throw new Error(`${segments} straights, ${patterns.length} patterns`);

// Past every corner the line straight on stays clear for three cells, so a missed turn hits nothing.
const runout = new Set();
for (const k of corners) {
  const [hx, hy] = V[route.heading(k)], [c, r] = route.at(k);
  for (let n = 1; n <= 3; n++) runout.add(key(...wrap(c + hx * n, r + hy * n)));
}

for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (route.has(c, r)) continue;
  const p = local(c, r);
  if (p.d < 2) continue;
  let ch = patterns[p.s](p, c, r);
  if (/[#^]/.test(ch) && runout.has(key(c, r))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const [c, r] of route.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
  if (/[#^]/.test(g.get(T, ...wrap(c + dx, r + dy)))) throw new Error(`an obstacle at ${wrap(c + dx, r + dy)} stands next to the road`);
// The engine draws at most 300 walls and 300 spikes round the head (a 25 x 25 window).
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const n = {'#': 0, '^': 0};
  for (let r = y - 12; r <= y + 12; r++) for (let c = x - 12; c <= x + 12; c++) { const ch = g.get(T, ...wrap(c, r)); if (ch in n) n[ch]++; }
  if (n['#'] > 280 || n['^'] > 280) throw new Error(`too many obstacles round ${x},${y}: ${n['#']} walls, ${n['^']} spikes`);
}

// Two long clear stretches have a gentle burst of speed, then a brake before the turn.
const RUSH = [5, 10];

// ---- stages, by road index. Every corner is taken inside a chain that starts two cells before it
// and ends two after; the straights between hold crystals, trails of crystals and short chains in turn.
const stages = [];
{
  const first = 11;
  let p = first, kind = 0;
  const end = L + first - 2;           // the last stage ends here, just before stage 1 comes round again
  for (const k of [...corners.filter(k => k > first), ...corners.map(k => k + L)]) {
    if (k + 2 > end) break;
    // fill the straight up to the chain of the corner (which begins at k - 2)
    while (k - 2 - p >= 3) {
      const room = k - 2 - p;          // cells from p to where the corner chain starts, with a gap of at least 1
      if (RUSH.includes(seg[p % L]) && room >= 10) { stages.push([['gems', p, p + 3, p + 6]]); p += 8; }
      else if (room >= 7 && kind % 3 === 2) { stages.push([['chain', p, p + 3]]); p += 5; }
      else if (room >= 6 && kind % 3 === 1) { stages.push([['gems', p, p + 2, p + 4]]); p += 6; }
      else { stages.push([['gem', p]]); p += 2; }
      kind++;
    }
    stages.push([['chain', Math.min(p, k - 2), k + 2]]);
    p = k + 4;
  }
  while (end - p >= 0) {
    if (end - p >= 4) { stages.push([['gems', p, p + 2, p + 4]]); p += 6; }
    else { stages.push([['gem', p]]); p += 2; }
  }
}
g.routeStages(route, T, stages);

// Pads lie on the road and never block the route.
for (const s of RUSH) {
  const cells = [];
  for (let i = 0; i < L; i++) if (seg[i] === s) cells.push(i);
  const from = cells[1], to = cells[cells.length - 1];
  const chainStart = Math.max(...corners.filter(k => k <= to + 1)) - 2;
  for (let i = from; i < chainStart - 4; i++) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '>');
  for (let i = chainStart - 1; i >= chainStart - 3; i--) if (g.get(T, ...route.at(i)) === '.') { g.set(T, ...route.at(i), '='); break; }
}

// Vivid warm pinks, orange, yellow and violet survive the game's cool colour grading.
const floors = ['#ffcc00', '#ff44aa', '#ff0066', '#ff9900', '#ff00ff', '#ffff00', '#ff3388', '#ff6600',
  '#ff99cc', '#ffdd00', '#dd66ff', '#ff0033', '#ffbb00', '#ff00aa', '#ff7722', '#ee44cc', '#ffff00'];
const colorOf = (c, r) => {
  if (route.has(c, r)) return route.cells.findIndex(q => q[0] === c && q[1] === r) % 2 ? '#ff4422' : '#ffbb55';
  return floors[local(c, r).s];
};
const colors = {top: g.layers(colorOf), bottom: [['#ffdd00', '#ff55aa', 'r']]};
module.exports = {key: 'sunburst', name: 'Level 9', kind: 'Sunburst', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
