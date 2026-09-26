// Level 5 "Garden": the easy world. An endless hex plane (the 30 x 30 tile repeats) with no holes, so
// the snake never leaves the top face. There are no walls, pads or edges; a few spiked flower beds
// stand well off the route as landmarks. The route is one gentle climb northwards that leans east and
// comes back to the start after three turns of the tile, and each stage lies a cell or two past the
// end of the previous one. Chains lead the snake round every bend.
const {Grid} = require('../grid');
const W = 30, H = 30;
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const T = 'top';

// ---- the route: runs of moves from the start. It gains 39 columns east and loses 9 west (one tile)
// and climbs three tiles, so it closes on itself.
const start = [4, 27];
const route = g.route(start, 'N13 NE6 N6 NW3 N6 NE7 N7 NE6 N6 NW3 N6 NE7 N7 NE6 N6 NW3 N6 NE7 N3');
const L = route.length;

// ---- flower beds: seven spikes each, at least three steps from the route.
for (const [c, r] of [[12, 0], [22, 3], [4, 7], [15, 10], [25, 13], [9, 17], [19, 20], [9, 21], [19, 24], [29, 24]]) {
  if (g.disk(c, r, 3).some(q => route.has(...q))) throw new Error(`flower bed ${c},${r} is too close to the route`);
  for (const [x, y] of g.disk(c, r, 1)) g.set(T, x, y, '^');
}

// ---- stages, by route index: each begins a cell or two past the end of the previous one, on the line
// the snake is already on, so it only turns where an item shows the way.
g.routeStages(route, T, [
  [['gem', 11]],                                 // 1  after the run-up
  [['chain', 13, 17]],                           // 2  the first bend, led by the chain
  [['chain', 19, 23]],                           // 3
  [['gems', 25, 28, 31]],                        // 4  crystals through a step to the left
  [['chain', 33, 38]],                           // 5
  [['chain', 40, 45]],                           // 6
  [['gem', 47], ['chain', 49, 52]],              // 7
  [['gems', 54, 56, 58]],                        // 8
  [['gems', 60, 63, 66]],                        // 9  the second step to the left
  [['chain', 68, 73]],                           // 10
  [['chain', 75, 80]],                           // 11
  [['chain', 82, 87]],                           // 12
  [['chain', 89, 94]],                           // 13
  [['gems', 95, 98, 101]],                       // 14 the third step to the left
  [['chain', 103, 108]],                         // 15
  [['chain', 110, L]],                           // 16 back on the start line
  [['gems', L + 3, L + 6, L + 9]]                // 17 on the run-up, just before stage 1
]);

// Warm terracotta, sandy in the middle of the tile and rose at its rim (the colour grading turns these
// into the only warm floor of the game). A radial layer repeats without a seam. The underside is never
// seen but has to be drawn.
const warm = [['#ff5a28', '#b41e46', 'r']];
const colors = {top: warm, bottom: warm};
module.exports = {key: 'garden', name: 'Level 5', kind: 'Garden', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
