document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 App loaded!');
  
  let clickCount = 0;
  let cardCount = 0;

  const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸'];
  const titles = ['새로운 프로젝트', 'AI 분석 완료', '배포 성공!', '성능 최적화', '버그 수정됨'];
  const descriptions = ['Field Nine으로 빠르게 구축했습니다.', 'AI가 코드를 최적화했습니다.', '전 세계에 배포 완료.'];

  const countElement = document.getElementById('count');
  const cardCountElement = document.getElementById('cardCount');
  const container = document.getElementById('cardContainer');
  const startButton = document.getElementById('startBtn');
  const addCardButton = document.getElementById('addCardBtn');

  function handleStart() {
    clickCount++;
    if (countElement) {
      countElement.textContent = clickCount;
    }
    
    const hue = (clickCount * 15) % 360;
    document.body.style.background = 
      `linear-gradient(135deg, hsl(${hue}, 20%, 4%) 0%, hsl(${hue + 30}, 15%, 8%) 100%)`;
  }

  function addCard() {
    cardCount++;
    if (cardCountElement) {
      cardCountElement.textContent = cardCount;
    }
    
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'card';
    
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const title = titles[Math.floor(Math.random() * titles.length)];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    const now = new Date().toLocaleTimeString('ko-KR');
    
    card.innerHTML = `
      <div class="card-emoji">${emoji}</div>
      <h3>${title}</h3>
      <p>${description}</p>
      <div class="card-time">${now}</div>
      <button class="card-delete" onclick="removeCard(this)">삭제</button>
    `;
    
    container.appendChild(card);
    
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 100);
  }

  window.removeCard = function(button) {
    const card = button.closest('.card');
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        card.remove();
        cardCount--;
        if (cardCountElement) {
          cardCountElement.textContent = cardCount;
        }
      }, 300);
    }
  };

  if (startButton) {
    startButton.addEventListener('click', handleStart);
  }

  if (addCardButton) {
    addCardButton.addEventListener('click', addCard);
  }

  // 초기 카드 2개 생성
  addCard();
  addCard();
});