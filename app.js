document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Field Nine App loaded successfully!');
  console.log('📱 User Agent:', navigator.userAgent);
  console.log('🌐 Current URL:', window.location.href);
  console.log('⏰ Load Time:', new Date().toLocaleString('ko-KR'));
  
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

  console.log('🔍 DOM Elements found:', {
    countEl: !!countEl,
    cardCountEl: !!cardCountEl,
    container: !!container,
    startBtn: !!startBtn,
    addCardBtn: !!addCardBtn
  });

  function handleStart() {
    clickCount++;
    console.log(`👆 Start button clicked! Count: ${clickCount}`);
    
    if (countEl) countEl.textContent = clickCount;
    
    const hue = (clickCount * 15) % 360;
    document.body.style.background = 
      `linear-gradient(135deg, hsl(${hue}, 20%, 4%) 0%, hsl(${hue + 30}, 15%, 8%) 100%)`;
    
    console.log(`🎨 Background changed to hue: ${hue}`);
  }

  function addCard() {
    cardCount++;
    console.log(`📋 Adding card #${cardCount}`);
    
    if (cardCountEl) cardCountEl.textContent = cardCount;
    if (!container) {
      console.error('❌ Card container not found!');
      return;
    }

    const card = document.createElement('div');
    card.className = 'card';
    
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const desc = descs[Math.floor(Math.random() * descs.length)];
    const now = new Date().toLocaleTimeString('ko-KR');

    console.log(`✨ Generated card: ${emoji} ${title}`);

    card.innerHTML = `
      <div class="card-emoji">${emoji}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
      <div class="card-time">${now}</div>
    `;

    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    container.appendChild(card);

    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
      console.log(`🎬 Card #${cardCount} animation completed`);
    }, 10);
  }

  if (startBtn) {
    startBtn.addEventListener('click', handleStart);
    console.log('✅ Start button event listener attached');
  }

  if (addCardBtn) {
    addCardBtn.addEventListener('click', addCard);
    console.log('✅ Add card button event listener attached');
  }

  // Performance monitoring
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log(`⚡ Page fully loaded in ${loadTime.toFixed(2)}ms`);
  });

  console.log('🎯 App initialization complete!');
});