// ===== 遊戲狀態同推進 =====
// 呢個檔只管「規則點行」，唔碰 DOM。

let G = null;
let custSeq = 0;

function newGame() {
  G = {
    elapsed: 0,            // 一更已過幾多秒
    boatT: 0,              // 今班船已過幾多秒
    boatIndex: 0,
    phase: 'sell',         // 'sell' | 'cutoff'

    money: 0,              // 實收（毫）
    leftBehind: 0,
    errors: { wrongType: 0, wrongQty: 0, wrongChange: 0 },

    queue: [],             // 排緊隊嘅客
    current: null,         // 而家喺窗口嘅客
    speech: '',

    order: { adult: 0, child: 0, senior: 0 },
    stage: 'order',        // 'order' | 'pay'
    tender: 0,             // 客俾幾多
    change: 0,             // 你砌緊嘅找續
    due: 0,                // 正確找續（唔俾畫面睇）

    arrivals: [],          // 今班船嘅客幾時到
    arrived: 0,
    over: false,
  };
  planBoat();
  pullNext();
}

// 為今班船安排客人幾時出現
function planBoat() {
  const n = randInt(CFG.minCust, CFG.maxCust);
  G.arrivals = [];
  for (let i = 0; i < n; i++) G.arrivals.push(randInt(CFG.arriveFrom, CFG.arriveTo));
  G.arrivals.sort((a, b) => a - b);
  G.arrived = 0;
}

function resetOrder() {
  G.order = { adult: 0, child: 0, senior: 0 };
  G.stage = 'order';
  G.tender = 0;
  G.change = 0;
  G.due = 0;
}

function pullNext() {
  if (G.current || !G.queue.length) return;
  G.current = G.queue.shift();
  resetOrder();
  G.speech = greet() + describeOrder(G.current.want);
}

// ---------- 主循環（每 frame 叫一次） ----------

function tick(dt) {
  if (!G || G.over) return;

  G.elapsed += dt;
  if (G.elapsed >= CFG.shiftSec) { endShift(); return; }

  G.boatT += dt;

  // 客陸續出現
  while (G.arrived < G.arrivals.length && G.boatT >= G.arrivals[G.arrived]) {
    G.arrived++;
    if (G.queue.length >= CFG.queueMax) { G.leftBehind++; continue; }
    G.queue.push({ id: ++custSeq, want: makeWant() });
  }

  // 截龍：龍入面嘅人今班上唔到（但窗口嗰個可以做完）
  if (G.phase === 'sell' && G.boatT >= CFG.boatSec - CFG.cutoffBefore) {
    G.phase = 'cutoff';
    G.leftBehind += G.queue.length;
    G.queue = [];
  }

  // 船開
  if (G.boatT >= CFG.boatSec) {
    if (G.current) {
      G.leftBehind++;
      G.current = null;
      G.speech = '';
      resetOrder();
    }
    G.boatT -= CFG.boatSec;
    G.boatIndex++;
    G.phase = 'sell';
    planBoat();
  }

  pullNext();
}

// ---------- 玩家動作 ----------

function addItem(type) {
  if (!G.current || G.stage !== 'order' || G.over) return;
  G.order[type]++;
}

function clearOrder() {
  if (!G.current || G.stage !== 'order') return;
  G.order = { adult: 0, child: 0, senior: 0 };
}

function collect() {
  if (!G.current || G.stage !== 'order' || G.over) return;
  const total = orderTotal(G.order);
  if (total === 0) { toast('未揀票'); return; }

  G.stage = 'pay';
  G.tender = pickTender(total);
  G.due = G.tender - total;
  G.change = 0;
}

function addCoin(hao) {
  if (G.stage !== 'pay') return;
  G.change += hao;
}

function resetChange() {
  if (G.stage !== 'pay') return;
  G.change = 0;
}

function confirmChange() {
  if (!G.current || G.stage !== 'pay' || G.over) return;

  const want = G.current.want;
  let reason = '';

  if (!sameOrder(G.order, want)) {
    if (sameTypes(G.order, want)) G.errors.wrongQty++;
    else G.errors.wrongType++;
    reason = sameTypes(G.order, want) ? '數量唔啱' : '票種唔啱';
  }

  if (G.change !== G.due) {
    G.errors.wrongChange++;
    reason = reason ? reason + '、找錯錢' : '找錯錢';
  }

  // 實收 = 收到 － 找續。找多咗自己蝕，找少咗賺，但會計失誤。
  G.money += G.tender - G.change;

  G.current = null;
  G.speech = '';
  resetOrder();

  toast(reason ? '客人：唔係咁喎…（' + reason + '）' : '客人：唔該晒！');
  pullNext();
}

function endShift() {
  G.over = true;
  showEnd();
}
