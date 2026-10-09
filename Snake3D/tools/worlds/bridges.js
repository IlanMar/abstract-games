// Level 127 "Seven Bridges": a very hard hex level in the manner of the late classic levels Skeletal and
// Three Roads. A hex world of 64 x 72 cells: the old town of the seven bridges, the riddle no walk can
// solve, crossing each bridge once. Two arms of the river (void) cut the town into four: the north bank,
// the south bank, the cathedral island in the middle and the timber island east of it, past a channel. On
// one face the walk cannot be done, but this road has two: it crosses every bridge, some on top, some
// underneath, two of them on both, and goes down four times, into the river, into the channel and off the
// banks into the sea. The thread is uneven: stages wait up to the edge of sight, crystals lead on over the
// wooden bridges, and at some bends only the painted road shows the turn.
//   - the land: the north bank (rows 4 to 21), the river (22 to 27), the islands (28 to 43, the cathedral
//     island from column 8 to 33, the channel 34 to 38, the timber island 39 to 57), the river again (44 to
//     49), the south bank (50 to 67) and the sea; the bridges are the road over the water, the four to the
//     cathedral island three cells wide with parapets of slow pads, the other three one cell wide;
//   - the banks: quays of slow pads along the water with bollards (spikes), blocks of houses (walls, hex
//     disks of radius 2) on a grid six cells apart where they stand clear of the road, a square with a
//     fountain (a wall in a ring of boost pads) on each bank;
//   - the cathedral island: the cathedral, a ring of walls of radius 3 with a door, pews of slow pads and an
//     altar (a spike); the timber island: stacks of logs (walls in short rows) and sawdust (slow pads);
//   - underneath: cellars (walls in short rows), sewers (boost pads) and rats (spikes).
// Colour concept: an old town at dusk. On top a gold road over violet banks, the cathedral island rose and
// the timber island dark teal, caramel bridges and chocolate quays; underneath a pale blue road over dark
// teal cellars.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 64, H = 72, T = 'top', B = 'bottom';
const {mod, key, unkey, hash} = kit;
const start = [14, 10];
const runs =
  'S20 SE14 NE11 SE6 NE5 N16 NW12 SW2 S10 D'      // top: over two islands and back north, into the river
  + ' N8 NW8 SW2 S29 SE2 S14 SE8 NE8 N16 NW5 D'  // underneath: over the east bridges south, the high bridge, the channel
  + ' SE6 S13 SW16 NW12 SW2 S12 D'                // top: back over the high bridge, west and off into the sea
  + ' N8 NW2 N19 NE2 N35 D'                       // underneath: over the west bridges and off the north bank
  + ' S7';                                        // top: home
const band = r => r >= 4 && r <= 21 ? 'north' : r >= 28 && r <= 43 ? 'mid' : r >= 50 && r <= 67 ? 'south' : null;
const ground = (c, r) => {
  const b = band(r);
  if (b !== 'mid') return b;
  return c >= 8 && c <= 33 ? 'cathedral' : c >= 39 && c <= 57 ? 'timber' : null;
};
const probe = road(new Grid(W, H, true), [...start, 'S'], runs);
const land = new Set(), bridge = new Map();                 // bridge: cell -> 'stone' or 'wood'
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (ground(c, r)) land.add(key(c, r));
const g0 = new Grid(W, H, true);
for (const p of probe.cells) if (!p.hole && !ground(p.c, p.r)) {
  const stone = [12, 14, 26, 28].includes(p.c) && !band(p.r);
  bridge.set(key(p.c, p.r), stone ? 'stone' : 'wood');
  if (stone) for (const q of g0.disk(p.c, p.r, 1)) if (!ground(...q)) bridge.set(key(...q), 'stone');
}
for (const k of bridge.keys()) land.add(k);
const g = new Grid(W, H, true);
for (const k of land) g.set('both', ...unkey(k), '.');
const R = road(g, [...start, 'S'], runs);
for (const p of R.cells) if (p.hole && land.has(key(p.c, p.r))) throw new Error(`the dive at ${p.c},${p.r} is not over the water`);
const tight = i => { const p = R.at(i); return bridge.get(key(p.c, p.r)) === 'wood'; };
const runout = kit.runouts(g, R);
const water = (c, r) => !land.has(key(c, r));
const quay = (c, r) => ground(c, r) && g.disk(c, r, 1).some(q => water(...q));
const CATHEDRAL = [20, 39], FOUNTAINS = [[44, 12], [52, 58]];
const near = (c, r, [x, y], rad) => g.disk(x, y, rad).some(q => q[0] === c && q[1] === r);
const houses = new Set();
for (let r = 0; r < H; r += 6) for (let c = 0; c < W; c += 6) {
  const ctr = [c + (r / 6 % 2) * 3, r + 2];
  const disk = g.disk(...ctr, 2);
  if (disk.every(q => ['north', 'south'].includes(ground(...q)) && !quay(...q) && R.local(T, ...q).d >= 3)
    && FOUNTAINS.every(f => !disk.some(q => near(...q, f, 3)))) disk.forEach(q => houses.add(key(...q)));
}

// ---- the town and its cellars.
kit.paint(g, R, {cells: land, runout}, (side, c, r, q, n) => {
  const k = key(c, r), kind = ground(c, r);
  if (bridge.has(k)) return bridge.get(k) === 'stone' && q.d === 1 ? '=' : '.';         // a parapet
  if (side === B) {
    if (q.d >= 2 && mod(c + 3 * r, 7) === 0 && mod(c, 3) !== 0) return '#';               // a cellar
    if (mod(r, 9) === 4 && mod(c, 4) !== 0) return '>';                                    // a sewer
    return q.d >= 3 && n < 0.05 ? '^' : '.';                                               // a rat
  }
  if (quay(c, r)) return n < 0.12 ? '^' : '=';                                             // a quay, a bollard
  if (kind === 'cathedral') {
    if (near(c, r, CATHEDRAL, 3) && !near(c, r, CATHEDRAL, 2)) return r === CATHEDRAL[1] + 3 && c === CATHEDRAL[0] ? '.' : '#';
    if (c === CATHEDRAL[0] && r === CATHEDRAL[1]) return '^';                              // the altar
    if (near(c, r, CATHEDRAL, 2)) return mod(r, 2) ? '=' : '.';                            // pews
    return q.d >= 3 && n < 0.06 ? '^' : '.';
  }
  if (kind === 'timber') return mod(r, 4) === 1 && mod(c, 5) <= 2 && q.d >= 2 ? '#' : n < 0.12 ? '=' : '.';   // logs, sawdust
  for (const f of FOUNTAINS) {
    if (c === f[0] && r === f[1]) return '#';
    if (near(c, r, f, 1)) return '>';
    if (near(c, r, f, 3)) return n < 0.2 ? '=' : '.';                                      // the square
  }
  if (houses.has(k)) return '#';
  return q.d >= 3 && n < 0.03 ? '^' : '.';
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread through the town, trails of crystals over the wooden bridges, two chains at once.
let {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [5, 9, 3, 11, 7, 2], crumbs: 3, steps: [9, 6, 11, 8], rails: 3});
stages = kit.merge(R, kit.trails(stages, tight, 5));
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: an old town at dusk.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (bridge.has(k)) return '#ff3300';
  if (side === B) return '#444444';
  if (quay(c, r)) return '#993300';
  const kind = ground(c, r);
  return kind === 'cathedral' ? '#b41e46' : kind === 'timber' ? '#444444' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'bridges', name: 'Level 127', kind: 'Seven Bridges', start: [...start, 'S'], colors, grid: g};
if (require.main === module) console.log(g.print());
