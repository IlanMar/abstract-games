// Level 123 "Ranch": a hard level in the manner of the late classic level Crossed. A square world of 64 x
// 64 cells, an endless plane: a ranch cut into paddocks sixteen cells square by fences of spikes, as
// Crossed is cut by its lines of spikes. The road is a dirt track that wanders across the paddocks through
// gates, past haystacks, herds and furrows, and goes down four times into a pond to run the soil under the
// ranch. The thread is uneven: stages wait up to the edge of sight, crystals lead on along the track, and at
// some bends only the painted road shows the turn.
//   - the fences: lines of spikes on every sixteenth row and column (fourteen off the edge), a wall post at
//     every crossing and every fourth cell; where the road crosses one, a gate: the fence opens a cell
//     either side, the posts stand two cells off and a cattle grid of slow pads lies beside the road;
//   - the paddocks, each its own: a herd (spikes scattered), hay (2 x 2 walls in rows), furrows (rows of
//     slow and boost pads), a round pen (a ring of walls with a gap), mud (slow pads with pigs, spikes), an
//     orchard (lone walls on a grid with fruit, boost pads), a pond (holes ringed with reeds) and a barn
//     (walls round a floor of straw);
//   - underneath: the soil, fence posts going down, roots (spikes), burrows (walls in short runs) and
//     water pipes (boost pads);
//   - the dives: the dive cell and its two neighbours across the road, a pond through both faces.
// Colour concept: a ranch under a purple dusk. On top a sand track over violet and rose paddocks with
// chocolate fence lines, the ponds glowing raspberry; underneath a pale blue road through chocolate soil.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 64, H = 64, T = 'top', B = 'bottom';
const {mod, key, hash} = kit;
const g = new Grid(W, H);
g.floor(0, 0, W - 1, H - 1);
const start = [8, 56];
const R = road(g, [...start, 'N'],
  'N28 E12 S10 E18 N20 W6 N6 D'       // top: up the west, a loop through the middle and into the north pond
  + ' S8 E20 S24 W10 S6 D'            // underneath: back, east and the long way south to the second
  + ' N6 E16 S14 W8 D'                // top: up, east and round into the south-east pond
  + ' E10 N5 W30 S3 W21 S6 D'         // underneath: back east, then the long way west to the last
  + ' N7');                           // top: up into the start

// ---- the ponds the road dives into, and the fences.
const gap = kit.diveGaps(g, R);
const fence = x => mod(x, 16) === 14;
const paddock = (c, r) => [Math.floor(mod(c - 14, W) / 16), Math.floor(mod(r - 14, H) / 16)];
const KINDS = ['herd', 'hay', 'furrows', 'pen', 'mud', 'orchard', 'pond', 'barn'];
const kindOf = (c, r) => { const [i, j] = paddock(c, r); return KINDS[mod(i * 3 + j * 5 + (i * j) % 3, KINDS.length)]; };
const near = (c, r) => Math.min(R.local(T, c, r).d, R.local(B, c, r).d);
// A paddock's own frame: x, y from its north-west corner inside the fence (1 to 15).
const inner = (c, r) => [mod(c - 14, 16), mod(r - 14, 16)];
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  if (kindOf(c, r) !== 'pond' || fence(c) || fence(r)) continue;
  const [x, y] = inner(c, r), d = Math.hypot(x - 8, (y - 8) * 1.4);
  if (d < 3.2 && near(c, r) >= 3) gap.add(key(c, r));                                    // a pond of its own
}
kit.punch(g, R, gap, 'a pond');
const glow = kit.glow(g, gap);
const runout = kit.runouts(g, R);
const gate = new Set();                                                                  // fence cells the road opens
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if ((fence(c) || fence(r)) && R.local(T, c, r).d <= 1) gate.add(key(c, r));

// ---- the ranch and the soil under it.
kit.paint(g, R, {skip: gap, keep: [glow], runout}, (side, c, r, q, n) => {
  const [x, y] = inner(c, r), onFence = fence(c) || fence(r);
  if (side === T) {
    if (onFence) {
      if (q.d === 1) return '=';                                                         // a cattle grid
      if (q.d === 2 && (gate.has(key(...g.move(c, r, 'N'))) || gate.has(key(...g.move(c, r, 'S')))
        || gate.has(key(...g.move(c, r, 'E'))) || gate.has(key(...g.move(c, r, 'W'))))) return '#';   // a gate post
      return (fence(c) && fence(r)) || (fence(c) ? mod(r, 4) : mod(c, 4)) === 2 ? '#' : '^';
    }
    if (glow.has(key(c, r))) return n < 0.5 ? '=' : '.';                                  // reeds
    switch (kindOf(c, r)) {
      case 'herd': return q.d >= 2 && n < 0.09 ? '^' : n > 0.96 ? '=' : '.';
      case 'hay': return mod(x, 5) >= 2 && mod(x, 5) <= 3 && mod(y, 5) >= 2 && mod(y, 5) <= 3 ? '#' : '.';
      case 'furrows': return mod(y, 3) === 0 ? '=' : mod(y, 3) === 1 && mod(x, 2) ? '>' : '.';
      case 'pen': { const d = Math.round(Math.hypot(x - 7.5, y - 7.5)); return d === 5 && !(x > 6 && x < 9 && y > 10) ? '#' : d <= 1 ? '>' : '.'; }
      case 'mud': return mod(x + y, 2) === 0 ? '=' : q.d >= 2 && n < 0.07 ? '^' : '.';
      case 'orchard': return mod(x, 4) === 2 && mod(y, 4) === 2 ? '#' : mod(x, 4) === 3 && mod(y, 4) === 2 ? '>' : '.';
      case 'barn': return (x === 3 || x === 12 || y === 4 || y === 11) && x >= 3 && x <= 12 && y >= 4 && y <= 11 && !(y === 11 && x > 6 && x < 9) ? '#' : x > 3 && x < 12 && y > 4 && y < 11 && n < 0.5 ? '=' : '.';
      default: return '.';
    }
  }
  if (onFence) return (fence(c) ? mod(r, 4) : mod(c, 4)) === 2 ? '#' : '.';              // the posts going down
  if (mod(y, 8) === 4 && mod(x, 3) !== 0) return '>';                                      // a water pipe
  if (q.d >= 2 && mod(x + 2 * y, 11) === 0 && mod(x, 4) !== 0) return '#';                  // a burrow
  if (q.d >= 2 && n < 0.05) return '^';                                                    // a root
  return '.';
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread over the paddocks, two chains at once every fourth stage.
let {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [5, 4], launch: 0, gate: i => mod(i, 3) === 2,
  gaps: [6, 10, 3, 8, 11, 5], crumbs: 3, steps: [10, 7, 11, 8], rails: 3});
stages = kit.merge(R, stages);
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a ranch under a purple dusk.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff5a28', '#ff3300'] : ['#ff99cc', '#ff44aa']);
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#993300';
  if (fence(c) || fence(r)) return '#993300';
  const [i, j] = paddock(c, r);
  return (i + j) % 2 ? '#b41e46' : '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'ranch', name: 'Level 123', kind: 'Ranch', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
