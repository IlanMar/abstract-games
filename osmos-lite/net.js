'use strict';

// ============================================================================
// Сетевая игра: до 6 игроков в одном мире. Ссылка с ?room=код — кто открыл её первым,
// тот хост: его телефон считает весь мир той же физикой, что и одиночная игра, а
// остальные (гости) шлют ему только тапы и рисуют его снимки с интерполяцией.
// Связь — WebRTC напрямую между телефонами (PeerJS). Бесплатный сервер PeerJS нужен,
// только чтобы найти друг друга; где напрямую не пробиться, у PeerJS есть бесплатный
// TURN-ретранслятор. Хост ушёл — гости сами выбирают нового (кто первый займёт код
// комнаты), и мир начинается заново. Без ?room= этот файл только рисует кнопку в меню.
//
// Протокол. Гость → хост, JSON: tap {x, y} — направление выстрела; respawn; view {r} —
// радиус своего экрана в px мира; ping {c}. Хост → гость, JSON: hi {color, world};
// cfg {world}; players {list}; s {k, f, o} — звук; pong; full. И двоичный снимок
// NET.snapHz раз в секунду — только клетки рядом с гостем (см. buildSnapshot).
// ============================================================================

const NET = {
  lib: 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js',
  libHash: 'sha384-nlUQ8ZqCbvStErob+biJNzSgltf6urV3VGqhfIfzhmg9RXmpeRm76ELw0pYnKlTR',   // меняете версию — пересчитайте
  prefix: 'abstract-cell-',  // код комнаты → id хоста на сервере PeerJS
  maxPlayers: 6,             // по числу цветов в PLAYER_RGB
  snapHz: 20,                // снимков в секунду каждому гостю — пока влезают в бюджет:
  budget: 80 * 1024,         // байт/с на гостя (×5 гостей ≈ 3 Мбит/с отдачи с телефона хоста);
  minHz: 8,                  // в тесном мире снимки крупнее — шлём реже, но не реже этого
  delay: 0.1,                // с: гость рисует мир с задержкой ≥ этой (и ≥ 1.6 интервала
                             // между снимками) — чтобы было между чем интерполировать
  extrapolate: 0.15,         // с: снимки запоздали — ведём клетки по скорости не дольше этого
  viewMargin: 1.3,           // гостю — клетки в радиусе его экрана × это + 150 px
  tapRate: 15,               // выстрелов в секунду от гостя — не больше (от флуда)
  joinTimeout: 12,           // с: не подключились — пробуем заново
  stall: 1.5,                // с: снимков нет дольше — «ждём хоста»
};
const ROOM = (new URLSearchParams(location.search).get('room') || '')
  .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
const HEAD = 31, REC = 18, ARM = 5;   // байт: заголовок снимка, клетка, щупальце бактерии

let peer = null, hostConn = null, retryTimer = 0, netStatus = '', wakeLock = null, wakePending = false;
let playersList = [];        // [{c: цвет, h: хост ли}] — для меню и полоски сверху
let viewT = 0, pingT = 0, lastView = 0, rtt = 0, lastSnapAt = 0, snapIvl = 0.05;
let snapBuf = new ArrayBuffer(64 * 1024), snapView = new DataView(snapBuf);
const snaps = [], proxies = new Map();
let clockOff = null, tick = 0, hadCell = false, camSnap = true, respawnAsked = false, hostR = CONFIG.worldRadius;

// ----------------------------------------------------------------------------
// Подключение
// ----------------------------------------------------------------------------

function loadPeer() {
  return new Promise((ok, fail) => {
    if (window.Peer) { ok(); return; }
    const s = document.createElement('script');
    s.src = NET.lib;
    s.integrity = NET.libHash;
    s.crossOrigin = 'anonymous';
    s.onload = ok;
    s.onerror = () => fail(new Error('PeerJS failed to load'));
    document.head.appendChild(s);
  });
}

async function netStart() {
  document.documentElement.classList.add('live');   // меню без размытия: мир под ним живой
  $('mp-solo').hidden = true;
  $('mp-room').hidden = false;
  $('mp-code').textContent = ROOM;
  setStatus('Connecting…');
  try { await loadPeer(); } catch (e) { setStatus('No connection — check the internet'); return; }
  claimHost();
}

function dropPeer() {
  hostConn = null;
  if (peer) { const p = peer; peer = null; try { p.destroy(); } catch (e) {} }
}

function retry(ms, text) {
  clearTimeout(retryTimer);
  if (text) setStatus(text);
  retryTimer = setTimeout(claimHost, ms);
}

// Пробуем занять код комнаты: получилось — мы хост, занят — идём в гости
function claimHost() {
  clearTimeout(retryTimer);
  dropPeer();
  const p = new Peer(NET.prefix + ROOM);
  peer = p;
  let settled = false;
  p.on('open', () => { if (p === peer) { settled = true; becomeHost(); } });
  p.on('error', err => {
    if (p !== peer) return;
    if (!settled && err.type === 'unavailable-id') { settled = true; joinAsGuest(); return; }
    if (net.role === 'host' && settled) return;   // сервер PeerJS моргнул — 'disconnected' переподключит
    netError(err);
  });
}

function joinAsGuest() {
  dropPeer();
  const p = new Peer();
  peer = p;
  p.on('open', () => {
    if (p !== peer) return;
    const conn = p.connect(NET.prefix + ROOM, { serialization: 'raw', reliable: true });
    hostConn = conn;
    conn.on('open', () => { if (conn === hostConn) becomeGuest(); });
    conn.on('data', d => { if (conn === hostConn) onHostData(d); });
    conn.on('close', () => { if (conn === hostConn) hostLost(); });
    conn.on('error', () => { if (conn === hostConn) hostLost(); });
  });
  p.on('error', err => {
    if (p !== peer) return;
    if (hostConn && hostConn.open) return;         // с хостом связь прямая, сервер PeerJS не нужен
    // хост ушёл между «код занят» и подключением — значит, код свободен: пробуем снова
    if (err.type === 'peer-unavailable') { retry(300 + Math.random() * 700); return; }
    netError(err);
  });
  // Проверять соединение, а не роль: после ухода хоста бывший гость — ещё 'client',
  // и зависшее подключение к новому хосту иначе никогда не повторилось бы
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { if (!(hostConn && hostConn.open)) claimHost(); }, NET.joinTimeout * 1000);
}

function netError(err) {
  if (err.type === 'browser-incompatible') { setStatus('This browser has no WebRTC'); return; }
  retry(2500 + Math.random() * 1500, 'Connection problem — retrying…');
}

// Хоста не стало: кто-то из гостей займёт код комнаты первым — разброс по времени,
// чтобы не толкались
function hostLost() {
  if (net.role !== 'client') return;
  hostConn = null;
  retry(200 + Math.random() * 1500, 'Host left — reconnecting…');
}

// ----------------------------------------------------------------------------
// Хост
// ----------------------------------------------------------------------------

function becomeHost() {
  clearTimeout(retryTimer);
  const wasGuest = net.role === 'client';
  net.role = 'host';
  setMyColor(0);
  if (wasGuest) {
    // был гостем — теперь свой мир со своими настройками
    Object.assign(CONFIG, net.localCfg);
    net.localCfg = {};
    proxies.clear(); snaps.length = 0;
    firstRun = true;
    reset();
  } else player.color = 0;
  const p = peer;
  p.on('connection', conn => conn.on('open', () => addGuest(conn)));
  // Отвалился от сервера PeerJS (не от гостей) — перерегистрируемся, чтобы нас находили
  p.on('disconnected', () => setTimeout(() => {
    if (p === peer && !p.destroyed) try { p.reconnect(); } catch (e) {}
  }, 1000));
  setStatus('');
  playersChanged();
  netMenuState();
  requestWake();
}

function send(conn, m) {
  if (conn && conn.open) try { conn.send(JSON.stringify(m)); } catch (e) {}
}

function addGuest(conn) {
  if (net.role !== 'host') { conn.close(); return; }
  if (net.remotes.length >= NET.maxPlayers - 1) {
    send(conn, { t: 'full' });
    setTimeout(() => conn.close(), 500);
    return;
  }
  const used = new Set([net.myColor]);
  for (const r of net.remotes) used.add(r.color);
  let color = 0;
  while (used.has(color)) color++;
  const rp = { conn, color, cell: null, eater: null, lastX: 0, lastY: 0, viewR: 700, taps: 0, tapT: 0, snapT: 0 };
  net.remotes.push(rp);
  rp.cell = spawnPlayerCell(color, rp);
  send(conn, { t: 'hi', color, world: CONFIG.worldRadius });
  conn.on('data', d => onGuestData(rp, d));
  conn.on('close', () => dropGuest(rp));
  conn.on('error', () => dropGuest(rp));
  playersChanged();
}

// Гость ушёл — его клетка исчезает; кого она растворяла — свободны
function dropGuest(rp) {
  const i = net.remotes.indexOf(rp);
  if (i < 0) return;
  net.remotes.splice(i, 1);
  if (rp.cell && !rp.cell.eatenBy) removeCell(rp.cell);
  playersChanged();
}

function onGuestData(rp, d) {
  if (typeof d !== 'string') return;
  let m;
  try { m = JSON.parse(d); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;
  if (m.t === 'tap') {
    const c = rp.cell, x = +m.x, y = +m.y, l = Math.hypot(x, y);
    if (!c || c.eatenBy || !(l > 0.5 && l < 1.5) || c.r < CONFIG.ejectMinRadius) return;
    const now = performance.now() / 1000;
    if (now - rp.tapT > 1) { rp.tapT = now; rp.taps = 0; }
    if (++rp.taps > NET.tapRate) return;
    ejectCell(c, x / l, y / l);
    c.flash = Math.min(1, c.flash + 0.25);
  } else if (m.t === 'respawn') {
    if (rp.cell) return;
    rp.cell = spawnPlayerCell(rp.color, rp);
    rp.eater = null;
    send(rp.conn, { t: 's', k: 'rebirth' });
  } else if (m.t === 'view') {
    const v = +m.r;
    if (Number.isFinite(v)) rp.viewR = clamp(v, 200, 8000);
  } else if (m.t === 'ping') {
    send(rp.conn, { t: 'pong', c: +m.c || 0 });
  }
}

// Звук гостю: его клетка кого-то съела, её съели, её схватили
function netSound(rp, k, f, o) {
  send(rp.conn, { t: 's', k, f, o });
}

// Новый мир у хоста: гости — туда же
function netWorldReset() {
  for (const rp of net.remotes) {
    rp.cell = spawnPlayerCell(rp.color, rp);
    rp.eater = null;
    send(rp.conn, { t: 'cfg', world: CONFIG.worldRadius });
    send(rp.conn, { t: 's', k: 'rebirth' });
  }
}

function playersChanged() {
  playersList = [{ c: net.myColor, h: true }];
  for (const rp of net.remotes) playersList.push({ c: rp.color, h: false });
  for (const rp of net.remotes) send(rp.conn, { t: 'players', list: playersList });
  updateNetUI();
}

function hostTick(dt) {
  for (const rp of net.remotes) {
    if (rp.cell && rp.cell.dead) {        // гостя съели: камера гостя — за съевшим
      rp.eater = rp.cell.eatenBy;
      rp.lastX = rp.cell.x; rp.lastY = rp.cell.y;
      rp.cell = null;
    }
  }
  const ht = performance.now() / 1000;
  for (const rp of net.remotes) {
    rp.snapT -= dt;
    if (rp.snapT > 0) continue;
    const ch = rp.conn.dataChannel;
    // канал забит (слабая сеть) — этот снимок пропускаем, а не копим задержку
    if (!ch || ch.readyState !== 'open' || ch.bufferedAmount > 150000) { rp.snapT = 1 / NET.snapHz; continue; }
    const buf = buildSnapshot(rp, ht);
    try { rp.conn.send(buf); } catch (e) {}
    // крупный снимок — следующий позже, чтобы уложиться в бюджет
    rp.snapT = clamp(buf.byteLength / NET.budget, 1 / NET.snapHz, 1 / NET.minHz);
  }
}

// Снимок: заголовок (тип 1, время хоста, id клетки гостя, id того, за кем камера,
// число клеток, начало отсчёта и шаг q координат) и клетки в радиусе экрана гостя:
// id, x и y от начала отсчёта и r — целыми в шагах q (сотые доли пикселя экрана —
// вдвое компактнее float), vx, vy, флаги (игрок, бактерия, капля), цвет игрока,
// прозрачность, вспышка; у бактерии — её щупальца
function buildSnapshot(rp, ht) {
  const me = rp.cell, eater = !me && rp.eater && !rp.eater.dead ? rp.eater : null;
  const fc = me || eater;
  const fx = fc ? fc.x : rp.lastX, fy = fc ? fc.y : rp.lastY;
  const R = rp.viewR * NET.viewMargin + 150;
  const q = Math.max(0.25, (R + CONFIG.worldRadius * 0.3) / 32000);   // влезет и центр гиганта за краем
  let n = 0, size = HEAD;
  for (const c of cells) {
    const dx = c.x - fx, dy = c.y - fy, rr = R + c.r;
    if (dx * dx + dy * dy > rr * rr) continue;
    n++;
    size += REC + (c.bact ? 1 + c.arms.length * ARM : 0);
  }
  if (snapBuf.byteLength < size) { snapBuf = new ArrayBuffer(size * 2); snapView = new DataView(snapBuf); }
  const v = snapView;
  v.setUint8(0, 1);
  v.setFloat64(1, ht);
  v.setUint32(9, me ? me.id : 0);
  v.setUint32(13, fc ? fc.id : 0);
  v.setUint16(17, n);
  v.setFloat32(19, fx);
  v.setFloat32(23, fy);
  v.setFloat32(27, q);
  let o = HEAD;
  for (const c of cells) {
    const dx = c.x - fx, dy = c.y - fy, rr = R + c.r;
    if (dx * dx + dy * dy > rr * rr) continue;
    v.setUint32(o, c.id);
    v.setInt16(o + 4, clamp(Math.round(dx / q), -32767, 32767));   // гиганта за краем — прижать
    v.setInt16(o + 6, clamp(Math.round(dy / q), -32767, 32767));
    v.setUint16(o + 8, clamp(Math.round(c.r / q), 0, 65535));
    v.setInt16(o + 10, clamp(Math.round(c.vx), -32000, 32000));
    v.setInt16(o + 12, clamp(Math.round(c.vy), -32000, 32000));
    v.setUint8(o + 14, (c.isPlayer ? 1 : 0) | (c.bact ? 2 : 0) | (c.mote ? 4 : 0) | (c.color << 3));
    v.setUint8(o + 15, Math.round(clamp(alphaOf(c), 0, 1) * 255));
    v.setUint8(o + 16, Math.round(clamp(c.flash, 0, 1) * 255));
    v.setUint8(o + 17, 0);                                          // запас
    o += REC;
    if (c.bact) {
      v.setUint8(o++, c.arms.length);
      for (const s of c.arms) {
        v.setUint32(o, s.t ? s.t.id : 0);
        v.setUint8(o + 4, Math.round(clamp(s.ext, 0, 1) * 255));
        o += ARM;
      }
    }
  }
  return snapBuf.slice(0, o);
}

// ----------------------------------------------------------------------------
// Гость
// ----------------------------------------------------------------------------

function becomeGuest() {
  clearTimeout(retryTimer);
  if (net.role !== 'client') net.localCfg = { worldRadius: CONFIG.worldRadius };
  net.role = 'client';
  net.remotes.length = 0;                // бывший хост: его гости уже подключаются не к нему
  // свой мир больше не нужен: клетки придут от хоста
  cells = [];
  proxies.clear(); snaps.length = 0; clockOff = null;
  player = makeCell(0, 0, CONFIG.playerRadius, true);
  player.dead = true;
  hadCell = false; camSnap = true; respawnAsked = false;
  dead = false; deadT = 0;
  overEl.classList.remove('show');
  resetParticles();
  net.focus = null;
  lastSnapAt = performance.now() / 1000;
  setStatus('Joining…');
  sendView(true);
  netMenuState();
  requestWake();
}

function onHostData(d) {
  if (d instanceof ArrayBuffer) { readSnapshot(d); return; }
  if (typeof d !== 'string') return;
  let m;
  try { m = JSON.parse(d); } catch (e) { return; }
  if (!m || typeof m !== 'object') return;
  if (m.t === 'hi') { setMyColor(m.color | 0); setWorld(m.world); setStatus(''); }
  else if (m.t === 'cfg') setWorld(m.world);
  else if (m.t === 'players' && Array.isArray(m.list)) { playersList = m.list; updateNetUI(); }
  else if (m.t === 's') {
    if (m.k === 'eat') Sound.eat(clamp(+m.f || 0, 0, 1), !!m.o);
    else if (m.k === 'death') Sound.death();
    else if (m.k === 'grab') Sound.grab();
    else if (m.k === 'rebirth') Sound.rebirth();
  } else if (m.t === 'pong') rtt = performance.now() - m.c;
  else if (m.t === 'full') {
    clearTimeout(retryTimer);
    dropPeer();
    setStatus('Room is full — 6 players max');
  }
}

function setWorld(r) {
  r = +r;
  if (Number.isFinite(r)) CONFIG.worldRadius = hostR = clamp(r, 300, 20000);
}

// «Defaults» у гостя: свои умолчания — на потом, для одиночной; карта остаётся хостовой
function netAfterDefaults() {
  net.localCfg.worldRadius = DEFAULTS.worldRadius;
  CONFIG.worldRadius = hostR;
}

function readSnapshot(buf) {
  if (buf.byteLength < HEAD) return;
  const v = new DataView(buf);
  if (v.getUint8(0) !== 1) return;
  const ht = v.getFloat64(1), n = v.getUint16(17);
  const ox = v.getFloat32(19), oy = v.getFloat32(23), q = v.getFloat32(27);
  const s = {
    ht, myId: v.getUint32(9), focusId: v.getUint32(13), n,
    id: new Uint32Array(n), f: new Float32Array(n * 7), flags: new Uint8Array(n), color: new Uint8Array(n),
    armAt: new Int32Array(n).fill(-1), armT: [], armE: [], index: new Map(),
  };
  let o = HEAD;
  for (let i = 0; i < n; i++) {
    if (o + REC > buf.byteLength) return;
    const k = i * 7, fl = v.getUint8(o + 14);
    s.id[i] = v.getUint32(o);
    s.f[k] = ox + v.getInt16(o + 4) * q;
    s.f[k + 1] = oy + v.getInt16(o + 6) * q;
    s.f[k + 2] = v.getUint16(o + 8) * q;
    s.f[k + 3] = v.getInt16(o + 10);
    s.f[k + 4] = v.getInt16(o + 12);
    s.flags[i] = fl & 7;
    s.color[i] = fl >> 3;
    s.f[k + 5] = v.getUint8(o + 15) / 255;
    s.f[k + 6] = v.getUint8(o + 16) / 255;
    o += REC;
    if (s.flags[i] & 2) {
      if (o + 1 > buf.byteLength) return;
      const na = v.getUint8(o++);
      if (o + na * ARM > buf.byteLength) return;
      s.armAt[i] = s.armT.length;
      s.armT.push(na); s.armE.push(0);
      for (let a = 0; a < na; a++) {
        s.armT.push(v.getUint32(o));
        s.armE.push(v.getUint8(o + 4) / 255);
        o += ARM;
      }
    }
    s.index.set(s.id[i], i);
  }
  // Часы хоста: самый быстрый снимок даёт наибольшее (ht − now) — к нему сразу,
  // к медленным — едва-едва (дрейф часов)
  const now = performance.now() / 1000, sample = ht - now;
  if (clockOff === null || sample > clockOff) clockOff = sample;
  else clockOff += (sample - clockOff) * 0.02;
  lastSnapAt = now;
  if (snaps.length && ht <= snaps[snaps.length - 1].ht) return;   // опоздавший — мимо
  // интервал между снимками (для задержки); пауза хоста — не повод рисовать с отставанием
  if (snaps.length) snapIvl += (clamp(ht - snaps[snaps.length - 1].ht, 0.02, 1 / NET.minHz) - snapIvl) * 0.1;
  snaps.push(s);
  if (snaps.length > 6) snaps.shift();
}

// Раз в кадр: клетки — между двумя снимками вокруг момента «сейчас − delay»
function netApply(dt) {
  if (snaps.length && clockOff !== null) applySnapshots();
  const n = Math.max(1, Math.ceil(dt / CONFIG.maxStep)), h = dt / n;
  if (dt > 0) for (let i = 0; i < n; i++) stepCamera(h);
}

function applySnapshots() {
  const rt = performance.now() / 1000 + clockOff - Math.max(NET.delay, snapIvl * 1.6);
  let ai = -1;
  for (let i = 0; i < snaps.length; i++) if (snaps[i].ht <= rt) ai = i;
  if (ai > 0) { snaps.splice(0, ai); ai = 0; }          // что старше нужного — больше не понадобится
  let A = ai >= 0 ? snaps[ai] : null, B = snaps[ai + 1] || null, u = 0, ext = 0;
  if (A && B) u = (rt - A.ht) / (B.ht - A.ht);
  else if (A) { B = A; A = null; ext = Math.min(rt - B.ht, NET.extrapolate); }   // снимки кончились
  else B = snaps[0];                                                         // все ещё впереди
  tick++;
  for (let i = 0; i < B.n; i++) {
    const id = B.id[i], k = i * 7, fl = B.flags[i];
    let x = B.f[k], y = B.f[k + 1], r = B.f[k + 2], vx = B.f[k + 3], vy = B.f[k + 4], al = B.f[k + 5];
    const j = A ? A.index.get(id) : undefined;
    if (j !== undefined) {
      const q = j * 7;
      x = lerp(A.f[q], x, u); y = lerp(A.f[q + 1], y, u); r = lerp(A.f[q + 2], r, u);
      vx = lerp(A.f[q + 3], vx, u); vy = lerp(A.f[q + 4], vy, u); al = lerp(A.f[q + 5], al, u);
    } else if (ext > 0) { x += vx * ext; y += vy * ext; }
    let p = proxies.get(id);
    if (!p) {
      p = makeCell(x, y, r, !!(fl & 1));
      p.id = id;
      p.ph = (id * 0.6180339887) % 1 * 100;
      p.pvx = p.svx = vx; p.pvy = p.svy = vy;
      if (fl & 2) { p.bact = true; p.arms = []; }
      proxies.set(id, p);
    }
    p.x = x; p.y = y; p.r = r; p.m = massOf(r);
    p.vx = vx; p.vy = vy;
    p.born = al; p.flash = B.f[k + 6];
    p.isPlayer = !!(fl & 1); p.mote = !!(fl & 4); p.color = B.color[i];
    p.seen = tick;
  }
  // щупальца — когда все клетки на месте: хватают они тоже клетки снимка
  for (let i = 0; i < B.n; i++) {
    const at = B.armAt[i];
    if (at < 0) continue;
    const p = proxies.get(B.id[i]), na = B.armT[at];
    while (p.arms.length < na) p.arms.push({ t: null, ext: 0, ang: 0, len: 0 });
    for (let a = 0; a < na; a++) {
      const tid = B.armT[at + 1 + a];
      p.arms[a].t = tid ? proxies.get(tid) || null : null;
      p.arms[a].ext = B.armE[at + 1 + a];
    }
  }
  cells.length = 0;
  for (const p of proxies.values()) {
    if (p.seen === tick) cells.push(p);
    else proxies.delete(p.id);
  }

  const me = B.myId ? proxies.get(B.myId) : null;
  if (me) {
    player = me;
    if (camSnap) {
      camSnap = false;
      cam.x = cam.fx = me.x; cam.y = cam.fy = me.y; cam.vx = cam.vy = 0;
      cam.fr = me.r; cam.zoom = targetZoom();
    }
    if (dead) { dead = false; deadT = 0; overEl.classList.remove('show'); }
    hadCell = true; respawnAsked = false;
  } else if (hadCell && !dead) {
    dead = true; deadT = 0;
    player.dead = true;
    input.down = false;
  }
  net.focus = B.focusId ? proxies.get(B.focusId) || null : null;
}

function netTap(nx, ny) {
  send(hostConn, { t: 'tap', x: +nx.toFixed(4), y: +ny.toFixed(4) });
}

function netRespawn() {
  if (respawnAsked) return;
  respawnAsked = true;
  send(hostConn, { t: 'respawn' });
  setTimeout(() => { respawnAsked = false; }, 1500);   // потерялось — можно ещё раз
}

function sendView(force) {
  const r = Math.hypot(W, H) / 2 / cam.zoom;
  if (!force && Math.abs(r - lastView) < lastView * 0.08) return;
  lastView = r;
  send(hostConn, { t: 'view', r: Math.round(r) });
}

function guestTick(dt) {
  viewT -= dt;
  if (viewT <= 0) { viewT = 0.5; sendView(false); }
  pingT -= dt;
  if (pingT <= 0) { pingT = 2; send(hostConn, { t: 'ping', c: performance.now() }); }
  const stalled = hostConn && performance.now() / 1000 - lastSnapAt > NET.stall;
  if (stalled && !netStatus) setStatus('Waiting for the host…');
  else if (!stalled && netStatus === 'Waiting for the host…') setStatus('');
}

// Из главного цикла, раз в кадр
function netTick(dt) {
  if (net.role === 'host') hostTick(dt);
  else if (net.role === 'client') guestTick(dt);
}

function netDebug() {
  return net.role === 'host' ? `host · ${net.remotes.length} guests`
    : `guest · rtt ${rtt.toFixed(0)} ms · ${Math.round(1 / snapIvl)} snaps/s`;
}

// ----------------------------------------------------------------------------
// Интерфейс: полоска сверху, раздел меню
// ----------------------------------------------------------------------------

const cssColor = c => { const q = PLAYER_RGB[c] || RGB_PLAYER; return `rgb(${q[0]},${q[1]},${q[2]})`; };

function setMyColor(c) {
  net.myColor = c;
  PART_COLOR = rgba(PLAYER_RGB[c] || RGB_PLAYER, 0.45);
  RIPPLE_COLOR = rgba(PLAYER_RGB[c] || RGB_PLAYER, 0.4);
  if (player && net.role !== 'client') player.color = c;
  updateNetUI();
}

function setStatus(text) {
  netStatus = text;
  updateNetUI();
}

function updateNetUI() {
  if (!ROOM) return;
  const bar = $('netbar'), list = $('mp-players');
  bar.hidden = false;
  bar.textContent = '';
  list.textContent = '';
  for (const p of playersList) {
    const c = p.c | 0, me = c === net.myColor && net.role;
    const dot = document.createElement('i');
    dot.style.background = cssColor(c);
    if (me) dot.className = 'me';
    bar.appendChild(dot);
    const item = document.createElement('span'), d2 = dot.cloneNode();
    item.appendChild(d2);
    item.appendChild(document.createTextNode(me ? (p.h ? 'You · host' : 'You') : (p.h ? 'Host' : 'Friend')));
    list.appendChild(item);
  }
  if (netStatus) {
    const t = document.createElement('span');
    t.textContent = netStatus;
    bar.appendChild(t);
  }
  $('mp-role').textContent = net.role === 'host' ? 'Hosting' : net.role === 'client' ? 'Joined' : '…';
}

// Гость не трогает настройки мира: их задаёт хост
function netMenuState() {
  const guest = net.role === 'client';
  for (const id of ['s-eject', 's-enemies', 's-diff', 's-map', 's-maxe', 's-bact', 's-bamt', 'b-new']) $(id).disabled = guest;
  for (const el of aiInputs) el.disabled = guest;
  $('mp-note').textContent = guest
    ? 'The host sets up the world. If the host leaves, one of you takes over and a new world starts'
    : 'You host: your phone runs the world for everyone — keep this screen open';
  updateNetUI();
}

async function requestWake() {
  if (wakeLock || wakePending || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  wakePending = true;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch (e) {}
  wakePending = false;
}
document.addEventListener('visibilitychange', () => { if (net.role && !document.hidden) requestWake(); });
window.addEventListener('pointerdown', () => { if (net.role) requestWake(); });

function newRoomCode() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint8Array(6));
  let s = '';
  for (const b of r) s += abc[b % abc.length];
  return s;
}

$('b-mp').addEventListener('click', () => {
  location.href = location.pathname + '?room=' + newRoomCode();
});
$('b-leave').addEventListener('click', () => {
  location.href = location.pathname;
});
$('b-invite').addEventListener('click', async () => {
  const url = location.origin + location.pathname + '?room=' + ROOM, btn = $('b-invite');
  if (navigator.share) {
    try { await navigator.share({ title: 'Abstract Cell', text: 'Join my world', url }); return; } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  try { await navigator.clipboard.writeText(url); btn.textContent = 'Link copied'; } catch (e) { btn.textContent = url; }
  setTimeout(() => { btn.textContent = 'Invite'; }, 2000);
});

if (ROOM) netStart();
