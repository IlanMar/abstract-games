// Level 15 "Prism": a bright one-sided hex world after the hex levels of the classic set (Shielded,
// Honeycomb, Twisted, Wave, Framed, Paperclip). An endless plane (the 48 x 60 tile repeats) with no holes,
// so the snake never leaves the top face. The road climbs the tile three times, each pass a third of the
// width further east, so that one lap crosses the whole tile; it heads north, north-east, south-east and
// north-west in forty runs, turning both ways, with two wiggles north (N3 NW3 N3 NE3 N3) where every bend
// has a short chain of its own. Every stretch borrows a figure from the classic hex levels:
//   - shields: a lane of slow pads beside the road with boost gates every five cells, and wall hooks
//     behind it (Shielded, where the chains run inside '=' shields);
//   - frames: rectangles of wall with spike corners, open to the road (Framed);
//   - paperclips: loops of slow pads round a spike (Paperclip);
//   - twists: arms of spikes curling away from the road (Twisted);
//   - waves: ribbons of slow pads with boost beads (Wave);
//   - diamonds of spikes round a boost pad; a snake road: a boost lane between two wall lanes (Snake Road);
// and in the open spaces far from the road, the hex cells of Honeycomb: rings of wall with a gap and a
// boost pad in the middle. As in the classic levels the chains are long, and each bend is taken inside
// one. No wall or spike stands next to the road, and past every corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 48, H = 60, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 56];
// Three passes, each 60 rows north and 16 columns east: they run side by side and never meet.
const route = g.route(start, 'N14 NE8 N6 NW4 N4 NE10 SE6 NE4 N3 NW3 N3 NE3 N3 NW8 N18'
  + ' NE6 N10 NE3 SE4 NE3 N12 NW4 N8 NE10 N4 NW6 N14'
  + ' NE6 N6 NE8 N6 NW4 N6 NE3 N3 NW3 N3 NE3 N11 NE3');
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

// ---- the figures, one per stretch, as functions of (u, d, v). Only speed pads come next to the road.
const M = {
  shields: ({u, d}) => d === 1 ? (mod(u, 5) === 0 ? '>' : '=') : d === 3 && mod(u, 6) < 3 ? '#' : d === 4 && mod(u, 6) === 2 ? '#'
    : d >= 5 && mod(u + d, 4) === 0 ? '^' : '.',
  frames: ({u, d}) => { const x = mod(u, 8);
    if (d >= 2 && d <= 5 && x >= 1 && x <= 6) {
      const ex = x === 1 || x === 6, ed = d === 5;
      if (ex && (d === 2 || ed)) return '^';
      if (ex || ed) return '#';
      return d === 3 && (x === 3 || x === 4) ? '>' : '.';
    }
    return d >= 7 && mod(u + d, 5) === 0 ? '^' : '.'; },
  paperclips: ({u, d}) => { const x = mod(u, 7);
    if (d >= 2 && d <= 5 && x <= 4) { const edge = x === 0 || x === 4 || d === 2 || d === 5; return edge ? '=' : (x === 2 && (d === 3 || d === 4) ? '^' : '.'); }
    return d >= 7 && mod(u - d, 4) === 0 ? '#' : '.'; },
  twists: ({u, d, v}) => d >= 2 && mod(u + v * 2 * d, 7) === 0 ? '^' : d >= 5 && mod(u + v * 2 * d, 7) === 3 ? '#' : '.',
  waves: ({u, d}) => d < 2 ? '.' : mod(u - d, 5) === 0 ? (mod(u - d, 10) === 5 ? '>' : '=') : d >= 4 && mod(u + d, 10) === 0 ? '^' : '.',
  diamonds: ({u, d}) => { const q = Math.abs(mod(u, 6) - 3) + Math.abs(d - 4); return q === 0 ? '>' : q === 2 ? '^' : d >= 8 && mod(u, 3) === 0 ? '#' : '.'; },
  snakeroad: ({u, d}) => d === 2 ? (mod(u, 7) === 0 ? '.' : '#') : d === 3 ? '>' : d === 4 ? (mod(u + 3, 7) === 0 ? '.' : '#') : d >= 6 && mod(u - d, 3) === 0 ? '^' : '.'
};
// Stretch by stretch, pass by pass (the wiggles take the shields).
const theme = [
  'shields', 'frames', 'twists', 'paperclips', 'waves', 'snakeroad', 'diamonds', 'frames',       // N14 .. NE4
  'shields', 'shields', 'shields', 'shields', 'shields', 'twists', 'paperclips',                 // wiggle, NW8 N18
  'waves', 'diamonds', 'frames', 'twists', 'paperclips', 'shields', 'waves', 'diamonds', 'snakeroad', 'frames', 'twists', 'waves',
  'paperclips', 'waves', 'frames', 'snakeroad', 'twists', 'paperclips',                          // NE6 .. N6
  'shields', 'shields', 'shields', 'shields', 'frames', 'waves', 'diamonds'];                   // wiggle, NE3 N11 NE3
if (theme.length !== corners.length) throw new Error(`${corners.length} stretches, ${theme.length} themes`);
const COMB_FROM = 8;                          // the open spaces far from the road take the honeycomb
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d === 0 || q.d >= COMB_FROM) continue;
  const ch = M[theme[q.s]](q);
  if (ch !== '.') g.set(T, c, r, ch);
}

// ---- the honeycomb (Honeycomb): hex rings of wall of radius 2 with a gap turning round from cell to
// cell, a boost pad in the middle and spikes on the ring beyond, at centres at least 7 apart.
const far = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (local(c, r).d >= COMB_FROM + 2) far.push([c, r]);
const combs = [];
for (const p of far.sort((a, b) => local(...b).d - local(...a).d || a[0] - b[0] || a[1] - b[1])) {
  if (combs.some(s => { const [dx, dy] = delta(s, p); return Math.hypot(dx, dy) < 7; })) continue;
  combs.push(p);
}
function deco(c, r, ch) { if (local(c, r).d >= 4) g.set(T, c, r, ch); }
combs.forEach((ctr, n) => {
  deco(...ctr, '>');
  g.ring(...ctr, 2).forEach((p, k) => { if (k !== (2 * n) % 12 && k !== (2 * n + 1) % 12) deco(...p, '#'); });
  g.ring(...ctr, 3).forEach((p, k) => { if (k % 3 === n % 3) deco(...p, '^'); });
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
// bend follows within four cells (the wiggle) each bend gets a short chain of its own. The straights
// between take a crystal, a trail of crystals or a straight chain in turn.
const stages = [];
{
  const end = L + 8;
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  bends.forEach((k, n) => {
    if (k + 2 > end) return;
    const pre = n % 2 ? 3 : 6;            // long and short corner chains in turn
    while (k - pre - pos >= 2) {
      const room = k - pre - pos;
      if (room >= 8 && kind % 3 === 1) { stages.push([['chain', pos, pos + 6]]); pos += 8; }
      else if (room >= 6 && kind % 3 === 2) { stages.push([['gems', pos, pos + 2, pos + 4]]); pos += 6; }
      else { stages.push([['gem', pos]]); pos += 2; }
      kind++;
    }
    const tight = bends[n + 1] !== undefined && bends[n + 1] - k <= 4;
    const to = tight || k - pos < 3 ? k + 1 : k + 2;
    // Two groups in one stage, as in the classic levels: a crystal on the straight, the chain round the bend.
    if (k - pos >= 2 && n % 3 !== 2) stages.push([['gem', pos], ['chain', pos + 2, to]]);
    else stages.push([['chain', Math.min(pos, k - 1), to]]);
    pos = to + 2;
  });
  while (end - pos >= 9) { stages.push([['gems', pos, pos + 3, pos + 6]]); pos += 8; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);

// ---- a boost rush on the long NE10: pads on the road between the items, a slow pad before the corner chain.
for (const s of [5]) {
  const cells = [];
  for (let i = 1; i <= L; i++) if (segment[i % L] === s) cells.push(i);
  let chainStart = cells[cells.length - 1];
  while (/[a-zà-þα-ω]/.test(g.get(T, ...route.at(chainStart - 1)))) chainStart--;
  for (let i = cells[1]; i < chainStart - 3; i++) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '>');
  for (let i = chainStart - 1; i >= chainStart - 3; i--) if (g.get(T, ...route.at(i)) === '.') { g.set(T, ...route.at(i), '='); break; }
}

// ---- colours: a prism of pinks, violets and oranges, a pair per figure (the band beside the road and
// every third ring out), a tomato and caramel road, the honeycomb in lilac and indigo.
const floors = {
  shields: ['#ff00ff', '#ff44aa'], frames: ['#ff5a28', '#ff3300'], paperclips: ['#ff0088', '#ff99cc'],
  twists: ['#6600cc', '#ff00ff'], waves: ['#ff0066', '#ff5a28'], diamonds: ['#ff44aa', '#6600cc'], snakeroad: ['#993300', '#ff7700']
};
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.u, 4) < 2 ? '#ff1111' : '#ff3300';
  if (q.d >= COMB_FROM) return mod(q.d, 2) ? '#dd88ff' : '#6600cc';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#ff00ff', '#ff5a28', 'r']]};
module.exports = {key: 'prism', name: 'Level 15', kind: 'Prism', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
