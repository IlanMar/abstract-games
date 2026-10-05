// Level 40 "Snowflake": a hard level in ice. A hex world of 48 x 56 cells, all void but one great snow
// crystal: a hub with six arms one cell wide. The road goes round the hub and out along every arm: out to
// the tip on one face, off the end, and back along the other face of the same arm to the hub, then on round
// the hub to the next arm. Six arms, six dives; every arm is driven both ways, once on each face.
//   - every arm grows two pairs of twigs, slanting out at 60 degrees, each with an icicle (a spike) at its
//     tip: dead ends a snake that misses nothing will never take;
//   - the hub is a frozen crystal: a ring of icicles at its corners round slow pads, walls round a boost
//     pad at the heart.
// Colour style, ice: a road of white ice (bright cyan) over grey-teal frost, dark teal twigs, a single
// violet glint at the heart.
// Stages: long chains along the arms, a lead-in chain right up to each tip and the next chain where the
// snake comes out on the other face.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const C = [24, 28], HUB = 5, ARM = 12;
const start = [24, 20];
const R = road(g, [...start, 'N'],
  'N9 D S13'                // top: out along the north arm; back underneath
  + ' SE5 NE12 D SW13'      // underside: round to the north-east arm and out; back on top
  + ' S5 SE12 D NW13'       // top: the south-east arm; back underneath
  + ' SW5 S12 D N13'        // underside: the south arm; back on top
  + ' NW5 SW12 D NE13'      // top: the south-west arm; back underneath
  + ' N5 NW12 D SE13'       // underside: the north-west arm; back on top
  + ' NE5 N3');             // top: round to the north corner and up into the start
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const ROT = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];

// ---- the land: the road, the hub and the twigs.
const land = new Set();
for (const p of R.cells) if (!p.hole) land.add(key(p.c, p.r));
const hub = new Map();
for (let k = 0; k < HUB; k++) g.ring(...C, k).forEach((q, j) => hub.set(key(...q), {k, corner: k === 0 || j % k === 0}));
for (const k of hub.keys()) land.add(k);
// Twigs: from the arm cells 5 and 9 out from the hub corner, two cells and three cells long, at 60 degrees
// either side of the arm.
const twig = new Map();
ROT.forEach((dir, a) => {
  let p = g.ring(...C, HUB)[a * HUB];
  for (let n = 1; n <= ARM; n++) {
    p = g.step(...p, dir);
    if (n !== 5 && n !== 9) continue;
    for (const side of [ROT[(a + 1) % 6], ROT[(a + 5) % 6]]) {
      let q = p;
      const len = n === 5 ? 3 : 2;
      for (let m = 1; m <= len; m++) { q = g.step(...q, side); twig.set(key(...q), m === len); }
    }
  }
});
for (const k of twig.keys()) { if (R.has(T, ...k.split(',').map(Number)) || R.has(B, ...k.split(',').map(Number))) throw new Error(`a twig at ${k} lies on the road`); land.add(k); }
for (const p of R.cells) if (p.hole && land.has(key(p.c, p.r))) throw new Error(`the dive at ${p.c},${p.r} is not in the void`);
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}

// ---- the ice, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    const h = hub.get(k);
    if (h) ch = h.k === 0 ? '>' : h.k === 1 ? '#' : h.k === 2 ? '=' : h.k === 3 ? (h.corner ? '^' : '.') : '.';
    else if (twig.has(k)) ch = twig.get(k) ? '^' : '.';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [11, 13], lead: [4, 3]});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, ice: white ice on grey-teal frost.
const colorOf = side => (c, r) => {
  const q = R.local(side, c, r), k = key(c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ffffff' : '#dddddd';
  if (hub.has(k)) return hub.get(k).k === 0 ? '#cc00ff' : hub.get(k).k % 2 ? '#999999' : '#444444';
  if (twig.has(k)) return '#444444';
  return '#999999';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'snowflake', name: 'Level 40', kind: 'Snowflake', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
