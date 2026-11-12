// ===== 啟動、綁掣、主迴圈 =====

let prev = 0;
let pickedEra = '1980';

function start(eraKey) {
  if (typeof eraKey === 'string') pickedEra = eraKey;

  $('startView').hidden = true;
  $('endView').hidden = true;
  $('toast').hidden = true;
  qCache = -1;
  custSeq = 0;
  newGame(pickedEra);
  applyEra();
  prev = 0;
}

function loop(ts) {
  if (!prev) prev = ts;
  const dt = Math.min(0.1, (ts - prev) / 1000);
  prev = ts;
  tick(dt);
  render();
  requestAnimationFrame(loop);
}

// 年代揀手：按鈕同 pickedEra 同步
function pickEra(key) {
  pickedEra = key;
  document.querySelectorAll('.era').forEach(b => {
    b.classList.toggle('on', b.dataset.era === key);
  });
}

function bind() {
  document.querySelectorAll('.ticket').forEach(btn => {
    btn.addEventListener('click', () => addItem(btn.dataset.type));
  });

  document.querySelectorAll('.coin').forEach(btn => {
    btn.addEventListener('click', () => addCoin(Number(btn.dataset.coin)));
  });

  document.querySelectorAll('#cargoPane .cargo').forEach(btn => {
    btn.addEventListener('click', () => addCargo(btn.dataset.cargo));
  });

  document.querySelectorAll('.era').forEach(btn => {
    btn.addEventListener('click', () => pickEra(btn.dataset.era));
  });

  $('clearOrder').addEventListener('click', clearOrder);
  $('checkAge').addEventListener('click', checkAge);
  $('resetChange').addEventListener('click', resetChange);
  $('exactBtn').addEventListener('click', payExact);
  $('collectBtn').addEventListener('click', collect);
  $('confirmBtn').addEventListener('click', confirmChange);
  $('tapBtn').addEventListener('click', tapCard);
  $('againBtn').addEventListener('click', () => start());
  $('startBtn').addEventListener('click', () => start(pickedEra));

  $('switchEra').addEventListener('click', () => {
    $('endView').hidden = true;
    $('startView').hidden = false;
    pickEra(G ? G.era : pickedEra);
  });

  // 鍵盤（電腦玩快好多，方便測試）
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.key === '1') addItem('adult');
    else if (e.key === '2') addItem('child');
    else if (e.key === '3') addItem('senior');
    else if (e.key === 'q' || e.key === 'Q') checkAge();
    else if (e.key === '0' && G && G.stage === 'pay') payExact();
    else if (e.key === 'Enter') {
      if (!G || G.over) return;
      if (G.stage === 'order') collect();
      else if (G.stage === 'tap') tapCard();
      else confirmChange();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (G.stage === 'order') clearOrder();
      else if (G.stage === 'pay') resetChange();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bind();
  requestAnimationFrame(loop);
});
