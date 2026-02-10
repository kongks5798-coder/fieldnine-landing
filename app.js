// === Field Nine App Logic ===
document.addEventListener('DOMContentLoaded', () => {
  let clickCount = 0;
  let cardCount = 0;

  const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸'];
  const titles = ['새로운 프로젝트', 'AI 분석 완료', '배포 성공!', '성능 최적화', '버그 수정됨'];
  const descs = ['Field Nine으로 빠르게 구축했습니다.', 'AI가 코드를 최적화했습니다.', '전 세계에 배포 완료.'];

  const countEl = document.getElementById('count');
  const cardCountEl = document.getElementById('cardCount');
  const container = document.getElementById('cardContainer');
  const startBtn = document.getElementById('startBtn');
  const addCardBtn = document.getElementById('addCardBtn');

  function handleStart() {
    clickCount++;
    if (countEl) countEl.textContent = clickCount;
    const hue = (clickCount * 15) % 360;
    document.body.style.background =
      \`linear-gradient(135deg, hsl(\${hue}, 20%, 4%) 0%, hsl(\${hue + 30}, 15%, 8%) 100%)\`;
  }

  function addCard() {
    cardCount++;
    if (cardCountEl) cardCountEl.textContent = cardCount;
    if (!container) return;
    const card = document.createElement('div');
    card.className = 'card';
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const desc = descs[Math.floor(Math.random() * descs.length)];
    const now = new Date().toLocaleTimeString('ko-KR');
    card.innerHTML = \`
      <div class="card-emoji">\${emoji}</div>
      <h3>\${title}</h3>
      <p>\${desc}</p>
      <div class="card-time">\${now}에 생성됨</div>
    \`;
    container.prepend(card);
  }

  if (startBtn) startBtn.addEventListener('click', handleStart);
  if (addCardBtn) addCardBtn.addEventListener('click', addCard);

  // 초기 카드 3개 생성
  for (let i = 0; i < 3; i++) {
    setTimeout(() => addCard(), i * 200);
  }

  console.log('🚀 Field Nine App loaded!');
  console.log('📦 Files: index.html, style.css, app.js');
  console.log('✅ Ready to dev!');
});