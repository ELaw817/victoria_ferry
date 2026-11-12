// ===== 規則、票價、客人 =====
// 呢個檔唔應該識「畫面」。全部係純資料同純計算，方便日後寫測試同調數值。

const CFG = {
  shiftSec: 180,       // 一更幾多真實秒
  boatSec: 45,         // 一班船隔幾耐
  cutoffBefore: 10,    // 開船前幾多秒截龍

  queueMoodHit: 30,    // 貨票／找錯錢：後面每個客心情 −30
  fakeChildChance: 0.22, // 有細路嘅客，幾大機會有人扮小童
  ageMoodHit: 20,      // 你查核客人年齡，佢心情 −20
};

// ===== 貨票（1990 年代）=====
// 客人唔會講自己有貨，行到窗口才見到。貨票只收現金。
const CARGO = {
  tv:     { label: '電視',   cent: 1200 },
  fridge: { label: '雪櫃',   cent: 1500 },
  bike:   { label: '單車',   cent: 800 },
  fan:    { label: '風扇',   cent: 600 },
  cooker: { label: '電飯煲', cent: 500 },
  ladder: { label: '木梯',   cent: 400 },
};

const CARGO_KEYS = Object.keys(CARGO);

const emptyCargo = () => CARGO_KEYS.reduce((o, k) => { o[k] = 0; return o; }, {});

const cargoTotal = c => CARGO_KEYS.reduce((sum, k) => sum + (c[k] || 0) * CARGO[k].cent, 0);

const cargoCount = c => CARGO_KEYS.reduce((sum, k) => sum + (c[k] || 0), 0);

// 「電視×1、木梯×2」
const cargoLabel = c => CARGO_KEYS.filter(k => c[k] > 0)
  .map(k => CARGO[k].label + (c[k] > 1 ? '×' + c[k] : ''))
  .join('、');

const sameCargo = (a, b) => CARGO_KEYS.every(k => (a[k] || 0) === (b[k] || 0));

// ===== 年代 =====
// 每個年代改「工具同動詞」。數值分開擺，方便調平衡。
// octopus: 有幾多成客用八達通（0 = 全現金）
const ERAS = {
  '1980': {
    key: '1980',
    name: '一九八〇',
    sign: '維 多 利 亞 小 輪 · 一 九 八 〇',
    counter: '售票處',
    minCust: 8,
    maxCust: 11,
    queueMax: 8,
    arriveFrom: 1,       // 客喺第幾秒開始嚟
    arriveTo: 30,        // 客最遲第幾秒到齊（早過截龍）
    octopus: 0,
    cargoChance: 0,      // 未有人托貨上船
    tapFail: 0.05,
    tapLock: 0.8,
    moodHit: 30,
  },
  '1990': {
    key: '1990',
    name: '一九九〇',
    sign: '維 多 利 亞 小 輪 · 一 九 九 〇',
    counter: '電腦售票',
    minCust: 13,
    maxCust: 18,
    queueMax: 10,
    arriveFrom: 1,
    arriveTo: 26,        // 1990 客多又密，龍會積
    octopus: 0.65,
    cargoChance: 0.32,   // 幾多成客帶貨
    tapFail: 0.05,
    tapLock: 0.8,
    moodHit: 30,
  },
};

const ERA_KEYS = ['1980', '1990'];
const eraOf = key => ERAS[key] || ERAS['1980'];

const MOOD_MAX = 100;

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

// 客人用咩付款：八達通機會（0–1）
function makePay(octopusChance) {
  return Math.random() < octopusChance ? 'octopus' : 'cash';
}

// 客人有咩貨：大部分空手，有時一件，平嘢間中兩件
function makeCargo(chance) {
  const cargo = emptyCargo();
  if (Math.random() >= chance) return cargo;

  const kind = CARGO_KEYS[randInt(0, CARGO_KEYS.length - 1)];
  cargo[kind] = Math.random() < 0.12 && CARGO[kind].cent <= 600 ? 2 : 1;
  return cargo;
}

// 客人講嘅嘢：講完要買咩，再補一句付款方式（唔會提貨）
function speechFor(cust) {
  return greet() + describeOrder(cust.want) + (cust.pay === 'octopus' ? '，八達通' : '');
}

// 查核年齡嗰陣，客人嘅反應
const AGE_CAUGHT = '……好啦，我認，我十六歲。';
const AGE_CHILD = '我個仔真係得八歲咋喎…';

// 客人開場白（純裝飾）
const GREET = ['唔該，', '喂，', '', '', '阿姐，', '唔該快啲，'];
const greet = () => GREET[randInt(0, GREET.length - 1)];

// 拍唔中嗰下，客人會咁講（純裝飾）
const TAP_FAIL = ['嘟—— 唔得喎，再拍過', '嘟—— 冇反應，再嚟', '嘟—— 拍多次啦'];
const tapFailLine = () => TAP_FAIL[randInt(0, TAP_FAIL.length - 1)];
