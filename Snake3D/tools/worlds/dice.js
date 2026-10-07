// Level 66 "Dice": a hard square level. A square world of 48 x 32, all void but six dice faces of twelve by
// twelve floating in two rows (one to three on top, six to four below), and bridges where the road runs
// between them. Every pip is a hole of two by two right through the die. The road runs up the six and
// drops into the one's single pip; underneath it crosses to the two and runs off its top edge; on top it
// runs over the two into the middle pip of the three; underneath it comes down the gap and drops into
// the five's middle pip; on top it comes home along the bottom of the five and the six.
//   - every pip the road does not take is ringed with spikes on top and slow pads underneath, as the
//     classic Vents rings its vents; the pips it drops into are ringed with slow pads on both faces;
//   - the rims of the dice: a wall at every corner, boost pads along the edges every third cell;
//   - the bridges between the dice are tunnels: a wall right beside the road on both sides, a spike
//     every fifth cell, clear near the bends (Zig-Zag);
//   - long chains, '>=' gates between chains, two chains at once on every third stage.
// Colour style, casino: every die its own shade of raspberry, cherry and violet, a gold road, the
// underside in the same colours darker.
// Stages: long chains, a chain through every bend, lead-in chains to the pips.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 32, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [7, 26];
const runs =
  'N17 D'                    // top: up the six and into the one's pip
  + ' S6 E16 N12 D'          // underside: down to the gap, across to the two and off its top edge
  + ' S6 E15 D'              // top: down the two and into the three's middle pip
  + ' W6 S16 W8 D'           // underside: down the gap and into the five's middle pip
  + ' E8 S6 W25 N3';         // top: round the bottom of the five and the six home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;

// ---- the dice: [column, row, value]; pips at 2, 5 and 8 cells in, two by two.
const DICE = [[2, 2, 1], [18, 2, 2], [34, 2, 3], [2, 18, 6], [18, 18, 5], [34, 18, 4]];
const PIPS = {1: ['C'], 2: ['TL', 'BR'], 3: ['TL', 'C', 'BR'], 4: ['TL', 'TR', 'BL', 'BR'],
  5: ['TL', 'TR', 'C', 'BL', 'BR'], 6: ['TL', 'TR', 'ML', 'MR', 'BL', 'BR']};
const AT = {TL: [2, 2], TR: [8, 2], ML: [2, 5], C: [5, 5], MR: [8, 5], BL: [2, 8], BR: [8, 8]};
const pips = [];                                   // [c, r] of the top-left cell of every pip
for (const [fc, fr, v] of DICE) for (const p of PIPS[v]) pips.push([fc + AT[p][0], fr + AT[p][1]]);
const pipCells = new Map();                        // cell -> pip number
pips.forEach(([c, r], n) => { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pipCells.set(key(c + a, r + b), n); });
const dieOf = (c, r) => DICE.findIndex(([fc, fr]) => c >= fc && c < fc + 12 && r >= fr && r < fr + 12);

// ---- the land: the dice and a bridge three cells wide under the road.
const probe = road(new Grid(W, H), [...start, 'N'], runs);
const land = new Set();
for (const [fc, fr] of DICE) for (let r = fr; r < fr + 12; r++) for (let c = fc; c < fc + 12; c++) land.add(key(c, r));
for (const p of probe.cells) if (!p.hole) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) land.add(key(mod(p.c + a, W), mod(p.r + b, H)));
for (const k of pipCells.keys()) land.delete(k);
for (const p of probe.cells) if (p.hole && !pipCells.has(key(p.c, p.r))) { land.delete(key(p.c, p.r)); land.delete(key(...g.move(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in a hole`);
const taken = new Set(R.cells.filter(p => p.hole && pipCells.has(key(p.c, p.r))).map(p => pipCells.get(key(p.c, p.r))));

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const turn = i => R.corners.includes(mod(i, R.length)) || R.at(i).hole || R.at(i + 1).hole;
const shielded = i => { for (let n = -3; n <= 4; n++) if (turn(i + n)) return false; return true; };
// Distance (in the square ring sense) from a cell to a pip: 1 for the ring right round it.
const pipRing = (c, r) => {
  for (const [n, [pc, pr]] of pips.entries()) {
    const dc = Math.max(pc - c, c - pc - 1), dr = Math.max(pr - r, r - pr - 1);
    if (Math.max(dc, dr) === 1) return n;
  }
  return -1;
};

// ---- the dice, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  const die = dieOf(c, r);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const ring = pipRing(c, r);
    if (die < 0) { if (q.d === 1 && shielded(q.i)) ch = mod(q.u, 5) === 0 ? '^' : '#'; }          // the tunnels
    else if (ring >= 0) ch = taken.has(ring) ? '=' : (side === T ? '^' : '=');                      // round the pips
    else {
      const [fc, fr] = DICE[die], x = c - fc, y = r - fr;
      const edge = x === 0 || y === 0 || x === 11 || y === 11;
      if ((x === 0 || x === 11) && (y === 0 || y === 11)) ch = '#';                                 // the corners
      else if (edge && mod(x + y, 3) === 0) ch = side === T ? '>' : '=';                           // the rims
      else if (side === B && (x === 5 || x === 6 || y === 5 || y === 6) && mod(x + y, 2) === 0) ch = '>';   // a cross underneath
    }
    if (/[#^]/.test(ch) && (die >= 0 ? q.d <= 1 : false)) ch = '.';
    if (/[#^]/.test(ch) && runout[side].has(k)) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}

// ---- stages: two chains together every third stage, never across a dive or in a tunnel.
const {stages, pads} = autoStages(R, {lengths: [12, 15], lead: [6, 4], launch: 0, gate: i => mod(i, 2) === 0});
const inDie = i => dieOf(R.at(i).c, R.at(i).r) >= 0;
const merged = [];
for (let k = 0; k < stages.length; k++) {
  const a = stages[k], b = stages[k + 1];
  if (k % 3 === 1 && b && a.every(gr => gr[0] === 'chain') && b.every(gr => gr[0] === 'chain') && inDie(a[0][1]) && inDie(b[0][2])
    && !R.dives.some(d => d > a[0][1] && d < b[0][1])) { merged.push([...a, ...b]); k++; }
  else merged.push(a);
}
placeStages(g, R, merged);
putPads(g, R, pads);

// ---- colours, casino: a shade per die, a gold road, wine bridges; underneath darker.
const FACES = {top: ['#ff0066', '#cc00ff', '#ff0088', '#b41e46', '#ff44aa', '#6600cc'],
  bottom: ['#b41e46', '#6600cc', '#b41e46', '#550077', '#6600cc', '#550077']};
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return side === T ? (mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800') : (mod(q.i, 4) < 2 ? '#ff44aa' : '#ff0088');
  const die = dieOf(c, r);
  return die < 0 ? '#993300' : FACES[side][die];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'dice', name: 'Level 66', kind: 'Dice', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
