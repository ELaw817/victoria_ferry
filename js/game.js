// ===== 遊戲狀態同推進 =====
// 呢個檔只管「規則點行」，唔碰 DOM。

let G = null;
let custSeq = 0;

const era = () => eraOf(G.era);

function newGame(eraKey) {
  G = {
    era: eraOf(eraKey).key,

    elapsed: 0,            // 一更已過幾多秒
    boatT: 0,              // 今班船已過幾多秒
    boatIndex: 0,
    phase: 'sell',         // 'sell' | 'cutoff'

    money: 0,              // 實收（仙）
    leftBehind: 0,
    errors: { wrongType: 0, wrongQty: 0, wrongChange: 0, wrongCargo: 0, wrongAge: 0 },

    queue: [],             // 排緊隊嘅客
    current: null,         // 而家喺窗口嘅客
    speech: '',

    order: { adult: 0, child: 0, senior: 0 },
    cargo: emptyCargo(),   // 你撳咗嘅貨票
    stage: 'order',        // 'order' | 'pay' | 'tap'
    tender: 0,             // 客俾幾多（現金）
    change: 0,             // 你砌緊嘅找續
    due: 0,                // 正確找續（唔俾畫面睇）
    cashDue: 0,            // 今次要收幾多現金（貨票／全單）

    tapLock: 0,            // 拍卡失敗後，仲要等幾多秒才可以再拍
    taps: { ok: 0, fail: 0 },

    arrivals: [],          // 今班船嘅客幾時到
    arrived: 0,
    over: false,
  };
  planBoat();
  pullNext();
}

// 為今班船安排客人幾時出現
function planBoat() {
  const e = era();
  const n = randInt(e.minCust, e.maxCust);
  G.arrivals = [];
  for (let i = 0; i < n; i++) G.arrivals.push(randInt(e.arriveFrom, e.arriveTo));
  G.arrivals.sort((a, b) => a - b);
  G.arrived = 0;
}

function resetOrder() {
  G.order = { adult: 0, child: 0, senior: 0 };
  G.cargo = emptyCargo();
  G.stage = 'order';
  G.tender = 0;
  G.change = 0;
  G.due = 0;
  G.cashDue = 0;
  G.tapLock = 0;
}

function pullNext() {
  if (G.current || !G.queue.length) return;
  G.current = G.queue.shift();
  resetOrder();
  G.speech = speechFor(G.current);
}

// ---------- 主循環（每 frame 叫一次） ----------

function tick(dt) {
  if (!G || G.over) return;

  G.elapsed += dt;
  if (G.elapsed >= CFG.shiftSec) { endShift(); return; }

  G.boatT += dt;
  if (G.tapLock > 0) G.tapLock = Math.max(0, G.tapLock - dt);

  // 客陸續出現
  const e = era();
  while (G.arrived < G.arrivals.length && G.boatT >= G.arrivals[G.arrived]) {
    G.arrived++;
    if (G.queue.length >= e.queueMax) { G.leftBehind++; continue; }

    const want = makeWant();
    const fakeChild = want.child > 0 && Math.random() < CFG.fakeChildChance;

    G.queue.push({
      id: ++custSeq,
      want,
      pay: makePay(e.octopus),
      mood: MOOD_MAX,
      cargo: makeCargo(e.cargoChance),   // 行到窗口才見到
      fakeChild,
      ageChecked: false,
      ageVerdict: '',
      age: fakeChild ? randInt(16, 32) : (want.child > 0 ? randInt(5, 12) : 0),
    });
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

function addCargo(kind) {
  if (!G.current || G.stage !== 'order' || G.over) return;
  if (!CARGO[kind]) return;
  G.cargo[kind]++;
}

function clearOrder() {
  if (!G.current || G.stage !== 'order') return;
  G.order = { adult: 0, child: 0, senior: 0 };
  G.cargo = emptyCargo();
}

// 查核年齡：只可以喺落單階段問，而且每個客只問一次
function checkAge() {
  const c = G.current;
  if (!c || G.stage !== 'order' || G.over) return;
  if (c.ageChecked || !c.want.child) return;

  c.ageChecked = true;
  c.mood = Math.max(0, c.mood - CFG.ageMoodHit);

  if (c.fakeChild) {
    // 捉到：細路其實係成人，要買成人票
    c.fakeChild = false;
    c.ageVerdict = 'adult';
    c.want = { ...c.want, child: c.want.child - 1, adult: c.want.adult + 1 };
    // 你已經撳咗小童票嘅話，即刻幫你轉做成人票
    if (G.order.child > 0) { G.order.child--; G.order.adult++; }
    G.speech = AGE_CAUGHT;
    toast('查核：原來係成人，已轉成人票');
  } else {
    c.ageVerdict = 'child';
    G.speech = AGE_CHILD;
    toast('查核：真係小童 — 客人唔高興');
  }
}

function collect() {
  if (!G.current || G.stage !== 'order' || G.over) return;

  const people = orderTotal(G.order);
  const cargo = cargoTotal(G.cargo);          // 你撳咗嘅貨票（唔係客實際有幾多）
  const total = people + cargo;
  if (total === 0) { toast('未揀票'); return; }

  G.change = 0;
  G.tapLock = 0;

  if (G.current.pay === 'octopus') {
    // 人票拍卡，貨票現金
    G.cashDue = cargo;
    if (people > 0) {
      G.stage = 'tap';
      G.tender = people;
      G.due = 0;
    } else {
      startCash(cargo);
    }
  } else {
    // 現金一筆過：人票 + 貨票
    startCash(total);
  }
}

function startCash(amount) {
  G.stage = 'pay';
  G.cashDue = amount;
  G.tender = pickTender(amount);
  G.due = G.tender - amount;
  G.change = 0;
}

// 八達通：5% 機會失敗。成功回傳 true。
function tapCard() {
  if (!G.current || G.stage !== 'tap' || G.over) return false;
  if (G.tapLock > 0) return false;

  const e = era();

  if (Math.random() < e.tapFail) {
    G.taps.fail++;
    G.tapLock = e.tapLock;
    G.current.mood = Math.max(0, G.current.mood - e.moodHit);

    if (G.current.mood <= 0) {
      // 拍到燥，客人唔買走人
      G.leftBehind++;
      finishSale('客人：拍極都唔得，我唔買喇！');
      return false;
    }

    G.speech = tapFailLine();
    toast('拍唔中 — 再拍一次');
    return false;
  }

  G.taps.ok++;
  G.money += orderTotal(G.order);   // 人票

  if (G.cashDue > 0) {
    // 仲有貨票要收現金
    startCash(G.cashDue);
    G.speech = '人票拍咗 — 貨錢要俾現金。';
    toast('人票拍卡完成 — 仲要收貨票（現金）');
    return true;
  }

  const order = settleOrder();
  finishSale(order ? '客人：嘟—— 喂，唔啱喎（' + order + '）' : '客人：嘟！唔該。');
  return true;
}

function addCoin(hao) {
  if (G.stage !== 'pay') return;
  G.change += hao;
}

function resetChange() {
  if (G.stage !== 'pay') return;
  G.change = 0;
}

// 核對人票、貨票、查核。回傳原因，順便記低失誤同搞躁條龍。
function settleOrder() {
  const c = G.current;
  let reason = '';

  if (!sameOrder(G.order, c.want)) {
    const qtyOnly = sameTypes(G.order, c.want);
    if (qtyOnly) G.errors.wrongQty++;
    else G.errors.wrongType++;
    reason = qtyOnly ? '數量唔啱' : '票種唔啱';
  }

  if (!sameCargo(G.cargo, c.cargo)) {
    G.errors.wrongCargo++;
    upsetQueue();
    reason = reason ? reason + '、貨票唔啱' : '貨票唔啱';
  }

  // 有人扮小童，你冇查核就照賣
  if (c.fakeChild && G.order.child > 0) {
    G.errors.wrongAge++;
    reason = reason ? reason + '、查核漏招' : '查核漏招';
  }

  return reason;
}

// 貨票出錯／找錯錢：後面條龍每個客心情 −30，跌到 0 就走
function upsetQueue() {
  if (!G.queue.length) return;
  const alive = [];
  for (const c of G.queue) {
    c.mood = Math.max(0, c.mood - CFG.queueMoodHit);
    if (c.mood <= 0) G.leftBehind++;
    else alive.push(c);
  }
  G.queue = alive;
}

function finishSale(message) {
  G.current = null;
  G.speech = '';
  resetOrder();
  toast(message);
  pullNext();
}

function confirmChange() {
  if (!G.current || G.stage !== 'pay' || G.over) return;

  let reason = settleOrder();

  if (G.change !== G.due) {
    G.errors.wrongChange++;
    upsetQueue();
    reason = reason ? reason + '、找錯錢' : '找錯錢';
  }

  // 實收 = 收到 － 找續。找多咗自己蝕，找少咗賺，但會計失誤。
  G.money += G.tender - G.change;

  finishSale(reason ? '客人：唔係咁喎…（' + reason + '）' : '客人：唔該晒！');
}

function endShift() {
  G.over = true;
  showEnd();
}
