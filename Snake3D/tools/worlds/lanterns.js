// Level 16 "Lanterns": the easy world of the three after Prism, a lantern festival at night. An endless
// plane (the 48 x 48 tile repeats) with no holes, so the snake never leaves the top face. The road is a
// lit path of long straights and ten wide bends, climbing the tile once. Almost everything that glows
// beside it is made of boost and slow pads, which only change the speed of a snake that strays onto them.
// Each straight has its own trim along the road:
//   - garlands: a wire of slow pads three cells out, paper lanterns of boost pads hanging from it;
//   - lamps: a row of lamp posts two cells out;
//   - awnings: a striped awning of slow and boost pads;
//   - ribbons: slanted ribbons of slow pads;
// and the open spaces between the straights hold whole pictures, each one in the next free place:
//   - fireworks: eight boost-pad spokes round a wall, spike sparks at the tips;
//   - koi ponds: ovals of slow pads with two boost-pad fish;
//   - moons: crescents of boost pads;
//   - paper lanterns: a body of boost pads between wall caps, a slow-pad tassel.
// It is the gentlest of the new worlds: nothing sharp stands nearer than four cells to the road, the
// chains are short, crystals mark every straight, and the road carries no pads. Past every corner three
// cells straight on stay clear.
const {Grid} = require('../grid');
const W = 48, H = 48, T = 'top';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 46];
const runs = 'N14 E17 N10 W9 N12 E22 S12 E7 N24 W37';
const route = g.route(start, runs);
const L = route.length;
const V = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};
const wrap = (c, r) => [((c % W) + W) % W, ((r % H) + H) % H];
const key = (c, r) => `${c},${r}`;
const mod = (a, n) => ((a % n) + n) % n;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

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

// Past every corner three cells straight on stay clear, with the cells round them.
const runout = new Set();
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.move(...p, route.heading(k));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) runout.add(key(...wrap(p[0] + dx, p[1] + dy)));
  }
}

// ---- the trim along each straight, two to four cells out: pads only.
const TRIM = {
  garlands: ({u, d}) => d === 3 ? '=' : d === 4 && (mod(u, 6) === 2 || mod(u, 6) === 3) ? '>' : '.',
  lamps: ({u, d}) => d === 2 && mod(u, 4) === 0 ? '>' : d === 3 && mod(u, 4) === 0 ? '=' : '.',
  awnings: ({u, d}) => d === 3 || d === 4 ? (mod(u, 4) < 2 ? '=' : '>') : '.',
  ribbons: ({u, d}) => d >= 2 && d <= 4 && mod(u - d, 5) === 0 ? '=' : '.'
};
// Stretch by stretch: N14 E17 N10 W9 N12 E22 S12 E7 N24 W37.
const theme = ['garlands', 'lamps', 'awnings', 'ribbons', 'garlands', 'awnings', 'lamps', 'ribbons', 'garlands', 'lamps'];
if (theme.length !== corners.length) throw new Error(`${corners.length} stretches, ${theme.length} themes`);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d < 2 || q.d > 4 || runout.has(key(c, r))) continue;
  const ch = TRIM[theme[q.s]](q);
  if (ch !== '.') g.set(T, c, r, ch);
}

// ---- the pictures, in world cells: x east and y north of the centre, as g.shape draws them. Each one
// takes the free place farthest from the road, in turn, and every cell of it stays four cells off the road.
const PICTURES = [
  {name: 'firework', R: 4, at: (x, y) => { const q = Math.max(Math.abs(x), Math.abs(y));
    if (q === 0) return '#';
    return q <= 4 && (x === 0 || y === 0 || Math.abs(x) === Math.abs(y)) ? (q === 4 ? '^' : '>') : null; }},
  {name: 'koi', R: 5, at: (x, y) => { const e = (x / 4.6) ** 2 + (y / 2.8) ** 2;
    return e >= 0.72 && e <= 1.25 ? '=' : (x === -2 && y === 0) || (x === 2 && y === 1) ? '>' : null; }},
  {name: 'moon', R: 4, at: (x, y) => Math.hypot(x, y) <= 3.4 && Math.hypot(x - 1.7, y - 0.8) > 2.7 ? '>' : null},
  {name: 'lantern', R: 5, at: (x, y) => {
    if (y === 4 && Math.abs(x) <= 1) return '#';                 // the cap
    if (y === -4 && Math.abs(x) <= 1) return '#';                // the base
    if (Math.abs(y) <= 3 && (x / 2.6) ** 2 + (y / 3.6) ** 2 <= 1) return '>';   // the glowing body
    return x === 0 && y === -5 ? '=' : null; }}                 // the tassel
];
const placed = [];
const free = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) free.push([c, r, local(c, r).d]);
free.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
const apart = (a, b) => { let dx = Math.abs(a[0] - b[0]), dy = Math.abs(a[1] - b[1]); dx = Math.min(dx, W - dx); dy = Math.min(dy, H - dy); return Math.max(dx, dy); };
for (const [c, r, d] of free) {
  if (d < 6) break;
  const pic = PICTURES[placed.length % PICTURES.length];
  if (placed.some(p => apart(p.at, [c, r]) < p.pic.R + pic.R + 2)) continue;
  const cells = g.shape(c, r, pic.R + 1, (x, y) => pic.at(Math.round(x), Math.round(y)) !== null);
  if (cells.some(q => local(...q).d < 4)) continue;
  for (const q of g.shape(c, r, pic.R + 1, () => true)) {
    const [x, y] = [q[0] - c, r - q[1]].map((v, k) => { const n = k ? H : W; return v > n / 2 ? v - n : v < -n / 2 ? v + n : v; });
    const ch = pic.at(x, y + 0);
    if (ch) g.set(T, ...q, ch);
  }
  placed.push({pic, at: [c, r]});
}
// Stars over the rest of the night: a scatter of boost pads.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (local(c, r).d >= 6 && g.get(T, c, r) === '.' && hash(c, r) < 0.05) g.set(T, c, r, '>');

for (const [c, r] of route.cells) for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++)
  if (/[#^]/.test(g.get(T, ...wrap(c + dx, r + dy)))) throw new Error(`an obstacle at ${wrap(c + dx, r + dy)} stands within three cells of the road`);

// ---- stages, the easy way: every bend is taken inside a short chain that begins three cells before it;
// the straights between hold a crystal, a trail of three crystals or a five-cell chain in turn.
const stages = [];
{
  const end = L + 8;                               // the last stage ends here, within three cells of stage 1 (at 11)
  let pos = 11, kind = 0;
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  bends.forEach((k, n) => {
    if (k + 2 > end) return;
    while (k - 3 - pos >= 2) {
      const room = k - 3 - pos;
      let to;
      if (room >= 7 && kind % 3 === 1) { stages.push([['chain', pos, pos + 4]]); to = pos + 4; }
      else if (room >= 6 && kind % 3 === 2) { stages.push([['gems', pos, pos + 2, pos + 4]]); to = pos + 4; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      pos = to + 2;
    }
    const to = bends[n + 1] !== undefined && bends[n + 1] - k <= 4 ? k + 1 : k + 2;
    stages.push([['chain', Math.max(pos, k - 3), to]]);
    pos = to + 2;
  });
  while (end - pos >= 7) { stages.push([['gems', pos, pos + 2, pos + 4]]); pos += 6; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);

// ---- colours: a lantern-lit path of sand and caramel through a violet night; each stretch has its own
// pair near the road (the band next to it and every third ring out), the night far off is indigo with a
// rose glow under every picture.
const floors = {
  garlands: ['#b41e46', '#ff0066'], lamps: ['#993300', '#ff3300'], awnings: ['#ff0088', '#ff44aa'], ribbons: ['#6600cc', '#ff00ff']
};
const glow = new Set();
for (const {pic, at} of placed) for (const q of g.shape(...at, pic.R, (x, y) => Math.hypot(x, y) <= pic.R + 0.5)) if (local(...q).d >= 3) glow.add(key(...q));
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300';
  if (glow.has(key(c, r))) return '#b41e46';
  if (q.d >= 6) return '#6600cc';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#ff0066', 'r']]};
module.exports = {key: 'lanterns', name: 'Level 16', kind: 'Lanterns', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\npictures:', placed.map(p => p.pic.name + '@' + p.at).join(' '));
