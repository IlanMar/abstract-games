// Level 26 "Bulkheads": a middle classic level in the manner of Flip Side, Chamber and Queue. A solid
// square plate of 40 x 40 cells in a frame of void (the 48 x 48 tile repeats). Both faces are divided
// into compartments by bulkheads: on top they run north to south, underneath east to west, each with a
// door every few cells and a spike at every end, so where one face is walled the other is open (Weave).
// The road runs to the edge of the plate four times (north, east, south, south), falls off it and comes back underneath or on top,
// and goes through the doors of the bulkheads. Beside the road:
//   - runway lights '>..>' and strips of slow pads in the compartments (Colour Check, Queue);
//   - a chamber at two corners of the road: a ring of wall with spikes at its corners round a pad (Chamber).
// Colour concept: a riveted plate of rose and wine on top, of violet and wine underneath, the road the
// palest stripe on both.
// Stages: long chains through the doors, a chain through every pair of close bends, a lead-in chain right
// up to the edge and the next chain where the snake comes over it.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 48, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const X0 = 4, X1 = 43;                         // the plate: columns and lines 4..43
g.floor(X0, X0, X1, X1);
const start = [10, 38];
const R = road(g, [...start, 'N'],
  'N34 D'                       // top: up the west side and off the north edge
  + ' S8 E20 S12 E13 D'         // underside: down, east, down and off the east edge
  + ' W6 S10 W12 S10 D'         // top: back, down, west and off the south edge
  + ' N6 W16 S5 D'              // underside: up, west along the south and off the south edge again
  + ' N6');                     // top: up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is on the plate`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the chambers: at two corners of the road, on the face the road does not take there.
const chambers = [];
for (const n of [2, 6]) {
  const p = R.at(R.corners[n]), side = p.side === T ? B : T;
  // The chamber sits diagonally off the corner, outside the bend, three cells away.
  for (const [dx, dy] of [[4, 4], [-4, 4], [4, -4], [-4, -4]]) {
    const cc = p.c + dx, cr = p.r + dy;
    if (cc - 2 < X0 || cc + 2 > X1 || cr - 2 < X0 || cr + 2 > X1) continue;
    let ok = true;
    for (let y = -2; y <= 2 && ok; y++) for (let x = -2; x <= 2 && ok; x++) if (R.local(side, cc + x, cr + y).d < 2) ok = false;
    if (ok) { chambers.push({side, c: cc, r: cr}); break; }
  }
}

// ---- the bulkheads and the trim, face by face.
for (let r = X0; r <= X1; r++) for (let c = X0; c <= X1; c++) for (const side of [T, B]) {
  const q = R.local(side, c, r);
  if (q.d <= 1) continue;
  // Along (a) the bulkheads and across (b) them: top bulkheads are columns, underside ones are lines.
  const a = side === T ? r : c, b = side === T ? c : r;
  let ch = '.';
  if (mod(b - X0, 6) === 3) ch = mod(a - X0, 9) < 2 ? '.' : mod(a - X0, 9) === 2 || mod(a - X0, 9) === 8 ? '^' : '#';
  else if (mod(b - X0, 6) === 0) ch = mod(a - X0, 3) === 0 ? '>' : '.';          // runway lights
  else if (mod(b - X0, 6) === 5 && side === B) ch = '=';                        // a strip of slow pads underneath
  const ch2 = chambers.find(m => m.side === side && Math.max(Math.abs(c - m.c), Math.abs(r - m.r)) <= 2);
  if (ch2) {
    const ring = Math.max(Math.abs(c - ch2.c), Math.abs(r - ch2.r));
    ch = ring === 2 ? (Math.abs(c - ch2.c) === 2 && Math.abs(r - ch2.r) === 2 ? '^' : c === ch2.c ? '.' : '#') : ring === 0 ? '>' : '=';
  }
  if (/[#^]/.test(ch) && runout[side].has(key(c, r))) ch = '.';
  if (ch !== '.') g.set(side, c, r, ch);
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [9, 12], lead: [6, 4], pair: 4, gate: i => R.at(i).side === B});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours: rose and wine on top, violet and wine underneath, in compartments; the road the palest.
const colorOf = side => (c, r) => {
  if (c < X0 || c > X1 || r < X0 || r > X1) return side === T ? '#b41e46' : '#6600cc';
  if (R.has(side, c, r)) { const i = R.local(side, c, r).i; return side === T ? (mod(i, 4) < 2 ? '#ff5a28' : '#ff3300') : (mod(i, 4) < 2 ? '#ff99cc' : '#ff44aa'); }
  const b = side === T ? c : r, room = Math.floor((b - X0 + 3) / 6) % 2;
  if (R.local(side, c, r).d === 1) return side === T ? '#ff0066' : '#ff00ff';
  return side === T ? (room ? '#b41e46' : '#ff0088') : (room ? '#6600cc' : '#b41e46');
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'bulkheads', name: 'Level 26', kind: 'Bulkheads', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
