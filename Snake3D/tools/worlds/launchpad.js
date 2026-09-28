// Level 14 "Launchpad": a bright one-sided square world after the speed levels of the classic set
// (Accelerator, Queue, Colour Check). An endless plane (the 52 x 52 tile repeats) with no holes. The road
// is long straights with short hooks between them, thirteen runs turning both ways, and it is built
// for speed: on the long straights a strip of boost pads on the road launches the snake into a long
// straight chain, as the '>>>>' strips of Accelerator launch it into its paths, and a slow pad brakes it
// before the corner. Beside the road:
//   - launch chevrons: boost-pad arrows pointing along the road, walls behind (Accelerator);
//   - beacons: dotted '>' lines two cells out and '=' posts behind (the '>..>' lines of Colour Check);
//   - slalom: spike posts on alternate sides with boost pads behind them;
//   - barcode: bars of wall across the verge with a boost pad in each (Queue);
//   - queue lanes: a wall lane with gaps every five cells, another behind it, spikes in the gaps (Queue);
//   - dominoes of wall with spike pips; pad fields of boost and slow pads (Colour Check);
// and far from the road, over everything, the concentric square rings of wall of Accelerator. No wall or
// spike stands next to the road (diagonals included), and past every corner three cells stay clear.
const {Grid} = require('../grid');
const W = 52, H = 52, T = 'top';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 48];
const runs = 'N20 E14 S6 E12 N22 W8 N8 E20 S10 E6 N14 E8 N4';
const route = g.route(start, runs);
const L = route.length;
const V = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const wrap = (c, r) => [((c % W) + W) % W, ((r % H) + H) % H];
const key = (c, r) => `${c},${r}`;
const mod = (a, n) => ((a % n) + n) % n;

// Stretches (a corner cell ends its stretch) and corners, the corner into the start included (index L).
const seg = [], corners = [];
{ let s = 0; for (let i = 1; i <= L; i++) { seg[i % L] = s; if (route.heading(i + 1) !== route.heading(i)) { corners.push(i); s++; } } }

// Distance d from the road (8 neighbours), the road cell i each cell hangs from, u along and v across it.
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
  return {d, i, u: i + dx * hx + dy * hy, v: dx * hy - dy * hx, s: seg[i]};
}

// ---- the verges, as functions of (u along, d out, v side). Nothing sharp nearer than d = 2.
const M = {
  launch: ({u, d}) => d >= 2 && d <= 4 && mod(u - d, 4) === 0 ? '>' : d === 6 && mod(u, 4) === 0 ? '#' : '.',
  beacons: ({u, d}) => d === 2 && mod(u, 2) === 0 ? '>' : d === 4 && mod(u, 4) === 1 ? '=' : d === 5 && mod(u, 8) === 5 ? '#' : '.',
  slalom: ({u, d, v}) => { const k = mod(u, 6), mine = v > 0 ? k === 0 : k === 3;
    return mine && d === 2 ? '^' : mine && d === 3 ? '>' : d === 5 && mod(u, 3) === 0 ? '^' : '.'; },
  barcode: ({u, d}) => d >= 2 && d <= 6 && mod(u, 3) === 0 ? (d === 4 ? '>' : '#') : '.',
  queue: ({u, d}) => { const gap = mod(u, 5) === 0;
    return d === 2 ? (gap ? '.' : '#') : d === 3 && gap ? '^' : d === 4 ? (mod(u + 2, 5) === 0 ? '.' : '#') : '.'; },
  dominoes: ({u, d}) => { const a = mod(u, 4), b = mod(d - 2, 5);
    return d < 2 ? '.' : a === 0 && b < 2 ? '#' : a === 2 && b === 3 ? '^' : '.'; },
  pads: ({u, d}) => d >= 2 && d <= 3 ? (mod(u + d, 2) ? '>' : '=') : d === 5 && mod(u, 3) === 0 ? '#' : '.'
};
// Stretch by stretch: N20 E14 S6 E12 N22 W8 N8 E20 S10 E6 N14 E8 N4 (the last one runs on into the first).
const theme = ['launch', 'beacons', 'slalom', 'barcode', 'queue', 'dominoes', 'pads', 'launch', 'slalom',
  'dominoes', 'queue', 'barcode', 'launch'];
if (theme.length !== new Set(seg).size) throw new Error(`${new Set(seg).size} stretches, ${theme.length} themes`);
// The rings of Accelerator: squares of wall round the points of a 16-cell lattice, far from the road.
const ring = (c, r) => { const q = Math.max(Math.abs(mod(c, 16) - 8), Math.abs(mod(r, 16) - 8));
  return q === 0 ? '>' : q === 2 || q === 5 ? (mod(c + r, 8) === 0 ? '.' : '#') : q === 7 && mod(c + r, 2) === 0 ? '^' : '.'; };
const RING_FROM = 8;

// Past every corner three cells straight on stay clear, with their neighbours.
const runout = new Set();
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.move(...p, route.heading(k));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) runout.add(key(...wrap(p[0] + dx, p[1] + dy)));
  }
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d < 2) continue;
  let ch = q.d >= RING_FROM ? ring(c, r) : M[theme[q.s]](q, c, r);
  if (/[#^]/.test(ch) && runout.has(key(c, r))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const [c, r] of route.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
  if (/[#^]/.test(g.get(T, ...wrap(c + dx, r + dy)))) throw new Error(`an obstacle at ${wrap(c + dx, r + dy)} stands next to the road`);
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const n = {'#': 0, '^': 0};
  for (let r = y - 14; r <= y + 14; r++) for (let c = x - 14; c <= x + 14; c++) { const ch = g.get(T, ...wrap(c, r)); if (ch in n) n[ch]++; }
  if (n['#'] > 400 || n['^'] > 400) throw new Error(`too many obstacles round ${x},${y}: ${n['#']} walls, ${n['^']} spikes`);
}

// ---- stages. A long straight (LAUNCH) gets a launch: a crystal, a strip of boost pads on the road, a
// long straight chain, then a slow pad and the corner chain. Every bend is taken inside a chain that
// begins up to six cells before it; the other straights hold crystals, trails and straight chains in turn.
const LAUNCH = new Set([0, 4, 7, 10]);
const stages = [], strips = [], brakes = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  bends.forEach((k, n) => {
    if (k + 2 > end) return;
    if (LAUNCH.has(seg[pos % L]) && k - 6 - pos >= 10) {
      stages.push([['gem', pos]]);
      // two free cells, then boost pads up to the chain: the '>>' strip lies inside the gem stage gap
      const chainFrom = pos + 3, chainTo = k - 9;
      strips.push(pos + 1, pos + 2);
      stages.push([['chain', chainFrom, chainTo]]);
      stages.push([['gems', chainTo + 2, chainTo + 4]]);
      pos = chainTo + 6;
      brakes.push(pos - 1);
    }
    while (k - 6 - pos >= 3) {
      const room = k - 6 - pos;
      let to;
      if (room >= 8 && kind % 3 === 1) { stages.push([['chain', pos, pos + 6]]); to = pos + 6; }
      else if (room >= 6 && kind % 3 === 2) { stages.push([['gems', pos, pos + 2, pos + 4]]); to = pos + 4; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      pos = to + 2;
    }
    const tight = bends[n + 1] !== undefined && bends[n + 1] - k <= 4;
    const to = tight ? k + 1 : k + 2;
    stages.push([['chain', Math.min(pos, k - 1), to]]);
    pos = to + 2;
  });
  while (end - pos >= 9) { stages.push([['gems', pos, pos + 3, pos + 6]]); pos += 8; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);
// The launch strips and the brakes: pads on the road, which only change the speed.
for (const i of strips) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '>');
for (const i of brakes) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '=');

// ---- colours: a sunset launch field, each verge in its pair of oranges, reds and pinks (no yellow: after
// the colour grading it turns as green as the boost pads), the far rings on indigo and lilac, a pink road.
const floors = {
  launch: ['#ff7700', '#ff1111'], beacons: ['#ff0088', '#ff7700'], slalom: ['#ff1111', '#ffaa00'],
  barcode: ['#ffaa00', '#ff0066'], queue: ['#ff5a28', '#ff1111'], dominoes: ['#ff0066', '#ffaa00'], pads: ['#ff00ff', '#ff7700']
};
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff00ff' : '#ff0088';
  if (q.d >= RING_FROM) return Math.max(Math.abs(mod(c, 16) - 8), Math.abs(mod(r, 16) - 8)) % 3 === 0 ? '#dd88ff' : '#6600cc';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#ff9900', '#ff00ff', 'r']]};
module.exports = {key: 'launchpad', name: 'Level 14', kind: 'Launchpad', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
