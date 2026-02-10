document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Field Nine App loaded!');
  
  let clickCount = 0;
  let cardCount = 0;

  const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸'];
  const titles = ['새로운 프로젝트', 'AI 분석 완료', '배포 성공!', '성능 최적화', '버그 수정됨'];
  const descriptions = ['Field Nine으로 빠르게 구축했습니다.', 'AI가 코드를 최적화했습니다.', '전 세계에 배포 완료.'];

  const countElement = document.getElementById('count');
  const cardCountElement = document.getElementById('cardCount');
  const cardContainer = document.getElementById('cardContainer');
  const startButton = document.getElementById('startBtn');
  const addCardButton = document.getElementById('addCardBtn');

  function handleStartClick() {
    clickCount++;
    if (countElement) {
      countElement.textContent = clickCount;
    }
    
    // 배경색을 동적으로 변경
    const hue = (clickCount * 15) % 360;
    document.body.style.background = 
      `linear-gradient(135deg, hsl(${hue}, 20%, 4%) 0%, hsl(${hue + 30}, 15%, 8%) 100%)`;
    
    console.log(`시작 버튼 클릭됨! 총 ${clickCount}회`);
  }

  function addNewCard() {
    cardCount++;
    if (cardCountElement) {
      cardCountElement.textContent = cardCount;
    }
    
    if (!cardContainer) return;

    const card = document.createElement('div');
    card.className = 'card';
    
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const currentTime = new Date().toLocaleTimeString('ko-KR');
    
    card.innerHTML = `
      <div class="card-emoji">${randomEmoji}</div>
      <h3>${randomTitle}</h3>
      <p>${randomDescription}</p>
      <div class="card-time">생성 시간: ${currentTime}</div>
    `;
    
    // 카드 클릭 시 제거
    card.addEventListener('click', () => {
      card.style.transform = 'scale(0.8)';
      card.style.opacity = '0';
      setTimeout(() => {
        if (card.parentNode) {
          card.parentNode.removeChild(card);
          cardCount--;
          if (cardCountElement) {
            cardCountElement.textContent = cardCount;
          }
        }
      }, 300);
    });
    
    cardContainer.appendChild(card);
    
    // 애니메이션 효과
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 50);
    
    console.log(`새 카드 추가됨! 총 ${cardCount}개`);
  }

  // 이벤트 리스너 등록
  if (startButton) {
    startButton.addEventListener('click', handleStartClick);
  }

  if (addCardButton) {
    addCardButton.addEventListener('click', addNewCard);
  }

  // 초기 카드 몇 개 추가
  setTimeout(() => {
    addNewCard();
    addNewCard();
  }, 500);

  console.log('✅ 모든 이벤트 리스너가 등록되었습니다.');
});