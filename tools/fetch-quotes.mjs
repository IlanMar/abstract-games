// Разовая загрузка исторических котировок: node tools/fetch-quotes.mjs
//
// Пишет data/index.js со списком бумаг и по файлу data/<КОД>.js на каждую бумагу:
//   window.QUOTES.<КОД> = { t0: время первого бара (unix, сек),
//                           c:  [закрытия],
//                           dh: [часов до следующего бара] }
// Файлы грузятся по требованию, поэтому глубокая история не утяжеляет старт игры.
// Время сдвинуто к часовому поясу биржи, чтобы в игре его можно было печатать как есть.
import { writeFileSync, mkdirSync } from 'node:fs';

const FROM = '1990-01-01';
const UA = { 'User-Agent': 'Mozilla/5.0' };

// Yahoo Finance: дневные бары за всю доступную историю
const YAHOO = [
  ['GOOGL', 'Google', 'GOOGL'],
  ['AAPL', 'Apple', 'AAPL'],
  ['TSLA', 'Tesla', 'TSLA'],
  ['NVDA', 'Nvidia', 'NVDA'],
  ['INTC', 'Intel', 'INTC'],
  ['GME', 'GameStop', 'GME'],
  ['KO', 'Coca-Cola', 'KO'],
  ['BTC', 'Bitcoin', 'BTC-USD'],
];

// MOEX ISS: дневные свечи, открытый API без ключа
const MOEX = [
  ['SBER', 'Сбербанк'],
  ['GAZP', 'Газпром'],
];

async function json(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

// обе функции возвращают массив пар [время, закрытие]
async function yahoo(symbol) {
  // именно period1/period2: с range=max Yahoo молча отдаёт месячные бары вместо дневных
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
          + `?period1=${Date.parse(FROM) / 1000}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
  const r = (await json(u, UA)).chart.result[0];
  const close = r.indicators.quote[0].close, off = r.meta.gmtoffset || 0;
  const out = [];
  for (let i = 0; i < close.length; i++) if (close[i] != null) out.push([r.timestamp[i] + off, close[i]]);
  return out;
}

async function moex(sec) {
  const out = [];
  for (let start = 0; ; start += 500) {
    const u = `https://iss.moex.com/iss/engines/stock/markets/shares/securities/${sec}`
            + `/candles.json?interval=24&from=${FROM}&start=${start}`;
    const { candles } = await json(u);
    const ic = candles.columns.indexOf('close'), it = candles.columns.indexOf('begin');
    for (const row of candles.data) {
      // "2024-06-03 00:00:00" — московское время; читаем как UTC, чтобы печаталось как есть
      if (row[ic] > 0) out.push([Date.parse(row[it].replace(' ', 'T') + 'Z') / 1000, row[ic]]);
    }
    if (candles.data.length < 500) return out;
  }
}

function pack(rows) {
  const dh = [];
  for (let i = 1; i < rows.length; i++) dh.push(Math.round((rows[i][0] - rows[i - 1][0]) / 3600));
  return { t0: rows[0][0], c: rows.map(r => +r[1].toPrecision(5)), dh };
}

const names = {};
mkdirSync('data', { recursive: true });

for (const [key, name, symbol] of [...YAHOO, ...MOEX]) {
  const q = pack(symbol ? await yahoo(symbol) : await moex(key));
  names[key] = name;
  writeFileSync(`data/${key}.js`, `window.QUOTES.${key} = ${JSON.stringify(q)};\n`);

  // на глаза: глубина истории и самый резкий день — так видно склейки и битые бары
  let jump = 0;
  for (let i = 1; i < q.c.length; i++) jump = Math.max(jump, Math.abs(Math.log(q.c[i] / q.c[i - 1])));
  console.log(key.padEnd(6), String(q.c.length).padStart(5), 'баров с',
              new Date(q.t0 * 1000).toISOString().slice(0, 10),
              '· самый резкий день', (Math.expm1(jump) * 100).toFixed(0) + '%');
}

writeFileSync('data/index.js', 'window.QUOTES = {};\nwindow.TICKERS = ' + JSON.stringify(names) + ';\n');
console.log('data/index.js + ' + Object.keys(names).length + ' файлов записано');
