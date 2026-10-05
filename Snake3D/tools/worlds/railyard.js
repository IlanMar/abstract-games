// Level 23 "Railyard": the middle world of the four after Aqueduct, a railway yard. A one-sided square
// world, an endless plane (the 56 x 56 tile repeats) with no holes. The road is the main line: it runs
// east, drops to the next track, runs back west, and so on four times down the tile, each pass with a
// set of points (a jog of three cells) at its own place, and the last drop wraps round the south edge
// into the start. Each stretch has its own lineside, in the manner of the classic levels:
//   - rails: a shield of slow pads two cells out with a boost-pad gate every four (Shielded);
//   - platform: a platform edge of wall three cells out, its doors every ten, spikes on the far side
//     and runway lights '>..>' two cells out (Colour Check);
//   - wagons: freight cars of wall four cells long, spikes in the couplings (Queue);
//   - signals: a wall post three cells out with a boost-pad lamp before it, spikes further off;
//   - points: diagonal ladders of slow pads with boost-pad beads (Wave) on the short jogs;
// and the space between the tracks holds turntables: a boost-pad hub, a deck of slow pads and a ring of
// wall with two gaps, each in the next free place (the rings of Accelerator).
// The stages are of middle strength: long straights carry an express (a strip of boost pads on the road
// launches the snake into a long chain, a slow pad brakes it), every jog is taken by one chain, some
// stages are two groups (a crystal and the chain round the next bend), and the road along the signals
// has '>=' level crossings between the stages (Vents). No wall or spike stands next to the road, and
// past every corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 56, H = 56, T = 'top';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [3, 7];
// Four passes fourteen rows apart (east, west, east, west), each with its own points; neighbouring
// tracks stay eight cells or more apart.
const route = g.route(start, 'E14 S3 E12 N3 E15 S14 W10 N3 W14 S3 W17 S14 E8 N3 E10 S3 E10 S3 E8 N3 E8 S14 W16 S3 W12 N3 W16 S14');
const L = route.length;
const V = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const wrap = (c, r) => [((c % W) + W) % W, ((r % H) + H) % H];
const key = (c, r) => `${c},${r}`;
const mod = (a, n) => ((a % n) + n) % n;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Stretches (a corner cell ends its stretch) and corners, the corner into the start included (index L).
const seg = [], corners = [];
{ let s = 0; for (let i = 1; i <= L; i++) { seg[i % L] = s; if (route.heading(i + 1) !== route.heading(i)) { corners.push(i); s++; } } }
const stretchLength = corners.map((k, s) => k - (s ? corners[s - 1] : corners[corners.length - 1] - L));

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
  return {d, i, u: i + dx * hx + dy * hy, v: dx * hy - dy * hx, s: seg[i], c, r};
}

// Past every corner three cells straight on stay clear, with the cells round them.
const runout = new Set();
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.move(...p, route.heading(k));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) runout.add(key(...wrap(p[0] + dx, p[1] + dy)));
  }
}

// ---- the lineside, as functions of (u, d, v). Walls and spikes stand two cells out or further.
const SIDE = {
  rails: ({u, d}) => d === 2 ? (mod(u, 4) === 0 ? '>' : '=') : d === 4 && mod(u, 6) === 3 ? '^' : '.',
  platform: ({u, d}) => d === 2 ? (mod(u, 3) === 0 ? '>' : '.') : d === 3 ? (mod(u, 10) < 2 ? '.' : '#') : d === 4 && mod(u, 10) === 5 ? '^' : '.',
  wagons: ({u, d}) => (d === 3 || d === 4) && mod(u, 6) < 4 ? '#' : d === 3 && mod(u, 6) === 5 ? '^' : '.',
  signals: ({u, d}) => { const x = mod(u, 8);
    if (d === 3 && x === 0) return '#';
    if (d === 2 && x === 7) return '>';
    return d === 5 && x === 4 ? '^' : '.'; },
  points: ({u, d}) => d >= 2 && d <= 4 && mod(u + d, 4) === 0 ? (d === 3 ? '>' : '=') : '.'
};
// Short stretches (the jogs) take the points; the straights take the others in turn.
const CYCLE = ['rails', 'signals', 'platform', 'wagons', 'rails', 'platform', 'signals', 'wagons'];
let turn = 0;
const theme = stretchLength.map(n => (n <= 4 ? 'points' : CYCLE[turn++ % CYCLE.length]));
const REACH = 5;
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d < 2 || q.d > REACH) continue;
  const ch = SIDE[theme[q.s]](q);
  if (/[#^]/.test(ch) && runout.has(key(c, r))) continue;
  if (ch !== '.') g.set(T, c, r, ch);
}

// ---- the turntables between the tracks: a boost hub, a slow-pad deck, a ring of wall with a gap on
// each side. Each takes the free place farthest from the road, and stays three cells off it.
const tables = [];
{
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cand.push([c, r, local(c, r).d]);
  cand.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
  const apart = (a, b) => { let dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]); return Math.max(Math.min(dx, W - dx), Math.min(dy, H - dy)); };
  for (const [c, r, d] of cand) {
    if (d < 6) break;
    if (tables.some(t => apart(t, [c, r]) < 9)) continue;
    tables.push([c, r]);
  }
}
tables.forEach(([c, r], n) => {
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const q = wrap(c + dx, r + dy), ring = Math.max(Math.abs(dx), Math.abs(dy));
    if (local(...q).d < 3) continue;
    let ch = '.';
    if (ring === 0) ch = '>';
    else if (ring <= 2) ch = '=';
    else ch = (n % 2 ? dx === 0 : dy === 0) ? '.' : '#';
    g.set(T, ...q, ch);
  }
});
// Ballast over the rest of the yard: a scatter of slow pads.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (local(c, r).d > REACH && g.get(T, c, r) === '.' && hash(c, r) < 0.05) g.set(T, c, r, '=');

for (const [c, r] of route.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
  if (/[#^]/.test(g.get(T, ...wrap(c + dx, r + dy)))) throw new Error(`an obstacle at ${wrap(c + dx, r + dy)} stands next to the road`);

// ---- stages. A straight of fifteen cells or more gets an express: a crystal, two boost pads on the
// road, a long straight chain and a slow pad before the bend. Bends closer than five cells (the points)
// are threaded by one chain. Other bends are taken by a chain that begins up to ten cells before it,
// every other one with a crystal on the straight in the same stage. The straights between hold straight
// chains of six and eight cells; along the signals each stage is followed by a '>=' crossing.
const stages = [], strips = [], brakes = [], gates = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  const gap = i => (theme[seg[i % L]] === 'signals' ? 3 : 2);
  for (let n = 0; n < bends.length; n++) {
    const k = bends[n];
    if (k + 2 > end) break;
    if (k - pos >= 15) {
      stages.push([['gem', pos]]);
      strips.push(pos + 1, pos + 2);
      stages.push([['chain', pos + 3, k - 7]]);
      brakes.push(k - 6);
      pos = k - 5;
    }
    while (k - pos >= 11) {
      const len = k - pos >= 15 && kind++ % 2 === 0 ? 7 : 5;
      stages.push([['chain', pos, pos + len]]);
      if (gap(pos + len) === 3) gates.push(pos + len + 1);
      pos += len + gap(pos + len);
    }
    let last = n;
    while (bends[last + 1] !== undefined && bends[last + 1] - bends[last] <= 4 && bends[last + 1] + 2 <= end) last++;
    const tight = bends[last + 1] !== undefined && bends[last + 1] - bends[last] <= 6;
    const to = tight || k - pos < 3 ? bends[last] + 1 : bends[last] + 2;
    // Two groups in one stage, as in the classic levels: a crystal on the straight, the chain round the bend.
    if (k - pos >= 5 && n % 2 === 0) stages.push([['gem', pos], ['chain', pos + 2, to]]);
    else stages.push([['chain', Math.min(pos, k - 1), to]]);
    pos = to + 2;
    n = last;
  }
  while (end - pos >= 9) { stages.push([['chain', pos, pos + 6]]); pos += 8; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);
// The road's own pads: express strips, brakes and '>=' crossings. A pad on the road only changes the speed.
const pad = (i, ch) => { if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), ch); };
for (const i of strips) pad(i, '>');
for (const i of brakes) pad(i, '=');
for (const i of gates) { pad(i, '>'); pad(i + 1, '='); }

// ---- colours: a caramel main line with chocolate sleepers, each lineside on its own pair, the
// turntables in rose and wine rings, and the yard in broad violet and wine bands along the tracks.
const floors = {
  rails: ['#993300', '#ff5a28'], platform: ['#ff0088', '#ff44aa'], wagons: ['#b41e46', '#ff0066'],
  signals: ['#6600cc', '#ff00ff'], points: ['#ff3300', '#ff5a28']
};
const ringOf = (c, r) => { let best = 9;
  for (const [tc, tr] of tables) { const dx = Math.abs(c - tc), dy = Math.abs(r - tr);
    best = Math.min(best, Math.max(Math.min(dx, W - dx), Math.min(dy, H - dy))); }
  return best; };
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.i, 3) === 0 ? '#993300' : '#ff3300';
  const ring = ringOf(c, r);
  if (ring <= 3 && q.d >= 3) return ring % 2 ? '#ff0066' : '#b41e46';
  if (q.d > REACH) return '#6600cc';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#993300', '#6600cc', 'r']]};
module.exports = {key: 'railyard', name: 'Level 23', kind: 'Railyard', start: [...start, 'E'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\nturntables:', tables.join(' '), '\nthemes:', theme.join(' '));
