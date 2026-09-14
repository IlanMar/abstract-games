// Разовая загрузка исторических котировок: node tools/fetch-quotes.mjs
// Пишет data/quotes.js — по каждой бумаге последние BARS дневных баров:
//   { name, t0: время первого бара (unix, сек), c: [закрытия], dh: [часов до следующего бара] }
// Время сдвинуто к часовому поясу биржи, чтобы в игре его можно было печатать как есть.
import { writeFileSync, mkdirSync } from 'node:fs';

const BARS = 2600;   // ~10 лет дневных баров
const UA = { 'User-Agent': 'Mozilla/5.0' };

// Yahoo Finance: дневные бары за 10 лет
const YAHOO = [
  ['GOOGL', 'Google', 'GOOGL'],
  ['AAPL', 'Apple', 'AAPL'],
  ['TSLA', 'Tesla', 'TSLA'],
  ['NVDA', 'Nvidia', 'NVDA'],
  ['GME', 'GameStop', 'GME'],
  ['KO', 'Coca-Cola', 'KO'],
  ['INTC', 'Intel', 'INTC'],
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
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=10y&interval=1d`;
  const r = (await json(u, UA)).chart.result[0];
  const close = r.indicators.quote[0].close, off = r.meta.gmtoffset || 0;
  const out = [];
  for (let i = 0; i < close.length; i++) if (close[i] != null) out.push([r.timestamp[i] + off, close[i]]);
  return out;
}

async function moex(sec) {
  const out = [];
  for (let start = 0; ; start += 500) {
    const u = `https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/${sec}`
            + `/candles.json?interval=24&from=2016-01-01&start=${start}`;
    const { candles } = await json(u);
    const ic = candles.columns.indexOf('close'), it = candles.columns.indexOf('begin');
    for (const row of candles.data) {
      // "2024-06-03 00:00:00" — московское время; читаем как UTC, чтобы печаталось как есть
      if (row[ic] > 0) out.push([Date.parse(row[it].replace(' ', 'T') + 'Z') / 1000, row[ic]]);
    }
    if (candles.data.length < 500) return out;
  }
}

function pack(name, rows) {
  rows = rows.slice(-BARS);
  const dh = [];
  for (let i = 1; i < rows.length; i++) dh.push(Math.round((rows[i][0] - rows[i - 1][0]) / 3600));
  return { name, t0: rows[0][0], c: rows.map(r => +r[1].toPrecision(5)), dh };
}

const quotes = {};
for (const [key, name, symbol] of YAHOO) quotes[key] = pack(name, await yahoo(symbol));
for (const [key, name] of MOEX) quotes[key] = pack(name, await moex(key));

for (const [key, q] of Object.entries(quotes)) {
  const last = new Date((q.t0 + q.dh.reduce((s, h) => s + h, 0) * 3600) * 1000);
  console.log(key.padEnd(5), q.c.length, 'баров,', new Date(q.t0 * 1000).toISOString().slice(0, 10),
              '->', last.toISOString().slice(0, 10));
}

mkdirSync('data', { recursive: true });
writeFileSync('data/quotes.js', 'window.QUOTES = ' + JSON.stringify(quotes) + ';\n');
console.log('data/quotes.js written');
