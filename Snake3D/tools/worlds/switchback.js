// Level 52 "Switchback": a very hard hex level in the colours of the classic Snake Road and Shrivel. A
// hex world of 48 x 56, all void but a comb of bridges three cells wide: the road climbs and falls in
// long legs joined by hairpins (two 60-degree turns two cells apart), five legs on top running east, then
// drops off the end of the last leg and comes back west underneath on five legs of its own, set between
// the legs on top, so between any two bridges there is a gap of open void one cell wide.
//   - every hairpin stands on an island of radius two; the bridges are lit with boost pads on the
//     straights and slow pads before every hairpin, as in Snake Road;
//   - where a bridge on one face runs under the road of the other, its far cells carry spikes;
//   - long chains along the legs, one chain through every hairpin, '>=' gates between chains.
// Colour style, classic sea (Snake Road, Shrivel): bands of blue to green by line, a gold road.
// Stages: long chains, one chain through every hairpin, a lead-in chain right up to each end.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const W = 48, H = 56, T = 'top', B = 'bottom';
const g = new Grid(W, H, true);
const start = [4, 40];
const runs =
  'N26 NE4 SE4 S28 SE4 NE4 N28 NE4 SE4 S28 SE4 NE4 N28 D'        // top: five legs east
  + ' S6 SE4 S21 SW4 NW4 N28 NW4 SW4 S28 SW4 NW4 N28 NW4 SW4 S28 SW4 S6 D'   // underside: legs west
  + ' N11';                                                     // top: home
const mod = (a, n) => ((a % n) + n) % n;
const key = (c, r) => `${c},${r}`;
const hash = (c, r) => { let h = c * 374761393 + r * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---- the land: bridges (the road and one cell either side) and an island at every hairpin.
const probe = road(new Grid(W, H, true), [...start, 'N'], runs);
const land = new Set();
for (const p of probe.cells) if (!p.hole) for (const q of g.disk(p.c, p.r, 1)) land.add(key(...q));
for (const k of probe.corners) { const p = probe.at(k); if (p.h === 'N' || p.h === 'S') continue; for (const q of g.disk(p.c, p.r, 2)) land.add(key(...q)); }
for (const p of probe.cells) if (p.hole) { land.delete(key(p.c, p.r)); land.delete(key(...g.step(p.c, p.r, p.h))); }
for (const k of land) g.set('both', ...k.split(',').map(Number), '.');
const R = road(g, [...start, 'N'], runs);
for (const p of R.cells) if (!p.hole && g.get(T, p.c, p.r) === ' ') throw new Error(`the road leaves the land at ${p.c},${p.r}`);
for (const p of R.cells) if (p.hole && g.get(T, p.c, p.r) !== ' ') throw new Error(`the dive at ${p.c},${p.r} is not in the void`);

// Past every corner three cells straight on stay clear on its face, with the cells round them.
const runout = {top: new Set(), bottom: new Set()};
for (const k of R.corners) {
  const p = R.at(k);
  let q = [p.c, p.r];
  for (let n = 0; n < 3; n++) { q = g.step(...q, p.h); for (const o of [q, ...R.nbrs(...q)]) runout[p.side].add(key(...o)); }
}
const toCorner = i => { let n = 0; while (n < 40 && !R.corners.includes(i + n) && !R.at(i + n).hole) n++; return n; };

// ---- the bridges, face by face.
for (const k of land) {
  const [c, r] = k.split(',').map(Number);
  for (const side of [T, B]) {
    const q = R.local(side, c, r);
    if (q.d === 0) continue;
    let ch = '.';
    if (q.d === 1) {
      const n = toCorner(q.i);
      if (n >= 1 && n <= 3) ch = '=';                                   // brake before the hairpin
      else if (n >= 7 && mod(q.u, 3) === 0) ch = '>';                   // lights on the straights
    } else if (q.d >= 3) ch = hash(c * 2 + (side === T ? 0 : 1), r) < 0.5 ? '^' : '.';
    else ch = mod(c + r, 2) ? '^' : '=';
    if (/[#^]/.test(ch) && (q.d <= 1 || runout[side].has(k))) ch = '.';
    if (ch !== '.') g.set(side, c, r, ch);
  }
}
for (const p of R.cells) if (!p.hole) for (const q of R.nbrs(p.c, p.r))
  if (/[#^]/.test(g.get(p.side, ...q))) throw new Error(`an obstacle at ${q} on ${p.side} stands next to the road`);

// ---- stages.
const {stages, pads} = autoStages(R, {lengths: [14, 17], lead: [6, 4], launch: 18, gate: i => mod(i, 3) === 0});
placeStages(g, R, stages);
putPads(g, R, pads);

// ---- colours, classic sea: the Snake Road palette in bands by line, a gold road.
const SEA = ['#0088ff', '#0099ee', '#0099dd', '#0099cc', '#0099bb', '#00aaaa', '#00aa99', '#00aa88', '#00bb77', '#00bb66', '#00bb55', '#00bb44', '#00cc33', '#00cc22'];
const colorOf = side => (c, r) => {
  if (!land.has(key(c, r))) return '#000000';
  const q = R.local(side, c, r);
  if (q.d === 0) return mod(q.i, 4) < 2 ? '#ff6600' : '#ff8800';
  const b = Math.min(SEA.length - 1, Math.abs(r - 27) >> 1);
  return SEA[side === T ? b : SEA.length - 1 - b];
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'switchback', name: 'Level 52', kind: 'Switchback', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
