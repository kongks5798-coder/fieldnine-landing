// === Field Nine App — Main Entry Point ===
document.addEventListener('DOMContentLoaded', function() {
  var clickCount = 0;
  var cardCount = 0;

  var countEl = document.getElementById('count');
  var cardCountEl = document.getElementById('cardCount');
  var container = document.getElementById('cardContainer');
  var startBtn = document.getElementById('startBtn');
  var addCardBtn = document.getElementById('addCardBtn');

  var emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸'];
  var titles = ['새로운 프로젝트', 'AI 분석 완료', '배포 성공!', '성능 최적화', '버그 수정됨'];
  var descs = [
    'Field Nine으로 빠르게 구축했습니다.',
    'AI가 코드를 최적화했습니다.',
    '전 세계에 배포 완료.'
  ];

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function handleStart() {
    clickCount++;
    if (countEl) { countEl.textContent = clickCount; }
    var hue = (clickCount * 15) % 360;
    document.body.style.background =
      'linear-gradient(135deg, hsl(' + hue + ',20%,4%) 0%, hsl(' + (hue + 30) + ',15%,8%) 100%)';
  }

  function addCard() {
    cardCount++;
    if (cardCountEl) { cardCountEl.textContent = cardCount; }
    if (!container) { return; }

    var card = document.createElement('div');
    card.className = 'card';
    var time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    card.innerHTML =
      '<div class="card-emoji">' + pick(emojis) + '</div>' +
      '<h3>' + pick(titles) + '</h3>' +
      '<p>' + pick(descs) + '</p>' +
      '<div class="card-time">' + time + '</div>';

    card.addEventListener('click', function() {
      card.style.transform = 'scale(0.95)';
      setTimeout(function() { card.style.transform = ''; }, 150);
    });

    container.prepend(card);
  }

  if (startBtn) { startBtn.addEventListener('click', handleStart); }
  if (addCardBtn) { addCardBtn.addEventListener('click', addCard); }

  // 초기 카드 3개
  for (var i = 0; i < 3; i++) {
    setTimeout(addCard, i * 200);
  }

  console.log('🚀 Field Nine App loaded!');
});
