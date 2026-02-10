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
    
    // Dynamic background color based on clicks
    const hue = (clickCount * 15) % 360;
    document.body.style.background = 
      `linear-gradient(135deg, hsl(${hue}, 20%, 4%) 0%, hsl(${hue + 30}, 15%, 8%) 100%)`;
    
    // Add visual feedback
    if (startButton) {
      startButton.style.transform = 'scale(0.95)';
      setTimeout(() => {
        startButton.style.transform = '';
      }, 150);
    }
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
      <div class="card-time">${currentTime}</div>
    `;
    
    // Add entrance animation
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    cardContainer.appendChild(card);
    
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 10);
    
    // Add click handler to remove card
    card.addEventListener('click', () => {
      card.style.transform = 'scale(0.9) translateY(-10px)';
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
  }

  // Event listeners
  if (startButton) {
    startButton.addEventListener('click', handleStartClick);
  }
  
  if (addCardButton) {
    addCardButton.addEventListener('click', addNewCard);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      handleStartClick();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      addNewCard();
    }
  });

  // Auto-add first card as demo
  setTimeout(() => {
    addNewCard();
  }, 1000);
});