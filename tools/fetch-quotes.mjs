// Разовая загрузка исторических котировок: node tools/fetch-quotes.mjs
// Пишет data/quotes.js — часовые закрытия по каждой бумаге (последние BARS штук).
import { writeFileSync, mkdirSync } from 'node:fs';

const BARS = 1500;
const UA = { 'User-Agent': 'Mozilla/5.0' };

// Yahoo Finance: часовые бары за год
const YAHOO = [
  ['AAPL', 'Apple', 'AAPL'],
  ['TSLA', 'Tesla', 'TSLA'],
  ['NVDA', 'Nvidia', 'NVDA'],
  ['GME', 'GameStop', 'GME'],
  ['KO', 'Coca-Cola', 'KO'],
  ['BTC', 'Bitcoin', 'BTC-USD'],
];

// MOEX ISS: часовые свечи, открытый API без ключа
const MOEX = [
  ['SBER', 'Сбербанк'],
  ['GAZP', 'Газпром'],
];

async function json(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

async function yahoo(symbol) {
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1h`;
  const q = (await json(u, UA)).chart.result[0].indicators.quote[0].close;
  return q.filter(v => v != null);
}

async function moex(sec) {
  const out = [];
  for (let start = 0; ; start += 500) {
    const u = `https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/${sec}`
            + `/candles.json?interval=60&from=2024-06-01&start=${start}`;
    const { candles } = await json(u);
    const close = candles.columns.indexOf('close');
    for (const row of candles.data) if (row[close] > 0) out.push(row[close]);
    if (candles.data.length < 500) return out;
  }
}

const quotes = {};
for (const [key, name, symbol] of YAHOO) {
  const c = await yahoo(symbol);
  quotes[key] = { name, c: c.slice(-BARS).map(v => +v.toPrecision(6)) };
  console.log(key, c.length, '->', quotes[key].c.length);
}
for (const [key, name] of MOEX) {
  const c = await moex(key);
  quotes[key] = { name, c: c.slice(-BARS).map(v => +v.toPrecision(6)) };
  console.log(key, c.length, '->', quotes[key].c.length);
}

mkdirSync('data', { recursive: true });
writeFileSync('data/quotes.js', 'window.QUOTES = ' + JSON.stringify(quotes) + ';\n');
console.log('data/quotes.js written');
