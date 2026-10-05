// Level 39 "Meander": a hard level in Art Deco gold and purple. A square world of 56 x 44 cells, mostly
// void: two friezes of a Greek-key meander hang in the dark, one above the other. The road runs the upper
// frieze east on top, tooth after tooth (up six, across three, down six, across three ...), drops off its
// east end, comes back underneath, crosses down to the lower frieze and runs it west with the teeth
// pointing down, drops off its west end and climbs back to the start on top. The bends come every three
// to six cells the whole way.
//   - the frieze is framed: a gold rim of wall two cells out from the road, studded with spikes;
//   - inside each tooth a fan of boost pads opens up, and the gaps between teeth hold slow pads;
//   - on the face the road does not take over a frieze, the teeth are drawn in boost pads, like inlay.
// Colour style, Art Deco: a gold road (two golds) over bright purple, a deep violet rim, magenta fans.
// Stages: long chains along the teeth, a chain through every pair of close bends, a lead-in chain right
// up to each end of a frieze and the next chain where the snake comes out.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 56, H = 44, T = 'top', B = 'bottom';
const g = new Grid(W, H);
const start = [10, 33];
const TEETH_UP = 'E3 N6 E3 S6 E3 N4 E3 S4 E3 N6 E3 S6 E3 N4 E3 S4 E3 N6 E3 S6';
const TEETH_DOWN = 'W3 S6 W3 N6 W3 S4 W3 N4 W3 S6 W3 N6 W3 S4 W3 N4 W3 S6 W3 N6';
const R = road(g, [...start, 'N'],
  'N13 W8 N6 E4 '                     // top: up and round onto the upper frieze
  + TEETH_UP + ' E8 D'               // top: the upper frieze east and off its end
  + ' W6 S20 ' + TEETH_DOWN + ' W4 D'  // underside: back, down to the lower frieze and along it west, off its end
  + ' E6 N1');                       // top: back and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const OTHER = {top: B, bottom: T};

// ---- the land: two cells round the road on either face; the dive cells and the cells past them void.
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (Math.min(R.local(T, c, r).d, R.local(B, c, r).d) <= 2) land.add(key(c, r));
for (const p of R.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.move(p.c, p.r, p.h))); }
for (const p of R.cells) if (!p.hole && !land.has(key(p.c, p.r))) throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.move(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// Inside a tooth: a cell between the two legs of a tooth, on the side the tooth points to.
const tooth = (side, c, r) => {
  const q = R.local(side, c, r);
  if (q.d !== 1) return false;
  let n = 0;
  for (const o of R.nbrs(c, r)) if (R.has(side, ...o)) n++;
  return n >= 4;                           // hemmed in by the road on both sides
};

// ---- what stands on the land, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r), o = R.local(OTHER[side], c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (q.d === 2) ch = mod(q.u, 4) === 0 ? '^' : '#';                        // the gold rim
    else if (q.d === 1) ch = tooth(side, c, r) ? (mod(c + r, 2) ? '>' : '.') : '.';   // fans in the teeth
    else if (o.d === 0) ch = mod(o.i, 2) ? '>' : '.';                          // inlay under the other road
    else if (o.d === 1) ch = '=';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [10, 13], lead: [4, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, Art Deco: gold on purple.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff5a28';
  if (q.d === 1) return tooth(side, c, r) ? '#ff0088' : '#cc00ff';
  return '#6600cc';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'meander', name: 'Level 39', kind: 'Meander', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
