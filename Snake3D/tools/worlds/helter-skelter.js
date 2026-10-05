// Level 50 "Helter Skelter": a hard hex level with relief, a fairground spiral tower. A hex world of 48 x
// 56 cells, all void but a stepped hex cone eighteen cells round with a crater at its peak. The road
// winds round it on top in three laps, rings 16, 11 and 7, each a terrace one and a half cells above
// the last, and between laps climbs a ramp inward like a train up a mountain road; from the third lap it
// climbs to the rim (four cells up) and drops into the crater. Underneath it slides
// straight down the inside of the cone to the foot, runs up the west edge and off its corner, and comes
// back down the edge on top to the start.
//   - rails between the laps: a ring of walls and spikes halfway between two laps, never right beside the
//     road, so a missed turn on the outside of a lap ends against the rail;
//   - the slide underneath is lined with boost pads and ends in slow pads before the turn at the foot;
//   - on the long sides a crystal, a boost strip and a long chain; between chains '>=' gates.
// Colour style, fairground: a gold road over a spiral of magenta and white stripes that wind up the
// tower, a violet foot; underneath violet and grey stripes.
// Stages: long chains along the laps, a chain through every bend and every step inward, a lead-in chain
// right up to the crater and the edge, and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const C = [24, 28], EDGE = 18, CRATER = 2;
const start = [10, 37];
const runs =
  'SE14 NE16 N16 NW16 SW16 S8'                // top: the first lap, round ring 16
  + ' SE5 S3 SE11 NE11 N11 NW11 SW11 S4'      // top: up the ramp onto ring 11, the second lap
  + ' SE4 S3 SE7 NE7 N7 NW7 SW7 S2'           // top: up the ramp onto ring 7, the third lap
  + ' SE4 D'                                  // top: up to the rim and into the crater
  + ' NW16 N2 D'                              // underside: down the inside to the foot, up the edge and off it
  + ' S12 SE2 S5 SE2';                        // top: back down the edge, onto ring 16 and round to the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the cone: hex distance from the centre.
const dist = new Map();
for (let k = 0; k <= EDGE + 1; k++) for (const q of g.ring(...C, k)) if (!dist.has(key(...q))) dist.set(key(...q), k);
const dOf = (c, r) => (dist.has(key(c, r)) ? dist.get(key(c, r)) : 99);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (dOf(c, r) > CRATER && dOf(c, r) <= EDGE) g.set('both', c, r, '.');
const R = road(g, [...start, 'SE'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the cone at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// ---- relief: the laps are terraces (the height depends only on the distance from the centre), and the
// road climbs on the steps between them, half a cell up for every cell in.
const KNOTS = [[EDGE, 0], [15, 0], [12, 1.5], [11, 1.5], [8, 3], [6, 3], [3, 4], [CRATER, 4]];
const heightOf = d => {
  for (let k = 0; k + 1 < KNOTS.length; k++) {
    const [d0, h0] = KNOTS[k], [d1, h1] = KNOTS[k + 1];
    if (d <= d0 && d >= d1) return h0 + (h1 - h0) * (d0 - d) / (d0 - d1);
  }
  return 0;
};
const land = [];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (g.get(T, c, r) !== ' ') land.push(key(c, r));
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (g.get(T, c, r) === ' ' ? 0 : Math.round(heightOf(dOf(c, r)) * 4) / 4)));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the tower, face by face.
const RAILS = [13, 9];                                     // between the laps
const slide = i => R.at(i).side === B;
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const d = dOf(c, r);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (side === T) {
      if (RAILS.includes(d) && q.d >= 2) ch = mod(c + r, 3) === 0 ? '^' : '#';             // a rail
      else if (d >= 17 && q.d >= 2 && hash(c, r) < 0.08) ch = '^';                          // litter at the foot
    } else if (q.d === 1 && slide(q.i)) {
      ch = dOf(R.at(q.i).c, R.at(q.i).r) >= 15 ? '=' : '>';                                 // the slide
    } else if (q.d >= 3 && hash(c * 3 + 1, r) < 0.05) ch = '^';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 15, gate: i => mod(i, 4) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, fairground: magenta and white stripes winding up the tower, a gold road.
const angle = (c, r) => Math.atan2((r + 0.5 * (c & 1)) - (C[1] + 0.5 * (C[0] & 1)), (c - C[0]) * 0.866);
const stripe = (c, r) => mod(Math.floor((angle(c, r) / (2 * Math.PI) + dOf(c, r) / 12) * 8), 2);
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (dOf(c, r) >= 17) return side === T ? '#6600cc' : '#444444';
  if (side === T) return stripe(c, r) ? '#ff0088' : '#ffffff';
  return stripe(c, r) ? '#6600cc' : '#999999';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'helter-skelter', name: 'Level 50', kind: 'Helter Skelter', start: [...start, 'SE'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let i = 0; i < R.length; i++) { const a = R.at(i), b = R.at(i + 1); if (!a.hole && !b.hole) worst = Math.max(worst, Math.abs(height[b.r][b.c] - height[a.r][a.c])); }
  console.log('steepest step on the road:', worst);
}
