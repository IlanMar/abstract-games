// Level 129 "Organ": a very hard level in the manner of the late classic level Zig-Zag, over the void. A
// square world of 64 x 64 cells, all void but a pipe organ: the wind chest, a rank of pipes standing up
// from it in a tower, tallest in the middle, and the console below. The road runs along the chest, climbs
// a pipe through its tunnel to the open top and drops off it, comes down the same pipe on the other face,
// and so from pipe to pipe, the faces taking turns, then down the east tower to the console, the length of
// the keyboard in a long launch and back up to the chest. The thread is uneven: stages wait up to the edge
// of sight, crystals lead on along the chest, and at some bends only the painted road shows the turn.
//   - the chest: three cells wide from column 3 to 59 at row 40, its edges studded with stops (slow and
//     boost pads); the towers at both ends down to the console;
//   - the speaking pipes: six, three cells wide, 14, 22 and 30 cells tall, the tunnel of a Zig-Zag inside
//     each (a wall right beside the road on both sides wherever the road is straight), the mouth (slow
//     pads) four cells above the chest; between them six dummy pipes half as tall, their feet in walls;
//   - the console: seven rows, black keys (walls in twos and threes) above the road, pedals (slow pads)
//     below;
//   - underneath: wind trunks (boost pads), struts (walls) and dust (spikes).
// Colour concept: an organ in a dark church. On top a gold road through dark tin pipes on a chocolate
// chest, the dummy pipes violet, a rose console; underneath a pale blue road over the dark teal back.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 64, H = 64, T = 'top', B = 'bottom';
const {mod, key, unkey, hash} = kit;
const start = [40, 54];
const runs =
  'W36 N14 E5 N14 D'                 // top: along the keyboard, up the west tower and the first pipe
  + ' S15 E8 N22 D'                  // underneath: down it, along the chest and up the second
  + ' S23 E8 N30 D'                  // top: and so on up the tower, the faces taking turns
  + ' S31 E8 N30 D'
  + ' S31 E8 N22 D'
  + ' S23 E8 N14 D'
  + ' S15 E9 S14 W18';               // top: down the last pipe, the east tower and along the keyboard home
const CHEST = 40, CONSOLE = 54;
const PIPES = [[9, 14], [17, 22], [25, 30], [33, 30], [41, 22], [49, 14]];   // column, height above the chest
const DUMMY = [[13, 7], [21, 11], [29, 15], [37, 15], [45, 11], [53, 7]];
const pipeAt = (c, r) => [...PIPES, ...DUMMY].find(([x, h]) => Math.abs(c - x) <= 1 && r < CHEST - 1 && r >= CHEST - h);
const speaking = (c, r) => PIPES.some(([x, h]) => Math.abs(c - x) <= 1 && r < CHEST - 1 && r >= CHEST - h);

// ---- the land.
const land = new Set();
for (let c = 3; c <= 59; c++) for (let r = CHEST - 1; r <= CHEST + 1; r++) land.add(key(c, r));
for (const x of [4, 58]) for (let r = CHEST; r <= CONSOLE; r++) for (let c = x - 1; c <= x + 1; c++) land.add(key(c, r));
for (let c = 3; c <= 59; c++) for (let r = CONSOLE - 3; r <= CONSOLE + 3; r++) land.add(key(c, r));
for (const [x, h] of [...PIPES, ...DUMMY]) for (let r = CHEST - h; r < CHEST - 1; r++) for (let c = x - 1; c <= x + 1; c++) land.add(key(c, r));
const g = new Grid(W, H);
for (const k of land) g.set('both', ...unkey(k), '.');
const R = road(g, [...start, 'W'], runs);
for (const p of R.cells) if (p.hole && land.has(key(p.c, p.r))) throw new Error(`the dive at ${p.c},${p.r} is not over the void`);
const runout = kit.runouts(g, R);
const shield = (side, c, r) => speaking(c, r) && r <= CHEST - 6 || speaking(c, r) && r === CHEST - 2;

// ---- the organ and its back.
kit.paint(g, R, {cells: land, runout, shield}, (side, c, r, q, n) => {
  const pipe = pipeAt(c, r), y = r - CONSOLE;
  if (side === B) {
    if (pipe) return q.d === 1 && mod(r, 3) === 0 ? '>' : '.';                              // a wind trunk
    if (q.d >= 2 && mod(c, 6) === 0) return '#';                                             // a strut
    return q.d >= 2 && n < 0.05 ? '^' : '.';                                                 // dust
  }
  if (pipe) {
    const [x] = pipe, speak = speaking(c, r);
    if (r === CHEST - 4 || r === CHEST - 5) return c === x ? '.' : '=';                        // the mouth
    if (!speak && r === CHEST - 2) return '#';                                               // a dummy's foot
    if (c !== x) return '#';                                                                 // the tin
    return speak ? '.' : mod(r, 3) === 0 ? '^' : '=';
  }
  if (r === CHEST - 1 || r === CHEST + 1) return mod(c, 3) === 0 ? '>' : mod(c, 3) === 1 ? '=' : '.';   // stops
  if (r >= CONSOLE - 3 && r <= CONSOLE + 3 && c >= 6 && c <= 56) {
    if (y <= -2) return [1, 2, 4, 5, 6].includes(mod(c, 7)) && mod(c, 2) ? '#' : '.';         // black keys
    if (y >= 2) return mod(c, 3) !== 2 ? '=' : '.';                                          // pedals
  }
  return '.';
});
kit.checkRoad(g, R, shield);

// ---- stages: an uneven thread up and down the pipes, a launch along the keyboard, two chains at once.
let {stages, pads} = autoStages(R, {first: 13, lengths: [13, 16], lead: [6, 4], launch: 20, gate: i => mod(i, 3) === 1,
  gaps: [5, 9, 3, 11, 7, 2], crumbs: 3, steps: [9, 6, 11, 8], rails: 3});
// No launch right where the snake comes out of a pipe: the stage selector would start the snake on the
// crystal facing the open top. The chain there begins at the way out, as after any dive.
for (let k = stages.length - 2; k >= 0; k--) {
  const [kind, i] = stages[k][0];
  if (stages[k].length !== 1 || kind !== 'gem' || !R.at(i - 1).hole) continue;
  pads = pads.filter(([j, ch]) => !(ch === '>' && (j === i + 1 || j === i + 2)));
  stages[k + 1][0][1] = i;
  stages.splice(k, 1);
}
stages = kit.merge(R, stages);
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: an organ in a dark church.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (side === B) return '#444444';
  if (pipeAt(c, r)) return speaking(c, r) ? '#444444' : '#6600cc';
  if (r >= CONSOLE - 3) return '#b41e46';
  return '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'organ', name: 'Level 129', kind: 'Organ', start: [...start, 'W'], colors, grid: g};
if (require.main === module) console.log(g.print());
