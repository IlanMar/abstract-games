// Level 70 "Halfpipe": a very hard square level with relief, a skateboard halfpipe. A square world of 32 x
// 48: a pipe of 24 x 40 in a frame of void, flat along the middle and curving up on both sides to a lip
// three and a half cells high. The road carves it like a skater: on top it rides up the east wall, along
// the lip, straight down across the bottom and up the west wall, along the other lip and back, four
// times up the pipe, then runs up the middle and off the north end; underneath it carves back down the
// same way and flies off the west lip, coming back on top along the first carve. The lips run along the
// very edge of the land, so a missed turn at the top of a wall flies off the side.
//   - the coping: slow pads along both lips, away from the road;
//   - the road is lit like a train line: boost pads beside it where it runs downhill, slow pads where it
//     climbs, every other cell;
//   - grind rails: short walls along the flat bottom halfway between two carves, and spikes halfway up
//     the walls between them, clear near the bends;
//   - underneath, the scaffolding: stripes of boost pads across the pipe between the carves;
//   - long chains, '>=' gates between chains.
// Colour style, sunset: the pipe violet at the bottom through wine to raspberry at the lips, a gold road;
// underneath the same darker with a pink road.
// Stages: long chains, a chain through every bend, lead-in chains to the ends.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 32, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 27, Y0 = 4, Y1 = 43, MID = (X0 + X1) / 2;
g.floor(X0, Y0, X1, Y1);
const start = [17, 38];
const R = road(g, [...start, 'E'],
  'E9 N6 W21 N6 E21 N6 W21 N6 E10 N10 D'      // top: four carves up the pipe, off the north end
  + ' S6 W10 S6 E21 S6 W21 S6 E21 S11 W22 D'  // underside: four carves back down, off the west lip
  + ' E14');                                  // top: out of the west lip onto the first carve
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- relief: flat along the middle, a quarter-pipe curve up each side, a straight wall to the lip.
const hOf = c => { const dx = Math.abs(c - MID) - 2; return dx <= 0 ? 0 : dx <= 4 ? dx * dx / 16 : Math.min(3.5, 1 + (dx - 4) * 0.5); };
const height = Array.from({length: H}, (_, r) => Array.from({length: W}, (_, c) => (g.get(T, c, r) === ' ' ? 0 : Math.round(hOf(c) * 4) / 4)));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the pipe, face by face.
const climb = i => height[R.at(i + 1).r][R.at(i + 1).c] - height[R.at(i).r][R.at(i).c];
for (let r = Y0; r <= Y1; r++) for (let c = X0; c <= X1; c++) {
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const lip = c === X0 || c === X1, flat = Math.abs(c - MID) <= 3, wall = Math.abs(c - MID) >= 6 && !lip;
    if (q.d === 1 && mod(q.u, 2) === 0 && !R.at(q.i).hole && !R.at(q.i + 1).hole && climb(q.i)) ch = climb(q.i) > 0 ? '=' : '>';   // the train line
    else if (lip) ch = '=';                                                                 // the coping
    else if (q.d === 3 && side === T && flat) ch = '#';                                     // grind rails
    else if (q.d === 3 && side === T && wall && mod(c, 3) === 0) ch = '^';
    else if (q.d === 3 && side === B && mod(c, 2) === 0) ch = '>';                          // the scaffolding
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(key(c, r)))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {first: 2, lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, sunset: by height, violet at the bottom to raspberry at the lips; a gold road.
const SHADE = {top: ['#550077', '#6600cc', '#b41e46', '#ff0066'], bottom: ['#550077', '#550077', '#6600cc', '#b41e46']};
const colorOf = side => (c, r) => {
  if (g.get(T, c, r) === ' ') return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  return SHADE[side][Math.min(3, Math.floor(height[r][c]))];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'halfpipe', name: 'Level 70', kind: 'Halfpipe', start: [...start, 'E'], colors, grid: g, height};
if (require.main === module) {
  console.log(g.print());
  let worst = 0;
  for (let i = 0; i < R.length; i++) if (!R.at(i).hole && !R.at(i + 1).hole) worst = Math.max(worst, Math.abs(climb(i)));
  console.log('steepest step on the road:', worst);
}
