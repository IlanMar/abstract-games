// Level 44 "Rainbow": a hard level in all the colours of the rainbow. A square world of 82 x 44 cells,
// all sky (void) but a double rainbow: two arches of seven bands, two cells each, that stand side by side
// with their inner feet on one cloud. The road climbs out of the cloud on top, over the crown of the second arch
// in stairs and off its far foot into the sky; underneath it comes back
// on an inner lane, over the second arch, through the cloud, over the first arch and off its near foot;
// on top again it takes the outer lane over the first arch and down into the cloud. Every shoulder of an arch is a staircase of bends.
//   - rails of light: dashed walls along the band edges, three cells out from the road;
//   - sparkles: spikes on the outer and inner rims of the arches;
//   - the cloud is soft: puffs of boost pads on top, of slow pads underneath, and a few hailstones.
// No pads on the arches: the bands are red and green too. Colour style, rainbow: a white road over the
// seven bands, red outermost and violet innermost, on a pale cloud.
// Stages: long chains up the legs and over the crowns, one chain through every staircase, a lead-in chain
// right up to each far foot and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 82, H = 44, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const ARCHES = [21, 59], CY = 26, K = 5, F0 = 5, F1 = 19, FOOT = 6;
const UP = 'E3 N3 E3 N3 E4 N4', DOWN = 'S4 E4 S3 E3 S3 E3';      // the shoulders of the outer lane
const start = [44, 34];
const R = road(g, [...start, 'N'],
  'N13 ' + UP + ' E10 ' + DOWN + ' S11 D'      // top: up out of the cloud, over the second arch and off its far foot
  + ' N6 W6 N6 W4 N4 W10 S4 W4 S16 W20'        // underside: the inner lane over the second arch, through the cloud
  + ' N16 W4 N4 W10 S4 W4 S11 D'               // underside: over the first arch and off its near foot
  + ' N6 W6 N6 ' + UP + ' E10 ' + DOWN         // top: the outer lane over the first arch
  + ' S14 E8 N1');                             // top: down into the cloud and back to the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wrapd = (a, n) => mod(a + n / 2, n) - n / 2;

// ---- the land: the arches (an octagonal "radius" f, the bands by f) and the cloud.
const archAt = (c, r) => {
  for (const ac of ARCHES) {
    const dx = Math.abs(wrapd(c - ac, W)), dy = r - CY;
    const f = dy > 0 ? dx : Math.max(dx, -dy, dx - dy - K);
    if (f >= F0 && f < F1 && dy <= FOOT) return {f, band: Math.floor((f - F0) / 2)};
  }
  return null;
};
const PUFFS = [0, 1, 2, 3, 4, 5, 6].map(k => [28 + 4 * k, 35 + (k % 2) * 2]);
const cloud = (c, r) => PUFFS.some(([x, y]) => (c - x) ** 2 + (r - y) ** 2 <= 20);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (archAt(c, r) || cloud(c, r)) g.set('both', c, r, '.');
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the sky`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the bands and the cloud, face by face.
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) for (const side of [T, B]) {
  if (g.get(T, c, r) === ' ') continue;
  const q = R.local(side, c, r);
  if (q.d === 0) continue;
  const a = archAt(c, r);
  let ch = '.';
  if (a && !cloud(c, r)) {
    if ((a.f === F0 || a.f === F1 - 1) && mod(c + r, 3) === 0) ch = '^';                    // sparkles on the rims
    else if (q.d === 3 && mod(a.f - F0, 2) === 1 && mod(q.u, 5) < 3) ch = '#';              // rails of light
    else if (q.d >= 3 && hash(c * 3 + (side === T ? 0 : 1), r) < 0.03) ch = '^';
  } else if (cloud(c, r)) {
    if (q.d >= 2 && mod(c + 2 * r, 5) === 0) ch = side === T ? '>' : '=';                  // soft puffs
    else if (q.d >= 3 && hash(c, r * 5 + (side === T ? 0 : 1)) < 0.05) ch = '^';            // hail
  }
  if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages: no launches, there are no pads on the arches.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [4, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, rainbow: seven bands, red outermost, under a white road; a pale cloud.
const BANDS = ['#cc00ff', '#6600cc', '#ff99cc', '#ffff00', '#ff6600', '#ff3300', '#ff0000'];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd';
  if (cloud(c, r)) return '#999999';
  const a = archAt(c, r);
  if (a) return BANDS[a.band];
  return '#444444';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'rainbow', name: 'Level 44', kind: 'Rainbow', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
