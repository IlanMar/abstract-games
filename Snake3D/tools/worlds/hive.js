// Level 4 "Hive": an endless hex plane (the 36 x 36 tile repeats) pierced by a lattice of wells.
// A well is a 7-cell hole: diving into it brings the snake out on the other face. Chains orbit the
// wells, run down the lanes between them and lead into the wells to switch faces.
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

// ---- stages. Each one can be seen from where the previous one ends. A dive is always led in by a
// chain that runs straight into a well, and the item on the other face waits where the snake comes out.
g.stage(['gem', T, 17, 24]);                                    // 1
g.stage(['chain', T, 17, 22, 'N N N N N N N']);                 // 2  up the lane between the wells
g.stage(['gem', T, 19, 12]);                                    // 3
g.stage(['chain', T, g.arc([21, 16], 6, 6).reverse()]);         // 4  half an orbit round the well
g.stage(['chain', T, 21, 19, 'S S S S S']);                     // 5  straight on to the next well...
g.stage(['gem', B, 21, 25]);                                    // 6  ...dive, and the crystal waits underneath
g.stage(['chain', B, 21, 24, 'NW NW NW NW NW NW NW NW NW']);   // 7  a long diagonal past the next well
g.stage(['chain', B, 12, 19, 'N N N N N N']);                   // 8  up the column into the well...
g.stage(['gem', T, 12, 13]);                                    // 9  ...and back on top
g.stage(['gem', T, 10, 15]);                                    // 10
g.stage(['chain', T, 9, 15, 'SW SW S']);                        // 11 onto the boost lane
g.stage(['gem', T, 7, 28]);                                     // 12
g.stage(['chain', T, 8, 30, 'SE SE SE SE NE NE NE NE NE N N']); // 13 past the well, back up the start lane

const colors = {
  top: [['#f0a01e', '#c8501e', 'd']],
  bottom: [['#5a1e8c', '#b42878', 'd']]
};
module.exports = {key: 'hive', name: 'Level 4', kind: 'Hive', start: [17, 35, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
