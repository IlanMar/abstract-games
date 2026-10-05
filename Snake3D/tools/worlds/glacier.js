// Level 25 "Glacier": the hard world of the four after Aqueduct, ice over the void. A hex world of 48 x 56
// cells in which only the road and what lies beside it is solid, in the manner of the late classic hex
// levels (Shrivel, Absolute, Zig-Zag); a missed turn slides off the ice onto the underside, far from the
// next item. The road climbs the tile three times, each pass a third of the width further east, leaning
// north-east and north-west, with a dip south-east on the second pass. Each stretch is its own kind of ice:
//   - ridge: the road alone, one cell wide, on every short stretch;
//   - crevasse: three wide, cracks (holes) beside the road, now on one side, now on the other;
//   - icefall: three wide, a slide of boost pads on one side and slow pads on the other (Zig-Zag);
//   - moraine: five wide, a hem of spike stones two cells out, gravel of slow pads beside the road;
//   - serac: five wide, blocks of wall two cells out and cracks between them and the road;
// and at five corners a floe: a disc of ice with a rim of boost pads, wall pillars on it and a ring of
// spikes inside. The stages are hard ones:
//   - a launch on the long straights: two boost pads on the road throw the snake into a long straight
//     chain, a slow pad brakes it before the bend (Accelerator);
//   - every run of close bends (the dip, the wiggles) is threaded by one chain;
//   - '>=' gates on the road between the stages on the icefalls (Vents);
//   - few crystals: almost every stage is a chain.
// No wall or spike stands next to the road, and past every corner three cells straight on are ice.
const {Grid} = require('../grid');
const W = 48, H = 56, T = 'top';
const g = new Grid(W, H, true);
const start = [6, 50];
// Three passes, each 56 rows north and 16 columns east; neighbouring bridges stay six cells or more apart.
const route = g.route(start, 'N14 NE6 N10 NW3 N8 NE7 N10'
  + ' NE6 N8 NE3 SE3 NE3 N12 NW4 N10 NE8 N8 NE3 N18'
  + ' NE4 N10 NW2 N10 NE6 N6 NE8 N14');
const L = route.length;
const dirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const key = (c, r) => `${c},${r}`;
const mod = (n, m) => (n % m + m) % m;

// Stretches (a corner cell ends its stretch) and corners.
const segment = [], corners = [];
{ let s = 0; for (let i = 1; i <= L; i++) { segment[i % L] = s; if (route.heading(i + 1) !== route.heading(i)) { corners.push(i); s++; } } }
// The start lies on a straight: the cells past the last corner belong to the first stretch.
for (let i = corners[corners.length - 1] + 1; i <= L; i++) segment[i % L] = 0;
const stretchLength = corners.map((k, s) => k - (s ? corners[s - 1] : corners[corners.length - 1] - L));

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
  return {d, u: i, v: hx * oy - hy * ox < 0 ? 1 : -1, s: segment[i], c, r};
}

// ---- the ice: a ridge on every short stretch, and on the straights crevasses, icefalls, moraines and
// seracs in turn.
const LONG = ['icefall', 'crevasse', 'moraine', 'icefall', 'serac', 'crevasse', 'moraine', 'serac'];
let turn = 0;
const theme = stretchLength.map(n => (n <= 4 ? 'ridge' : LONG[turn++ % LONG.length]));
const WIDTH = {ridge: 0, crevasse: 1, icefall: 1, moraine: 2, serac: 2};
// Floes round five corners spread over the lap: discs of radius three.
const FLOE = 3;
const floes = [1, 5, 10, 16, 20].map(n => route.at(corners[n]));
const floeOf = (c, r) => floes.find(f => g.disk(...f, FLOE).some(([x, y]) => x === c && y === r));
const land = (c, r) => g.set('both', c, r, '.');
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r), kind = theme[q.s];
  if (q.d === 0 || floeOf(c, r)) { land(c, r); continue; }
  if (q.d > WIDTH[kind]) continue;
  // Cracks: a hole every fifth cell beside the road, the side changing every ten.
  if (kind === 'crevasse' && mod(q.u, 5) === 2 && (mod(q.u, 20) < 10) === (q.v > 0)) continue;
  if (kind === 'serac' && q.d === 1 && mod(q.u, 7) === 3) continue;
  land(c, r);
}
// Past every corner three cells straight on are ice, so a missed turn has a moment before the edge.
const runout = new Set();
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.step(...p, route.heading(k));
    if (g.get(T, ...p) === ' ') land(...p);
    runout.add(key(...p));
    for (const m of dirs) runout.add(key(...g.step(...p, m)));
  }
}

// ---- what stands on the ice and on the floes. Nothing sharp nearer than two cells to the road.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (g.get(T, c, r) !== '.') continue;
  const q = local(c, r), kind = theme[q.s];
  let ch = '.';
  const floe = floeOf(c, r);
  if (floe && q.d >= 2) {
    // The floe: a rim of boost pads with a wall pillar every third cell, a ring of spikes inside.
    const ring = [1, 2, 3].find(k => g.ring(...floe, k).some(([x, y]) => x === c && y === r)) || 0;
    const idx = ring ? g.ring(...floe, ring).findIndex(([x, y]) => x === c && y === r) : 0;
    ch = ring === 3 ? (idx % 3 === 0 ? '#' : '>') : ring === 2 ? (idx % 2 === 0 ? '^' : '.') : '.';
  } else if (kind === 'icefall' && q.d === 1) ch = q.v > 0 ? '>' : mod(q.u, 3) === 0 ? '=' : '.';
  else if (kind === 'moraine' && q.d === 2) ch = mod(q.u, 2) === 0 ? '^' : '.';
  else if (kind === 'moraine' && q.d === 1) ch = mod(q.u, 5) === 0 ? '=' : '.';
  else if (kind === 'serac' && q.d === 2) ch = mod(q.u, 5) < 2 ? '#' : '.';
  if (/[#^]/.test(ch) && (q.d < 2 || runout.has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const [c, r] of route.cells) for (const m of dirs)
  if (/[#^]/.test(g.get(T, ...g.step(c, r, m)))) throw new Error(`an obstacle at ${g.step(c, r, m)} stands next to the road`);

// ---- stages. A long straight gets a launch: a crystal, two boost pads on the road, a long straight
// chain, a slow pad and the corner chain. Bends closer than seven cells are threaded by one chain round
// all of them. Corner chains begin four or seven cells before the bend; the straights between hold
// straight chains of nine cells, now and then a crystal. On the icefalls each stage is followed by two
// free cells for a '>=' gate.
const stages = [], strips = [], brakes = [], gates = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  const gap = i => (theme[segment[i % L]] === 'icefall' ? 3 : 2);
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
      else if (room >= 6) { stages.push([['chain', pos, pos + 4]]); to = pos + 4; }
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

// ---- colours: blue ice in the polar night. The road is the palest ice (the pink that the game's
// grading turns pale blue), each kind of ice has its pair of violets and wines, the floes are lilac, and
// the underside is a dark violet.
const ice = {ridge: ['#ff44aa', '#ff99cc'], crevasse: ['#6600cc', '#ff00ff'], icefall: ['#ff0088', '#ff44aa'],
  moraine: ['#993300', '#b41e46'], serac: ['#b41e46', '#ff0066']};
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.u, 4) < 2 ? '#ff99cc' : '#ff44aa';
  if (floeOf(c, r)) return mod(q.d, 2) ? '#ff00ff' : '#6600cc';
  const [a, b] = ice[theme[q.s]];
  return q.d === 1 ? b : a;
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#b41e46', 'r']]};
module.exports = {key: 'glacier', name: 'Level 25', kind: 'Glacier', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\nthemes:', theme.join(' '));
