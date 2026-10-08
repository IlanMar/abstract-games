// Level 89 "Constellations": a very hard level, a big one. A hex world of 72 x 84 cells, all void but the
// night sky: the road is a constellation line three cells wide, drawn from star to star, its edges a trail
// of stardust, and every bend is a star, an island of radius three. Nothing is beside the line: a missed
// turn runs off into the dark and over to the other face. The road dives off four line ends, so half the run is on the underside. The thread is
// uneven: stages wait up to the edge of sight and crystals lead on along the long lines.
//   - the stars: a disc of radius three on every bend, with a ring of spikes (its rays) on the far side, away
//     from the line;
//   - the line: the road and a cell of stardust either side, a slow pad on every other dust cell, and a
//     '>=' gate on the road after every other stage;
//   - twinkles: lone cells of land scattered over the dark far from the line, a spike on every third;
//   - the line ends where the road dives stay void.
// Colour concept: a winter sky. On top an ice line between dark grey stars, underneath a pale pink line
// between violet stars; the twinkles in bright purple.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 72, H = 84, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [10, 78];
const R = road(g, [...start, 'N'],
  'N22 NE14 N12 NE10 SE10 S8 D'        // top: up the west line, a lean north-east, over the summit and down off a star
  + ' N8 NE12 N22 NW14 D'              // underside: back up, north-east, the long north line and off to the north-west
  + ' SE6 NE10 SE8 S40 D'              // top: back, over the north-east star and down the long east line
  + ' N6 NW4 SW6 S8 SW16 NW12 SW17 S23 D'  // underside: up, a crook, the long south-west line and down off the bottom
  + ' N5');                            // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = n => { let h = n * 374761393; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);

// ---- the land: the line, the stars and the twinkles.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
const star = new Map();
R.corners.forEach(k => { const p = R.at(k); for (const q of g.disk(p.c, p.r, 3)) star.set(key(...q), {side: p.side, c: p.c, r: p.r, ring: g.ring(p.c, p.r, 3).some(o => key(...o) === key(...q))}); });
for (const k of star.keys()) land.add(k);
const twinkle = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) >= 4 && !star.has(key(c, r)) && hash(c * 37 + r * 101) < 0.025) twinkle.add(key(c, r));
for (const k of twinkle) land.add(k);
// The line ends where the road dives: the dive cell and the cells round it that are not road stay void.
const pit = new Set();
for (const p of R.cells) if (p.hole) {
  pit.add(key(p.c, p.r));
  for (const o of R.nbrs(p.c, p.r)) if (!R.has(T, ...o) && !R.has(B, ...o)) pit.add(key(...o));
}
for (const p of R.cells) if (!p.hole && pit.has(key(p.c, p.r))) throw new Error(`the road runs over a line end at ${p.c},${p.r}`);
for (const k of pit) { land.delete(k); star.delete(k); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- rays and twinkles. Nothing sharp next to the road on its own face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const s = star.get(k);
    if (s && s.ring && q.d >= 2) ch = '^';
    else if (!s && q.d === 1 && mod(q.u, 2) === 0) ch = '=';
    else if (twinkle.has(k) && mod(c + r, 3) === 0) ch = '^';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [5, 3], launch: 0, gate: i => mod(i, 2) === 0,
  gaps: [5, 11, 3, 8, 2, 10], crumbs: 2, steps: [9, 11, 6, 10], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a winter sky.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ffffff' : '#999999') : (mod(q.i, 4) < 2 ? '#ff99cc' : '#ff44aa');
  if (twinkle.has(k)) return '#cc00ff';
  return side === T ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'constellations', name: 'Level 89', kind: 'Constellations', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
