// Level 8 "Carnival": the fourth easy one-sided world, a square one where no two stretches look alike.
// An endless plane (the 40 x 40 tile repeats) with no holes, so the snake never leaves the top face. The
// road winds once round the tile in seventeen straights of different lengths, turning left and right
// in every direction, and each straight runs through its own quarter of the fair: picket fences,
// wall gates, checkerboards, diamonds, zigzags, rings, crosses, ladders, confetti, pillars, chevrons,
// waves, bricks and more, each in its own bright floor colour. No wall or spike stands next to the road
// (diagonals included), and past every corner the road ahead stays clear for three cells, so a missed
// turn hits nothing at once. Chains lead the snake round every corner; each stage lies a cell or two
// past the end of the previous one. On the two longest straights boost pads give a rush between the
// crystals, and a slow pad brakes the snake before the next corner.
const {Grid} = require('../grid');
const W = 40, H = 40;
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const T = 'top';

// ---- the road: every straight a different length, turning both ways. It climbs the tile once and
// comes back to its start.
const start = [3, 37];
const runs = 'N14 E9 N6 W5 N9 E16 S7 E8 N12 E5 N15 W17 S6 W8 S7 W8 N4';
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

// ---- one pattern per straight, drawn in road coordinates: u along the road, v across it (d is the
// distance from the road). Nothing is drawn nearer than d = 2.
const patterns = [
  // 0 the run-up: picket fences of spikes, and posts of wall behind
  ({u, d}) => d === 2 ? (mod(u, 2) ? '^' : '.') : d === 4 ? (mod(u, 2) ? '.' : '#') : d >= 6 && mod(u + d, 3) === 0 ? '^' : '.',
  // 1 wall fences with gates, spikes in the yards behind
  ({u, d}) => d === 2 ? (mod(u, 4) ? '#' : '.') : d >= 4 && mod(u + d, 2) === 0 ? '^' : '.',
  // 2 a checkerboard of spikes
  ({u, v, d}) => d >= 2 && mod(u + v, 2) === 0 ? '^' : '.',
  // 3 diamonds of wall with a spike in the heart
  ({u, d}) => { const a = Math.abs(mod(u, 6) - 3) + Math.abs(mod(d - 1, 6) - 3); return a === 0 ? '^' : a <= 1 ? '#' : '.'; },
  // 4 a zigzag of wall on each side
  ({u, d}) => { const z = 2 + Math.abs(mod(u, 6) - 3); return d === z ? '#' : d === z + 2 && mod(u, 2) ? '^' : '.'; },
  // 5 rings of spikes round a wall post
  ({u, d}) => { const x = mod(u, 5) - 2, y = mod(d - 2, 5) - 2, q = Math.max(Math.abs(x), Math.abs(y)); return q === 0 ? '#' : q === 2 && (x + y) % 2 === 0 ? '^' : '.'; },
  // 6 crosses of spikes
  ({u, d}) => { const x = mod(u, 4) - 1, y = mod(d - 2, 4) - 1; return (x === 0 && Math.abs(y) <= 1) || (y === 0 && Math.abs(x) <= 1) ? '^' : '.'; },
  // 7 ladders: rungs of wall across, rails of spikes
  ({u, d}) => d >= 3 && mod(d - 3, 4) < 3 && mod(u, 3) === 0 ? '#' : (d === 2 || mod(d - 3, 4) === 3) && mod(u, 3) === 1 ? '^' : '.',
  // 8 confetti: spikes thrown about, a few walls
  ({d}, c, r) => { const h = hash(c, r); return d < 2 ? '.' : h < 0.1 ? '#' : h < 0.42 ? '^' : '.'; },
  // 9 pillars: 2 x 2 blocks of wall in rows
  ({u, d}) => d >= 2 && mod(u, 4) < 2 && mod(d - 2, 4) < 2 ? '#' : '.',
  // 10 chevrons of spikes pointing along the road, boost pads in their tips
  ({u, d}) => { const k = mod(u - d, 5); return d >= 2 && k === 0 ? (d === 2 ? '>' : '^') : d >= 4 && k === 2 ? '#' : '.'; },
  // 11 waves: a band of spikes rolling to and fro
  ({u, d}) => { const w = 4 + Math.round(1.6 * Math.sin(u * Math.PI / 4)); return d === w ? '^' : d === w + 1 ? '^' : d === 2 && mod(u, 4) === 0 ? '#' : '.'; },
  // 12 bricks: a wall laid in courses
  ({u, d}) => d < 3 ? '.' : (d % 2 === 1 && mod(u + (d % 4 === 1 ? 0 : 2), 4) === 0) ? '.' : d % 2 === 1 ? '#' : '.',
  // 13 stepping stones of slow pads between spikes
  ({u, d}) => d === 2 ? (mod(u, 2) ? '=' : '.') : d >= 3 && mod(u + d, 3) === 0 ? '^' : d >= 5 && mod(u - d, 3) === 0 ? '#' : '.',
  // 14 nested squares of wall and spike
  ({u, d}) => { const x = mod(u, 8) - 4, y = d - 5, q = Math.max(Math.abs(x), Math.abs(y)); return q === 3 ? '#' : q === 1 ? '^' : '.'; },
  // 15 herringbone of spikes
  ({u, d}) => d >= 2 && mod(u + (d % 2 ? d : -d), 4) === 0 ? '^' : '.',
  // 16 lanterns: walls in pairs, boost-pad lights between
  ({u, d}) => d === 3 && mod(u, 4) === 0 ? '#' : d === 3 && mod(u, 4) === 2 ? '>' : d >= 5 && mod(u + d, 3) === 0 ? '^' : d >= 5 && mod(u - d, 6) === 0 ? '#' : '.'
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

// The two longest straights get a sugar rush: boost pads between a sparse trail of crystals.
const RUSH = [5, 11];

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

// ---- sugar rush on the two longest straights: boost pads between the crystals, a slow pad before the
// corner chain. Pads lie on the road; running over them only changes speed.
for (const s of RUSH) {
  const cells = [];
  for (let i = 0; i < L; i++) if (seg[i] === s) cells.push(i);
  const from = cells[1], to = cells[cells.length - 1];
  const chainStart = Math.max(...corners.filter(k => k <= to + 1)) - 2;
  for (let i = from; i < chainStart - 4; i++) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '>');
  for (let i = chainStart - 1; i >= chainStart - 3; i--) if (g.get(T, ...route.at(i)) === '.') { g.set(T, ...route.at(i), '='); break; }
}

// ---- colours: every quarter of the fair in its own bright floor, as they come out of the colour
// grading: vivid green, salmon, pink, violet, raspberry, olive, lilac, light blue, sky blue, indigo,
// light green, beige. The road is a caramel and dough ribbon.
const floors = ['#ffff00', '#ff0088', '#ff9900', '#ff00ff', '#ff1111', '#ff44aa', '#ff99cc', '#ff0066',
  '#dd88ff', '#ffaa00', '#6600cc', '#ff7700', '#ff0088', '#ffff00', '#ff00ff', '#ff99cc', '#ff1111'];
const colorOf = (c, r) => {
  if (route.has(c, r)) return route.cells.findIndex(q => q[0] === c && q[1] === r) % 2 ? '#ff3300' : '#ff5a28';
  return floors[local(c, r).s];
};
const colors = {top: g.layers(colorOf), bottom: [['#ff0088', '#ff00ff', 'r']]};
module.exports = {key: 'carnival', name: 'Level 8', kind: 'Carnival', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
