// Level 122 "Galleons": a very hard level in the manner of the late classic levels Skeletal and Absolute,
// over the void. A square world of 72 x 56 cells, all sea (void) but two galleons lying side by side, bows
// to the east, joined by boarding planks one cell wide. The road crosses a deck between masts and cannon,
// runs out to the tip of the bowsprit and drops into the sea, comes back under the hull through the hold,
// crosses a plank to the other ship and comes up through a hatch onto its deck; then the same again the
// other way. The thread is uneven: stages wait up to the edge of sight, crystals lead on along the planks
// and the bowsprits, and at some bends only the painted road shows the turn.
//   - the hulls: a square stern, sides seven cells off the keel and a pointed bow over the last twelve;
//     the road and a cell either side of it are land too, the bowsprits and planks only the road;
//   - the decks: planks with seams of slow pads, three masts (2 x 2 walls in a ring of belaying pins,
//     spikes), cannon along the rails (walls with spike muzzles, gun ports between), closed hatches
//     (rings of slow pads) and a wheel (a ring of boost pads round a wall) on the quarterdeck;
//   - the holds: the keel (walls along the middle), crates (2 x 2 walls), barrels (spikes), hammocks
//     (slow pads) and ballast (boost pads) in rows;
//   - tightropes: crystals four cells apart along the planks and bowsprits instead of chains;
//   - shields as in Shielded: on the straights of the decks and holds a wall right beside the road on one
//     side, the side changing from stretch to stretch, with a spike every sixth cell;
//   - stages of two chains at once, as in Snake Road, every fourth stage;
//   - the dives: off the tips of the bowsprits and through two open hatches.
// Colour concept: a sea fight at sunset. On top a gold road over a chocolate deck, the second ship
// violet, the planks and bowsprits caramel, the hatches glowing raspberry; underneath a pale blue road
// through the dark hold.
const {Grid} = require('../grid');
const {road, autoStages, placeStages, putPads} = require('../road');
const kit = require('../worldkit');
const W = 72, H = 56, T = 'top', B = 'bottom';
const {mod, key, hash} = kit;
const start = [25, 16];
const runs =
  'E13 N7 E6 S7 E6 N3 E14 D'           // top: across the north ship round the masts and out along the bowsprit
  + ' W17 N4 W8 S29 W8 D'               // the hold: back under the bowsprit, over the east plank and into the south ship
  + ' E10 S8 E10 N4 E15 D'              // top: up through a hatch, along the south deck and out along its bowsprit
  + ' W20 S4 W17 N4 W6 N32 D'           // the hold: back under the south ship, over the west plank and up a hatch
  + ' S7 E1';                   // top: home
// The ships: keel row, stern, bow tip.
const SHIPS = [{y: 13, x0: 2, x1: 56}, {y: 42, x0: 8, x1: 60}];
const hw = (s, x) => (x < s.x0 || x > s.x1 ? -1 : x > s.x1 - 12 ? 1 + Math.floor(6 * (s.x1 - x) / 12) : 7);
const shipAt = (c, r) => SHIPS.findIndex(s => Math.abs(r - s.y) <= hw(s, c));

// ---- the land: the hulls and the road; the planks and bowsprits are the road alone.
const probe = road(new Grid(W, H), [...start, 'E'], runs);
const land = new Set();
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (shipAt(c, r) >= 0) land.add(key(c, r));
for (const p of probe.cells) if (!p.hole) land.add(key(p.c, p.r));
const g = new Grid(W, H);
for (const k of land) g.set('both', ...kit.unkey(k), '.');
const R = road(g, [...start, 'E'], runs);
const gap = kit.diveGaps(g, R);
for (const p of R.cells) if (p.hole && shipAt(p.c, p.r) < 0) gap.delete(key(p.c, p.r));   // off a bowsprit: the sea already
kit.punch(g, R, gap, 'a hatch');
for (const k of gap) land.delete(k);
const tight = i => { const p = R.at(i); return shipAt(p.c, p.r) < 0; };
const glow = kit.glow(g, [...gap].filter(k => shipAt(...kit.unkey(k)) >= 0));
const runout = kit.runouts(g, R);

// ---- the decks and the holds.
const ship = (c, r) => SHIPS[shipAt(c, r)];
const shield = (side, c, r, q) => shipAt(c, r) >= 0 && !tight(q.i) && q.v === (mod(q.s, 2) ? 1 : -1);
kit.paint(g, R, {cells: land, keep: [glow], runout, shield}, (side, c, r, q, n) => {
  const s = ship(c, r);
  if (!s) return '.';
  const y = r - s.y, x = c - s.x0, edge = Math.abs(y) === hw(s, c);
  if (q.d === 1 && shield(side, c, r, q)) return mod(q.u, 6) === 0 ? '^' : '#';                  // a shield
  if (side === T) {
    if (edge) return mod(c, 4) === 0 ? '#' : mod(c, 4) === 2 ? '.' : '.';                          // the rail, gun ports
    if (Math.abs(y) === hw(s, c) - 1 && mod(c, 4) === 0 && hw(s, c) === 7) return '^';             // a cannon's muzzle
    for (const mx of [10, 24, 38]) {
      const dx = x - mx, dy = y;
      if ((dx === 0 || dx === 1) && (dy === 0 || dy === 1)) return '#';                           // a mast
      if (Math.max(Math.abs(dx - 0.5), Math.abs(dy - 0.5)) === 2.5 && mod(dx + dy, 2) === 0) return '^';   // belaying pins
    }
    if (x <= 5 && Math.abs(y) <= 2) return Math.max(Math.abs(x - 3), Math.abs(y)) === 2 ? '>' : x === 3 && y === 0 ? '#' : '.';   // the wheel
    if (mod(y, 3) === 0 && mod(c + 2 * y, 7) !== 0) return q.d >= 1 ? '=' : '.';                 // a seam
    return '.';
  }
  if (y === 0 && mod(c, 9) !== 4) return '#';                                                      // the keel
  if (Math.abs(y) >= 2 && Math.abs(y) <= 5 && mod(x, 8) <= 1 && mod(Math.abs(y), 4) <= 1) return '#';   // crates
  if (mod(x, 8) === 4 && Math.abs(y) >= 2 && n < 0.35) return '^';                                 // barrels
  if (Math.abs(y) === 6 && mod(c, 3) !== 0) return '=';                                            // hammocks
  if (mod(x, 8) === 6 && Math.abs(y) === 3) return '>';                                            // ballast
  return '.';
});
kit.checkRoad(g, R, shield);

// ---- stages: an uneven thread, trails of crystals over the planks and bowsprits, two chains at once.
let {stages, pads} = autoStages(R, {first: 13, lengths: [13, 16], lead: [6, 4], launch: 0, gate: i => mod(i, 3) === 1,
  gaps: [5, 9, 3, 11, 7, 2], crumbs: 3, steps: [9, 6, 11, 8], rails: 3});
stages = kit.merge(R, kit.trails(stages, tight));
placeStages(g, R, stages, {bends: 1});
putPads(g, R, pads);

// ---- colours: a sea fight at sunset.
const colorOf = side => (c, r) => {
  const k = key(c, r);
  if (!land.has(k)) return '#000000';
  const q = R.local(side, c, r), s = shipAt(c, r);
  if (q.d === 0) return kit.stripe(q, side === T ? ['#ff6600', '#ff5a28'] : ['#ff99cc', '#ff44aa']);
  if (glow.has(k)) return '#ff0066';
  if (s < 0) return '#ff3300';
  if (side === B) return s ? '#444444' : '#993300';
  return s ? '#6600cc' : '#993300';
};
const colors = {top: g.layers(colorOf(T)), bottom: g.layers(colorOf(B))};
module.exports = {key: 'galleons', name: 'Level 122', kind: 'Galleons', start: [...start, 'E'], colors, grid: g};
if (require.main === module) console.log(g.print());
