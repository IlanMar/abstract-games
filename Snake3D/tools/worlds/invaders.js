// Level 107 "Invaders": a hard level, a long one. A square world of 72 x 72 cells, an endless plane: the
// screen of an old arcade shooter, filled with the invading fleet. The invaders are pixel sprites drawn in
// walls, rank after rank (squids, crabs and octopuses), and the road weaves through the formation where the
// player has shot gaps in it. It dives into four craters blasted in the screen and runs the dark space
// behind it. The thread is uneven: stages wait up to the edge of sight, crystals lead on between the ranks,
// and at some bends only the painted road shows the turn.
//   - the fleet: a sprite every fourteen columns and eleven rows; the cells within a cell of the road are
//     shot away, and an invader that has lost more than two fifths is gone; the eyes are spikes;
//   - the bombs: zigzags of slow pads falling under some invaders, the player's shots: short columns of
//     boost pads;
//   - behind the screen: stars (spikes) and the mother ship, a long hull of walls, every so often;
//   - the craters: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: an arcade screen at night. On top a gold road on a dark teal screen, the ranks in pink,
// violet and caramel, underneath a pale blue road over violet space; the craters glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 72, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [6, 66];
const R = road(g, [...start, 'N'],
  'N40 E20 S8 E20 N20 W12 N7 D'      // top: up through the ranks, east, a dip, east, north and into a crater
  + ' S10 E26 S30 W14 N6 D'          // behind: back, east, the long way south and up into the second
  + ' S10 W20 S8 E36 N4 D'           // top: back, west, south and the long run east into the third
  + ' S10 W56 S7 D'                  // behind: back and the long way west into the last
  + ' N4');                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the craters: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a crater at ${p.c},${p.r}`);
for (const k of gap) g.hole(...k.split(',').map(Number));
const glow = new Set();
for (const k of gap) { const [c, r] = k.split(',').map(Number); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) glow.add(key(mod(c + dx, W), mod(r + dy, H))); }

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const clear = (c, r) => R.local(T, c, r).d >= 2 && !runout.top.has(key(c, r)) && !glow.has(key(c, r));

// ---- the fleet. 'o' marks an eye (a spike).
const SPRITES = [
  ['...##...', '..####..', '.######.', '##o##o##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'],                          // squid
  ['..#.....#..', '...#...#...', '..#######..', '.##o###o##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'],  // crab
  ['....####....', '.##########.', '############', '###oo##oo###', '############', '...##..##...', '..##.##.##..', '##........##'],  // octopus
];
const invader = new Map();                                  // cell -> {kind, ch}
for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) {
  const kind = j % 3, sp = SPRITES[kind], x0 = 14 * i + 2, y0 = 11 * j + 2;
  const cells = [];
  sp.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') cells.push([mod(x0 + x, W), mod(y0 + y, H), ch]); }));
  const left = cells.filter(([c, r]) => clear(c, r));          // a hit invader keeps what the road left of it
  if (left.length < 0.6 * cells.length) continue;
  left.forEach(([c, r, ch]) => invader.set(key(c, r), {kind, ch: ch === 'o' ? '^' : '#'}));
}
const shot = (c, r) => mod(c, 14) === 9 && mod(r, 11) >= 1 && mod(r, 11) <= 3 && hash(Math.floor(c / 14) * 7 + Math.floor(r / 11)) < 0.4;
const bomb = (c, r) => mod(r, 11) >= 10 || mod(r, 11) === 0 ? false : mod(c, 14) === 6 + (mod(r, 2)) && mod(r, 11) >= 4 && mod(r, 11) <= 8 && hash(Math.floor(c / 14) * 3 + Math.floor(r / 11) * 5) < 0.3;

// ---- the screen and the space behind it.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919));
  let ch = '.';
  if (side === T) {
    const v = invader.get(k);
    if (v) ch = v.ch;
    else if (shot(c, r) && q.d >= 2) ch = '>';                                                  // a shot
    else if (bomb(c, r) && q.d >= 2) ch = '=';                                                  // a bomb
  } else {
    if (mod(r, 24) === 12 && mod(c, 36) < 14 && q.d >= 3) ch = '#';                             // the mother ship
    else if (q.d >= 3 && n < 0.04) ch = '^';                                                     // a star
    else if (q.d >= 2 && n > 0.97) ch = '=';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 40, gate: i => mod(i, 2) === 1,
  gaps: [9, 4, 11, 2, 7, 6], crumbs: 2, steps: [11, 7, 9, 5], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: an arcade screen at night.
const RANK = ['#ff0088', '#cc00ff', '#ff3300'];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#6600cc';
  const v = invader.get(k);
  return v ? RANK[v.kind] : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'invaders', name: 'Level 107', kind: 'Invaders', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
