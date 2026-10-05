// Level 22 "Origami": the easy world of the four after Aqueduct, a sheet of folded paper. A one-sided hex
// world, an endless plane (the 48 x 48 tile repeats) with no holes, so the snake never leaves the top face.
// The road climbs the tile three times, each pass a third of the width further east, leaning north-east
// and north-west and dipping south-east once on the second and third passes. Beside it the paper is
// folded, one trim per stretch, all of pads that only change the speed of a snake that strays onto them:
//   - pleats: a zigzag of slow pads swinging two to four cells out;
//   - creases: a dashed line of boost pads three cells out;
//   - confetti: a scatter of boost and slow pads;
//   - ribbons: a slow-pad hem two cells out and a boost-pad hem four cells out;
// and the open paper between the passes holds whole folded figures, each one in the next free place:
//   - crane: wings of slow pads, a boost-pad body, a wall for the beak;
//   - boat: a slow-pad hull under a boost-pad sail, a spike on the mast;
//   - fan: slow-pad ribs spreading from a wall pin, a boost-pad rim;
//   - pinwheel: four slanted blades of boost and slow pads round a spike.
// Nothing sharp stands nearer than four cells to the road, the chains are short, every straight has a
// crystal, and past every corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 48, H = 48, T = 'top';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 44];
// Three passes, each 48 rows north and 16 columns east; neighbouring passes stay six cells or more apart.
const route = g.route(start, 'N12 NE6 N9 NW2 N8 NE6 N9'
  + ' NE6 N8 NW3 N10 NE4 N6 NE2 SE3 NE2 N9'
  + ' NE5 N6 NE4 N8 NW4 N12 NE6 N7 NE3 SE3 NE3 N13 NE4');
const L = route.length;
const dirs = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const key = (c, r) => `${c},${r}`;
const mod = (n, m) => (n % m + m) % m;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

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
  return {d, u: i, v: hx * oy - hy * ox < 0 ? 1 : -1, s: segment[i], c, r};
}

// Past every corner three cells straight on stay clear, with the cells round them.
const runout = new Set();
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.step(...p, route.heading(k));
    runout.add(key(...p));
    for (const m of dirs) runout.add(key(...g.step(...p, m)));
  }
}

// ---- the folds along each stretch, two to four cells out: pads only.
const TRIM = {
  pleats: ({u, d}) => d === 2 + Math.abs(mod(u, 4) - 2) ? '=' : '.',
  creases: ({u, d}) => d === 3 && mod(u, 3) !== 0 ? '>' : '.',
  confetti: ({d, c, r}) => { const x = hash(c, r); return d < 2 || d > 4 ? '.' : x < 0.12 ? '>' : x < 0.24 ? '=' : '.'; },
  ribbons: ({u, d}) => d === 2 ? '=' : d === 4 && mod(u, 2) === 0 ? '>' : '.'
};
const CYCLE = ['pleats', 'creases', 'ribbons', 'confetti', 'creases', 'pleats', 'confetti', 'ribbons'];
const theme = corners.map((_, s) => CYCLE[s % CYCLE.length]);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d < 2 || q.d > 4 || runout.has(key(c, r))) continue;
  const ch = TRIM[theme[q.s]](q);
  if (ch !== '.') g.set(T, c, r, ch);
}

// ---- the figures, x east and y north of the centre as g.shape draws them. Each one takes the free place
// farthest from the road, in turn, and every cell of it stays four cells off the road.
const FIGURES = [
  {name: 'crane', R: 4, at: (x, y) => {
    if (x === 4 && y === 3) return '#';                                            // the beak
    if (Math.abs(x) + Math.abs(y) <= 1) return '>';                                // the body
    if (x >= 1 && x <= 3 && y === x) return '>';                                   // the neck
    return y >= 0 && y <= 3 && Math.abs(x) >= 1 && Math.abs(x) <= 4 && y <= Math.abs(x) - 1 && y >= Math.abs(x) - 2 ? '=' : null; }},   // the wings
  {name: 'boat', R: 4, at: (x, y) => {
    if (y <= -1 && y >= -2 && Math.abs(x) <= 5 + y) return '=';                    // the hull
    if (x === 0 && y === 4) return '^';                                            // the mast top
    return y >= 0 && y <= 3 && x >= 0 && x <= 3 - y ? '>' : null; }},              // the sail
  {name: 'fan', R: 4, at: (x, y) => {
    const rr = Math.hypot(x, y + 2);
    if (x === 0 && y === -2) return '#';                                           // the pin
    if (y < -2 || rr > 4.6) return null;
    if (rr > 3.7) return '>';                                                      // the rim
    return mod(Math.round(Math.atan2(y + 2, x) / (Math.PI / 6)), 2) === 0 ? '=' : null; }},   // the ribs
  {name: 'pinwheel', R: 3, at: (x, y) => {
    if (x === 0 && y === 0) return '^';
    const a = Math.atan2(y, x), rr = Math.hypot(x, y);
    if (rr > 3.3) return null;
    const blade = mod(a - rr * 0.35, Math.PI / 2);
    return blade < 0.55 ? '>' : blade < 0.95 ? '=' : null; }}
];
const placed = [];
const free = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) free.push([c, r, local(c, r).d]);
free.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
for (const [c, r, d] of free) {
  if (d < 7) break;
  const fig = FIGURES[placed.length % FIGURES.length];
  if (placed.some(p => Math.hypot(...delta(p.at, [c, r])) < p.fig.R + fig.R + 2)) continue;
  const cells = g.shape(c, r, fig.R + 1, (x, y) => fig.at(Math.round(x), Math.round(y)) !== null);
  if (cells.some(q => local(...q).d < 4)) continue;
  for (const q of cells) {
    let dc = q[0] - c; if (dc > W / 2) dc -= W; if (dc < -W / 2) dc += W;
    let dr = q[1] - r; if (dr > H / 2) dr -= H; if (dr < -H / 2) dr += H;
    const y = -(dr + ((mod(c + dc, 2)) - mod(c, 2)) / 2);
    g.set(T, ...q, fig.at(Math.round(dc), Math.round(y)));
  }
  placed.push({fig, at: [c, r]});
}
// Paper grain over the rest of the sheet: a scatter of slow pads.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (local(c, r).d >= 6 && g.get(T, c, r) === '.' && hash(c, r) < 0.04) g.set(T, c, r, '=');

for (const [c, r] of route.cells) for (const p of g.disk(c, r, 3))
  if (/[#^]/.test(g.get(T, ...p))) throw new Error(`an obstacle at ${p} stands within three cells of the road`);

// ---- stages, the easy way: every bend is taken inside a short chain that begins three cells before it
// (close bends share one chain);
// the straights between hold a crystal, a trail of three crystals or a five-cell chain in turn.
const stages = [];
{
  const end = L + 8;                               // the last stage ends here, within three cells of stage 1 (at 11)
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  for (let n = 0; n < bends.length; n++) {
    const k = bends[n];
    if (k + 2 > end) break;
    while (k - 3 - pos >= 2) {
      const room = k - 3 - pos;
      let to;
      if (room >= 7 && kind % 3 === 1) { stages.push([['chain', pos, pos + 4]]); to = pos + 4; }
      else if (room >= 6 && kind % 3 === 2) { stages.push([['gems', pos, pos + 2, pos + 4]]); to = pos + 4; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      pos = to + 2;
    }
    // Bends closer than five cells (the wiggles and the dips) are taken by one chain round all of them.
    let last = n;
    while (bends[last + 1] !== undefined && bends[last + 1] - bends[last] <= 4 && bends[last + 1] + 2 <= end) last++;
    const to = bends[last + 1] !== undefined && bends[last + 1] - bends[last] <= 6 ? bends[last] + 1 : bends[last] + 2;
    stages.push([['chain', Math.max(pos, k - 3), to]]);
    pos = to + 2;
    n = last;
  }
  while (end - pos >= 7) { stages.push([['gems', pos, pos + 2, pos + 4]]); pos += 6; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);

// ---- colours: a road of folded caramel paper across violet and pink sheets, each fold on its own pair
// (the band beside the road and every third ring out), the open sheet in wide stripes of violet and
// wine, a raspberry glow under every figure.
const floors = {
  pleats: ['#ff00ff', '#ff44aa'], creases: ['#6600cc', '#ff00ff'], confetti: ['#ff0088', '#ff99cc'], ribbons: ['#b41e46', '#ff0066']
};
const glow = new Set();
for (const {fig, at} of placed) for (const q of g.disk(...at, fig.R + 1)) if (local(...q).d >= 3) glow.add(key(...q));
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.u, 4) < 2 ? '#ff5a28' : '#ff3300';
  if (glow.has(key(c, r))) return '#ff0066';
  if (q.d >= 6) return mod(c + r, 8) < 4 ? '#6600cc' : '#b41e46';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#ff0088', 'r']]};
module.exports = {key: 'origami', name: 'Level 22', kind: 'Origami', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\nfigures:', placed.map(p => p.fig.name + '@' + p.at).join(' '));
