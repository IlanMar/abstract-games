// Level 20 "Observatory": the middle world of the three after Tightrope, a star chart. A one-sided hex
// world, an endless plane (the 64 x 64 tile repeats) with no holes. The road climbs the tile four times,
// each pass a quarter of the width further east, so that one lap sweeps the whole sky; it runs mostly
// north, leans north-east and north-west, and dips south-east between two north-east runs. On the belt
// stretches it ticks: between the stages the road carries '>=' gates, a kick and a brake (Vents). Beside
// the road, one figure per stretch:
//   - constellations: stars of boost pads two and three cells out, spikes for the bright ones further off;
//   - comets: streaks of slow pads leaning back along the road, a boost-pad head and a spike nucleus;
//   - tubes: two rails of wall with boost pads between them, a telescope lying beside the road (Queue);
//   - nebulae: clouds of slow pads with boost-pad stars inside (Wave);
//   - the belt: a lane of slow pads with a boost pad every four cells, rocks of spike behind (Shielded);
// and between the passes the planets: a slow-pad globe round a boost core, a ring of wall with gaps,
// spike moons on the orbit outside, each in the next free place (Honeycomb's rings, grown into worlds).
// The chains run long through the bends as in the classic levels. No wall or spike stands next to the
// road, and past every corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 64, H = 64, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 60];
// Four passes, each 64 rows north and 16 columns east; neighbouring passes stay six cells or more apart.
const route = g.route(start, 'N12 NE8 N6 NW3 N4 NE3 N7 NE8 N38'
  + ' NE4 N6 NE3 SE3 NE3 N8 NW4 N6 NE7 N35'
  + ' NE4 N4 NE4 N8 NE3 N3 NW3 N3 NE3 N6 NE5 N15'
  + ' NW3 N10 NE8 N8 NE3 SE3 NE4 N6 NW3 N29 NE4');
const L = route.length;
const dirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const key = (c, r) => `${c},${r}`;
const mod = (n, m) => (n % m + m) % m;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// Stretches (a corner cell ends its stretch) and corners, the corner into the start included (index L).
const segment = [], corners = [];
{ let s = 0; for (let i = 1; i <= L; i++) { segment[i % L] = s; if (route.heading(i + 1) !== route.heading(i)) { corners.push(i); s++; } } }
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

// ---- the sky beside the road, one figure per stretch, as functions of (u, d, v). Only pads come next to it.
const M = {
  constellation: ({u, d, c, r}) => { const x = mod(u, 9);
    if ((d === 2 && x === 1) || (d === 3 && x === 4) || (d === 2 && x === 7)) return '>';
    return d === 4 && x === 5 ? '^' : d === 5 && x === 0 && hash(c, r) < 0.6 ? '^' : '.'; },
  comet: ({u, d}) => { const x = mod(u, 10);
    if (d === 3 && x === 0) return '^';                               // the nucleus
    if (d === 2 && x === 0) return '>';                               // the head
    return d >= 2 && d <= 4 && x >= 1 && x <= 5 && x - d >= -1 && x - d <= 2 ? '=' : '.'; },   // the tail
  tubes: ({u, d}) => d === 2 || d === 4 ? (mod(u, 8) === 0 ? '.' : '#') : d === 3 ? (mod(u, 2) ? '>' : '.') : '.',
  nebula: ({u, d, c, r}) => { if (d < 2 || d > 5) return '.';
    const cloud = Math.sin(u * 0.7 + d * 1.3) + Math.sin(u * 0.31 - d * 0.9) > 0.6;
    return cloud ? (hash(c, r) < 0.15 ? '>' : '=') : '.'; },
  belt: ({u, d}) => d === 1 ? (mod(u, 4) === 0 ? '>' : '=') : d === 3 && mod(u, 4) === 2 ? '^' : d === 4 && mod(u, 4) === 0 ? '^' : '.'
};
// Short stretches (the wiggles and dips) take the belt; the others take the figures in turn.
const CYCLE = ['constellation', 'comet', 'tubes', 'nebula', 'comet', 'constellation', 'nebula', 'tubes'];
let turn = 0;
const theme = stretchLength.map(n => (n <= 3 ? 'belt' : CYCLE[turn++ % CYCLE.length]));
const WORKS = 5;                              // the figures reach five cells out; the planets lie beyond
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d === 0 || q.d > WORKS) continue;
  const ch = M[theme[q.s]](q);
  if (ch !== '.') g.set(T, c, r, ch);
}

// ---- the planets: a globe of slow pads of radius R - 1 round a boost core, a ring of wall at R + 1
// with a gap every fourth cell, spike moons on ring R + 2. Big worlds first, where the space is widest.
const planets = [];
const cand = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cand.push([c, r, local(c, r).d]);
cand.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
for (const [c, r, d] of cand) {
  const R = d >= 8 ? 3 : d >= 7 ? 2 : 0;
  if (!R) break;
  if (planets.some(s => { const [dx, dy] = delta(s.at, [c, r]); return Math.hypot(dx, dy) < s.R + R + 5; })) continue;
  planets.push({at: [c, r], R});
}
function deco(c, r, ch) { if (local(c, r).d >= 3) g.set(T, c, r, ch); }
planets.forEach(({at, R}, n) => {
  for (let k = 0; k < R; k++) for (const p of g.ring(...at, k)) deco(...p, k === 0 ? '>' : '=');
  for (const p of g.ring(...at, R)) deco(...p, '.');
  g.ring(...at, R + 1).forEach((p, k) => deco(...p, mod(k + n, 4) === 0 ? '.' : '#'));
  g.ring(...at, R + 2).forEach((p, k) => deco(...p, mod(k, R + 3) === n % (R + 3) ? '^' : '.'));
});
// Far stars over the rest of the sky: a scatter of boost pads.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (local(c, r).d > WORKS && g.get(T, c, r) === '.' && hash(c, r) < 0.05) g.set(T, c, r, '>');

// ---- three clear cells straight on past every corner, and nothing sharp next to the road.
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.step(...p, route.heading(k));
    if (!route.has(...p) && /[#^]/.test(g.get(T, ...p))) g.set(T, ...p, '.');
    for (const m of dirs) { const q = g.step(...p, m); if (!route.has(...q) && /[#^]/.test(g.get(T, ...q))) g.set(T, ...q, '.'); }
  }
}
for (const [c, r] of route.cells) for (const m of dirs) {
  const p = g.step(c, r, m);
  if (/[#^]/.test(g.get(T, ...p))) throw new Error(`hazard beside the road at ${p}`);
}

// ---- stages. Every bend is taken inside a chain that begins up to six cells before it; where the next
// bend follows within four cells it gets a short chain of its own. The straights between take a
// crystal, a trail of crystals or a straight chain in turn; on the belt each is followed by two free
// cells for the '>=' tick of the road.
const stages = [], ticks = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const gap = i => (theme[segment[i % L]] === 'belt' || theme[segment[i % L]] === 'tubes' ? 3 : 2);
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  bends.forEach((k, n) => {
    if (k + 2 > end) return;
    const pre = n % 2 ? 3 : 6;            // long and short corner chains in turn
    while (k - pre - pos >= 2) {
      const room = k - pre - pos;
      let to;
      if (room >= 9 && kind % 3 === 1) { stages.push([['chain', pos, pos + 7]]); to = pos + 7; }
      else if (room >= 6 && kind % 3 === 2) { stages.push([['gems', pos, pos + 2, pos + 4]]); to = pos + 4; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      if (gap(to) === 3) ticks.push(to + 1);
      pos = to + gap(to);
    }
    const tight = bends[n + 1] !== undefined && bends[n + 1] - k <= 4;
    const to = tight || k - pos < 3 ? k + 1 : k + 2;
    // Two groups in one stage, as in the classic levels: a crystal on the straight, the chain round the bend.
    if (k - pos >= 3 && n % 3 !== 2) stages.push([['gem', pos], ['chain', pos + 2, to]]);
    else stages.push([['chain', Math.min(pos, k - 1), to]]);
    pos = to + 2;
  });
  while (end - pos >= 9) { stages.push([['gems', pos, pos + 3, pos + 6]]); pos += 8; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);
// The ticks: a boost pad and a slow pad on the road after a stage.
for (const i of ticks) {
  const a = route.at(i), b = route.at(i + 1);
  if (g.get(T, ...a) === '.' && g.get(T, ...b) === '.') { g.set(T, ...a, '>'); g.set(T, ...b, '='); }
}

// ---- colours: a violet night sky, the road a milky way of magenta and pink, each figure on its own
// pair, the planets in caramel and rose.
const floors = {
  constellation: ['#6600cc', '#ff00ff'], comet: ['#b41e46', '#ff0066'], tubes: ['#993300', '#ff5a28'],
  nebula: ['#ff0088', '#ff44aa'], belt: ['#6600cc', '#b41e46']
};
const planetAt = new Map();
planets.forEach(({at, R}) => { for (const p of g.disk(...at, R + 2)) planetAt.set(key(...p), R); });
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.u, 4) < 2 ? '#ff00ff' : '#ff0088';
  if (planetAt.has(key(c, r)) && q.d >= 3) return mod(q.d, 2) ? '#ff3300' : '#b41e46';
  if (q.d > WORKS) return mod(q.d, 3) ? '#6600cc' : '#b41e46';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#ff0088', 'r']]};
module.exports = {key: 'observatory', name: 'Level 20', kind: 'Observatory', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\nplanets:', planets.map(s => `${s.at}r${s.R}`).join(' '), '\nthemes:', theme.join(' '));
