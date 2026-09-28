// Level 21 "Aqueduct": the hard world of the three after Tightrope, the stone channels of an aqueduct over
// the void, in the manner of the late classic levels (Shrivel, Absolute, Snake Road), where most of the
// field is empty. A square world of 64 x 64 cells in which only the road and what lies beside it is
// solid; a missed turn runs off the edge and rolls the snake onto the underside, a long way from the next
// item. The road crosses the whole tile: it climbs a staircase and a long span in the west, crosses to the
// east, comes down through a jog and a shelf, crosses again, climbs through a notch, crosses once more and
// comes down through a bump to the south-east, from where it wraps round the east edge into the start.
// Each stretch is its own kind of bridge:
//   - pipe: the road alone, one cell wide;
//   - arches: three wide, with broken arches (holes) beside the road, now on one side, now on the other;
//   - channel: three wide, a race of slow pads on one side and boost pads on the other (Zig-Zag);
//   - locks: five wide, with a hem of spikes two cells out and sluices of boost pads (Snake Road);
// and at six corners a cistern: a square basin with spike rings, walls at its corners and boost pads
// round its rim. The stages are the hardest of the new worlds:
//   - a launch on the long straights: a strip of boost pads on the road throws the snake into a long
//     straight chain, a slow pad brakes it before the corner (Accelerator);
//   - a staircase, a jog, a notch or a bump is threaded by one chain round all its bends;
//   - '>=' gates on the road between the stages on the channels (the '=>=' gates of Vents);
//   - few crystals: almost every stage is a chain, and the corner chains run long.
// No wall or spike stands next to the road, and past every corner three cells straight on are floor.
const {Grid} = require('../grid');
const W = 64, H = 64, T = 'top';
const g = new Grid(W, H);
const start = [6, 56];
// Four passes (up, down, up, down), about sixteen columns apart, joined by crossings; the last one wraps
// round the east edge into the start. Neighbouring bridges stay six cells or more apart.
const runs = 'N14 E4 N4 E4 N30 E14 S12 W4 S6 E4 S10 E4 S16 E10 N8 W4 N6 E4 N26 E14 S6 E4 S4 W4 S30 E6 S4 E8';
const route = g.route(start, runs);
const L = route.length;
const V = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const wrap = (c, r) => [((c % W) + W) % W, ((r % H) + H) % H];
const key = (c, r) => `${c},${r}`;
const mod = (a, n) => ((a % n) + n) % n;

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
  return {d, i, u: i + dx * hx + dy * hy, v: dx * hy - dy * hx, s: seg[i]};
}

// ---- the bridges: a pipe on every short stretch (the staircase, the jog, the notch, the bump), and on the
// straights arches, channels and locks in turn.
const LONG = ['channel', 'arches', 'locks', 'arches', 'channel', 'locks'];
let turn = 0;
const theme = stretchLength.map(n => (n <= 6 ? 'pipe' : LONG[turn++ % LONG.length]));
const WIDTH = {pipe: 0, arches: 1, channel: 1, locks: 2};
// Cisterns round six corners, spread over the lap: the foot of the staircase, the top of the long span,
// the bottom of the first descent, the foot and the top of the notch climb, and the bump.
const CISTERN = 3;
const cisterns = [0, 4, 11, 12, 18, 21].map(n => route.at(corners[n]));
const inCistern = (c, r) => cisterns.find(([pc, pr]) => { let dx = Math.abs(c - pc), dy = Math.abs(r - pr);
  dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); return Math.max(dx, dy) <= CISTERN; });
const land = (c, r) => g.set('both', c, r, '.');
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r), kind = theme[q.s];
  if (q.d === 0 || inCistern(c, r)) { land(c, r); continue; }
  if (q.d > WIDTH[kind]) continue;
  // Broken arches: a hole every fourth cell, the side changing every eight.
  if (kind === 'arches' && q.d === 1 && mod(q.u, 4) === 1 && (mod(q.u, 16) < 8) === (q.v > 0)) continue;
  land(c, r);
}
// Past every corner three cells straight on are floor, so a missed turn has a moment before the edge.
const runout = new Set();
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.move(...p, route.heading(k));
    if (g.get(T, ...p) === ' ') land(...p);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) runout.add(key(...wrap(p[0] + dx, p[1] + dy)));
  }
}

// ---- what stands on the bridges and in the cisterns. Nothing sharp nearer than two cells to the road.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (g.get(T, c, r) !== '.') continue;
  const q = local(c, r), kind = theme[q.s];
  let ch = '.';
  const cistern = inCistern(c, r);
  if (cistern && q.d >= 2) {
    // The basin: spike rings on alternate cells, walls at the corners, boost pads round the rim.
    let dx = c - cistern[0], dy = r - cistern[1];
    if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W; if (dy > H / 2) dy -= H; if (dy < -H / 2) dy += H;
    const ring = Math.max(Math.abs(dx), Math.abs(dy));
    ch = ring === CISTERN ? (Math.abs(dx) === Math.abs(dy) ? '#' : '>') : mod(dx + dy, 2) === 0 ? '^' : '.';
  } else if (kind === 'channel' && q.d === 1) ch = q.v > 0 ? '=' : '>';
  else if (kind === 'locks' && q.d === 2) ch = mod(q.u, 2) === 0 ? '^' : '.';
  else if (kind === 'locks' && q.d === 1) ch = mod(q.u, 6) === 3 ? '>' : mod(q.u, 6) === 0 ? '=' : '.';
  if (/[#^]/.test(ch) && (q.d < 2 || runout.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const [c, r] of route.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
  if (/[#^]/.test(g.get(T, ...wrap(c + dx, r + dy)))) throw new Error(`an obstacle at ${wrap(c + dx, r + dy)} stands next to the road`);

// ---- stages. A long straight gets a launch: a crystal, two boost pads on the road, a long straight
// chain, a slow pad and the corner chain. Bends closer than seven cells (the staircase, the jog, the notch,
// the bump) are threaded by one chain round all of them. Corner chains begin four or seven cells before the
// bend; the straights between hold straight chains of nine cells, now and then a crystal. On the channels
// each stage is followed by two free cells for a '>=' gate.
const stages = [], strips = [], brakes = [], gates = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  const gap = i => (theme[seg[i % L]] === 'channel' ? 3 : 2);
  for (let n = 0; n < bends.length; n++) {
    const k = bends[n];
    if (k + 2 > end) break;
    if (k - pos >= 15) {
      stages.push([['gem', pos]]);
      strips.push(pos + 1, pos + 2);
      stages.push([['chain', pos + 3, k - 8]]);
      brakes.push(k - 7);
      pos = k - 6;
    }
    const pre = n % 2 ? 4 : 7;
    while (k - pre - pos >= 2) {
      const room = k - pre - pos;
      let to;
      if (room >= 11 && kind % 2 === 0) { stages.push([['chain', pos, pos + 8]]); to = pos + 8; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      if (gap(to) === 3) gates.push(to + 1);
      pos = to + gap(to);
    }
    // Thread the run of close bends that starts here with one chain.
    let last = n;
    while (bends[last + 1] !== undefined && bends[last + 1] - bends[last] <= 6 && bends[last + 1] + 2 <= end) last++;
    const tight = bends[last + 1] !== undefined && bends[last + 1] - bends[last] <= 8;
    const to = tight ? bends[last] + 1 : bends[last] + 2;
    stages.push([['chain', Math.min(pos, k - 1), to]]);
    pos = to + 2;
    n = last;
  }
  // The last straight runs into the start: a launch up to the end.
  if (end - pos >= 10) { stages.push([['gem', pos]]); strips.push(pos + 1, pos + 2); pos += 3; }
  while (end - pos >= 11) { stages.push([['chain', pos, pos + 8]]); pos += 10; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);
// The road's own pads: launch strips, brakes and '>=' gates. A pad on the road only changes the speed.
const pad = (i, ch) => { if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), ch); };
for (const i of strips) pad(i, '>');
for (const i of brakes) pad(i, '=');
for (const i of gates) { pad(i, '>'); pad(i + 1, '='); }

// ---- colours: sunlit stone over the dark. A caramel pipe, each kind of bridge in its own pair of
// stone and water colours, the cisterns in rose tiles, and the underside in chocolate.
const bridge = {pipe: ['#ff3300', '#ff5a28'], arches: ['#993300', '#ff5a28'], channel: ['#ff0088', '#ff44aa'], locks: ['#b41e46', '#ff0066']};
const colorOf = (c, r) => {
  const q = local(c, r);
  if (inCistern(c, r) && q.d >= 1) return mod(c + r, 4) < 2 ? '#ff0066' : '#b41e46';
  const [a, b] = bridge[theme[q.s]];
  if (q.d === 0) return mod(q.i, 4) < 2 ? a : b;
  return q.d === 1 ? b : a;
};
const colors = {top: g.layers(colorOf), bottom: [['#993300', '#ff3300', 'r']]};
module.exports = {key: 'aqueduct', name: 'Level 21', kind: 'Aqueduct', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\nthemes:', theme.join(' '));
