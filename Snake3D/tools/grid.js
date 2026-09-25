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
  // Adds the next stage. Each group is ['gem', side, c, r], ['chain', side, c, r, moves] or
  // ['chain', side, [[c, r], ...]] with the cells in walking order.
  stage(...groups) {
    let s = '';
    for (const [kind, side, c, r, moves] of groups) {
      const ch = this.letter(kind);
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
