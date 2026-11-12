// ===== 規則、票價、客人 =====
// 呢個檔唔應該識「畫面」。全部係純資料同純計算，方便日後寫測試同調數值。

const CFG = {
  shiftSec: 180,       // 一更幾多真實秒
  boatSec: 45,         // 一班船隔幾耐
  cutoffBefore: 10,    // 開船前幾多秒截龍
  minCust: 8,          // 每班船最少幾多客
  maxCust: 11,         // 每班船最多幾多客
  arriveFrom: 1,       // 客喺第幾秒開始嚟
  arriveTo: 30,        // 客最遲第幾秒到齊
  queueMax: 8,         // 龍最多排幾多人，多咗嘅唔排
};

// 價錢用「仙」做單位，避免浮點數誤差：$1.5 = 150
const FARES = { adult: 150, child: 80, senior: 50 };
const LABEL = { adult: '成人', child: '小童', senior: '長者' };
const TYPES = ['adult', 'child', 'senior'];
const CN = ['零', '一', '兩', '三', '四', '五', '六', '七', '八', '九', '十'];

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// 150 → "$1.5"，500 → "$5"
function fmt(cent) {
  const d = Math.floor(cent / 100);
  const c = cent % 100;
  if (c === 0) return `$${d}`;
  if (c % 10 === 0) return `$${d}.${c / 10}`;
  return `$${d}.${String(c).padStart(2, '0')}`;
}

function orderTotal(o) {
  return TYPES.reduce((sum, k) => sum + o[k] * FARES[k], 0);
}

function sameOrder(a, b) {
  return TYPES.every(k => a[k] === b[k]);
}

// 種類一樣、只係數量唔同
function sameTypes(a, b) {
  return TYPES.every(k => (a[k] > 0) === (b[k] > 0));
}

// 「兩張成人，一張小童」
function describeOrder(o) {
  const parts = TYPES.filter(k => o[k] > 0).map(k => CN[o[k]] + '張' + LABEL[k]);
  return parts.length ? parts.join('，') : '（冇）';
}

// 客人想買咩（成人為主，間中帶細路同長者）
function makeWant() {
  const want = { adult: randInt(1, 3), child: 0, senior: 0 };
  if (Math.random() < 0.45) want.child = randInt(1, 2);
  if (Math.random() < 0.18) want.senior = randInt(1, 2);
  return want;
}

// 客人會俾幾多錢：整元、一定夠、偏向細面額
function pickTender(total) {
  if (total % 100 === 0 && Math.random() < 0.15) return total;

  const opts = [];
  for (const step of [100, 200, 500, 1000]) {
    const v = Math.ceil(total / step) * step;
    if (v > total && !opts.includes(v)) opts.push(v);
  }
  if (!opts.length) return Math.ceil(total / 100) * 100;

  // 偏向最細嗰兩個選擇，唔好成日彈 $10 出嚟
  return opts[randInt(0, Math.min(1, opts.length - 1))];
}

// 客人開場白（純裝飾）
const GREET = ['唔該，', '喂，', '', '', '阿姐，', '唔該快啲，'];
const greet = () => GREET[randInt(0, GREET.length - 1)];
