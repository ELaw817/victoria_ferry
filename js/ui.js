// ===== 畫面 =====
// 只負責「睇 G，更新 DOM」。唔改 G。

const $ = id => document.getElementById(id);

let qCache = -1;
let clueCache = '';
let ageCache = '';
let lastAgeId = null;
let toastTimer = null;

// 07:00 → 09:00
function fmtClock(sec) {
  const mins = 420 + (sec / CFG.shiftSec) * 120;
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function totalErrors() {
  const e = G.errors;
  return e.wrongType + e.wrongQty + e.wrongChange + e.wrongCargo + e.wrongAge;
}

function toast(text, ms = 1700) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

// 年代換裝：招牌、櫃位、成個色調
function applyEra() {
  const e = eraOf(G.era);
  document.body.dataset.era = e.key;
  $('sign').textContent = e.sign;
  $('ticketName').textContent = e.counter;
}

function moodLabel(m) {
  if (m > 70) return '正常';
  if (m > 35) return '唔耐煩';
  return '燥底';
}

// 窗口嘅提示：有咩貨、細路似唔似大人、查核結果
function renderClues(hasCust) {
  const box = $('clues');
  if (!hasCust) {
    clueCache = '';
    box.innerHTML = '';
    return;
  }

  const c = G.current;
  const cargo = cargoLabel(c.cargo);
  const key = [cargo, c.fakeChild, c.ageChecked, c.mood <= 35].join('|');
  if (key === clueCache) return;
  clueCache = key;

  box.innerHTML = '';
  const chip = (text, cls) => {
    const el = document.createElement('span');
    el.className = 'chip ' + cls;
    el.textContent = text;
    box.appendChild(el);
  };

  if (cargo) chip('貨：' + cargo, 'goods');
  if (c.fakeChild && !c.ageChecked) chip('個「細路」生晒鬍鬚', 'warn');
  if (c.mood <= 35) chip('客人燥底', 'warn');
}

// 查核結果：大字卡片，講清楚啱咗定捉到，同埋張單改咗幾多
function renderAgeCard(hasCust) {
  const el = $('ageCard');
  const c = hasCust ? G.current : null;

  if (!c || !c.ageChecked) {
    if (!el.hidden) el.hidden = true;
    ageCache = '';
    return;
  }

  const adult = c.ageVerdict === 'adult';
  const key = c.id + '|' + c.age + '|' + c.ageVerdict;
  if (key === ageCache) return;
  ageCache = key;

  el.hidden = false;
  el.className = 'ageCard ' + (adult ? 'adult' : 'child');
  el.innerHTML =
    '<b>查核：' + c.age + ' 歲 · ' + (adult ? '成人' : '小童') + '</b>' +
    '<span>' + (adult
      ? '已自動轉成人票，小計 +' + fmt(FARES.adult - FARES.child)
      : '真係小童 — 但客人唔高興') + '</span>';
}

function render() {
  if (!G) return;

  // 頂部
  $('clock').textContent = fmtClock(G.elapsed);
  $('rev').textContent = fmt(G.money);
  $('err').textContent = totalErrors();
  $('left').textContent = G.leftBehind;

  const left = Math.max(0, CFG.boatSec - G.boatT);
  const cutoff = G.phase === 'cutoff';
  $('boatLbl').textContent = (cutoff ? '截龍 · ' : '下一班船 ') + Math.ceil(left) + ' 秒';
  $('clock').parentElement.classList.toggle('urgent', left <= 12);
  $('boatState').textContent = cutoff ? '截龍' : '售票中';
  $('boatState').classList.toggle('cut', cutoff);

  // 龍
  if (G.queue.length !== qCache) {
    qCache = G.queue.length;
    const c = $('crowd');
    c.innerHTML = '';
    for (let i = 0; i < Math.min(G.queue.length, 8); i++) c.appendChild(document.createElement('i'));
  }
  $('queueN').textContent = G.queue.length;

  const qm = G.queue.length
    ? Math.round(G.queue.reduce((s, c) => s + c.mood, 0) / G.queue.length)
    : MOOD_MAX;
  const qmTxt = $('queueMood');
  qmTxt.textContent = G.queue.length ? '後面：' + moodLabel(qm) : '';
  qmTxt.className = 'qmood' + (qm <= 35 ? ' bad' : qm <= 70 ? ' warn' : '');
  $('crowd').classList.toggle('mad', G.queue.length > 0 && qm <= 50);

  // 窗口
  const hasCust = !!G.current;
  const octopus = hasCust && G.current.pay === 'octopus';
  $('cust').classList.toggle('hide', !hasCust);
  $('bubble').classList.toggle('hide', !hasCust);
  $('payTag').classList.toggle('hide', !hasCust);
  if (hasCust) {
    $('bubble').textContent = G.speech;
    $('cust').style.setProperty('--cust', CUST_COLOURS[G.current.id % CUST_COLOURS.length]);
    $('cust').classList.toggle('angry', G.current.mood <= 35);
    $('payTag').textContent = octopus ? '八達通' : '現金';
    $('payTag').classList.toggle('octo', octopus);
  }
  renderClues(hasCust);
  renderAgeCard(hasCust);

  // 查核完，小計會變：閃一閃個總數，等人知發生咩事
  const ageId = hasCust && G.current.ageChecked ? G.current.id : null;
  if (ageId !== lastAgeId) {
    const t = $('total');
    t.classList.remove('flash');
    if (ageId !== null) {
      void t.offsetWidth;
      t.classList.add('flash');
    }
    lastAgeId = ageId;
  }

  // 面板
  const pay = G.stage === 'pay';
  const tap = G.stage === 'tap';
  $('orderPane').hidden = pay || tap;
  $('payPane').hidden = !pay;
  $('tapPane').hidden = !tap;

  // 票種
  document.querySelectorAll('.ticket').forEach(btn => {
    const n = G.order[btn.dataset.type];
    const q = btn.querySelector('.tk-qty');
    q.textContent = n;
    q.classList.toggle('zero', n === 0);
    btn.classList.toggle('on', n > 0);
  });

  // 貨票（只喺有貨嘅客面前出現）
  const showCargo = G.era === '1990' && hasCust && G.stage === 'order' &&
    cargoCount(G.current.cargo) > 0;
  $('cargoPane').hidden = !showCargo;
  if (showCargo) {
    document.querySelectorAll('#cargoPane .cargo').forEach(btn => {
      const n = G.cargo[btn.dataset.cargo] || 0;
      const q = btn.querySelector('.ck-qty');
      q.textContent = n;
      q.classList.toggle('zero', n === 0);
      btn.classList.toggle('on', n > 0);
    });
  }

  // 查核年齡：有買小童票先可以問
  $('checkAge').hidden = !(hasCust && G.stage === 'order' &&
    G.current.want.child > 0 && !G.current.ageChecked);

  const people = orderTotal(G.order);
  const cargo = cargoTotal(G.cargo);
  const total = people + cargo;
  $('total').textContent = fmt(total);
  $('collectBtn').disabled = total === 0 || !hasCust;

  // 找續
  $('payLabel').textContent = hasCust && G.current.pay === 'octopus' ? '貨票（現金）' : '小計';
  $('payTotal').textContent = fmt(G.cashDue);
  $('payTender').textContent = fmt(G.tender);
  $('changeOut').textContent = fmt(G.change);
  $('confirmBtn').disabled = !hasCust;

  // 拍卡
  if (tap) {
    const mood = G.current ? G.current.mood : MOOD_MAX;
    $('tapAmt').textContent = fmt(people);
    $('tapDue').textContent = fmt(people);
    $('moodBar').style.width = mood + '%';
    $('moodBar').classList.toggle('low', mood <= 35);
    $('moodTxt').textContent = moodLabel(mood);
    const locked = G.tapLock > 0;
    $('tapBtn').disabled = !hasCust || locked;
    $('tapBtn').textContent = locked ? '等 ' + G.tapLock.toFixed(1) + 's' : '拍卡';
  }
}

const CUST_COLOURS = ['#2b2f3a', '#3a2b2b', '#2b3a30', '#332b3a', '#2e3440'];

function showEnd() {
  $('rRev').textContent = fmt(G.money);
  $('rErr').textContent = totalErrors();
  $('rLeft').textContent = G.leftBehind;
  $('rCargoRow').hidden = G.era !== '1990';
  $('rCargo').textContent = G.errors.wrongCargo;
  $('rAge').textContent = G.errors.wrongAge;
  $('rTapRow').hidden = G.era !== '1990';
  $('rTap').textContent = G.taps.fail;
  $('rRank').textContent = rankOf();
  $('endSub').textContent = eraOf(G.era).name + ' · 07:00–09:00 早高峰';
  $('endView').hidden = false;
}

function rankOf() {
  const e = totalErrors();
  if (e === 0 && G.leftBehind <= 2) return '賣飛之王';
  if (e <= 2 && G.leftBehind <= 6) return '老手';
  if (e <= 6) return '伙記';
  return '學徒';
}
