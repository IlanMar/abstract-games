// Level 17 "Clockwork": the middle world of the three after Prism, the inside of a clock. A one-sided hex
// world, an endless plane (the 48 x 52 tile repeats) with no holes. The road winds through the works in
// fourteen runs, both ways round, and on the gear-train stretches it ticks: between the stages the road
// itself carries '>=' gates, a kick and a brake, as the '=>=' gates of Vents. Beside the road:
//   - escapement: a lane of slow pads with a boost pad every four cells, spike pallets behind (Shielded);
//   - ratchet: a sawtooth of spikes leaning along the road (Twisted);
//   - springs: coils of slow pads with a wall at every turn (Wave);
//   - chain drive: two rails of wall with boost-pad links between them (Queue);
//   - pinions: small cogs of wall round a boost-pad axle;
// and in the open spaces the great gears: a rim of wall round a slow-pad hub and a boost axle, spike
// teeth on the ring outside, each wheel in the next free place (Honeycomb's rings, grown into cogs).
// The chains run long through the bends as in the classic levels. No wall or spike stands next to the
// road, and past every corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 48, H = 52, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 48];
const route = g.route(start, 'N12 NE8 SE6 NE6 N10 NW6 N8 NE8 SE4 NE6 N12 NW7 SW18 NW7');
const L = route.length;
const dirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const key = (c, r) => `${c},${r}`;
const mod = (n, m) => (n % m + m) % m;

// Stretches (a corner cell ends its stretch) and corners, the corner into the start included (index L).
const segment = [], corners = [];
{ let s = 0; for (let i = 1; i <= L; i++) { segment[i % L] = s; if (route.heading(i + 1) !== route.heading(i)) { corners.push(i); s++; } } }

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

// ---- the works beside the road, one per stretch, as functions of (u, d, v). Only pads come next to it.
const M = {
  escapement: ({u, d}) => d === 1 ? (mod(u, 4) === 0 ? '>' : '=') : d === 3 && mod(u, 4) === 2 ? '^' : d === 4 && mod(u, 4) === 2 ? '#' : '.',
  ratchet: ({u, d}) => d >= 2 && d <= 4 && mod(u - d, 5) === 0 ? '^' : d === 5 && mod(u, 5) === 0 ? '#' : d === 2 && mod(u, 5) === 3 ? '>' : '.',
  springs: ({u, d}) => { const z = 2 + Math.abs(mod(u, 6) - 3);   // a zigzag between d = 2 and 5
    return d === z ? (z === 2 || z === 5 ? '#' : '=') : d === 1 && mod(u, 6) === 3 ? '>' : '.'; },
  chain: ({u, d}) => d === 2 || d === 4 ? (mod(u, 6) === 0 ? '.' : '#') : d === 3 ? (mod(u, 2) ? '>' : '.') : '.',
  pinions: ({u, d}) => { const x = mod(u, 7) - 3, q = Math.max(Math.abs(x), Math.abs(d - 3));
    return q === 0 ? '>' : q === 1 ? (mod(u + d, 2) ? '#' : '^') : d === 1 && mod(u, 7) === 0 ? '=' : '.'; }
};
// Stretch by stretch: N12 NE8 SE6 NE6 N10 NW6 N8 NE8 SE4 NE6 N12 NW7 SW18 NW7.
const theme = ['escapement', 'springs', 'chain', 'ratchet', 'pinions', 'springs', 'escapement', 'chain', 'ratchet',
  'springs', 'escapement', 'pinions', 'chain', 'ratchet'];
if (theme.length !== corners.length) throw new Error(`${corners.length} stretches, ${theme.length} themes`);
const WORKS = 6;                              // the works reach six cells out; the gears lie beyond
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d === 0 || q.d > WORKS) continue;
  const ch = M[theme[q.s]](q);
  if (ch !== '.') g.set(T, c, r, ch);
}

// ---- the great gears: rim of wall at radius R with a gap every third cell, spike teeth on ring R + 1
// every other cell, a slow-pad hub and a boost axle. Big wheels first, where the space is widest.
const gears = [];
const cand = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cand.push([c, r, local(c, r).d]);
cand.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
for (const [c, r, d] of cand) {
  const R = d >= 11 ? 4 : d >= 8 ? 3 : 0;
  if (!R) break;
  if (gears.some(s => { const [dx, dy] = delta(s.at, [c, r]); return Math.hypot(dx, dy) < s.R + R + 3.5; })) continue;
  gears.push({at: [c, r], R});
}
function deco(c, r, ch) { if (local(c, r).d >= 4) g.set(T, c, r, ch); }
gears.forEach(({at, R}, n) => {
  for (let k = 0; k < R; k++) for (const p of g.ring(...at, k)) deco(...p, k === 0 ? '>' : '=');
  g.ring(...at, R).forEach((p, k) => deco(...p, mod(k + n, 3) === 0 ? '.' : '#'));
  g.ring(...at, R + 1).forEach((p, k) => { if (k % 2 === n % 2) deco(...p, '^'); else deco(...p, '.'); });
});

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
// crystal, a trail of crystals or a straight chain in turn; on the gear-train stretches (chain drive and
// escapement) each is followed by two free cells for the '>=' tick of the road.
const TICK = new Set(['chain', 'escapement']);
const stages = [], ticks = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const gap = i => (TICK.has(theme[segment[i % L]]) ? 3 : 2);
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

// ---- colours: brass and copper works, the rose-gold road, chocolate far off with the gears on caramel.
const floors = {
  escapement: ['#ff5a28', '#ff3300'], ratchet: ['#993300', '#ff5a28'], springs: ['#ff3300', '#ff0066'],
  chain: ['#b41e46', '#ff5a28'], pinions: ['#ff0066', '#ff3300']
};
const gearAt = new Map();
gears.forEach(({at, R}) => { for (const p of g.disk(...at, R + 1)) gearAt.set(key(...p), R); });
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.u, 4) < 2 ? '#ff00ff' : '#ff0088';
  if (gearAt.has(key(c, r)) && q.d >= 4) return '#ff3300';
  if (q.d > WORKS) return mod(q.d, 3) ? '#993300' : '#b41e46';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#993300', '#ff5a28', 'r']]};
module.exports = {key: 'clockwork', name: 'Level 17', kind: 'Clockwork', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\ngears:', gears.map(s => `${s.at}r${s.R}`).join(' '));
