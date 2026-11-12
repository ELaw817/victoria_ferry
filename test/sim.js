// ===== test/sim.js =====
// 唔開瀏覽器，直接用 node 模擬一更，睇規則行唔行得通。
// 用法：node test/sim.js
//
// 呢個檔係「自動玩家」。日後改數值，跑一次就知有冇爆。

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

// 遊戲用嘅瀏覽器嘢，喺 node 入面全部做假
const stub = `
  var toast = () => {};
  var showEnd = () => {};
  var document = { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} };
  var window = { addEventListener: () => {} };
  var requestAnimationFrame = () => {};
`;

const code = ['js/rules.js', 'js/game.js']
  .map(f => fs.readFileSync(path.join(root, f), 'utf8'))
  .join('\n');

const runner = `
${stub}
${code}

const COINS = [1000, 500, 200, 100, 50, 20, 10];

// ---- 自動玩家：完美 ----
function perfectBot() {
  if (!G.current) return;
  if (G.stage === 'order') {
    if (G.current.fakeChild) checkAge();      // 睇到鬍鬚就查
    for (const k of TYPES) while (G.order[k] < G.current.want[k]) addItem(k);
    for (const k of CARGO_KEYS) while (G.cargo[k] < G.current.cargo[k]) addCargo(k);
    collect();
  } else if (G.stage === 'pay') {
    let remain = G.due;
    for (const c of COINS) while (remain >= c) { addCoin(c); remain -= c; }
    confirmChange();
  } else if (G.stage === 'tap') {
    tapCard();            // 拍唔中就下一 frame 再拍
  }
}

// ---- 自動玩家：求其（會出錯）----
function sloppyBot() {
  if (!G.current) return;
  if (G.stage === 'order') {
    G.order = { ...G.current.want };
    if (Math.random() < 0.3) G.order.adult++;               // 數量錯
    if (Math.random() < 0.5) G.cargo = { ...G.current.cargo }; // 一半機會漏貨票
    collect();
  } else if (G.stage === 'pay') {
    let remain = G.due + (Math.random() < 0.4 ? 10 : 0);    // 找錯錢
    for (const c of COINS) while (remain >= c) { addCoin(c); remain -= c; }
    confirmChange();
  } else if (G.stage === 'tap') {
    if (Math.random() < 0.3) G.order.adult++;               // 數量錯
    tapCard();
  }
}

function run(label, bot, eraKey) {
  newGame(eraKey);
  let guard = 0;
  while (!G.over && guard++ < 20000) {
    bot();
    tick(0.05);
  }
  const errs = G.errors;
  return {
    label,
    era: G.era,
    money: fmt(G.money),
    errors: errs.wrongType + errs.wrongQty + errs.wrongChange + errs.wrongCargo + errs.wrongAge,
    detail: errs,
    taps: G.taps.ok + '/' + G.taps.fail,
    leftBehind: G.leftBehind,
    over: G.over,
  };
}

const results = [];
for (const era of ERA_KEYS) {
  for (let i = 0; i < 3; i++) results.push(run('完美 ' + era + ' #' + (i + 1), perfectBot, era));
  for (let i = 0; i < 3; i++) results.push(run('求其 ' + era + ' #' + (i + 1), sloppyBot, era));
}

console.table(results);

// ---- 基本檢查 ----
const perfect = results.filter(r => r.label.startsWith('完美'));
const sloppy = results.filter(r => r.label.startsWith('求其'));
const p1980 = perfect.filter(r => r.era === '1980');
const p1990 = perfect.filter(r => r.era === '1990');

let fail = 0;
const check = (ok, msg) => {
  if (!ok) { fail++; console.log('FAIL: ' + msg); }
  else console.log('ok   ' + msg);
};

check(perfect.every(r => r.over), '完美玩家會玩到收工（兩個年代）');
check(perfect.every(r => r.errors === 0), '完美玩家零失誤（人票、貨票、查核）');
check(perfect.every(r => parseFloat(r.money.slice(1)) > 0), '完美玩家有營業額');
check(sloppy.some(r => r.errors > 0), '求其玩家會出錯（錯誤偵測有效）');
check(p1980.every(r => r.taps.startsWith('0/')), '1980 年代冇八達通（零拍卡）');
check(p1990.every(r => parseInt(r.taps) > 0), '1990 年代有客用八達通');
check(sloppy.some(r => r.detail.wrongCargo > 0), '求其玩家會漏貨票（貨票偵測有效）');

// ---- 年代差異 ----
check(ERAS['1980'].cargoChance === 0, '1980 年代唔收貨票');
check(ERAS['1990'].cargoChance > 0, '1990 年代有客帶貨');
check(cargoCount(makeCargo(0)) === 0, 'makeCargo(0) 一定空手');
check(cargoCount(makeCargo(1)) > 0, 'makeCargo(1) 一定有貨');

// ---- 砌一個客出嚟 ----
function makeCust(opts = {}) {
  G.queue = [{
    id: 9000,
    want: opts.want || { adult: 1, child: 0, senior: 0 },
    pay: opts.pay || 'cash',
    mood: MOOD_MAX,
    cargo: opts.cargo || emptyCargo(),
    fakeChild: !!opts.fakeChild,
    ageChecked: false,
    ageVerdict: '',
    age: opts.age || 0,
  }];
  G.current = null;
  pullNext();
}

function payExactChange() {
  let remain = G.due;
  for (const c of COINS) while (remain >= c) { addCoin(c); remain -= c; }
  confirmChange();
}

// ---- 貨票：1990 八達通人票 + 現金貨票 ----
const tvOnly = emptyCargo(); tvOnly.tv = 1;

newGame('1990');
makeCust({ pay: 'octopus', cargo: tvOnly });
addItem('adult'); addCargo('tv');
collect();
check(G.stage === 'tap', '八達通客有貨：先拍人票');
check(orderTotal(G.order) === 150, '拍卡只計人票（$1.5）');

const savedFail = ERAS['1990'].tapFail;
ERAS['1990'].tapFail = 0;
tapCard();
check(G.stage === 'pay', '拍完人票：轉去收貨票現金');
check(G.cashDue === 1200, '貨票現金 = $12');
check(G.money === 150, '拍卡即刻收咗人票錢');
payExactChange();
check(G.money === 150 + 1200, '貨票收齊：總數 = 人票 + 貨票');
check(G.current === null && G.stage === 'order', '完成交易：客人走、回落單');
ERAS['1990'].tapFail = savedFail;

// ---- 漏收貨票：後面條龍每個客 −30 ----
newGame('1990');
makeCust({ pay: 'cash', cargo: tvOnly });
addItem('adult');                       // 故意唔撳貨票
G.queue = [
  { id: 9001, want: { adult: 1, child: 0, senior: 0 }, pay: 'cash', mood: MOOD_MAX, cargo: emptyCargo(), fakeChild: false, ageChecked: false, ageVerdict: '', age: 0 },
  { id: 9002, want: { adult: 1, child: 0, senior: 0 }, pay: 'cash', mood: MOOD_MAX, cargo: emptyCargo(), fakeChild: false, ageChecked: false, ageVerdict: '', age: 0 },
];
collect();
payExactChange();
check(G.errors.wrongCargo === 1, '漏收貨票：記貨票出錯');
check(G.current.mood === MOOD_MAX - CFG.queueMoodHit && G.queue.length === 1 &&
  G.queue[0].mood === MOOD_MAX - CFG.queueMoodHit, '漏收貨票：後面每個客心情 −30');

// ---- 找錯錢：後面條龍一樣 −30 ----
newGame('1990');
makeCust({ pay: 'cash' });
addItem('adult');
G.queue = [{ id: 9003, want: { adult: 1, child: 0, senior: 0 }, pay: 'cash', mood: MOOD_MAX, cargo: emptyCargo(), fakeChild: false, ageChecked: false, ageVerdict: '', age: 0 }];
collect();
addCoin(1000);                          // 亂找
confirmChange();
check(G.errors.wrongChange === 1, '找錯錢：記找錯錢');
check(G.current && G.current.mood === MOOD_MAX - CFG.queueMoodHit, '找錯錢：後面個客心情 −30');

// ---- 龍嘅客心情跌到 0：走人 ----
newGame('1990');
makeCust({ pay: 'cash', cargo: tvOnly });
addItem('adult');
G.queue = [
  { id: 9004, want: { adult: 1, child: 0, senior: 0 }, pay: 'cash', mood: CFG.queueMoodHit, cargo: emptyCargo(), fakeChild: false, ageChecked: false, ageVerdict: '', age: 0 },
  { id: 9005, want: { adult: 1, child: 0, senior: 0 }, pay: 'cash', mood: MOOD_MAX, cargo: emptyCargo(), fakeChild: false, ageChecked: false, ageVerdict: '', age: 0 },
];
const leftBefore = G.leftBehind;
collect();
payExactChange();
check(G.leftBehind === leftBefore + 1, '龍尾個客燥到走：計上唔到船');
check(G.queue.length === 0 && G.current && G.current.id === 9005, '走得一個，剩返一個即刻埋嚟');

// ---- 查核年齡：捉到扮小童 ----
newGame('1980');
makeCust({ want: { adult: 1, child: 1, senior: 0 }, fakeChild: true, age: 16 });
const moodBefore = G.current.mood;
checkAge();
check(G.current.want.adult === 2 && G.current.want.child === 0, '查核：扮小童要轉買成人票');
check(G.current.ageVerdict === 'adult' && G.current.ageChecked, '查核：記錄咗係成人');
check(G.current.mood === moodBefore - CFG.ageMoodHit, '查核：客人心裡唔舒服（−20）');

// 已經撳咗小童票：捉到之後自動轉成人票
newGame('1980');
makeCust({ want: { adult: 1, child: 1, senior: 0 }, fakeChild: true, age: 16 });
addItem('adult'); addItem('child');
checkAge();
check(G.order.adult === 2 && G.order.child === 0, '查核捉到：已撳嘅小童票自動轉成人票');
check(G.order.adult === G.current.want.adult && G.order.child === G.current.want.child,
  '查核捉到：張單同新要求一致');

// ---- 查核年齡：好人被查 ----
newGame('1980');
makeCust({ want: { adult: 1, child: 1, senior: 0 }, fakeChild: false, age: 8 });
const goodMood = G.current.mood;
checkAge();
check(CARGO_KEYS.every(k => k), '（貨種清單存在）');
check(G.current.want.child === 1 && G.current.want.adult === 1, '查核好人：張單唔變');
check(G.current.ageVerdict === 'child', '查核好人：記錄咗係小童');
check(G.current.mood === goodMood - CFG.ageMoodHit, '查核好人：客人唔高興（−20）');

// ---- 唔查核就照賣：主任唔滿意 ----
newGame('1980');
makeCust({ want: { adult: 1, child: 1, senior: 0 }, fakeChild: true, age: 20 });
G.order = { adult: 1, child: 1, senior: 0 };
collect();
payExactChange();
check(G.errors.wrongAge === 1, '扮小童冇查核：記查核漏招');
check(G.current === null, '照賣都完成交易（但扣分）');

// ---- 查核只可以喺落單階段 ----
newGame('1980');
makeCust({ want: { adult: 1, child: 1, senior: 0 }, fakeChild: true, age: 20 });
G.order = { adult: 1, child: 1, senior: 0 };
collect();
checkAge();
check(G.current.fakeChild === true, '收咗錢之後唔可以再查核');

// ---- 現金客 + 貨票：一筆過 ----
newGame('1990');
const ladder = emptyCargo(); ladder.ladder = 2;
makeCust({ pay: 'cash', cargo: ladder });
addItem('adult');
addCargo('ladder'); addCargo('ladder');
check(cargoTotal(G.cargo) === 800, '貨票小計：木梯 ×2 = $8');
collect();
check(G.stage === 'pay' && G.cashDue === 950, '現金一筆過：人票 + 貨票 = $9.5');
payExactChange();
check(G.errors.wrongCargo === 0, '貨票啱：唔會記錯');
check(G.money === 950, '現金收入 = 人票 + 貨票 = $9.5');

console.log(fail ? '\\n' + fail + ' 個檢查失敗' : '\\n全部檢查通過');
process.exit(fail ? 1 : 0);
`;

vm.runInNewContext(runner, { console, require, process }, { filename: 'sim.js' });
