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

// ---- 自動玩家：完美 ----
function perfectBot() {
  if (!G.current) return;
  if (G.stage === 'order') {
    G.order = { ...G.current.want };
    collect();
  }
  if (G.stage === 'pay') {
    let remain = G.due;
    for (const c of [100, 50, 20, 10]) {
      while (remain >= c) { addCoin(c); remain -= c; }
    }
    confirmChange();
  }
}

// ---- 自動玩家：求其（會出錯）----
function sloppyBot() {
  if (!G.current) return;
  if (G.stage === 'order') {
    G.order = { ...G.current.want };
    if (Math.random() < 0.3) G.order.adult++;   // 數量錯
    collect();
  }
  if (G.stage === 'pay') {
    let remain = G.due + (Math.random() < 0.4 ? 10 : 0);  // 找錯錢
    for (const c of [100, 50, 20, 10]) {
      while (remain >= c) { addCoin(c); remain -= c; }
    }
    confirmChange();
  }
}

function run(label, bot) {
  newGame();
  let guard = 0;
  while (!G.over && guard++ < 20000) {
    bot();
    tick(0.05);
  }
  const errs = G.errors;
  return {
    label,
    money: fmt(G.money),
    errors: errs.wrongType + errs.wrongQty + errs.wrongChange,
    detail: errs,
    leftBehind: G.leftBehind,
    over: G.over,
  };
}

const results = [];
for (let i = 0; i < 3; i++) results.push(run('完美 #' + (i + 1), perfectBot));
for (let i = 0; i < 3; i++) results.push(run('求其 #' + (i + 1), sloppyBot));

console.table(results);

// ---- 基本檢查 ----
const perfect = results.filter(r => r.label.startsWith('完美'));
const sloppy = results.filter(r => r.label.startsWith('求其'));

let fail = 0;
const check = (ok, msg) => {
  if (!ok) { fail++; console.log('FAIL: ' + msg); }
  else console.log('ok   ' + msg);
};

check(perfect.every(r => r.over), '完美玩家會玩到收工');
check(perfect.every(r => r.errors === 0), '完美玩家零失誤');
check(perfect.every(r => parseFloat(r.money.slice(1)) > 0), '完美玩家有營業額');
check(sloppy.some(r => r.errors > 0), '求其玩家會出錯（錯誤偵測有效）');

console.log(fail ? '\\n' + fail + ' 個檢查失敗' : '\\n全部檢查通過');
process.exit(fail ? 1 : 0);
`;

vm.runInNewContext(runner, { console, require, process }, { filename: 'sim.js' });
