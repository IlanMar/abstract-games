// Level 2 "Weave": a frame of 3-wide lanes around a room whose top favours vertical lanes and whose
// underside favours horizontal lanes. Hazards on the two sides complement each other; portholes and
// edges are used to switch sides on purpose.
const {Grid} = require('../grid');
const W = 60, H = 36;
const g = new Grid(W, H);

// Frame: 3-wide ring.
g.floor(1, 1, 58, 34);
g.hole(4, 4, 55, 31);
// Room and its links.
g.floor(20, 10, 39, 25);
g.floor(29, 4, 29, 9);        // north tightrope (1 wide)
g.floor(29, 26, 30, 31);      // south link (2 wide)
g.floor(4, 17, 19, 18);       // west ribbon (2 wide)
g.floor(40, 16, 55, 18);      // east runway (3 wide)

// Room top: vertical spike stripes with a crossing gap on rows 17-18, capped by walls.
for (const c of [23, 27, 32, 36]) {
  g.rect('top', c, 12, c, 23, '^');
  g.rect('top', c, 17, c, 18, '.');
  g.set('top', c, 12, '#'); g.set('top', c, 23, '#');
}
// Room underside: horizontal spike stripes with a crossing gap on columns 29-30.
for (const r of [13, 15, 20, 22]) {
  g.rect('bottom', 22, r, 37, r, '^');
  g.rect('bottom', 29, r, 30, r, '.');
}
for (const r of [13, 22]) { g.set('bottom', 22, r, '#'); g.set('bottom', 37, r, '#'); }

// North lane: a clear channel on top between two spike rows; on the underside the channel is spiked.
for (const [c0, c1] of [[10, 18], [40, 48]]) {
  g.rect('top', c0, 1, c1, 1, '^'); g.rect('top', c0, 3, c1, 3, '^');
  g.rect('bottom', c0, 2, c1, 2, '^');
}
// East lane: slalom teeth on top, boost pads on the underside.
g.rect('top', 57, 6, 58, 7, '^'); g.rect('top', 56, 10, 57, 10, '^');
g.rect('top', 56, 24, 57, 24, '^'); g.rect('top', 57, 28, 58, 28, '^');
g.rect('bottom', 57, 8, 57, 12, '>'); g.rect('bottom', 57, 22, 57, 27, '>');
// East runway: boost pads down the middle on top, spikes under them.
g.rect('top', 43, 17, 50, 17, '>');
g.rect('bottom', 44, 17, 50, 17, '^');
// South lane: portholes to dive to the other side.
for (const c of [20, 40, 48]) g.hole(c, 33);
// West lane: slow pads, then a gate with a one-cell opening on top; the underside gate is mirrored.
g.rect('top', 1, 19, 3, 21, '=');
g.set('top', 1, 23, '#'); g.set('top', 3, 23, '#');
g.set('bottom', 2, 23, '#');
g.set('bottom', 1, 9, '^'); g.set('bottom', 3, 9, '^');
// West ribbon: spike runs on alternating rows, so the snake has to change row.
g.rect('top', 6, 18, 9, 18, '^'); g.rect('top', 16, 17, 18, 17, '^');
g.rect('bottom', 10, 18, 12, 18, '^'); g.rect('bottom', 15, 17, 17, 17, '^');

// Stages, in play order. The start is (35, 2) heading west on top.
const T = 'top', B = 'bottom';
g.stage(['gem', T, 22, 2]);                                  // 1  first crystal
g.stage(['chain', T, 18, 2, 'WWWWWWWW']);                    // 2  the spiked channel
g.stage(['gem', T, 2, 7]);                                   // 3  corner: turn south
g.stage(['chain', T, 2, 22, 'SSSSSS']);                      // 4  through the gate
g.stage(['gem', T, 7, 33]);                                  // 5  corner: turn east onto the porthole row
g.stage(['chain', T, 14, 33, 'EEEEE']);                      // 6  towards the porthole, top
g.stage(['chain', B, 19, 33, 'WWWWW']);                      // 7  same cells underneath, after the dive
g.stage(['gem', B, 8, 32]);                                  // 8  leave the shuttle, flip at the west edge
g.stage(['chain', T, 29, 31, 'NNNNN']);                      // 9  up the south link
g.stage(['gem', T, 32, 24]);                                 // 10 room hem
g.stage(['chain', T, 34, 23, 'NNNNNNNNNNN']);                // 11 a vertical lane between spike stripes
g.stage(['gem', B, 34, 10]);                                 // 12 dive off the north edge
g.stage(['chain', B, 33, 11, 'WWWWWWWWW']);                  // 13 underside hem, turn right after the dive
g.stage(['gem', B, 21, 15]);                                 // 14 west hem
g.stage(['chain', B, 18, 18, 'WWWWNWWWWWW']);                // 15 the ribbon jog
g.stage(['gem', B, 1, 27]);                                  // 16 underside gate
g.stage(['chain', B, 22, 34, 'EEEEEEEEEE']);                 // 17 south lane, outer row
g.stage(['gem', B, 44, 34]);                                 // 18
g.stage(['chain', B, 57, 21, 'NNNNNNNN']);                   // 19 after the boost pads
g.stage(['gem', B, 57, 5]);                                  // 20 over the north edge next
g.stage(['chain', T, 57, 4, 'SWSSSEESSSS']);                 // 21 slalom
g.stage(['chain', T, 42, 17, 'WWWWWWW']);                    // 22 off the boost runway, through the stripe gap
g.stage(['gem', T, 30, 17]);                                 // 23 room centre
g.stage(['chain', T, 29, 9, 'NNNNN']);                       // 24 back up the tightrope, then the loop

const colors = {
  top: [['#a01e96', '#e0406e', 'x'], ['#0a9a8c', '#14b45a', 'y', [20, 10, 39, 25]]],
  bottom: [['#dc3c1e', '#f08c1e', 'x'], ['#a0144a', '#d24678', 'y', [20, 10, 39, 25]]]
};
module.exports = {key: 'weave', name: 'Level 2', kind: 'Weave', start: [35, 2, 'W'], colors, grid: g};
if (require.main === module) console.log(g.print());
