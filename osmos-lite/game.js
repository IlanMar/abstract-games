'use strict';

// ============================================================================
// CONFIG — всё, что крутится при тюнинге ощущения. Расстояния в пикселях мира
// (при зуме 1 это пиксели экрана), время в секундах.
// Можно менять прямо из консоли браузера: CONFIG.drag = 0.6 — применится сразу.
// ============================================================================
const CONFIG = {
  // --- тяга игрока ---------------------------------------------------------
  thrust: 620,            // px/с²: ускорение от полной тяги у стартовой клетки
  thrustRampUp: 0.28,     // с: за столько тяга набирает ~63% после нажатия — «раскачка»
  thrustRampDown: 0.10,   // с: и так же быстро спадает после отпускания
  counterThrust: 1.3,     // тяга против текущей скорости сильнее: разворот не вязнет
  massFeel: 0.3,          // 0 — масса не влияет на разгон, 1 — честный F = ma

  // --- среда ----------------------------------------------------------------
  drag: 0.95,             // 1/с: вязкость жидкости; без тяги скорость падает в e раз за 1/drag с
  dragMassFeel: 0.15,     // крупная клетка тормозится медленнее: drag · m^-dragMassFeel
  maxSpeed: 560,          // px/с: мягкий потолок скорости
  overspeedDrag: 4,       // 1/с: как быстро срезается всё, что выше потолка

  // --- указатель (мышь или палец) --------------------------------------------
  deadZone: 14,           // px экрана вокруг центра клетки: тяги нет, клетка не дёргается
  fullForceDistance: 240, // px экрана от края dead zone до полной тяги
  fullForceScreen: 0.36,  // но не больше этой доли короткой стороны экрана (телефон)
  forceCurve: 1.3,        // >1 — мягче у центра, точнее мелкие движения

  // --- масса и размеры --------------------------------------------------------
  density: 1,             // масса = density · r², значит при слиянии r = √(r1² + r2²)
  playerRadius: 22,

  // --- мир и население --------------------------------------------------------
  worldRadius: 1500,      // мир — круглая чаша, край мягкий
  population: [           // размеры в долях стартового радиуса игрока
    { count: 26, min: 0.30, max: 0.80 },  // добыча
    { count: 8,  min: 0.90, max: 1.10 },  // ровня — отталкивается
    { count: 10, min: 1.30, max: 2.10 },  // опасные
    { count: 5,  min: 2.50, max: 5.00 },  // очень опасные
  ],
  minOrganisms: 34,       // съели слишком много — вдалеке, вне экрана, появится новая мелочь
  driftSpeed: [12, 42],   // px/с: собственный дрейф организмов
  wanderTurn: 0.5,        // рад/√с: насколько блуждает направление дрейфа
  steerTime: 2.5,         // с: за сколько организм возвращается к своему дрейфу после толчка

  // --- поглощение ---------------------------------------------------------------
  absorbRatio: 1.12,      // во столько раз по радиусу надо быть больше, чтобы съесть
  captureReach: 0.6,      // 1 — захват при касании, 0 — когда жертва целиком за мембраной
  absorptionTime: 0.55,   // с: базовое время растворения (крупная жертва дольше)

  // --- столкновения ---------------------------------------------------------------
  bounceStiffness: 900,   // 1/с²: жёсткость мягкого отталкивания ровни
  bounceDamping: 18,      // 1/с: гашение отскока
  wallStiffness: 40,      // 1/с²: край мира — мягкая упругая стенка
  wallDamping: 6,

  // --- камера -------------------------------------------------------------------
  cameraStiffness: 3.4,   // рад/с: пружина камеры; меньше — ленивее и заметнее вес
  cameraLookAhead: 0.66,  // с: камера смотрит на столько секунд пути вперёд (≈2/stiffness
                          // держит клетку в центре на ровном ходу, больше — вид чуть впереди)
  cameraMaxLead: 0.22,    // доля короткой стороны экрана: предел упреждения
  viewSize: 950,          // px: базовый зум = √(W·H) / viewSize
  zoomGrowth: 0.55,       // как сильно отъезжает камера при росте (0 — никак, 1 — клетка
                          // на экране всегда одного размера)
  zoomSmoothness: 0.8,    // с: инерция зума
  speedZoomOut: 0.08,     // на полной скорости камера отъезжает на столько

  // --- визуал ---------------------------------------------------------------------
  wobble: 0.02,           // амплитуда дрожания мембраны, доля радиуса
  breathe: 0.012,         // и её «дыхание»
  stretch: 0.09,          // вытягивание вдоль скорости на maxSpeed
  nucleusLag: 0.22,       // ядро отстаёт при ускорении: доля радиуса на полной тяге
  wakeRate: 70,           // пузырьков в секунду за клеткой на полной тяге

  // --- шаг симуляции ----------------------------------------------------------------
  maxStep: 1 / 120,       // физика бьёт кадр на подшаги не длиннее этого
  maxFrameDt: 0.1,        // после свёрнутой вкладки кадр не длиннее этого
  maxDPR: 2,              // iPhone с DPR 3 рисуем в 2× — разницы не видно, а кадр вдвое дешевле
};

// ============================================================================

const TAU = Math.PI * 2;
const $ = id => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
const hintEl = $('hint'), overEl = $('over'), debugEl = $('debug');

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const expK = (dt, tau) => 1 - Math.exp(-dt / tau);   // доля пути к цели за dt, не зависит от FPS
const massOf = r => CONFIG.density * r * r;
const baseMass = () => massOf(CONFIG.playerRadius);

const touchUI = matchMedia('(pointer: coarse)').matches;
if (touchUI) {
  hintEl.textContent = 'Touch and hold to push the cell toward your finger';
  overEl.firstElementChild.textContent = 'Absorbed — tap to restart';
}

// Цвета: игрок, добыча, ровня, угроза
const RGB_PLAYER = [110, 190, 255];
const RGB_FOOD   = [ 95, 225, 165];
const RGB_EQUAL  = [175, 185, 205];
const RGB_THREAT = [255, 118,  92];

let W = 0, H = 0, DPR = 1;
const cam = { x: 0, y: 0, vx: 0, vy: 0, zoom: 1, fx: 0, fy: 0, fr: CONFIG.playerRadius };
const input = { down: false, x: 0, y: 0, gx: 0, gy: 0, tx: 0, ty: 0, power: 0 };
let cells = [], order = [], player = null;
let time = 0, dead = false, deadT = 0, spawnT = 0, thrustUsed = 0, wakeAcc = 0;
let firstRun = true, debug = false, fps = 60, last = performance.now();

// ============================================================================
// Организмы
// ============================================================================

function makeCell(x, y, r, isPlayer) {
  return {
    x, y, vx: 0, vy: 0, r, m: massOf(r), isPlayer,
    eatenBy: null, offX: 0, offY: 0, m0: 0, absorbT: 1,
    dead: false, born: isPlayer ? 1 : 0, flash: 0, tint: 0,
    wander: Math.random() * TAU, cruise: 0, ph: Math.random() * 100,
    // только для отрисовки
    svx: 0, svy: 0, st: 0, ang: 0,     // сглаженная скорость, растяжение, его угол
    pvx: 0, pvy: 0, ax: 0, ay: 0,      // скорость до кадра и сглаженное ускорение
    nx: 0, ny: 0, nvx: 0, nvy: 0,      // смещение ядра — маленькая пружина внутри клетки
    sx: 0, sy: 0, sr: 0, vis: false,
  };
}

function setMass(c, m) {
  c.m = m > 0 ? m : 0;
  c.r = Math.sqrt(c.m / CONFIG.density);
}

function giveDrift(c) {
  // мелочь шустрее, гиганты еле ползут
  const [a, b] = CONFIG.driftSpeed;
  c.cruise = lerp(a, b, Math.random()) * clamp(Math.sqrt(CONFIG.playerRadius / c.r), 0.45, 1.3);
  c.vx = Math.cos(c.wander) * c.cruise;
  c.vy = Math.sin(c.wander) * c.cruise;
}

// Ищет свободное место; farFromView — только вне экрана (для подсадки новых)
function place(r, safe, farFromView) {
  const R = CONFIG.worldRadius;
  for (let tries = 0; tries < 80; tries++) {
    const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * (R - r - 40);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    if (Math.hypot(x - player.x, y - player.y) < safe + r + player.r) continue;
    if (farFromView) {
      const view = Math.hypot(W, H) / 2 / cam.zoom;
      if (Math.hypot(x - cam.x, y - cam.y) < view + r * 2) continue;
    }
    let free = true;
    for (const o of cells) {
      if (Math.hypot(x - o.x, y - o.y) < o.r + r + 24) { free = false; break; }
    }
    if (free) return { x, y };
  }
  return null;
}

function spawn(r, safe, farFromView) {
  const p = place(r, safe, farFromView);
  if (!p) return null;
  const c = makeCell(p.x, p.y, r, false);
  giveDrift(c);
  cells.push(c);
  return c;
}

function reset() {
  cells = [];
  player = makeCell(0, 0, CONFIG.playerRadius, true);
  cells.push(player);
  const r0 = CONFIG.playerRadius;
  for (const g of CONFIG.population) {
    for (let i = 0; i < g.count; i++) {
      const r = r0 * lerp(g.min, g.max, Math.random());
      // крупных не сажаем рядом, а первые куски добычи — наоборот, недалеко
      const safe = r > r0 ? 520 : (i < 5 ? 150 : 220);
      spawn(r, safe, false);
    }
  }
  for (const c of cells) c.born = 1;    // стартовое население видно сразу
  resetParticles();
  dead = false; deadT = 0; spawnT = 0;
  input.tx = input.ty = input.gx = input.gy = 0;
  overEl.classList.remove('show');
  if (firstRun) {
    // При самом первом запуске камера сразу на игроке, при рестарте — плавно доедет
    cam.x = cam.fx = player.x; cam.y = cam.fy = player.y;
    cam.zoom = targetZoom();
    firstRun = false;
  }
}

// ============================================================================
// Ввод: мышь и палец через pointer events
// ============================================================================

let activePointer = null;

cv.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  if (dead) {
    if (deadT > 0.5) reset();           // тап-рестарт, но не тот же тап, что пришёлся на смерть
    return;
  }
  activePointer = e.pointerId;
  input.down = true; input.x = e.clientX; input.y = e.clientY;
  try { cv.setPointerCapture(e.pointerId); } catch (err) {}
});
cv.addEventListener('pointermove', e => {
  if (activePointer !== null && e.pointerId !== activePointer) return;
  input.x = e.clientX; input.y = e.clientY;
});
function release(e) {
  if (e && activePointer !== null && e.pointerId !== activePointer) return;
  activePointer = null;
  input.down = false;
}
cv.addEventListener('pointerup', release);
cv.addEventListener('pointercancel', release);
cv.addEventListener('lostpointercapture', release);
window.addEventListener('blur', () => release());
cv.addEventListener('contextmenu', e => e.preventDefault());
// iOS Safari: никаких щипков-зумов и прокрутки страницы
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

window.addEventListener('keydown', e => {
  if (e.code === 'KeyD') { debug = !debug; debugEl.classList.toggle('show', debug); }
  if (dead && deadT > 0.5 && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR')) reset();
});

document.addEventListener('visibilitychange', () => {
  last = performance.now();
  release();
});

function fullForce() {
  return Math.min(CONFIG.fullForceDistance, Math.min(W, H) * CONFIG.fullForceScreen);
}

// Направление и сила тяги из положения указателя относительно клетки на экране
function readInput() {
  input.gx = input.gy = 0;
  if (!input.down || dead || player.eatenBy) return;
  const px = (player.x - cam.x) * cam.zoom + W / 2;
  const py = (player.y - cam.y) * cam.zoom + H / 2;
  const dx = input.x - px, dy = input.y - py, dist = Math.hypot(dx, dy);
  if (dist <= CONFIG.deadZone) return;
  const t = Math.pow(clamp((dist - CONFIG.deadZone) / fullForce(), 0, 1), CONFIG.forceCurve);
  input.gx = dx / dist * t;
  input.gy = dy / dist * t;
}

// ============================================================================
// Физика: один подшаг длиной h
// ============================================================================

function stepPlayer(h) {
  const p = player;
  // Тяга не включается мгновенно: сглаженный вектор догоняет цель
  const want = Math.hypot(input.gx, input.gy), have = Math.hypot(input.tx, input.ty);
  const k = expK(h, want > have ? CONFIG.thrustRampUp : CONFIG.thrustRampDown);
  input.tx += (input.gx - input.tx) * k;
  input.ty += (input.gy - input.ty) * k;
  if (p.eatenBy) return;

  // F = thrust · m0 · (m/m0)^(1 - massFeel);  a = F / m
  const relM = p.m / baseMass();
  const F = CONFIG.thrust * baseMass() * Math.pow(relM, 1 - CONFIG.massFeel);
  let ax = input.tx * F / p.m, ay = input.ty * F / p.m;

  // Против хода тяга чуть сильнее: гасить скорость приятнее, чем набирать
  const sp = Math.hypot(p.vx, p.vy), am = Math.hypot(ax, ay);
  if (sp > 1e-3 && am > 1e-6) {
    const cos = (ax * p.vx + ay * p.vy) / (sp * am);
    const boost = 1 + (CONFIG.counterThrust - 1) * Math.max(0, -cos);
    ax *= boost; ay *= boost;
  }
  p.vx += ax * h;
  p.vy += ay * h;

  // Вязкость: экспонента, а не v -= v·drag·h — так не зависит от шага
  const drag = CONFIG.drag * Math.pow(relM, -CONFIG.dragMassFeel);
  const d = Math.exp(-drag * h);
  p.vx *= d; p.vy *= d;

  // Мягкий потолок: превышение гаснет, а не обрезается
  const s = Math.hypot(p.vx, p.vy);
  if (s > CONFIG.maxSpeed) {
    const ns = CONFIG.maxSpeed + (s - CONFIG.maxSpeed) * Math.exp(-CONFIG.overspeedDrag * h);
    p.vx *= ns / s; p.vy *= ns / s;
  }
}

function stepDrifters(h) {
  const k = expK(h, CONFIG.steerTime);
  const jitter = CONFIG.wanderTurn * Math.sqrt(h) * 1.732;   // случайное блуждание с дисперсией σ²·t
  for (const c of cells) {
    if (c.isPlayer || c.eatenBy) continue;
    c.wander += (Math.random() * 2 - 1) * jitter;
    c.vx += (Math.cos(c.wander) * c.cruise - c.vx) * k;
    c.vy += (Math.sin(c.wander) * c.cruise - c.vy) * k;
  }
}

function capture(big, small) {
  small.eatenBy = big;
  small.offX = small.x - big.x;
  small.offY = small.y - big.y;
  small.m0 = small.m;
  // мелочь растворяется быстро, жертва почти своего размера — дольше
  small.absorbT = CONFIG.absorptionTime * clamp(0.35 + 1.3 * Math.sqrt(small.m / big.m), 0.35, 1.6);
}

function collide(h) {
  const n = cells.length, ratio = CONFIG.absorbRatio;
  for (let i = 0; i < n; i++) {
    const a = cells[i];
    if (a.eatenBy) continue;
    for (let j = i + 1; j < n; j++) {
      const b = cells[j];
      if (b.eatenBy) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rs = a.r + b.r, d2 = dx * dx + dy * dy;
      if (d2 >= rs * rs) continue;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
      const big = a.r >= b.r ? a : b, small = big === a ? b : a;

      if (big.r >= small.r * ratio) {
        // Заметно крупнее — не толкаемся, а ждём, пока жертва войдёт под мембрану
        if (d < big.r + small.r * CONFIG.captureReach) capture(big, small);
        continue;
      }
      // Ровня: мягкая пружина с гашением, равные и противоположные силы — импульс сохраняется
      const overlap = rs - d;
      const relVn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      const mr = a.m * b.m / (a.m + b.m);
      const F = Math.max(0, CONFIG.bounceStiffness * overlap - CONFIG.bounceDamping * relVn) * mr;
      a.vx -= nx * F / a.m * h; a.vy -= ny * F / a.m * h;
      b.vx += nx * F / b.m * h; b.vy += ny * F / b.m * h;
    }
  }
}

function walls(h) {
  const R = CONFIG.worldRadius;
  for (const c of cells) {
    if (c.eatenBy) continue;
    const d = Math.hypot(c.x, c.y), p = d + c.r - R;
    if (p <= 0 || d < 1e-6) continue;
    const nx = c.x / d, ny = c.y / d, vn = c.vx * nx + c.vy * ny;
    const a = CONFIG.wallStiffness * p + (vn > 0 ? CONFIG.wallDamping * vn : 0);
    c.vx -= nx * a * h; c.vy -= ny * a * h;
  }
}

function absorb(h) {
  let removed = false;
  for (const c of cells) {
    if (!c.eatenBy) continue;
    const big = c.eatenBy;
    // Жертву затягивает к центру хищника и растворяет
    const pull = Math.exp(-h * 3 / c.absorbT);
    c.offX *= pull; c.offY *= pull;
    c.x = big.x + c.offX; c.y = big.y + c.offY;

    let dm = c.m0 * h / c.absorbT;
    if (dm >= c.m - c.m0 * 0.002) { dm = c.m; c.dead = true; removed = true; }
    // Масса переходит вместе со своим импульсом: съесть быструю мошку — лёгкий толчок
    const M = big.m + dm;
    big.vx = (big.m * big.vx + dm * c.vx) / M;
    big.vy = (big.m * big.vy + dm * c.vy) / M;
    setMass(big, M);
    setMass(c, c.m - dm);
    big.flash = Math.min(1, big.flash + dm / big.m * 6);
  }
  if (!removed) return;

  // Кого доедал растворившийся — того доест тот, кто съел его самого
  for (const c of cells) {
    if (!c.eatenBy || !c.eatenBy.dead || c.dead) continue;
    const eater = c.eatenBy;
    if (eater.eatenBy && !eater.eatenBy.dead) {
      c.offX += eater.offX; c.offY += eater.offY;
      c.eatenBy = eater.eatenBy;
    } else {
      c.eatenBy = null;
      c.vx = eater.vx; c.vy = eater.vy;
    }
  }
  if (player.dead && !dead) {
    dead = true; deadT = 0;
    const eater = player.eatenBy;
    cam.fr = eater ? eater.r : player.r;
  }
  cells = cells.filter(c => !c.dead);
}

function stepCamera(h) {
  // Фокус: игрок, а после смерти — тот, кто его съел
  let fx = cam.fx, fy = cam.fy, vx = 0, vy = 0;
  const focus = !player.dead ? player : (player.eatenBy && !player.eatenBy.dead ? player.eatenBy : null);
  if (focus) {
    fx = focus.x; fy = focus.y; vx = focus.vx; vy = focus.vy;
    cam.fr = focus.r;
    if (focus === player && player.eatenBy) { vx = player.eatenBy.vx; vy = player.eatenBy.vy; }
  }
  cam.fx = fx; cam.fy = fy;

  // Упреждение по скорости, но не дальше края экрана
  let lx = vx * CONFIG.cameraLookAhead, ly = vy * CONFIG.cameraLookAhead;
  const lmax = CONFIG.cameraMaxLead * Math.min(W, H) / cam.zoom, l = Math.hypot(lx, ly);
  if (l > lmax) { lx *= lmax / l; ly *= lmax / l; }

  // Критически задемпфированная пружина: догоняет без перелёта, на разгоне отстаёт
  const w = CONFIG.cameraStiffness;
  cam.vx += (w * w * (fx + lx - cam.x) - 2 * w * cam.vx) * h;
  cam.vy += (w * w * (fy + ly - cam.y) - 2 * w * cam.vy) * h;
  cam.x += cam.vx * h;
  cam.y += cam.vy * h;
}

function step(h) {
  stepPlayer(h);
  stepDrifters(h);
  collide(h);
  walls(h);
  for (const c of cells) {
    if (c.eatenBy) continue;
    c.x += c.vx * h;
    c.y += c.vy * h;
  }
  absorb(h);
  stepCamera(h);
}

// Подсаживаем мелочь вне экрана, чтобы мир не пустел
function repopulate(dt) {
  spawnT -= dt;
  if (spawnT > 0 || cells.length - 1 >= CONFIG.minOrganisms) return;
  spawnT = 1.2;
  const pr = player.dead ? CONFIG.playerRadius : player.r;
  const big = Math.random() < 0.25;
  const r = Math.min(pr * (big ? lerp(1.3, 2.2, Math.random()) : lerp(0.3, 0.8, Math.random())),
    CONFIG.worldRadius * 0.12);
  spawn(r, 400, true);
}

function targetZoom() {
  const base = clamp(Math.sqrt(W * H) / CONFIG.viewSize, 0.55, 1.3);
  const grow = Math.pow(CONFIG.playerRadius / Math.max(cam.fr, 1), CONFIG.zoomGrowth);
  const sp = player && !player.dead ? Math.hypot(player.vx, player.vy) / CONFIG.maxSpeed : 0;
  return base * grow / (1 + CONFIG.speedZoomOut * clamp(sp, 0, 1.5));
}

// ============================================================================
// Частицы кильватера — чисто визуальные, массу не несут
// ============================================================================

const PARTS = [];
for (let i = 0; i < 240; i++) PARTS.push({ life: 0, max: 1, x: 0, y: 0, vx: 0, vy: 0, s: 1 });
let partNext = 0;

function resetParticles() { for (const p of PARTS) p.life = 0; }

function emitWake(dt) {
  const power = Math.hypot(input.tx, input.ty);
  if (player.dead || player.eatenBy || power < 0.03) { wakeAcc = 0; return; }
  wakeAcc += CONFIG.wakeRate * power * dt;
  const dx = input.tx / power, dy = input.ty / power;
  const size = Math.sqrt(player.r / CONFIG.playerRadius);
  while (wakeAcc >= 1) {
    wakeAcc--;
    const p = PARTS[partNext]; partNext = (partNext + 1) % PARTS.length;
    const side = (Math.random() * 2 - 1) * player.r * 0.5;
    p.x = player.x - dx * player.r * 0.95 - dy * side;
    p.y = player.y - dy * player.r * 0.95 + dx * side;
    const kick = (60 + Math.random() * 90) * power * size;
    p.vx = player.vx - dx * kick + (Math.random() - 0.5) * 30;
    p.vy = player.vy - dy * kick + (Math.random() - 0.5) * 30;
    p.max = p.life = 0.6 + Math.random() * 0.6;
    p.s = (0.9 + Math.random() * 1.6) * size;
  }
}

function updateParticles(dt) {
  const d = Math.exp(-2.2 * dt);
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    p.life -= dt;
    p.vx *= d; p.vy *= d;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}

// ============================================================================
// Визуальные состояния — сглаживание всего, что видно
// ============================================================================

function updateVisuals(dt) {
  const kv = expK(dt, 0.15), ka = expK(dt, 0.06), kt = expK(dt, 0.3);
  const pr = player.dead ? CONFIG.playerRadius : player.r;
  const K = 70, C = 9;                                   // пружина ядра: чуть недодемпфирована — дрожит
  for (const c of cells) {
    // ускорение за кадр — по нему отстаёт ядро
    const rax = dt > 0 ? (c.vx - c.pvx) / dt : 0, ray = dt > 0 ? (c.vy - c.pvy) / dt : 0;
    c.ax += (rax - c.ax) * ka; c.ay += (ray - c.ay) * ka;

    c.svx += (c.vx - c.svx) * kv; c.svy += (c.vy - c.svy) * kv;
    const sp = Math.hypot(c.svx, c.svy);
    c.st += (CONFIG.stretch * clamp(sp / CONFIG.maxSpeed, 0, 1) - c.st) * kv;
    if (sp > 1) c.ang = Math.atan2(c.svy, c.svx);

    let tx = -c.ax / CONFIG.thrust * CONFIG.nucleusLag * c.r;
    let ty = -c.ay / CONFIG.thrust * CONFIG.nucleusLag * c.r;
    const tl = Math.hypot(tx, ty), tmax = c.r * 0.28;
    if (tl > tmax) { tx *= tmax / tl; ty *= tmax / tl; }
    c.nvx += (-K * (c.nx - tx) - C * c.nvx) * dt; c.nx += c.nvx * dt;
    c.nvy += (-K * (c.ny - ty) - C * c.nvy) * dt; c.ny += c.nvy * dt;

    c.flash *= Math.exp(-3 * dt);
    if (c.born < 1) c.born = Math.min(1, c.born + dt / 1.2);
    if (!c.isPlayer) {
      const q = Math.log(c.r / pr) / Math.log(CONFIG.absorbRatio);
      c.tint += (clamp(q, -1, 1) - c.tint) * kt;
    }
  }
}

// ============================================================================
// Отрисовка
// ============================================================================

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 50));

function rnd(i, seed) {                 // детерминированный хеш -> [0,1)
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(seed, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Пыль: слои с параллаксом, бесконечная плитка без хранения точек
const DUST = [
  { p: 0.10, zp: 0.15, tile: 360, count: 9, size: 1.0, color: 'rgba(140,170,225,0.22)', dx: 4,  dy: 1.5 },
  { p: 0.30, zp: 0.40, tile: 420, count: 6, size: 1.4, color: 'rgba(150,190,240,0.18)', dx: 7,  dy: -3 },
  { p: 0.65, zp: 0.75, tile: 520, count: 4, size: 1.8, color: 'rgba(170,210,255,0.14)', dx: -5, dy: 4 },
  { p: 1.00, zp: 1.00, tile: 460, count: 4, size: 2.2, color: 'rgba(160,220,255,0.10)', dx: 0,  dy: 0 },
];

function drawDust() {
  for (let li = 0; li < DUST.length; li++) {
    const L = DUST[li], lz = Math.pow(cam.zoom, L.zp), T = L.tile;
    const ox = cam.x * L.p + time * L.dx, oy = cam.y * L.p + time * L.dy;
    const hw = W / 2 / lz, hh = H / 2 / lz;
    const x0 = Math.floor((ox - hw) / T), x1 = Math.floor((ox + hw) / T);
    const y0 = Math.floor((oy - hh) / T), y1 = Math.floor((oy + hh) / T);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > 400) continue;
    ctx.fillStyle = L.color;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const cell = Math.imul(tx, 73856093) ^ Math.imul(ty, 19349663);
        for (let k = 0; k < L.count; k++) {
          const id = cell ^ Math.imul(k + 1, 83492791);
          const px = (tx + rnd(id, 1 + li)) * T, py = (ty + rnd(id, 7 + li)) * T;
          const s = L.size * (0.6 + rnd(id, 13 + li) * 0.9);
          ctx.fillRect((px - ox) * lz + W / 2 - s / 2, (py - oy) * lz + H / 2 - s / 2, s, s);
        }
      }
    }
  }
}

function drawBoundary() {
  const z = cam.zoom, cx = -cam.x * z + W / 2, cy = -cam.y * z + H / 2, R = CONFIG.worldRadius * z;
  // Если край мира далеко за экраном — рисовать нечего
  const far = Math.hypot(cam.x, cam.y) * z;
  if (far + Math.hypot(W, H) / 2 < R - 20) return;
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(cx, cy, R, 0, TAU, true);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.strokeStyle = 'rgba(120,170,255,0.035)'; ctx.lineWidth = 18; ctx.stroke();
  ctx.strokeStyle = 'rgba(140,190,255,0.14)';  ctx.lineWidth = 1.5; ctx.stroke();
}

const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const light = c => mix(c, [255, 255, 255], 0.5);

function colorOf(c) {
  if (c.isPlayer) return RGB_PLAYER;
  return c.tint < 0 ? mix(RGB_EQUAL, RGB_FOOD, -c.tint) : mix(RGB_EQUAL, RGB_THREAT, c.tint);
}

function alphaOf(c) {
  let a = c.born;
  if (c.eatenBy) a *= Math.sqrt(clamp(c.m / c.m0, 0, 1));
  return a;
}

function membrane(sr, ph) {
  const n = clamp(Math.round(sr * 0.5), 16, 52), A = CONFIG.wobble;
  const br = sr * (1 + CONFIG.breathe * Math.sin(time * 1.6 + ph));
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const th = i / n * TAU;
    const k = 1 + A * (0.5 * Math.sin(3 * th + time * 1.1 + ph)
                     + 0.3 * Math.sin(5 * th - time * 1.7 + ph * 2)
                     + 0.2 * Math.sin(7 * th + time * 2.3 + ph * 3));
    const x = Math.cos(th) * br * k, y = Math.sin(th) * br * k;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function drawGlow(c, col, a) {
  const R = c.sr * (c.isPlayer ? 2.4 : 1.9);
  const ga = (c.isPlayer ? 0.22 : 0.11) * a * (1 + c.flash * 1.8);
  const g = ctx.createRadialGradient(c.sx, c.sy, c.sr * 0.5, c.sx, c.sy, R);
  g.addColorStop(0, rgba(col, ga));
  g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(c.sx, c.sy, R, 0, TAU); ctx.fill();
}

function drawBody(c, col, a) {
  const sr = c.sr, lc = light(col);
  if (sr < 2.5) {
    ctx.fillStyle = rgba(lc, 0.7 * a);
    ctx.beginPath(); ctx.arc(c.sx, c.sy, Math.max(sr, 1), 0, TAU); ctx.fill();
    return;
  }
  // Мембрана и цитоплазма — в повёрнутой и чуть вытянутой вдоль скорости системе
  ctx.save();
  ctx.translate(c.sx, c.sy);
  ctx.rotate(c.ang);
  const s = 1 + c.st;
  ctx.scale(s, 1 / s);                // площадь сохраняется
  membrane(sr, c.ph);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, sr * 1.03);
  const p = c.isPlayer ? 1.25 : 1;
  g.addColorStop(0,    rgba(col, 0.06 * a * p));
  g.addColorStop(0.55, rgba(col, 0.14 * a * p));
  g.addColorStop(0.86, rgba(col, 0.32 * a * p));
  g.addColorStop(1,    rgba(col, 0.72 * a));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, sr * 0.035);
  ctx.strokeStyle = rgba(lc, (c.isPlayer ? 0.6 : 0.45) * a);
  ctx.stroke();
  ctx.restore();

  // Ядро: медленно плавает и отстаёт при ускорении — видно, что внутри есть масса
  const z = cam.zoom;
  const nx = c.sx + c.nx * z + sr * 0.06 * Math.sin(time * 0.6 + c.ph);
  const ny = c.sy + c.ny * z + sr * 0.06 * Math.cos(time * 0.47 + c.ph * 1.3);
  const nr = sr * (c.isPlayer ? 0.36 : 0.3);
  const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
  ng.addColorStop(0,   `rgba(255,255,255,${(0.85 * a * (c.isPlayer ? 1 : 0.6)).toFixed(3)})`);
  ng.addColorStop(0.35, rgba(lc, 0.5 * a));
  ng.addColorStop(1,   rgba(col, 0));
  ctx.fillStyle = ng;
  ctx.beginPath(); ctx.arc(nx, ny, nr, 0, TAU); ctx.fill();

  // Органеллы — только когда клетка на экране достаточно крупная
  if (sr > 10) {
    ctx.fillStyle = rgba(lc, 0.32 * a);
    const os = Math.max(1, sr * 0.045);
    for (let k = 0; k < 4; k++) {
      const an = c.ph * (k + 1) + time * (0.15 + 0.05 * k) * (k & 1 ? 1 : -1);
      const rr = sr * (0.45 + 0.1 * Math.sin(time * 0.4 + k + c.ph));
      const ox = c.sx + c.nx * z * 0.5 + Math.cos(an) * rr;
      const oy = c.sy + c.ny * z * 0.5 + Math.sin(an) * rr;
      ctx.beginPath(); ctx.arc(ox, oy, os, 0, TAU); ctx.fill();
    }
  }
}

function drawCells() {
  const z = cam.zoom;
  for (const c of cells) {
    c.sx = (c.x - cam.x) * z + W / 2;
    c.sy = (c.y - cam.y) * z + H / 2;
    c.sr = c.r * z;
    const m = c.sr * 2.5 + 4;
    c.vis = c.sx > -m && c.sx < W + m && c.sy > -m && c.sy < H + m && c.sr > 0.2;
  }
  // мелкие снизу: жертва видна сквозь полупрозрачного хищника, пока растворяется
  order = cells.slice().sort((a, b) => a.r - b.r);

  ctx.globalCompositeOperation = 'lighter';
  for (const c of order) if (c.vis && c.sr > 2) drawGlow(c, colorOf(c), alphaOf(c));
  ctx.globalCompositeOperation = 'source-over';
  for (const c of order) if (c.vis) drawBody(c, colorOf(c), alphaOf(c));
}

function drawParticles() {
  const z = cam.zoom;
  ctx.globalCompositeOperation = 'lighter';
  for (const p of PARTS) {
    if (p.life <= 0) continue;
    const t = p.life / p.max;
    const x = (p.x - cam.x) * z + W / 2, y = (p.y - cam.y) * z + H / 2, s = Math.max(0.6, p.s * z);
    ctx.fillStyle = rgba(RGB_PLAYER, 0.45 * t * t);
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Тонкий пунктир к указателю — видно, куда и насколько сильно давишь
function drawAim() {
  if (!input.down || dead || player.eatenBy || touchUI) return;
  const px = player.sx, py = player.sy, dx = input.x - px, dy = input.y - py, d = Math.hypot(dx, dy);
  if (d <= CONFIG.deadZone) return;
  const a = 0.08 + 0.2 * Math.hypot(input.tx, input.ty);
  const from = Math.min(player.sr * 1.25, d);
  ctx.setLineDash([2, 7]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(RGB_PLAYER, a);
  ctx.beginPath();
  ctx.moveTo(px + dx / d * from, py + dy / d * from);
  ctx.lineTo(input.x, input.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(input.x, input.y, 5, 0, TAU); ctx.stroke();
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  drawDust();
  drawBoundary();
  drawParticles();
  drawCells();
  drawAim();
}

// ============================================================================
// Главный цикл
// ============================================================================

function checkFinite() {
  for (const c of cells) {
    if (Number.isFinite(c.x + c.y + c.vx + c.vy + c.m)) continue;
    console.error('NaN in physics', c);
    c.vx = c.vy = 0;
    if (!Number.isFinite(c.x + c.y)) c.x = c.y = 0;
    if (!Number.isFinite(c.m) || c.m <= 0) setMass(c, massOf(CONFIG.playerRadius * 0.5));
  }
  if (!Number.isFinite(cam.x + cam.y + cam.vx + cam.vy + cam.zoom)) {
    console.error('NaN in camera');
    cam.x = cam.fx; cam.y = cam.fy; cam.vx = cam.vy = 0; cam.zoom = 1;
  }
}

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (!(dt > 0)) dt = 0;
  dt = Math.min(dt, CONFIG.maxFrameDt);
  if (dt > 0) fps += (1 / dt - fps) * 0.05;

  for (const c of cells) { c.pvx = c.vx; c.pvy = c.vy; }
  readInput();
  if (dt > 0) {
    const n = Math.ceil(dt / CONFIG.maxStep), h = dt / n;
    for (let i = 0; i < n; i++) step(h);
  }
  time += dt;

  const tz = targetZoom();
  cam.zoom = Math.exp(lerp(Math.log(cam.zoom), Math.log(tz), expK(dt, CONFIG.zoomSmoothness)));

  emitWake(dt);
  updateParticles(dt);
  updateVisuals(dt);
  repopulate(dt);
  checkFinite();

  if (input.down && !dead) {
    thrustUsed += dt;
    if (thrustUsed > 1.5) hintEl.classList.add('hide');
  }
  if (dead) {
    deadT += dt;
    if (deadT > 0.5) overEl.classList.add('show');
  }

  render();
  if (debug) {
    const sp = player.dead ? 0 : Math.hypot(player.vx, player.vy);
    debugEl.textContent =
      `fps    ${fps.toFixed(0)}\n` +
      `speed  ${sp.toFixed(0)} px/s\n` +
      `thrust ${Math.hypot(input.tx, input.ty).toFixed(2)}\n` +
      `mass   ${(player.m / baseMass()).toFixed(2)} × start\n` +
      `radius ${player.r.toFixed(1)}\n` +
      `zoom   ${cam.zoom.toFixed(2)}\n` +
      `cells  ${cells.length}`;
  }
  requestAnimationFrame(frame);
}

resize();
reset();
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
