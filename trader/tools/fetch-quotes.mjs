// Разовая загрузка исторических котировок: node trader/tools/fetch-quotes.mjs
//
// Пишет data/index.js со списком бумаг и по файлу data/<КОД>.js на каждую бумагу:
//   window.QUOTES.<КОД> = { cur: значок валюты,
//                           t0:  время первого бара (unix, сек),
//                           c:   [закрытия],
//                           dh:  [часов до следующего бара] }
// Файлы грузятся по требованию, поэтому глубокая история не утяжеляет старт игры.
// Время сдвинуто к часовому поясу биржи, чтобы в игре его можно было печатать как есть.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../data/', import.meta.url));   // рядом с игрой, а не с cwd

const FROM = '1990-01-01';
const UA = { 'User-Agent': 'Mozilla/5.0' };
const SIGN = { USD: '$', RUB: '₽', EUR: '€' };

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
  // «американские горки»: взлетели, обвалились, годами стояли в боковике, снова взлетели
  ['CSCO', 'Cisco', 'CSCO'],
  ['AMD', 'AMD', 'AMD'],
  ['MU', 'Micron', 'MU'],
  ['GE', 'General Electric', 'GE'],
  ['F', 'Ford', 'F'],
  // товары: ключ читаемый, символ — непрерывный фьючерс Yahoo
  ['GOLD', 'Gold', 'GC=F'],
  ['SILVER', 'Silver', 'SI=F'],
  ['BRENT', 'Oil', 'BZ=F'],
  ['COPPER', 'Copper', 'HG=F'],
];

// Отбраковано намеренно:
//   CL=F (WTI) — 20 апреля 2020 расчётная цена ушла в минус, лог-доходность не считается;
//   PL=F, NG=F — в непрерывном ряду видны склейки контрактов: скачок на треть и назад за день.

// MOEX ISS: дневные свечи, открытый API без ключа
const MOEX = [
  ['SBER', 'Sberbank'],
  ['GAZP', 'Gazprom'],
];

async function json(url, headers) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
}

// обе функции возвращают { cur, rows: [[время, закрытие], ...] }
async function yahoo(symbol) {
  // именно period1/period2: с range=max Yahoo молча отдаёт месячные бары вместо дневных
  const u = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`
          + `?period1=${Date.parse(FROM) / 1000}&period2=${Math.floor(Date.now() / 1000)}&interval=1d`;
  const r = (await json(u, UA)).chart.result[0];
  const close = r.indicators.quote[0].close, off = r.meta.gmtoffset || 0;
  const rows = [];
  for (let i = 0; i < close.length; i++) if (close[i] > 0) rows.push([r.timestamp[i] + off, close[i]]);
  return { cur: SIGN[r.meta.currency] || r.meta.currency, rows };
}

async function moex(sec) {          // акции на Мосбирже торгуются в рублях
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
    if (candles.data.length < 500) return { cur: SIGN.RUB, rows: out };
  }
}

function pack({ cur, rows }) {
  const dh = [];
  for (let i = 1; i < rows.length; i++) dh.push(Math.round((rows[i][0] - rows[i - 1][0]) / 3600));
  return { cur, t0: rows[0][0], c: rows.map(r => +r[1].toPrecision(5)), dh };
}

const names = {};
mkdirSync(DIR, { recursive: true });

for (const [key, name, symbol] of [...YAHOO, ...MOEX]) {
  const q = pack(symbol ? await yahoo(symbol) : await moex(key));
  names[key] = name;
  writeFileSync(`${DIR}${key}.js`, `window.QUOTES.${key} = ${JSON.stringify(q)};\n`);

  // на глаза: глубина истории и самый резкий день — так видно склейки и битые бары
  let jump = 0;
  for (let i = 1; i < q.c.length; i++) jump = Math.max(jump, Math.abs(Math.log(q.c[i] / q.c[i - 1])));
  console.log(key.padEnd(6), q.cur, String(q.c.length).padStart(5), 'баров с',
              new Date(q.t0 * 1000).toISOString().slice(0, 10),
              '· самый резкий день', (Math.expm1(jump) * 100).toFixed(0) + '%');
}

writeFileSync(DIR + 'index.js', 'window.QUOTES = {};\nwindow.TICKERS = ' + JSON.stringify(names) + ';\n');
console.log(DIR + ': индекс + ' + Object.keys(names).length + ' файлов записано');
