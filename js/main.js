// ===== 啟動、綁掣、主迴圈 =====

let prev = 0;

function start() {
  $('startView').hidden = true;
  $('endView').hidden = true;
  $('toast').hidden = true;
  qCache = -1;
  custSeq = 0;
  newGame();
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

function bind() {
  document.querySelectorAll('.ticket').forEach(btn => {
    btn.addEventListener('click', () => addItem(btn.dataset.type));
  });

  document.querySelectorAll('.coin').forEach(btn => {
    btn.addEventListener('click', () => addCoin(Number(btn.dataset.coin)));
  });

  $('clearOrder').addEventListener('click', clearOrder);
  $('resetChange').addEventListener('click', resetChange);
  $('collectBtn').addEventListener('click', collect);
  $('confirmBtn').addEventListener('click', confirmChange);
  $('againBtn').addEventListener('click', start);
  $('startBtn').addEventListener('click', start);

  // 鍵盤（電腦玩快好多，方便測試）
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.key === '1') addItem('adult');
    else if (e.key === '2') addItem('child');
    else if (e.key === '3') addItem('senior');
    else if (e.key === 'Enter') {
      if (G.stage === 'order') collect();
      else confirmChange();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (G.stage === 'order') clearOrder();
      else resetChange();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bind();
  requestAnimationFrame(loop);
});
