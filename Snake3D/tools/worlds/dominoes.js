// Level 100 "Dominoes": a very hard level, a long one. A square world of 60 x 72 cells, all void but a game
// of dominoes laid out on the sky: tiles of 5 x 11 cells set in staggered columns with a cell of void
// between them. The road runs over the tiles that make up the line of play (and bridges the gaps between
// them), drops off the ends of the line to the backs of the tiles and comes back, so half the run is on the
// underside. The pips are holes through the tiles: a missed turn can drop the snake through a pip to the
// other face. The thread is uneven: stages wait up to the edge of sight, crystals lead on along the line,
// and at some bends only the painted road shows the turn.
//   - a tile: two halves of 5 x 5 with a dividing bar of wall between them; each half shows 0 to 6 pips,
//     holes two cells clear of the road; tiles away from the line are laid here and there as well;
//   - the backs: a stripe of slow pads down the middle of every tile and a spike in each corner;
//   - the ends of the line where the road dives stay void.
// Colour concept: old bone tiles. On top a pink road over beige tiles with dark teal bars, underneath a
// gold road over dark teal backs with violet stripes; the bridges between tiles chocolate.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 60, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [9, 64];
const R = road(g, [...start, 'N'],
  'N30 E14 N12 W8 N10 D'          // top: up the west of the line, east, north, west and off its end
  + ' S8 E20 S16 E12 N24 D'       // underside: back, east, south, east and north off the far end
  + ' S8 W6 S30 E8 S10 D'         // top: back, the long column south and off
  + ' N6 W20 S8 W20 S10 D'        // underside: back, west, south, west and off over the edge
  + ' N8');                       // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the tiles: staggered columns of slots 6 x 12, a tile of 5 x 11 in each.
const slot = (c, r) => {
  const bx = Math.floor(c / 6), y = r - (bx % 2) * 6, by = Math.floor(mod(y, H) / 12);
  return {id: bx * 7 + by, x: c % 6, y: mod(y, 12)};
};
const PIPS = [[], [[2, 2]], [[1, 1], [3, 3]], [[1, 1], [2, 2], [3, 3]], [[1, 1], [3, 1], [1, 3], [3, 3]],
  [[1, 1], [3, 1], [2, 2], [1, 3], [3, 3]], [[1, 1], [3, 1], [1, 2], [3, 2], [1, 3], [3, 3]]];
const onTile = (c, r) => { const s = slot(c, r); return s.x < 5 && s.y < 11; };
const pipAt = (c, r) => {
  const s = slot(c, r);
  if (s.x >= 5 || s.y >= 11 || s.y === 5) return false;
  const half = s.y < 5 ? 0 : 1, y = s.y < 5 ? s.y : s.y - 6;
  return PIPS[Math.floor(hash(s.id * 2 + half + 11) * 7)].some(([px, py]) => px === s.x && py === y);
};
const inPlay = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (onTile(c, r) && near(c, r) <= 1) inPlay.add(slot(c, r).id);
const laid = id => inPlay.has(id) || hash(id * 5 + 2) < 0.2;

// ---- the land: the tiles laid and the road with a cell either side.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1 || (onTile(c, r) && laid(slot(c, r).id))) land.add(key(c, r));
// The ends of the line where the road dives: the dive cell and the cells round it that are not road stay void.
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  pit.add(key(p.c, p.r));
  for (const o of R.nbrs(p.c, p.r)) if (!R.has(T, ...o) && !R.has(B, ...o)) pit.add(key(...o));
  let q = [p.c, p.r];
  for (let n = 0; n < 2; n++) { q = g.move(...q, p.h); pit.add(key(...q)); for (const o of R.nbrs(...q)) pit.add(key(...o)); }
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a line end at ${p.c},${p.r}`);
// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
// The pips: holes two cells clear of the road on both faces.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const k = key(c, r);
  if (pipAt(c, r) && near(c, r) >= 2 && !runout.top.has(k) && !runout.bottom.has(k)) pit.add(k);
}
for (const k of pit) land.delete(k);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// ---- bars and backs. Nothing sharp next to the road on its own face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0 || !onTile(c, r)) continue;
    const s = slot(c, r);
    let ch = '.';
    if (side === T) { if (s.y === 5) ch = '#'; }                                     // the dividing bar
    else if (s.x === 2 && mod(s.y, 2) === 0) ch = '=';                               // the stripe on the back
    else if ((s.x === 0 || s.x === 4) && (s.y === 0 || s.y === 10)) ch = '^';        // a corner
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [12, 14], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [5, 10, 2, 11, 7, 4], crumbs: 2, steps: [10, 6, 11, 8], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: ivory and ebony.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff0088' : '#ff44aa') : (mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28');
  if (!onTile(c, r)) return '#993300';
  const s = slot(c, r);
  if (side === T) return s.y === 5 ? '#444444' : '#ff5a28';
  return s.x === 2 ? '#6600cc' : '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'dominoes', name: 'Level 100', kind: 'Dominoes', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
