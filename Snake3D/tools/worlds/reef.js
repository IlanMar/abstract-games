// Level 19 "Reef": the easy world of the three after Tightrope, a coral reef. An endless plane (the 64 x 64
// tile repeats) with no holes, so the snake never leaves the top face. The road is a sandy trail that
// snakes through the whole tile: it climbs one quarter of it, crosses over, goes down the next, and so on
// four times, every long run with a small jog aside, so that one lap takes the snake past every part of
// the reef. Almost everything that grows beside it is made of boost and slow pads, which only change the
// speed of a snake that strays onto them. Each stretch has its own trim along the road:
//   - kelp: fronds of slow pads waving two to four cells out;
//   - bubbles: strings of boost-pad bubbles rising beside the road;
//   - coral: a fence of slow and boost pads, three and four cells out;
//   - ripples: slanted ripples of slow pads in the sand;
// and the open spaces between the runs hold whole pictures, each one in the next free place:
//   - fish: a body of boost pads, a tail of slow pads, a wall for the eye;
//   - jellyfish: a dome of slow pads over boost-pad tentacles;
//   - starfish: five arms of boost pads round a spike;
//   - scallops: a fan of slow-pad ribs with a rim of boost pads.
// Nothing sharp stands nearer than four cells to the road, the chains are short, crystals mark every
// straight, and the road carries no pads. Past every corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 64, H = 64, T = 'top';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 56];
// Four runs 16 columns apart (up, down, up, down), joined along lines 8 and 56; the last crossing wraps
// round the east edge into the start. Each run jogs five cells aside once, never towards a jog of its
// neighbour.
const runs = 'N18 E5 N16 W5 N14 E16 S34 W5 S8 E5 S6 E16 N12 W5 N20 E5 N16 E16 S20 W5 S16 E5 S12 E16';
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

// ---- the trim along each stretch, two to four cells out: pads only.
const TRIM = {
  kelp: ({u, d}) => d === 2 + Math.abs(mod(u, 6) - 3) % 3 && mod(u, 3) !== 0 ? '=' : '.',
  bubbles: ({u, d}) => (d === 2 && mod(u, 5) === 0) || (d === 3 && mod(u, 5) === 2) || (d === 4 && mod(u, 5) === 4) ? '>' : '.',
  coral: ({u, d}) => d === 3 ? (mod(u, 3) === 0 ? '>' : '=') : d === 4 && mod(u, 3) === 1 ? '=' : '.',
  ripples: ({u, d}) => d >= 2 && d <= 4 && mod(u + d, 4) === 0 ? '=' : '.'
};
// Stretch by stretch: N18 E5 N16 W5 N14 | E16 | S34 W5 S8 E5 S6 | E16 | N12 W5 N20 E5 N16 | E16 |
// S20 W5 S16 E5 S12 | E16 (into the start).
const theme = ['kelp', 'bubbles', 'coral', 'bubbles', 'ripples', 'bubbles', 'kelp', 'ripples', 'coral', 'ripples', 'bubbles',
  'ripples', 'coral', 'kelp', 'bubbles', 'kelp', 'ripples', 'bubbles', 'kelp', 'coral', 'ripples', 'coral', 'bubbles', 'coral'];
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
  {name: 'fish', R: 5, at: (x, y) => {
    if (x === 2 && y === 1) return '#';                                            // the eye
    if ((x / 3.4) ** 2 + (y / 2.2) ** 2 <= 1) return '>';                          // the body
    return x <= -3 && x >= -5 && Math.abs(y) <= -2 - x ? '=' : null; }},           // the tail
  {name: 'jellyfish', R: 5, at: (x, y) => {
    if (y >= 0 && Math.hypot(x, y) <= 3.6) return y === 0 ? '>' : '=';            // the dome, its rim aglow
    return y < 0 && y >= -4 && (x === -2 || x === 0 || x === 2) && mod(y + x / 2, 2) === 1 ? '>' : null; }},   // the tentacles
  {name: 'starfish', R: 4, at: (x, y) => {
    if (x === 0 && y === 0) return '^';
    const a = Math.atan2(y, x), rr = Math.hypot(x, y), k = Math.round((a - Math.PI / 2) / (2 * Math.PI / 5));
    const off = Math.abs(a - Math.PI / 2 - k * 2 * Math.PI / 5);
    return rr <= 4.2 && off * rr <= 0.9 + (4.2 - rr) * 0.25 ? '>' : null; }},
  {name: 'scallop', R: 4, at: (x, y) => {
    const rr = Math.hypot(x, y + 2);
    if (y < -2 || rr > 5.2) return null;
    if (rr > 4.3) return '>';                                                       // the rim
    return mod(Math.round(Math.atan2(y + 2, x) / (Math.PI / 7)), 2) === 0 && rr > 1 ? '=' : null; }}   // the ribs
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
    const ch = pic.at(x, y);
    if (ch) g.set(T, ...q, ch);
  }
  placed.push({pic, at: [c, r]});
}
// Plankton over the rest of the reef: a scatter of boost pads.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (local(c, r).d >= 6 && g.get(T, c, r) === '.' && hash(c, r) < 0.04) g.set(T, c, r, '>');

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

// ---- colours: a trail of pale sand through pink and violet coral; each stretch has its own pair near
// the road (the band next to it and every third ring out), the deep reef far off is violet and wine in
// slow swells, with a raspberry glow under every picture.
const floors = {
  kelp: ['#6600cc', '#ff00ff'], bubbles: ['#ff0088', '#ff44aa'], coral: ['#b41e46', '#ff0066'], ripples: ['#ff00ff', '#ff99cc']
};
const glow = new Set();
for (const {pic, at} of placed) for (const q of g.shape(...at, pic.R, (x, y) => Math.hypot(x, y) <= pic.R + 0.5)) if (local(...q).d >= 3) glow.add(key(...q));
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff5a28' : '#ff3300';
  if (glow.has(key(c, r))) return '#ff0066';
  if (q.d >= 6) return mod(q.d, 4) < 2 ? '#6600cc' : '#b41e46';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#6600cc', '#ff0088', 'r']]};
module.exports = {key: 'reef', name: 'Level 19', kind: 'Reef', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print(), '\npictures:', placed.map(p => p.pic.name + '@' + p.at).join(' '));
