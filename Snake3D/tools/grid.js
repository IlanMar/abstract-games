// Drawing aid for the world scripts in tools/worlds. A world is drawn on two text grids (top and
// bottom face), then stages are placed with stage(). build-levels.js turns the result into levels.js.
//
// Coordinates are (c, r): column, and line of the text picture, line 0 being the north edge.
// Square moves: N (up the picture), S, E, W. Hex moves: N, S, NE, SE, NW, SW; odd hex columns sit
// half a cell lower than even ones.
const MOVES = {N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0]};

// One hex step in picture coordinates (h: number of lines). Works through data rows, which grow upwards.
function hexStep(c, r, m, h) {
  const y = h - 1 - r, odd = c & 1;
  let nc = c, ny = y;
  switch (m) {
    case 'N': ny = y + 1; break;
    case 'S': ny = y - 1; break;
    case 'NE': nc = c + 1; ny = odd ? y : y + 1; break;
    case 'SE': nc = c + 1; ny = odd ? y - 1 : y; break;
    case 'NW': nc = c - 1; ny = odd ? y : y + 1; break;
    case 'SW': nc = c - 1; ny = odd ? y - 1 : y; break;
    default: throw new Error('bad hex move ' + m);
  }
  return [nc, h - 1 - ny];
}

class Grid {
  constructor(w, h, hex = false) {
    if (hex && w % 2) throw new Error('a hex world needs an even width to wrap');
    this.w = w; this.h = h; this.hex = hex;
    this.top = Array.from({length: h}, () => Array(w).fill(' '));
    this.bottom = Array.from({length: h}, () => Array(w).fill(' '));
    this.stages = [];
    this.used = {gem: 0, chain: 0};
  }
  sides(side) { return side === 'both' ? [this.top, this.bottom] : [this[side]]; }
  set(side, c, r, ch) {
    if (c < 0 || r < 0 || c >= this.w || r >= this.h) throw new Error(`out of range ${c},${r}`);
    for (const g of this.sides(side)) g[r][c] = ch;
  }
  get(side, c, r) { return this[side][r][c]; }
  // Tile characters: ' ' hole, '.' floor, '#' wall, '^' spike, '>' boost, '=' slow. Side: top | bottom | both.
  rect(side, c0, r0, c1, r1, ch) {
    for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++)
      for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) this.set(side, c, r, ch);
  }
  floor(c0, r0, c1, r1) { this.rect('both', c0, r0, c1, r1, '.'); }
  hole(c0, r0, c1 = c0, r1 = r0) { this.rect('both', c0, r0, c1, r1, ' '); }
  // Cells visited from (c, r) by a move string: 'EEEN' (square) or 'N NE NE' (hex, space separated).
  cells(c, r, moves) {
    const out = [[c, r]];
    const list = this.hex ? moves.split(/[ ,]+/).filter(Boolean) : [...moves];
    for (const m of list) {
      if (this.hex) [c, r] = hexStep(c, r, m, this.h);
      else { c += MOVES[m][0]; r += MOVES[m][1]; }
      out.push([c, r]);
    }
    return out;
  }
  // Crystals take A..Z and chains a..z, each in order of appearance.
  letter(kind) {
    const k = this.used[kind]++;
    if (k >= 26) throw new Error('out of letters for ' + kind);
    return String.fromCharCode((kind === 'gem' ? 65 : 97) + k);
  }
  // Adds the next stage. Each group is ['gem', side, c, r], ['gems', side, [[c, r], ...]] (a trail of
  // crystals under one letter), ['chain', side, c, r, moves] or ['chain', side, [[c, r], ...]] with the
  // cells in walking order.
  stage(...groups) {
    let s = '';
    for (const [kind, side, c, r, moves] of groups) {
      const ch = this.letter(kind === 'chain' ? 'chain' : 'gem');
      const cells = kind === 'gem' ? [[c, r]] : Array.isArray(c) ? c : this.cells(c, r, moves);
      for (const [x, y] of cells) {
        const cur = this.get(side, x, y);
        if (cur !== '.') throw new Error(`stage ${this.stages.length + 1} ${ch}: cell ${x},${y} on ${side} is '${cur}'`);
        // The engine places an item only where the top of the cell is plain floor, whichever side it is on.
        const top = this.get('top', x, y);
        if (side === 'bottom' && top !== '.' && !/[a-z]/i.test(top)) throw new Error(`stage ${this.stages.length + 1} ${ch}: top of ${x},${y} is '${top}'`);
        this.set(side, x, y, ch);
      }
      s += ch;
    }
    this.stages.push(s);
  }
  // One move from (c, r) that wraps round the world's edges, in either kind of world.
  move(c, r, m) {
    if (this.hex) return this.step(c, r, m);
    return [(c + MOVES[m][0] + this.w) % this.w, (r + MOVES[m][1] + this.h) % this.h];
  }
  // A route for a world laid out along one path: runs of moves from a start cell, such as 'N13 NE6 N6'
  // or 'N18 E12'. It must come back to its start cell. at(i), along(i, j) and heading(i) look it up by
  // index (0 is the start, heading(i) is the move that reaches cell i); indices past the end go round again.
  route(start, runs) {
    const cells = [start.slice()], moves = [null];
    for (const run of runs.split(' ')) {
      const [, m, n] = run.match(/^([A-Z]+)(\d+)$/);
      for (let i = 0; i < +n; i++) { cells.push(this.move(...cells[cells.length - 1], m)); moves.push(m); }
    }
    const length = cells.length - 1;
    if (String(cells[length]) !== String(start)) throw new Error(`the route ends at ${cells[length]}, not at its start`);
    moves[0] = moves[length];
    const on = new Set(), cell = i => cells[((i % length) + length) % length];
    for (let i = 0; i < length; i++) {
      if (on.has(String(cells[i]))) throw new Error(`the route crosses itself at ${cells[i]}`);
      on.add(String(cells[i]));
    }
    return {length, cells: cells.slice(0, length), has: (c, r) => on.has(`${c},${r}`), at: cell,
      along: (from, to) => Array.from({length: to - from + 1}, (_, k) => cell(from + k)),
      heading: i => moves[((i % length) + length) % length]};
  }
  // Adds the stages of a route world. Each stage is a list of groups by route index: ['gem', i],
  // ['gems', i, j, ...] or ['chain', i, j] (the cells from i to j). Checks that every stage begins within
  // three cells of where the previous one ended, and that the snake gets there without turning: a player
  // needs three cells to react, so it only turns where an item of the stage in play shows the way.
  routeStages(route, side, stages) {
    const first = s => s[0][1], last = s => Math.max(...s.map(([, ...ix]) => ix[ix.length - 1]));
    stages.forEach((s, k) => {
      const e = last(s), f = k + 1 < stages.length ? first(stages[k + 1]) : first(stages[0]) + route.length;
      const n = (k + 1) % stages.length + 1;
      if (f - e > 3) throw new Error(`stage ${n} begins ${f - e} cells after stage ${k + 1}`);
      for (let i = e + 1; i <= f; i++) if (route.heading(i) !== route.heading(e)) throw new Error(`stage ${n} starts round a bend`);
      this.stage(...s.map(([kind, ...ix]) => kind === 'gem' ? ['gem', side, ...route.at(ix[0])]
        : kind === 'gems' ? ['gems', side, ix.map(route.at)] : ['chain', side, route.along(ix[0], ix[1])]));
    });
  }
  // Cells round (c, r) whose centres pass inside(x, y), for drawing pictures: x east and y north of the
  // centre of (c, r), in cells, as the floor looks to a snake heading north (in a hex world odd columns
  // sit half a cell lower). The search goes R cells out and wraps round the world's edges.
  shape(c, r, R, inside) {
    const odd = k => (this.hex ? ((k % 2) + 2) % 2 : 0), out = [];
    for (let dc = -R; dc <= R; dc++) for (let dr = -R - 1; dr <= R + 1; dr++)
      if (inside(dc, -(dr + (odd(c + dc) - odd(c)) / 2))) out.push([(((c + dc) % this.w) + this.w) % this.w, (((r + dr) % this.h) + this.h) % this.h]);
    return out;
  }
  // Colour layers for a face painted cell by cell: colorOf(c, r) gives the colour of every cell. The
  // commonest colour becomes one layer over the whole face, the other cells go in runs down the columns,
  // and a run that repeats in the next column joins it in one rectangle.
  layers(colorOf) {
    const count = new Map();
    for (let c = 0; c < this.w; c++) for (let r = 0; r < this.h; r++) count.set(colorOf(c, r), (count.get(colorOf(c, r)) || 0) + 1);
    const base = [...count].sort((a, b) => b[1] - a[1])[0][0];
    const runs = [];
    for (let c = 0; c < this.w; c++) for (let r = 0; r < this.h; r++) {
      const col = colorOf(c, r);
      if (col === base || (r > 0 && colorOf(c, r - 1) === col)) continue;
      let r1 = r;
      while (r1 + 1 < this.h && colorOf(c, r1 + 1) === col) r1++;
      const left = runs.find(u => u.col === col && u.r0 === r && u.r1 === r1 && u.c1 === c - 1);
      if (left) left.c1 = c; else runs.push({col, r0: r, r1, c0: c, c1: c});
    }
    return [[base, base, 'y'], ...runs.map(u => [u.col, u.col, 'y', [u.c0, u.r0, u.c1, u.r1]])];
  }
  // Hex helpers. A hex world repeats, so these wrap around its edges.
  step(c, r, m) {
    const [nc, nr] = hexStep(c, r, m, this.h);
    return [((nc % this.w) + this.w) % this.w, ((nr % this.h) + this.h) % this.h];
  }
  // Cells exactly `radius` steps from a centre, in walking order: from the north cell, clockwise.
  ring(c, r, radius) {
    if (!radius) return [[c, r]];
    let p = [c, r];
    for (let i = 0; i < radius; i++) p = this.step(...p, 'N');
    const out = [];
    for (const m of ['SE', 'S', 'SW', 'NW', 'N', 'NE']) for (let i = 0; i < radius; i++) { out.push(p); p = this.step(...p, m); }
    return out;
  }
  disk(c, r, radius) { const out = []; for (let k = 0; k <= radius; k++) out.push(...this.ring(c, r, k)); return out; }
  // `count` consecutive ring cells starting at ring index `from` (0 = north), clockwise.
  arc([c, r], from, count, radius = 2) { const rr = this.ring(c, r, radius); return Array.from({length: count}, (_, i) => rr[(from + i) % rr.length]); }
  ascii(side) { return this[side].map(row => row.join('').replace(/\s+$/, '')); }
  // Both faces side by side with a column ruler, for looking at a world while designing it.
  print() {
    const t = this.ascii('top'), b = this.ascii('bottom');
    const ruler = '   ' + Array.from({length: this.w}, (_, c) => c % 10).join('');
    const lines = t.map((line, r) => String(r).padStart(2) + ' ' + line.padEnd(this.w) + ' | ' + b[r]);
    return [ruler + ' | ' + ruler.slice(3), ...lines, 'stages: ' + this.stages.join(' ')].join('\n');
  }
}

module.exports = {Grid, MOVES, hexStep};
