// ===== 畫面 =====
// 只負責「睇 G，更新 DOM」。唔改 G。

const $ = id => document.getElementById(id);

let qCache = -1;
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
  return e.wrongType + e.wrongQty + e.wrongChange;
}

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 1700);
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

  // 窗口
  const hasCust = !!G.current;
  $('cust').classList.toggle('hide', !hasCust);
  $('bubble').classList.toggle('hide', !hasCust);
  if (hasCust) {
    $('bubble').textContent = G.speech;
    $('cust').style.setProperty('--cust', CUST_COLOURS[G.current.id % CUST_COLOURS.length]);
  }

  // 面板
  const pay = G.stage === 'pay';
  $('orderPane').hidden = pay;
  $('payPane').hidden = !pay;

  // 票種
  document.querySelectorAll('.ticket').forEach(btn => {
    const n = G.order[btn.dataset.type];
    const q = btn.querySelector('.tk-qty');
    q.textContent = n;
    q.classList.toggle('zero', n === 0);
    btn.classList.toggle('on', n > 0);
  });

  const total = orderTotal(G.order);
  $('total').textContent = fmt(total);
  $('collectBtn').disabled = total === 0 || !hasCust;

  // 找續
  $('payTotal').textContent = fmt(total);
  $('payTender').textContent = fmt(G.tender);
  $('changeOut').textContent = fmt(G.change);
  $('confirmBtn').disabled = !hasCust;
}

const CUST_COLOURS = ['#2b2f3a', '#3a2b2b', '#2b3a30', '#332b3a', '#2e3440'];

function showEnd() {
  $('rRev').textContent = fmt(G.money);
  $('rErr').textContent = totalErrors();
  $('rLeft').textContent = G.leftBehind;
  $('rRank').textContent = rankOf();
  $('endView').hidden = false;
}

function rankOf() {
  const e = totalErrors();
  if (e === 0 && G.leftBehind <= 2) return '賣飛之王';
  if (e <= 2 && G.leftBehind <= 6) return '老手';
  if (e <= 6) return '伙記';
  return '學徒';
}
