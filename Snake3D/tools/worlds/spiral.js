// Level 3 "Spiral": three 3-wide rings joined into a spiral that winds into a central arena. The way
// in runs on top (boost straights, braking before corners, gates, a slalom); from the arena the snake
// drops to the underside and winds back out on the other face of the same rings.
const {Grid} = require('../grid');
const W = 44, H = 44;
const g = new Grid(W, H);

// Rings: bands of 3 cells, 2-cell gaps between rings.
for (const o of [1, 6, 11]) { const f = W - 1 - o; g.floor(o, o, f, f); g.hole(o + 3, o + 3, f - 3, f - 3); }
g.floor(16, 16, 27, 27);                     // arena
// Bridges from each ring's left band to the next ring, and cuts that turn the rings into a spiral.
g.floor(4, 6, 5, 8); g.hole(1, 4, 3, 5);     // ring 0 -> ring 1
g.floor(9, 11, 10, 13); g.hole(6, 9, 8, 10); // ring 1 -> ring 2
g.floor(14, 16, 15, 18); g.hole(11, 14, 13, 15); // ring 2 -> arena

const T = 'top', B = 'bottom';
// ---- ring 0 (top side, clockwise)
g.rect(T, 16, 2, 23, 2, '>');                // boost straight
g.rect(T, 35, 1, 37, 3, '=');                // brake before the corner
for (const [c, r] of [[40, 10], [41, 16], [40, 22], [41, 28]]) g.rect(T, c, r, c + 1, r, '^');   // slalom teeth
g.set(T, 30, 40, '#'); g.set(T, 30, 42, '#');  // gates with a moving opening
g.set(T, 22, 41, '#'); g.set(T, 22, 42, '#');
g.set(T, 14, 40, '#'); g.set(T, 14, 41, '#');
g.rect(T, 2, 24, 2, 33, '>');                // boost up the left band
g.rect(T, 1, 9, 3, 11, '=');                 // brake before the bridge
// ---- ring 1
g.rect(T, 12, 6, 31, 6, '^');                // spiked outer edge; the underside spikes the inner edge
g.rect(B, 12, 8, 31, 8, '^');
g.hole(36, 16); g.hole(36, 26);              // portholes
g.set(T, 28, 36, '^'); g.set(T, 24, 36, '^');
g.rect(T, 7, 24, 7, 30, '>');
g.rect(T, 6, 14, 8, 15, '=');
// ---- ring 2
g.rect(T, 14, 12, 19, 12, '>');
g.rect(T, 30, 15, 32, 16, '=');
g.set(T, 30, 21, '#'); g.set(T, 32, 21, '#');
g.rect('both', 16, 30, 27, 30, '^'); g.rect('both', 16, 32, 27, 32, '^');   // a spiked channel on both faces
// ---- arena
g.set(T, 27, 20, '^'); g.set(T, 27, 22, '^');   // the lead-in to the edge can only be run eastwards
g.rect(B, 19, 20, 24, 20, '^'); g.rect(B, 19, 23, 24, 23, '^');
// ---- underside of the way out
g.rect(B, 12, 20, 12, 24, '>');              // ring 2 left band, heading south
g.set(B, 31, 21, '#');                       // ring 2 right band: the gate the other way round
g.rect(B, 16, 13, 28, 13, '^');              // ring 2 top band: spiked inner edge
g.rect(B, 6, 26, 8, 27, '=');
g.rect(B, 12, 36, 22, 36, '^');              // ring 1 bottom band: spiked middle row east of the corner
g.rect(B, 12, 37, 22, 37, '.');
g.set(B, 14, 42, '#'); g.set(B, 22, 40, '#'); g.set(B, 22, 42, '#'); g.set(B, 30, 40, '#');
g.rect(B, 41, 33, 41, 37, '>');              // ring 0 right band, heading north
g.rect(B, 38, 1, 39, 3, '=');

// ---- stages: inward on top
g.stage(['gem', T, 14, 2]);                                   // 1
g.stage(['chain', T, 25, 2, 'EEEEEEE']);                      // 2  straight after the boost pads
g.stage(['gem', T, 41, 5]);                                   // 3  corner after braking
g.stage(['chain', T, 42, 8, 'SSSSWWSSSSS']);                  // 4  slalom
g.stage(['gem', T, 42, 24]);                                  // 5
g.stage(['chain', T, 40, 27, 'SSSSSS']);                      // 6
g.stage(['gem', T, 37, 41]);                                  // 7
g.stage(['chain', T, 33, 41, 'WWWWWW']);                      // 8  first gate
g.stage(['gem', T, 22, 40]);                                  // 9  in the second gate
g.stage(['chain', T, 17, 42, 'WWWWWWW']);                     // 10 third gate
g.stage(['gem', T, 2, 37]);                                   // 11
g.stage(['chain', T, 2, 23, 'NNNNNNN']);                      // 12 after the boost, brake for the bridge
g.stage(['gem', T, 5, 7]);                                    // 13 bridge to ring 1
g.stage(['chain', T, 10, 7, 'EEEEEEEEEEE']);                  // 14 under the spiked edge
g.stage(['gem', T, 33, 7]);                                   // 15
g.stage(['chain', T, 37, 10, 'SSSSSSSSSS']);                  // 16 past the first porthole
g.stage(['gem', T, 35, 26]);                                  // 17 inside of the second porthole
g.stage(['chain', T, 31, 36, 'WWNWWSWWSWWNWW']);              // 18 wave between spikes
g.stage(['gem', T, 7, 33]);                                   // 19 past the corner
g.stage(['chain', T, 7, 23, 'NNNNNN']);                       // 20
g.stage(['gem', T, 10, 12]);                                  // 21 bridge to ring 2
g.stage(['chain', T, 20, 12, 'EEEEEEE']);                     // 22
g.stage(['gems', T, [[31, 13], [31, 21]]]);                   // 23 round the corner and into the gate
g.stage(['chain', T, 27, 31, 'WWWWWWWWWW']);                  // 24 spiked channel
g.stage(['gem', T, 12, 27]);                                  // 25
g.stage(['chain', T, 12, 20, 'NNNEEEE']);                     // 26 onto the arena bridge
g.stage(['gems', T, [[18, 19], [25, 19], [25, 24], [18, 24]]]);   // 27 arena
g.stage(['chain', T, 23, 21, 'EEEE']);                        // 28 a lead-in that runs off the arena's east edge
// ---- and out on the underside
g.stage(['gem', B, 27, 21]);                                  // 29 waits just past the edge
g.stage(['chain', B, 24, 17, 'WWWWWWWWWW']);                  // 30 back over the bridge
g.stage(['gem', B, 12, 26]);                                  // 31
g.stage(['chain', B, 17, 31, 'EEEEEEEEEE']);                  // 32 the channel from below
g.stage(['gem', B, 30, 23]);                                  // 33 straight up the band, through the gate
g.stage(['chain', B, 27, 11, 'WWWWWWWWWWW']);                 // 34
g.stage(['chain', B, 7, 16, 'SSSSSSS']);                      // 35
g.stage(['gem', B, 9, 36]);                                   // 36
g.stage(['chain', B, 11, 35, 'EEEEEEEEEE']);                  // 37
g.stage(['gem', B, 30, 35], ['chain', B, 35, 24, 'NNNNNNNNNN']);   // 38 round the corner
g.stage(['gem', B, 33, 7]);                                   // 39
g.stage(['chain', B, 31, 7, 'WWWWWWWWW']);                    // 40
g.stage(['gems', B, [[12, 7], [5, 7]]], ['chain', B, 1, 12, 'SSSSSSSSSS']);   // 41 over the bridge, then south
g.stage(['gem', B, 2, 41]);                                   // 42
g.stage(['chain', B, 15, 41, 'EEEEEE']);                      // 43
g.stage(['gems', B, [[31, 41], [41, 38]]]);                   // 44
g.stage(['chain', B, 42, 27, 'NNNNNNNNNN']);                  // 45
g.stage(['gem', B, 41, 4]);                                   // 46
g.stage(['chain', B, 32, 2, 'WWWWWWW'], ['gems', B, [[15, 2], [5, 2]]]);   // 47 then over the west edge to the start

const colors = {
  top: [['#ff7a28', '#7a28c8', 'r']],
  bottom: [['#2cc8a8', '#a01e6e', 'r']]
};
module.exports = {key: 'spiral', name: 'Level 3', kind: 'Spiral', start: [3, 2, 'E'], colors, grid: g};
if (require.main === module) console.log(g.print());
