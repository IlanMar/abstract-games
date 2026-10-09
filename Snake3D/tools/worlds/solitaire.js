// Level 118 "Solitaire": a hard level, a long one. A square world of 84 x 64 cells, an endless plane of card
// table with a game of patience laid out on it: the stock and the waste, four foundations and seven columns
// of the tableau, face-down cards cascading under face-up ones. Every card is edged in wall, so the road
// cuts through the layout card by card where the edges open for it; the suits stand on the face-up cards
// (red in spikes, black in walls), and the road goes down four times through the gaps in the table to run
// its underside. The thread is uneven: stages wait up to the edge of sight, crystals lead on across the
// cards, and at some bends only the painted road shows the turn.
//   - a card: 9 x 13 cells, its edge in walls; a face-down card shows a back of slow-pad lattice, a face-up
//     card a pip (a spike or a wall) in its corner and, if nothing covers it, a big suit in the middle;
//   - the layout: the stock and the waste top left, the foundations top right (empty ones drawn as an
//     outline of slow pads), the tableau below, face-down cards two rows apart, face-up three;
//   - the felt: a weave of boost pads, chips (spikes) here and there;
//   - underneath: the planks of the table (walls) with gaps, gum (spikes);
//   - the dives: the dive cell and its two neighbours across the road, open through both faces.
// Colour concept: a card table at night. On top a pink road over dark teal felt, violet faces and wine backs
// in olive edges, underneath a pale blue road over chocolate planks; the dives glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 84, H = 64, T = 'top', B = 'bottom';
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [2, 58];
const R = road(g, [...start, 'N'],
  'N40 E20 S12 E24 N24 E16 S9 D'     // top: up the west, east past the stock, down, across the tableau, north and down a gap
  + ' N8 E14 S40 W30 N7 D'           // underneath: back, east, the long way south, west and up the second
  + ' S12 E26 N26 W16 S7 D'          // top: down, east under the tableau, north up the last column and into the third
  + ' N6 W40 S28 W14 S6 D'           // underneath: back, the long way west, south to the last
  + ' N5');                          // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the dives: the dive cell and its two neighbours across the road.
const gap = new Set();
for (const p of R.cells) if (p.hole) {
  const across = p.h === 'N' || p.h === 'S' ? [[1, 0], [-1, 0]] : [[0, 1], [0, -1]];
  for (const [dx, dy] of [[0, 0], ...across]) gap.add(key(mod(p.c + dx, W), mod(p.r + dy, H)));
}
for (const p of R.cells) if (!p.hole && gap.has(key(p.c, p.r))) throw new Error(`the road runs over a dive at ${p.c},${p.r}`);
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

// ---- the layout: cards in the order they were dealt, each later one covering the ones before.
const SUIT = [['.#.#.', '#####', '#####', '.###.', '..#..'], ['..#..', '.###.', '#####', '.###.', '..#..'],
  ['..#..', '.###.', '#####', '..#..', '.###.'], ['.###.', '#####', '#####', '..#..', '.###.']];   // hearts, diamonds, spades, clubs
const cards = [];
const deal = (x, y, up, n) => cards.push({x, y, up, suit: Math.floor(hash(n * 5 + 1) * 4), empty: false});
deal(4, 2, false, 0); deal(5, 3, false, 1);                                      // the stock
deal(15, 2, true, 2);                                                            // the waste
[37, 48, 59, 70].forEach((x, i) => cards.push({x, y: 2, up: true, suit: i, empty: i % 2 === 1}));   // the foundations
for (let i = 0; i < 7; i++) {
  const x = 4 + 11 * i, ups = 1 + Math.floor(hash(i * 3 + 9) * 3);
  let y = 20;
  for (let k = 0; k < i; k++, y += 2) deal(x, y, false, 10 + i * 10 + k);
  for (let k = 0; k < ups; k++, y += 3) deal(x, y, true, 10 + i * 10 + 5 + k);
}
const owner = new Map();                                     // cell -> index of the card on top
cards.forEach((cd, n) => { for (let r = cd.y; r < cd.y + 13; r++) for (let c = cd.x; c < cd.x + 9; c++) owner.set(key(c, r), n); });
const covered = n => cards.some((cd, m) => m > n && cd.x === cards[n].x && cd.y > cards[n].y && cd.y < cards[n].y + 13);
const pip = new Map();                                       // cell -> '#' or '^'
cards.forEach((cd, n) => {
  if (!cd.up || cd.empty) return;
  const mark = cd.suit < 2 ? '^' : '#';
  pip.set(key(cd.x + 2, cd.y + 1), mark);
  if (!covered(n)) SUIT[cd.suit].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') pip.set(key(cd.x + 2 + x, cd.y + 4 + y), mark); }));
});
const edge = (c, r) => {
  const n = owner.get(key(c, r));
  if (n === undefined) return false;
  const cd = cards[n];
  return c === cd.x || c === cd.x + 8 || r === cd.y || r === cd.y + 12 || owner.get(key(c, r - 1)) !== n;
};

// ---- the table and its underside.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  const k = key(c, r);
  if (gap.has(k)) continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const n = hash(c * 131 + r * 71 + (side === T ? 0 : 7919)), o = owner.get(k);
  let ch = '.';
  if (side === T) {
    if (o !== undefined) {
      const cd = cards[o];
      if (edge(c, r)) ch = cd.empty ? '=' : '#';                                                       // the edge of a card
      else if (cd.empty) ch = '.';
      else if (!cd.up) ch = mod(c + r, 3) === 0 || mod(c - r, 3) === 0 ? '=' : '.';                    // a card back
      else if (pip.has(k)) ch = pip.get(k);
    } else if (mod(c + 2 * r, 14) === 0) ch = '>';                                                     // the weave of the felt
    else if (q.d >= 3 && n < 0.03) ch = '^';                                                          // a chip
  } else {
    if (q.d >= 2 && mod(r, 8) === 0 && mod(c + 5 * Math.floor(r / 8), 13) > 1) ch = '#';              // a plank
    else if (q.d >= 3 && n < 0.04) ch = '^';                                                          // gum
    else if (q.d >= 2 && mod(r, 8) === 4 && mod(c, 4) === 0) ch = '=';
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k) || glow.has(k))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 3], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [9, 4, 11, 6, 2, 10], crumbs: 2, steps: [11, 8, 6, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a card table at night.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#993300';
  const o = owner.get(k);
  if (o === undefined) return '#444444';
  if (edge(c, r)) return cards[o].empty ? '#444444' : '#993300';
  return cards[o].empty ? '#444444' : cards[o].up ? '#6600cc' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'solitaire', name: 'Level 118', kind: 'Solitaire', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
