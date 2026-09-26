// Level 7 "Candy": the third easy world and the second one-sided hex, a land of sweets. An endless plane
// (the 40 x 44 tile repeats) with no holes, so the snake never leaves the top face. A road of caramel
// and chocolate steps climbs the tile twice, bending only by 60 degrees; each stage lies a cell or two
// past the end of the previous one, and chains lead the snake round every bend. Beside every straight
// stand sweets drawn in walls, spikes, pads and paint: smileys, hearts, cookies with chocolate chips,
// lollipops, a donut, ice creams, candy canes arching over the road, mint stars and jelly hearts to
// run through, and a rainbow. No wall or spike stands within a cell of the road. On two straights
// arrows of boost pads give a sugar rush, and a spot of jam brakes the snake before the bend.
const {Grid} = require('../grid');
const W = 40, H = 44;
const g = new Grid(W, H, true);
g.floor(0, 0, W - 1, H - 1);
const T = 'top';

// ---- the road: pass A starts with the run-up and climbs the west of the tile, pass B the east; each
// gains 20 columns east and one tile north, so the road closes after two tiles.
const start = [4, 40];
const route = g.route(start, 'N12 NE6 N4 NW4 N4 NE10 N4 NW2 N4 NE10 N8 NE4 N8 NW6 N6 NE10 N6 NE12');
const L = route.length;

const key = (c, r) => `${c},${r}`;
const DIRS = ['N', 'NE', 'SE', 'S', 'SW', 'NW'];
const near = (c, r) => DIRS.map(m => g.step(c, r, m));
const walk = (c, r, moves) => { const out = [[c, r]]; for (const m of moves.split(' ')) out.push(g.step(...out[out.length - 1], m)); return out; };
const heart = s => (x, y) => { const X = x / s, Y = (y + 0.2) / s; return (X * X + Y * Y - 1) ** 3 - X * X * Y ** 3 <= 0; };
const edge = cells => { const s = new Set(cells.map(String)); return cells.filter(q => near(...q).some(n => !s.has(String(n)))); };

// Tiles and paint go through put and dye, which note whose cell it is: no figure may overlap another
// or put a tile on the road.
const paint = new Map(), owner = new Map(), problems = [];
let figure = '';
function claim(c, r) {
  const o = owner.get(key(c, r));
  if (o && o !== figure) problems.push(`${figure} overlaps ${o} at ${c},${r}`);
  owner.set(key(c, r), figure);
}
function put(cells, ch) {
  for (const [c, r] of cells) {
    claim(c, r);
    g.set(T, c, r, ch);
    if (route.has(c, r) && !/^(arrow|jam)/.test(figure)) problems.push(`${figure} puts '${ch}' on the road at ${c},${r}`);
  }
}
function dye(cells, color) { for (const [c, r] of cells) { claim(c, r); paint.set(key(c, r), color); } }

// Colours as they come out of the colour grading: the pinks and violets stay candy pink and violet,
// dough turns beige, caramel orange, chocolate brown, cherry tomato red, baby blue light blue, mint
// light green, lemon olive, sky blue and grape indigo.
const C = {
  violet: '#ff00ff', pink: '#ff0088', rose: '#ff0066', lilac: '#ff44aa',
  dough: '#ff5a28', caramel: '#ff3300', chocolate: '#993300', cherry: '#ff0000',
  baby: '#ff99cc', mint: '#ffaa00', lemon: '#ff7700', sky: '#dd88ff', grape: '#6600cc'
};

// ---- the figures, each drawn round its centre cell and upright to a snake heading north.
const figures = {
  // A blushing face: wall eyes, a smile of spikes and cheeks of jelly.
  smiley(c, r) {
    dye(g.shape(c, r, 4, (x, y) => Math.hypot(x, y) <= 3.1), C.dough);
    put(g.shape(c, r, 3, (x, y) => Math.abs(x) === 1 && y > 0.9 && y < 1.9), '#');
    put(g.shape(c, r, 3, (x, y) => y < -0.4 && Math.abs(Math.hypot(x, y) - 2.1) < 0.55), '^');
    put(g.shape(c, r, 3, (x, y) => Math.abs(x) === 2 && y === 0), '=');
  },
  // Outlined in spikes, filled with cherry red.
  heart(c, r) {
    const cells = g.shape(c, r, 4, heart(2.7)), rim = edge(cells), s = new Set(rim.map(String));
    put(rim, '^'); dye(cells.filter(q => !s.has(String(q))), C.cherry);
  },
  // Slow pads: running into it only brakes the snake.
  jelly(c, r) { put(g.shape(c, r, 3, heart(1.6)), '='); },
  // Chocolate chips of spikes on a round of dough.
  cookie(c, r) {
    dye(g.disk(c, r, 2), C.dough);
    const one = g.ring(c, r, 1), two = g.ring(c, r, 2);
    put([one[0], two[4], two[8], one[3]], '^');
  },
  // A ring of walls round chocolate icing.
  donut(c, r) {
    put(g.ring(c, r, 2), '#');
    dye(g.ring(c, r, 1), C.chocolate); dye([[c, r]], C.dough);
  },
  // A swirl of cherry on baby blue, on a stick of two walls.
  lollipop(c, r) {
    dye(g.disk(c, r, 2), C.baby);
    dye(g.shape(c, r, 3, (x, y) => { const d = Math.hypot(x, y), a = Math.atan2(y, x); return d <= 2.4 && ((a / Math.PI / 2 + d / 2.6) % 1 + 1) % 1 < 0.5; }), C.cherry);
    put(walk(...g.step(...g.step(c, r, 'S'), 'S'), 'S S').slice(1), '#');
  },
  // A cone of dough under a scoop of mint, with a jelly cherry on top.
  icecream(c, r) {
    dye(g.shape(c, r, 3, (x, y) => y <= -0.4 && y >= -4 && Math.abs(x) <= (y + 4.2) / 1.6), C.dough);
    dye(g.shape(c, r, 3, (x, y) => y > -0.4 && Math.hypot(x, y - 0.8) <= 1.9), C.mint);
    put([walk(c, r, 'N N N')[3]], '=');
  },
  // A six-pointed star of boost pads.
  star(c, r) { put([[c, r], ...g.ring(c, r, 1), ...DIRS.map(m => g.step(...g.step(c, r, m), m))], '>'); },
  // Striped walls and cherry spikes, its hook to the east or west: two of them arch over the road.
  cane(c, r, hook) {
    walk(c, r, `N N N N ${hook === 'E' ? 'NE SE' : 'NW SW'}`).forEach((q, i) => {
      put([q], i % 2 ? '^' : '#');
      if (i % 2) dye([q], C.cherry);
    });
  },
  // Six bands of paint between two clouds of walls.
  rainbow(c, r) {
    [C.cherry, C.caramel, C.lemon, C.mint, C.sky, C.grape].forEach((col, k) =>
      dye(g.shape(c, r, 10, (x, y) => y >= -0.3 && Math.abs(Math.hypot(x, y) - (8 - k)) < 0.5), col));
    for (const s of [-1, 1]) put(g.shape(c + s * 6, r + 1, 2, (x, y) => Math.hypot(x, y * 1.4) <= 1.6), '#');
  }
};
function place(name, c, r, ...rest) { figure = `${name} ${c},${r}`; figures[name](c, r, ...rest); }

// A figure on each side of every straight of the road, its walls and spikes two cells away, and more in
// the middle of the pockets between the passes. Pass A:
place('smiley', 0, 35); place('heart', 9, 35);           // the run-up
place('jelly', 4, 24); place('donut', 15, 24);
place('icecream', 2, 17); place('lollipop', 12, 17);
place('rainbow', 3, 9); place('star', 20, 5);
// Pass B:
place('cane', 20, 39, 'E'); place('cane', 28, 39, 'W');  // the arch
place('cookie', 15, 37); place('lollipop', 31, 33);
place('icecream', 22, 26); place('cookie', 32, 25);
place('cookie', 17, 16); place('smiley', 26, 16);
place('heart', 27, 4);
// The middle of the pockets and the bands the diagonals cross:
place('heart', 35, 19); place('jelly', 38, 25); place('star', 17, 30);
place('jelly', 10, 41); place('jelly', 29, 41);
place('cookie', 32, 13); place('cookie', 12, 30); place('cookie', 34, 39); place('donut', 36, 30);

// ---- sugar rush: arrows of boost pads point along two diagonals, then a spot of jam (slow pads)
// brakes the snake before the bend. Crystals lie between the arrows.
const turn = (m, k) => DIRS[(DIRS.indexOf(m) + k + 6) % 6];
function arrow(i) {
  const [c, r] = route.at(i), m = route.heading(i);
  figure = 'arrow ' + i;
  put([[c, r], g.step(c, r, turn(m, 2)), g.step(c, r, turn(m, -2))], '>');
}
function jam(i) {
  figure = 'jam ' + i;
  put([route.at(i), ...near(...route.at(i)).filter(q => !route.has(...q))], '=');
}
arrow(32); arrow(34); arrow(36); jam(38);
arrow(94); arrow(96); arrow(98); jam(100);

for (const [c, r] of route.cells) for (const [x, y] of [[c, r], ...near(c, r)])
  if (/[#^]/.test(g.get(T, x, y))) problems.push(`'${g.get(T, x, y)}' of ${owner.get(key(x, y))} stands next to the road at ${x},${y}`);
if (problems.length) throw new Error(problems.join('\n'));

// ---- stages, by road index: every bend is taken inside a chain.
g.routeStages(route, T, [
  [['gem', 10]],                                 // 1  after the run-up
  [['chain', 12, 16]],                           // 2
  [['chain', 18, 21]],                           // 3
  [['chain', 22, 27]],                           // 4  a step to the west
  [['chain', 28, 31]],                           // 5
  [['gems', 33, 35, 37]],                        // 6  sugar rush
  [['chain', 39, 43]],                           // 7
  [['chain', 44, 48]],                           // 8
  [['chain', 50, 54]],                           // 9
  [['gems', 56, 58]],                            // 10
  [['chain', 60, 64]],                           // 11 onto pass B, under the arch
  [['gem', 66]],                                 // 12
  [['chain', 68, 71]],                           // 13
  [['chain', 72, 76]],                           // 14
  [['gem', 78]],                                 // 15
  [['chain', 80, 84]],                           // 16
  [['chain', 86, 89]],                           // 17
  [['chain', 91, 93]],                           // 18
  [['gems', 95, 97, 99]],                        // 19 sugar rush
  [['chain', 101, 105]],                         // 20
  [['chain', 107, 111]],                         // 21
  [['gems', 113, 116]],                          // 22
  [['chain', 119, L + 3]],                       // 23 back onto the run-up
  [['gems', L + 5, L + 7]]                       // 24 just before stage 1
]);

// ---- colours: a patchwork of candy pinks and violets, in blobs that repeat with the tile (the sines
// go a whole number of times round it), under the figures and the road.
route.cells.forEach(([c, r], i) => paint.set(key(c, r), i % 2 ? C.chocolate : C.caramel));
const TAU = 2 * Math.PI, patch = [C.violet, C.pink, C.rose, C.lilac];
function blob(c, r) {
  const x = c / W, y = (r + (c & 1) / 2) / H;
  return Math.sin(TAU * (3 * x + 2 * y) + 1) + Math.sin(TAU * (4 * y - 2 * x) + 2) + Math.sin(TAU * (5 * x - y) + 4) + 0.6 * Math.sin(TAU * (7 * x + 6 * y));
}
const colorOf = (c, r) => paint.get(key(c, r)) || patch[Math.max(0, Math.min(3, Math.floor((blob(c, r) + 2.6) / 1.3)))];
// The underside is never seen but has to be drawn.
const colors = {top: g.layers(colorOf), bottom: [[C.pink, C.violet, 'r']]};
module.exports = {key: 'candy', name: 'Level 7', kind: 'Candy', start: [...start, 'N'], colors, grid: g};
if (require.main === module) console.log(g.print());
