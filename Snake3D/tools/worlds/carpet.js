// Level 124 "Carpet": a very hard level in the manner of the late classic levels Riddled and Shielded. A
// square world of 54 x 54 cells, an endless plane: a Sierpinski carpet woven as a rug, riddled with holes of
// three sizes, a great one in the middle, eight of six cells and sixty-four of two. The road keeps to the
// lanes between the holes, a lane of two cells with a border of slow pads on either side as in Shielded,
// often right beside a hole, so a missed turn drops the snake onto the back of the rug; four times it goes
// down on purpose into a big hole. The thread is uneven: stages wait up to the edge of sight, crystals lead
// on along the lanes, and at some bends only the painted road shows the turn.
//   - the carpet: the cell (c, r) is a hole when, in units of two cells, some digit of both coordinates in
//     base three is a one; the lanes run on every sixth line (five off the edge);
//   - the borders: the ring round every small hole, slow pads on top, boost pads underneath, its corners
//     spikes where they stand clear of the road;
//   - the knots: where four lanes meet away from the road, a spike on top and a 2 x 2 wall underneath;
//   - the rings round the big holes: a wall in every other cell of the ring two cells out, where clear;
//   - the dives: two into the great hole, two into the holes of six.
// Colour concept: a rug of wine and violet by night. On top a gold road along wine and violet blocks with
// chocolate borders, the big holes glowing raspberry; underneath a pale blue road over the dark back.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 54, H = 54, T = 'top', B = 'bottom';
const {mod, key} = kit;
const hole = (c, r) => { let u = c >> 1, v = r >> 1; while (u || v) { if (u % 3 === 1 && v % 3 === 1) return true; u = Math.floor(u / 3); v = Math.floor(v / 3); } return false; };
const small = (c, r) => mod(c, 6) >= 2 && mod(c, 6) <= 3 && mod(r, 6) >= 2 && mod(r, 6) <= 3;
const g = new Grid(W, H);
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!hole(c, r)) g.set('both', c, r, '.');
const start = [17, 50];
const R = road(g, [...start, 'N'],
  'N33 W12 N12 E12 S6 E6 S6 D'        // top: up beside the great hole, round the north-west and into it
  + ' N13 E12 S12 E6 S12 W5 D'        // the back: out north, east and down into the great hole from the east
  + ' E6 S12 E12 S6 W5 D'             // top: out east, round and into the south-east hole
  + ' E6 S6 W42 N5 D'                 // the back: the long way west along the south and up into the south-west hole
  + ' S6 E6 N3');                     // top: home
for (const p of R.cells) if (p.hole && !hole(p.c, p.r)) throw new Error(`the dive at ${p.c},${p.r} is not into a hole`);
const big = new Set();                                                       // cells of the big holes
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (hole(c, r) && !small(c, r)) big.add(key(c, r));
const glow = kit.glow(g, big);
const runout = kit.runouts(g, R);
// Chebyshev distance to the nearest big hole, up to 3.
const ring = (c, r) => { for (let d = 1; d <= 3; d++) for (let y = -d; y <= d; y++) for (let x = -d; x <= d; x++) if (big.has(key(mod(c + x, W), mod(r + y, H)))) return d; return 9; };

// ---- the carpet, face by face.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (!hole(c, r)) land.add(key(c, r));
kit.paint(g, R, {cells: land, keep: [glow], runout}, (side, c, r, q) => {
  const x = mod(c, 6), y = mod(r, 6);
  const border = x >= 1 && x <= 4 && y >= 1 && y <= 4 && !small(c, r) && hole(c - x + 2, r - y + 2);
  const corner = (x === 1 || x === 4) && (y === 1 || y === 4);
  const knot = (x === 5 || x === 0) && (y === 5 || y === 0);
  if (ring(c, r) === 2 && mod(c + r, 2) === 0 && q.d >= 2) return '#';
  if (side === T) {
    if (border) return corner && q.d >= 2 ? '^' : '=';
    if (knot && q.d >= 3 && x === 0 && y === 0) return '^';
    return '.';
  }
  if (border) return corner ? '.' : '>';
  if (knot && q.d >= 3) return '#';
  return '.';
});
kit.checkRoad(g, R);

// ---- stages: an uneven thread along the lanes, two chains at once every fourth stage.
let {stages, pads} = autoStages(R, {lengths: [13, 16], lead: [6, 4], launch: 0, gate: i => mod(i, 3) === 0,
  gaps: [5, 10, 3, 8, 11, 6], crumbs: 3, steps: [9, 6, 11, 7], rails: 3});
stages = kit.merge(R, stages);
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a rug of wine and violet by night.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (glow.has(k)) return '#ff0066';
  if (side === B) return '#444444';
  const x = mod(c, 6), y = mod(r, 6);
  if (x >= 1 && x <= 4 && y >= 1 && y <= 4) return '#993300';
  return (Math.floor(c / 18) + Math.floor(r / 18)) % 2 ? '#6600cc' : '#b41e46';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'carpet', name: 'Level 124', kind: 'Carpet', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
