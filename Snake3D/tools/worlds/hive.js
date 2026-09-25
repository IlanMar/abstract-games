// Level 4 "Hive": an endless hex plane (the 36 x 36 tile repeats) pierced by a lattice of wells.
// A well is a 7-cell hole: diving into it brings the snake out on the other face. Chains orbit the
// wells, run down the lanes between them and alternate between the two faces.
const {Grid} = require('../grid');
const W = 36, H = 36;
const g = new Grid(W, H, true);

g.floor(0, 0, W - 1, H - 1);
const wells = [];
for (const [c, rows] of [[3, [4, 16, 28]], [12, [10, 22, 34]], [21, [4, 16, 28]], [30, [10, 22, 34]]]) for (const r of rows) wells.push([c, r]);
for (const w of wells) for (const [c, r] of g.disk(...w, 1)) g.hole(c, r);

const T = 'top', B = 'bottom';
const at = (side, cells, ch) => { for (const [c, r] of cells) g.set(side, c, r, ch); };
// Spiked collars: half a ring round some wells, on alternating faces.
at(T, g.ring(12, 22, 2).slice(6, 12), '^');
at(B, g.ring(21, 16, 2).slice(0, 6), '^');
at(T, g.ring(30, 10, 2).slice(3, 9), '^');
at(B, g.ring(3, 28, 2).slice(9, 12).concat(g.ring(3, 28, 2).slice(0, 3)), '^');
// Boost lanes down the columns between wells (top), slow patches on the underside.
for (let r = 18; r <= 26; r++) g.set(T, 7, r, '>');
for (let r = 2; r <= 8; r++) g.set(T, 25, r, '>');
for (const [c, r] of g.disk(16, 29, 1)) g.set(B, c, r, '=');
for (const [c, r] of g.disk(34, 0, 1)) g.set(B, c, r, '=');
// Walls: short hex prisms that split two lanes.
for (const [c, r] of [[16, 5], [16, 6], [16, 7], [34, 16], [34, 17], [34, 18]]) g.set(T, c, r, '#');
for (const [c, r] of [[8, 11], [8, 12], [8, 13], [26, 30], [26, 31], [26, 32]]) g.set(B, c, r, '#');

// ---- stages
g.stage(['gem', T, 17, 24]);                                  // 1
g.stage(['chain', T, 17, 22, 'N N N N N N N']);               // 2  up the lane between the wells
g.stage(['gem', T, 19, 12]);                                  // 3
g.stage(['chain', T, g.arc([21, 16], 6, 6).reverse()]);         // 4  half an orbit round the well
g.stage(['gem', B, 21, 19]);                                  // 5  dive into the well from the south
g.stage(['chain', B, 21, 21, 'S S S S']);                     // 6  underside, straight on
g.stage(['gem', B, 17, 30]);                                  // 7  slow patch
g.stage(['chain', B, g.arc([12, 22], 0, 6)]);                   // 8  orbit on the underside
g.stage(['gem', T, 12, 19]);                                  // 9  dive back up
g.stage(['chain', T, 12, 18, 'N N N N N']);                   // 10 between two wells
g.stage(['gem', T, 7, 8]);                                    // 11
g.stage(['chain', T, 7, 10, 'S S S S S S S']);                // 12 then the boost lane
g.stage(['gem', T, 7, 28]);                                   // 13
g.stage(['chain', T, g.arc([12, 34], 7, 6).reverse()]);         // 14
g.stage(['gem', B, 17, 34]);                                  // 15
g.stage(['chain', B, g.arc([21, 28], 6, 6)]);                   // 16 then back to the start lane

const colors = {
  top: [['#f0a01e', '#c8501e', 'd']],
  bottom: [['#5a1e8c', '#b42878', 'd']]
};
module.exports = {key: 'hive', name: 'Level 4', kind: 'Hive', start: [17, 35, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
