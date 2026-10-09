// Level 117 "Rose Window": a very hard level, a long one, over the void. A hex world of 72 x 72 cells, all
// void but a great round window of stained glass and the road. The road comes in from the dark on a narrow
// ribbon, crosses the glass ring by ring between the leads, and drops through the oculus in the middle to
// run the back of the window; out in the corners it runs on the ribbon alone over the void. The leads are
// walls with gaps, the tracery leaves foils open to the void, and a missed turn can carry the snake off the
// edge of the glass. The thread is uneven: stages wait up to the edge of sight, crystals lead on across the
// panes, and at some bends only the painted road shows the turn.
//   - the window: a disk of radius 31 round the middle; the road and a cell either side of it are land
//     too;
//   - the leads: rings at radius 10, 20 and 31 (the stone frame) in walls, twelve mullions (walls) between
//     radius 10 and 20, all from two cells off the road;
//   - the tracery: twelve foils, holes of radius one at radius 25 between the mullions, where they stand
//     three cells clear of the road; six small ones at radius 5;
//   - the panes: twelve sectors and three rings of colour; rays of light (boost pads) down the middle of the
//     outer panes, cracks (slow pads) and shards (spikes) here and there;
//   - the back of the window: an iron armature (walls) in a lattice with gaps, pigeons (spikes);
//   - the dives: the dive cell and its neighbours that are not road stay void.
// Colour concept: a rose window at dusk. On top a gold road across violet, wine and dark teal panes in olive
// leads, underneath a pale blue road over the dark back of the glass; the ribbon over the void is rose.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 72, H = 72, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [67, 50];
const R = road(g, [...start, 'N'],
  'N20 NE12 SE4 S24 D'                              // top: up the east over the void, round the edge and down the west
  + ' N6 NE8 SE17 S23 D'                            // the back: back, across the window and down off its south
  + ' N10 NW14 N20 NE14 N8 NE12 SE12 S16 SW12 NW12 D'   // top: up from the dark, round the west and north of the glass and into the oculus
  + ' SE8 S12 SE14 S6 D'                            // the back: out, south and down off the south-east of the glass
  + ' N6 NE10 N6');                                 // top: up the east into the start
const {mod, key, hash} = kit;
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
const CX = 36, CY = 36;
const SX = Math.sqrt(3) / 2;
const rings = new Map();                                     // cell -> distance from the middle, rounded
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const d = Math.hypot((c - CX) * SX, r + mod(c, 2) / 2 - CY - mod(CX, 2) / 2);
  if (d < 31.5) rings.set(key(c, r), Math.round(d));
}
const angle = (c, r) => mod(Math.atan2((r + mod(c, 2) / 2) - (CY + mod(CX, 2) / 2), (c - CX) * SX) * 180 / Math.PI, 360);
const sector = (c, r) => Math.floor(angle(c, r) / 30);

// Past every corner three cells straight on stay clear, with the cells round them, on both faces.
const ro = kit.runouts(g, R), runout = new Set([...ro.top, ...ro.bottom]);

// ---- the land: the window and the ribbon; the tracery and the dives stay void.
const land = new Set(rings.keys());
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (near(c, r) <= 1) land.add(key(c, r));
const foil = new Set();
for (let n = 0; n < 12; n++) {
  const a = (30 * n + 15) * Math.PI / 180;
  for (const [rad, size] of [[25, 1], [5, 0]]) {
    if (rad === 5 && n % 2) continue;
    const x = CX + Math.cos(a) * rad / SX, y = CY + Math.sin(a) * rad, c = Math.round(x), r = Math.round(y - mod(c, 2) / 2 + mod(CX, 2) / 2);
    const disk = g.disk(c, r, size);
    if (g.disk(c, r, size + 2).every(q => near(...q) >= 2 && !runout.has(key(...q)))) disk.forEach(q => foil.add(key(...q)));
  }
}
const pit = kit.diveGaps(g, R);
for (const k of [...foil, ...pit]) land.delete(k);
for (const p of R.cells) if (!p.hole && !land.has(key(p.c, p.r))) throw new Error(`the road runs over the void at ${p.c},${p.r}`);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const glow = kit.glow(g, [...foil, ...pit]);
const lead = (c, r) => {
  const k = rings.get(key(c, r));
  if (k === undefined) return false;
  if (k === 10 || k === 20 || k === 31) return true;
  return k > 10 && k < 20 && Math.abs(mod(angle(c, r) + 15, 30) - 15) < 60 / k;   // a mullion
};

// ---- the glass and the back of it. Nothing sharp next to the road on its own face.
kit.paint(g, R, {cells: land, keep: [glow], runout: {top: runout, bottom: runout}}, (side, c, r, q, n) => {
  const ring = rings.get(key(c, r));
  if (ring === undefined) return '.';                                                                // the ribbon over the void
  if (side === T) {
    if (lead(c, r)) return '#';
    if (ring > 20 && Math.abs(mod(angle(c, r), 30) - 15) < 2.5 && mod(ring, 2) === 0) return '>';     // a ray of light
    if (q.d >= 2 && n < 0.05) return '=';                                                            // a crack
    if (q.d >= 3 && n < 0.09) return '^';                                                            // a shard
    return '.';
  }
  if (mod(c, 8) === 4 && mod(r, 3) !== 0 || mod(r, 9) === 4 && mod(c, 4) !== 0) return '#';           // the armature
  if (q.d >= 3 && n < 0.04) return '^';                                                              // a pigeon
  return '.';
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread over a long lap.
const {stages, pads} = autoStages(R, {first: 13, lengths: [11, 14], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [6, 10, 3, 8, 11, 5], crumbs: 2, steps: [9, 7, 11, 6], rails: 3});
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a rose window at dusk.
const PANE = [['#6600cc', '#b41e46'], ['#444444', '#6600cc'], ['#b41e46', '#444444']];
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r), ring = rings.get(k);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (glow.has(k)) return '#ff0066';
  if (ring === undefined) return '#ff44aa';
  if (side === B) return '#444444';
  if (lead(c, r)) return '#993300';
  return PANE[ring < 10 ? 0 : ring < 20 ? 1 : 2][sector(c, r) % 2];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'rosewindow', name: 'Level 117', kind: 'Rose Window', start: [...start, 'N'], colors, grid: g};
if (require.main === module) { console.log(g.print()); console.log('foils', foil.size); }
