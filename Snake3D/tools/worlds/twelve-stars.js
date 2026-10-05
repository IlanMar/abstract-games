// Level 47 "Twelve Stars": a hard level in the style of Europe. A square world, an endless deep-blue
// plaza (the 56 x 56 tile repeats) with a circle of twelve gold stars laid in the floor, and the four
// stars at north, east, south and west are open at the heart, right through both faces. The road runs
// round the circle and through it: into the west star from outside on top, into the north star from
// outside underneath, into the east star from outside on top and into the south star from inside
// underneath, coming back each time on the other face.
//   - a colonnade: pillars (walls) three cells out on both sides of the road, every third cell, like the
//     arcades of an old European square;
//   - the eight closed stars each hold a spike at the heart; the circle itself glows with boost pads on
//     top and slow pads underneath, never right beside the road;
//   - out on the plaza, statues on plinths: a spike ringed by four walls, farthest from the road first;
//   - the long straights step aside in jogs.
// Colour style, Europe: a white marble road over deep blue, gold stars, a violet circle.
// Stages: long chains, one chain through every pair of close bends, a lead-in chain right up to each
// open star and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const C = [28, 28], RING = 15;
const STARS = Array.from({length: 12}, (_, k) => [Math.round(C[0] + RING * Math.sin(k * Math.PI / 6)), Math.round(C[1] - RING * Math.cos(k * Math.PI / 6))]);
const OPEN = new Set([0, 3, 6, 9].map(k => STARS[k].join(',')));
for (const s of STARS) if (OPEN.has(s.join(','))) g.hole(...s);
const start = [4, 40];
const R = road(g, [...start, 'N'],
  'N12 E8 D'                          // top: up and east into the west star
  + ' W8 N7 E4 N7 W4 N7 E23 S5 D'     // underside: back, up in a jog, east and down into the north star
  + ' N7 E8 S4 E6 N4 E8 S8 W4 S6 E4 S8 W6 D'   // top: back, east in a jog, down in a jog and west into the east star
  + ' E7 S8 W22 S6 D'                 // underside: back, down, west across the circle and into the south star
  + ' N8 W6 S3 W6 N3 W4 S11 W8 N6');  // top: back up, west in a jog and round into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road runs over a star at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a star`);

// ---- the stars: five points of radius 3, one to the north.
const starAt = (c, r) => STARS.find(([x, y]) => {
  const dx = c - x, dy = y - r, rr = Math.hypot(dx, dy);
  if (rr > 3.2) return false;
  if (rr <= 1.3) return true;
  const a = mod(Math.atan2(dx, dy), 2 * Math.PI / 5);
  return Math.min(a, 2 * Math.PI / 5 - a) < 0.28;              // along one of the five points
});
const onCircle = (c, r) => Math.abs(Math.hypot(c - C[0], r - C[1]) - RING) < 0.5;

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- statues: the farthest places from the road on each face, ten cells apart.
const statues = {top: [], bottom: []};
for (const side of [T, B]) {
  const cand = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const d = R.local(side, c, r).d;
    if (d >= 5 && !starAt(c, r) && Math.abs(Math.hypot(c - C[0], r - C[1]) - RING) > 3) cand.push([c, r, d]);
  }
  cand.sort((a, b) => b[2] - a[2] || hash(a[0], a[1]) - hash(b[0], b[1]));
  for (const [c, r] of cand) if (!statues[side].some(([x, y]) => Math.max(Math.abs(x - c), Math.abs(y - r)) < 10)) statues[side].push([c, r]);
}
const statueAt = (side, c, r) => statues[side].find(([x, y]) => Math.abs(x - c) + Math.abs(y - r) <= 1);

// ---- the plaza, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  let ch = '.';
  const st = starAt(c, r), sa = statueAt(side, c, r);
  if (st) ch = st[0] === c && st[1] === r ? '^' : '.';                       // a closed star's heart
  else if (sa) ch = sa[0] === c && sa[1] === r ? '^' : '#';                  // a statue on its plinth
  else if (q.d === 3 && mod(q.u, 3) === 0) ch = '#';                          // the colonnade
  else if (onCircle(c, r) && q.d >= 2) ch = side === T ? '>' : '=';          // the glowing circle
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [11, 14], lead: [5, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, Europe: white marble on deep blue, gold stars, a violet circle.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd';
  if (starAt(c, r)) return '#ff6600';
  if (Math.abs(Math.hypot(c - C[0], r - C[1]) - RING) < 1.5) return '#cc00ff';
  return side === T ? '#6600cc' : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'twelve-stars', name: 'Level 47', kind: 'Twelve Stars', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
