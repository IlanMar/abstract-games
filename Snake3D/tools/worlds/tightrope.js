// Level 18 "Tightrope": the hard world of the three after Prism, a high-wire act over the void in the
// manner of the late classic levels (Shrivel, Absolute, Snake Road), where most of the field is empty.
// A square world of 52 x 52 cells in which only the road and what lies beside it is solid; a missed
// turn runs off the edge and rolls the snake onto the underside, a long way from the next item. Each
// stretch is its own kind of bridge:
//   - wire: the road alone, one cell wide;
//   - planks: three wide, with broken planks (holes) beside the road, now on one side, now on the other;
//   - rails: three wide, a lane of slow pads on one side and boost pads on the other (Zig-Zag);
//   - nets: five wide, with a hem of spikes two cells out (Snake Road);
// and at five corners a circus platform: a square island with spike rings, walls at its corners and
// boost pads round its rim. The road climbs a staircase of four-cell steps, walks a long wire east, drops
// through a hook and comes back west along a notch. The stages are the hardest of the new worlds:
//   - a launch on the long straights: a strip of boost pads on the road throws the snake into a long
//     straight chain, a slow pad brakes it before the corner (Accelerator);
//   - a staircase or a notch is threaded by one chain round all its bends;
//   - '>=' gates on the road between the stages on the rails (the '=>=' gates of Vents);
//   - few crystals: almost every stage is a chain, and the corner chains run long.
// No wall or spike stands next to the road, and past every corner three cells straight on are floor.
const {Grid} = require('../grid');
const W = 52, H = 52, T = 'top';
const g = new Grid(W, H);
const start = [6, 48];
const runs = 'N14 E4 N4 E4 N4 E4 N8 E14 S10 E4 S4 E8 N20 W10 N6 W10 S3 W6 N3 W12 N10';
const route = g.route(start, runs);
const L = route.length;
const V = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const wrap = (c, r) => [((c % W) + W) % W, ((r % H) + H) % H];
const key = (c, r) => `${c},${r}`;
const mod = (a, n) => ((a % n) + n) % n;

// Stretches (a corner cell ends its stretch) and corners, the corner into the start included (index L).
const seg = [], corners = [];
{ let s = 0; for (let i = 1; i <= L; i++) { seg[i % L] = s; if (route.heading(i + 1) !== route.heading(i)) { corners.push(i); s++; } } }
const segs = new Set(seg).size;

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

// ---- the bridges. Stretch by stretch:
// N14 (from the start) | E4 N4 E4 N4 E4 (the staircase) | N8 E14 S10 | E4 S4 E8 (the hook) | N20 W10 N6 |
// W10 S3 W6 N3 W12 (the notch) | N10 (into the start: one straight with the first).
const theme = ['rails', 'wire', 'wire', 'wire', 'wire', 'wire', 'nets', 'wire', 'planks', 'wire', 'wire', 'rails',
  'nets', 'wire', 'planks', 'rails', 'wire', 'wire', 'wire', 'planks', 'rails'];
if (theme.length !== segs || theme[0] !== theme[segs - 1]) throw new Error(`${segs} stretches, ${theme.length} themes`);
const WIDTH = {wire: 0, planks: 1, rails: 1, nets: 2};
// Circus platforms round five corners: the start of the staircase, its top, the far corner of the long
// wire, the foot of the hook and the corner into the notch.
const PLATFORM = 3;
const platforms = [corners[0], corners[5], corners[7], corners[10], corners[14]].map(k => route.at(k));
const onPlatform = (c, r) => platforms.some(([pc, pr]) => { let dx = Math.abs(c - pc), dy = Math.abs(r - pr);
  dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); return Math.max(dx, dy) <= PLATFORM; });
const land = (c, r) => g.set('both', c, r, '.');
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r), kind = theme[q.s];
  if (q.d === 0 || onPlatform(c, r)) { land(c, r); continue; }
  if (q.d > WIDTH[kind]) continue;
  // Broken planks: a hole every fourth cell, the side changing every eight.
  if (kind === 'planks' && q.d === 1 && mod(q.u, 4) === 1 && (mod(q.u, 16) < 8) === (q.v > 0)) continue;
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

// ---- what stands on the bridges and platforms. Nothing sharp nearer than two cells to the road.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (g.get(T, c, r) !== '.') continue;
  const q = local(c, r), kind = theme[q.s];
  let ch = '.';
  if (onPlatform(c, r) && q.d >= 2) {
    // The platform: spike rings on alternate cells, walls at the corners, boost pads round the rim.
    const [pc, pr] = platforms.find(([pc, pr]) => { let dx = Math.abs(c - pc), dy = Math.abs(r - pr);
      dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); return Math.max(dx, dy) <= PLATFORM; });
    let dx = c - pc, dy = r - pr;
    if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W; if (dy > H / 2) dy -= H; if (dy < -H / 2) dy += H;
    const ring = Math.max(Math.abs(dx), Math.abs(dy));
    ch = ring === PLATFORM ? (Math.abs(dx) === Math.abs(dy) ? '#' : '>') : mod(dx + dy, 2) === 0 ? '^' : '.';
  } else if (kind === 'rails' && q.d === 1) ch = q.v > 0 ? '=' : '>';
  else if (kind === 'nets' && q.d === 2) ch = mod(q.u, 2) === 0 ? '^' : '.';
  else if (kind === 'nets' && q.d === 1) ch = mod(q.u, 6) === 3 ? '>' : '.';
  if (/[#^]/.test(ch) && (q.d < 2 || runout.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const [c, r] of route.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
  if (/[#^]/.test(g.get(T, ...wrap(c + dx, r + dy)))) throw new Error(`an obstacle at ${wrap(c + dx, r + dy)} stands next to the road`);

// ---- stages. A long straight gets a launch: a crystal, two boost pads on the road, a long straight
// chain, a slow pad and the corner chain. Bends closer than five cells (the staircase, the
// hook, the notch) are threaded by one chain round all of them. Corner chains begin four or seven cells
// before the bend; the straights between hold straight chains of nine cells, now and then a crystal.
// On the rails each stage is followed by two free cells for a '>=' gate.
const stages = [], strips = [], brakes = [], gates = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  const gap = i => (theme[seg[i % L]] === 'rails' ? 3 : 2);
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

// ---- colours: a circus in the dark. A hot pink wire, each kind of bridge in its own pair, the
// platforms in striped tent colours, and the underside in violet.
const bridge = {wire: ['#ff00ff', '#ff0088'], planks: ['#993300', '#ff5a28'], rails: ['#6600cc', '#ff00ff'], nets: ['#b41e46', '#ff0066']};
const colorOf = (c, r) => {
  const q = local(c, r);
  if (onPlatform(c, r) && q.d >= 1) return mod(c + r, 4) < 2 ? '#ff3300' : '#ff0066';
  const [a, b] = bridge[theme[q.s]];
  if (q.d === 0) return mod(q.i, 4) < 2 ? a : b;
  return q.d === 1 ? b : a;
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#ff0088', 'r']]};
module.exports = {key: 'tightrope', name: 'Level 18', kind: 'Tightrope', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
