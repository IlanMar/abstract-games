// Level 115 "Moon": a very hard level, a long one, with relief. A hex world of 72 x 72 cells, an endless
// plane: the near side of the moon. Craters lie over it, overlapping, each a bowl sunk below the plain with a
// raised rim round it, so the road climbs over rims and drops into bowls as it crosses the field, and the
// dark seas are low plains between. Small craters away from the road have a shaft at their bottom (a hole),
// boulders lie on the rims, and the road goes down four times into a crater's floor to run the lava tubes
// underneath. The thread is uneven: stages wait up to the edge of sight, crystals lead on over the rims, and
// at some bends only the painted road shows the turn.
//   - the craters: centres from a hash, radius 4 to 9; the bowl sinks a tenth of the radius, the rim rises
//     a sixteenth; the height is the plain plus the seas plus every crater, smoothed once, in quarter
//     cells (the script prints the steepest step);
//   - shafts: the middle of a crater of radius up to six whose disk of two stands clear of the road;
//   - boulders (spikes) on the rims, rocks (walls) in small clusters on the highlands, dust (slow pads) in
//     the seas;
//   - underneath: lava tubes, ribs of wall across the tube lines, glowing veins of boost pads;
//   - the dives: the dive cell and its neighbours that are not road, open through both faces.
// Colour concept: moonlight. On top a gold road over violet highlands and dark teal seas with rose rims,
// underneath a pale blue road over chocolate tubes; the shafts and dives glow raspberry.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 72, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 64];
const R = road(g, [...start, 'N'],
  'N16 NE14 N12 NW10 N6 NE24 SE12 S9 D'     // top: up the west over the rims, a crook, the long lean east and down into a crater
  + ' N8 NE8 SE14 S24 SW18 S8 SE8 S6 D'     // underneath: back, round the east and the long way south into the second
  + ' N24 NW10 N4 NW16 SW8 S28 D'           // top: back up the east, across the seas and down into the third
  + ' N20 NW12 SW6 S31 D'                   // underneath: back, north-west and the long way south to the last
  + ' N6');                                 // top: up into the start
const {mod, key, hash} = kit;
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const SX = Math.sqrt(3) / 2, WX = W * SX;
const pos = (c, r) => [c * SX, r + mod(c, 2) / 2];
const dist = ([x0, y0], [x1, y1]) => Math.hypot(mod(x1 - x0 + WX / 2, WX) - WX / 2, mod(y1 - y0 + H / 2, H) - H / 2);

// ---- the craters and the relief.
const craters = [];
for (let n = 0; craters.length < 26 && n < 400; n++) {
  const c = Math.floor(hash(n * 3 + 1) * W), r = Math.floor(hash(n * 3 + 2) * H), rad = 4 + Math.floor(hash(n * 3 + 3) * 6);
  if (craters.every(k => dist(pos(c, r), pos(k.c, k.r)) > (rad + k.rad) * 0.8)) craters.push({c, r, rad});
}
const sea = (c, r) => Math.sin(2 * Math.PI * c / W + 0.5) * Math.cos(2 * Math.PI * r / H - 0.3);
const crater = (c, r) => {
  let h = 0, rim = false;
  for (const k of craters) {
    const t = dist(pos(c, r), pos(k.c, k.r)) / k.rad;
    if (t < 1) h -= k.rad / 10 * (1 - t * t);
    h += k.rad / 16 * Math.exp(-(((t - 1) / 0.35) ** 2));
    if (Math.abs(t - 1) < 0.15) rim = true;
  }
  return {h, rim};
};
const raw = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => 2 + 0.6 * sea(c, r) + crater(c, r).h));
const smooth = (c, r) => (raw[r][c] + ['N', 'NE', 'SE', 'S', 'SW', 'NW'].reduce((s, m) => { const [x, y] = g.step(c, r, m); return s + raw[y][x]; }, 0) / 6) / 2;
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => Math.round(smooth(c, r) * 4) / 4));

// ---- the dives and the shafts, the glow round them, and the runouts past the corners.
const gap = kit.diveGaps(g, R);
for (const k of craters) if (k.rad <= 6 && g.disk(k.c, k.r, 3).every(q => near(...q) >= 3)) g.disk(k.c, k.r, 1).forEach(q => gap.add(key(...q)));
kit.punch(g, R, gap, 'a shaft');
const glow = kit.glow(g, gap);
const runout = kit.runouts(g, R);

// ---- the surface and the tubes under it.
kit.paint(g, R, {skip: gap, keep: [glow], runout}, (side, c, r, q, n) => {
  let ch = '.';
  if (side === T) {
    const {rim} = crater(c, r);
    if (rim && q.d >= 2 && n < 0.22) ch = '^';                                                        // a boulder on a rim
    else if (!rim && sea(c, r) > 0.2 && q.d >= 3 && hash(Math.floor(c / 3) * 7 + Math.floor(r / 3) * 13) < 0.08) ch = '#';   // a rock
    else if (sea(c, r) < -0.3 && mod(c + 2 * r, 5) === 0) ch = '=';                                 // dust in a sea
    else if (q.d >= 3 && n < 0.02) ch = '^';
  } else {
    if (q.d >= 2 && mod(r + Math.floor(c / 2), 9) === 0 && mod(c, 7) !== 0) ch = '#';              // a rib of a tube
    else if (q.d >= 2 && mod(2 * r - c, 13) === 0) ch = '>';                                         // a glowing vein
    else if (q.d >= 3 && n < 0.03) ch = '^';
  }
  return ch;
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {first: 13, lengths: [11, 14], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [5, 10, 7, 2, 11, 4], crumbs: 2, steps: [9, 6, 11, 8], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: moonlight.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#993300';
  if (crater(c, r).rim) return '#b41e46';
  return sea(c, r) < -0.1 ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'moon', name: 'Level 115', kind: 'Moon', start: [...start, 'N'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  console.log('steepest step', kit.steepest(g, R, height), 'top', Math.max(...height.flat()), 'low', Math.min(...height.flat()), 'craters', craters.length);
}
