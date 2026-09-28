// Level 13 "Foundry": a bright one-sided square world built from the set pieces of the late classic
// levels. An endless plane (the 48 x 48 tile repeats) with no holes, so the snake never leaves the top
// face. The road climbs the tile once in sixteen straights of different lengths, turning both ways, with
// a notch (W S W N W) at the top. Every straight runs past its own piece of the foundry:
//   - runway lights: rows of boost pads and slow pads beside the road (the '>..>' lines of Colour Check);
//   - chambers: rooms of wall with spike corners, a door, and a '=>=>=' rail inside (Colour Check, Chamber);
//   - stairs: ribbons of slow pads climbing away from the road with boost beads (Wave);
//   - octagons of spikes round a boost-pad vent (Vents);
//   - checker rails: slow and boost pads in turn on one side, a boost lane on the other (Colour Check);
//   - vent housings: blocks of wall ringed with slow pads (Vents);
//   - sparks, and pillars with lamps.
// As in the classic levels the chains are long (up to ten cells), and each bend is taken inside one.
// Between stages on the runway and checker stretches the road itself carries a '>=' gate (the '=>='
// gates between the chains of Vents): a kick of speed, then a brake. No wall or spike stands next to the
// road (diagonals included), and past every corner three cells straight on stay clear.
const {Grid} = require('../grid');
const W = 48, H = 48, T = 'top';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [4, 46];
const runs = 'N12 E10 N8 W6 N10 E18 S8 E8 N14 E6 N12 W12 S4 W10 N4 W14';
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

// ---- the set pieces, as functions of (u along, d out, v side). Nothing sharp nearer than d = 2.
const M = {
  runway: ({u, d}) => d === 2 && mod(u, 3) === 0 ? '>' : d === 4 && mod(u, 3) === 0 ? '=' : d === 6 && mod(u, 6) === 0 ? '#'
    : d >= 8 && mod(u + d, 4) === 0 ? '^' : '.',
  chambers: ({u, d}) => {
    const x = mod(u, 9);
    if (d >= 3 && d <= 7 && x >= 1 && x <= 7) {
      const edgeX = x === 1 || x === 7, edgeD = d === 3 || d === 7;
      if (edgeX && edgeD) return '^';
      if (d === 3 && x === 4) return '.';                 // the door
      if (edgeX || edgeD) return '#';
      if (d === 5) return x % 2 ? '>' : '=';              // the rail inside
      return '.';
    }
    return d >= 9 && mod(u + d, 5) === 0 ? '^' : '.';
  },
  stairs: ({u, d}) => d < 2 ? '.' : mod(u - d, 6) < 2 ? (mod(u - d, 12) === 1 && d >= 3 ? '>' : '=') : d >= 4 && mod(u + d, 12) === 6 ? '^' : '.',
  octagons: ({u, d}) => {
    const a = Math.abs(mod(u, 9) - 4), b = Math.abs(d - 6), q = Math.max(a, b) + (Math.min(a, b) >= 2 ? 1 : 0);
    return q === 0 ? '>' : q === 3 ? '^' : d >= 11 && mod(u, 3) === 0 ? '#' : '.';
  },
  checker: ({u, d, v}) => d === 2 ? (v > 0 ? (mod(u, 2) ? '=' : '>') : '>') : d === 4 && mod(u, 4) === 0 ? '#'
    : d >= 6 && mod(u, 2) === 0 && mod(d, 2) === 0 && mod(Math.floor(u / 2) + Math.floor(d / 2), 2) === 0 ? '^' : '.',
  housings: ({u, d}) => {
    const a = mod(u, 6), b = mod(d - 3, 6);
    if (d >= 3 && a >= 1 && a <= 3 && b >= 1 && b <= 3) return a === 2 && b === 2 ? '#' : '=';
    return d === 2 && a === 2 ? '>' : '.';
  },
  sparks: ({d}, c, r) => { const h = hash(c, r); return d < 2 ? '.' : h < 0.08 ? '#' : h < 0.3 ? '^' : h < 0.36 ? '>' : '.'; },
  pillars: ({u, d}) => d >= 2 && mod(u, 4) < 2 && mod(d - 2, 4) < 2 ? '#' : d >= 2 && mod(u, 4) === 3 && mod(d - 2, 4) === 3 ? '>' : '.'
};
// Stretch by stretch: N12 E10 N8 W6 N10 E18 S8 E8 N14 E6 N12 | W12 S4 W10 N4 (the notch) | W14.
const theme = ['runway', 'stairs', 'checker', 'octagons', 'chambers', 'housings', 'sparks', 'checker',
  'chambers', 'runway', 'octagons', 'stairs', 'pillars', 'housings', 'sparks', 'octagons'];
if (theme.length !== corners.length) throw new Error(`${corners.length} stretches, ${theme.length} themes`);

// Past every corner three cells straight on stay clear, with their neighbours.
const runout = new Set();
for (const k of corners) {
  let p = route.at(k);
  for (let n = 0; n < 3; n++) {
    p = g.move(...p, route.heading(k));
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) runout.add(key(...wrap(p[0] + dx, p[1] + dy)));
  }
}
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const q = local(c, r);
  if (q.d < 2) continue;
  let ch = M[theme[q.s]](q, c, r);
  if (/[#^]/.test(ch) && runout.has(key(c, r))) ch = '.';
  if (ch !== '.') g.set(T, c, r, ch);
}
for (const [c, r] of route.cells) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
  if (/[#^]/.test(g.get(T, ...wrap(c + dx, r + dy)))) throw new Error(`an obstacle at ${wrap(c + dx, r + dy)} stands next to the road`);
// The engine draws at most 900 walls and 900 spikes a side; keep a 29 x 29 window well under that.
for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
  const n = {'#': 0, '^': 0};
  for (let r = y - 14; r <= y + 14; r++) for (let c = x - 14; c <= x + 14; c++) { const ch = g.get(T, ...wrap(c, r)); if (ch in n) n[ch]++; }
  if (n['#'] > 400 || n['^'] > 400) throw new Error(`too many obstacles round ${x},${y}: ${n['#']} walls, ${n['^']} spikes`);
}

// ---- stages. Every bend is taken inside a chain that begins up to six cells before it, so chains run
// long as in the classic levels; where the next bend follows within four cells the chain stops a cell
// past the bend. The straights between hold a crystal, a trail of crystals or a straight chain in turn.
// On the gate stretches a stage is followed by two free cells for the '>=' gate.
const RUSH = [5, 8];                               // the long straights E18 and N14: a boost rush
const GATES = new Set(['runway', 'checker']);
const stages = [], gaps = [];
{
  const end = L + 8;                               // the last stage ends here, within three cells of stage 1 (at 11)
  let pos = 11, kind = 0;
  const gap = i => (GATES.has(theme[seg[i % L]]) && !RUSH.includes(seg[i % L]) ? 3 : 2);
  const bends = [...corners.filter(k => k > 11), ...corners.map(k => k + L)];
  bends.forEach((k, n) => {
    if (k + 2 > end) return;
    const pre = n % 2 ? 3 : 6;            // long and short corner chains in turn
    while (k - pre - pos >= 2) {
      const room = k - pre - pos;
      let to;
      if (RUSH.includes(seg[pos % L]) && room >= 9) { stages.push([['gems', pos, pos + 4, pos + 8]]); to = pos + 8; }
      else if (room >= 8 && kind % 3 === 1) { stages.push([['chain', pos, pos + 6]]); to = pos + 6; }
      else if (room >= 6 && kind % 3 === 2) { stages.push([['gems', pos, pos + 2, pos + 4]]); to = pos + 4; }
      else { stages.push([['gem', pos]]); to = pos; }
      kind++;
      if (gap(to) === 3) gaps.push(to + 1);
      pos = to + gap(to);
    }
    const tight = bends[n + 1] !== undefined && bends[n + 1] - k <= 4;
    const to = tight ? k + 1 : k + 2;
    stages.push([['chain', Math.min(pos, k - 1), to]]);
    pos = to + 2;
  });
  // The last straight, up to the end: a trail, then a chain that ends where stage 1 comes in sight.
  while (end - pos >= 9) { stages.push([['gems', pos, pos + 3, pos + 6]]); pos += 8; }
  if (end - pos >= 1) stages.push([['chain', pos, end]]);
  else stages.push([['gem', end]]);
}
g.routeStages(route, T, stages);

// ---- the road's own pads: '>=' gates in the two free cells after a stage on the gate stretches, and a
// boost rush on RUSH (boost pads between the crystals, a slow pad before the corner chain).
for (const i of gaps) {
  const a = route.at(i), b = route.at(i + 1);
  if (g.get(T, ...a) === '.' && g.get(T, ...b) === '.') { g.set(T, ...a, '>'); g.set(T, ...b, '='); }
}
for (const s of RUSH) {
  const cells = [];
  for (let i = 1; i <= L; i++) if (seg[i % L] === s) cells.push(i);
  let chainStart = cells[cells.length - 1];
  while (/[a-zà-þα-ω]/.test(g.get(T, ...route.at(chainStart - 1)))) chainStart--;
  for (let i = cells[1]; i < chainStart - 3; i++) if (g.get(T, ...route.at(i)) === '.') g.set(T, ...route.at(i), '>');
  for (let i = chainStart - 1; i >= chainStart - 3; i--) if (g.get(T, ...route.at(i)) === '.') { g.set(T, ...route.at(i), '='); break; }
}

// ---- colours: the hot floors of a foundry, a pair per piece (the band next to the road and every third
// ring out), a violet and lilac road through them, magenta slag far from the road.
const floors = {
  runway: ['#ff3300', '#ff5a28'], chambers: ['#993300', '#ff3300'], stairs: ['#ff0066', '#ff44aa'],
  octagons: ['#ff00ff', '#ff0088'], checker: ['#ff1111', '#ff9900'], housings: ['#ff7700', '#993300'],
  sparks: ['#ff0088', '#ff5a28'], pillars: ['#ff44aa', '#ff0066']
};
const colorOf = (c, r) => {
  const q = local(c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#6600cc' : '#dd88ff';
  if (q.d >= 10) return mod(q.d, 2) ? '#ff00ff' : '#ff0088';
  const [main, band] = floors[theme[q.s]];
  return q.d === 1 || mod(q.d, 3) === 0 ? band : main;
};
const colors = {top: g.layers(colorOf), bottom: [['#ff3300', '#6600cc', 'r']]};
module.exports = {key: 'foundry', name: 'Level 13', kind: 'Foundry', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
