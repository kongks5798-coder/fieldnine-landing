document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Field Nine App loaded successfully!');
  
  let clickCount = 0;
  let cardCount = 0;

  const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸', '🎪', '🎭', '🎨', '🎯', '🎲'];
  const titles = [
    '새로운 프로젝트 시작', 
    'AI 분석 완료', 
    '배포 성공!', 
    '성능 최적화됨', 
    '버그 수정 완료',
    '코드 리뷰 통과',
    '테스트 케이스 추가',
    '데이터베이스 연결',
    'API 통합 완료',
    '보안 강화됨'
  ];
  const descriptions = [
    'Field Nine으로 빠르게 구축했습니다.',
    'AI가 코드를 자동으로 최적화했습니다.',
    '전 세계에 성공적으로 배포되었습니다.',
    '성능이 300% 향상되었습니다.',
    '사용자 경험이 크게 개선되었습니다.',
    '최신 기술 스택으로 업그레이드되었습니다.'
  ];

  // DOM 요소들 가져오기
  const countElement = document.getElementById('count');
  const cardCountElement = document.getElementById('cardCount');
  const cardContainer = document.getElementById('cardContainer');
  const startButton = document.getElementById('startBtn');
  const addCardButton = document.getElementById('addCardBtn');

  // 시작 버튼 클릭 핸들러
  function handleStartClick() {
    clickCount++;
    if (countElement) {
      countElement.textContent = clickCount;
      countElement.style.transform = 'scale(1.2)';
      setTimeout(() => {
        countElement.style.transform = 'scale(1)';
      }, 200);
    }

    // 배경색 변화 효과
    const hue = (clickCount * 15) % 360;
    const saturation = Math.min(20 + clickCount * 2, 40);
    const lightness = Math.min(4 + clickCount * 0.5, 12);
    
    document.body.style.background = 
      `linear-gradient(135deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${hue + 30}, ${saturation - 5}%, ${lightness + 4}%) 100%)`;

    // 성취 메시지 표시
    if (clickCount === 10) {
      showAchievement('🏆 10회 달성!', '꾸준히 클릭하고 계시네요!');
    } else if (clickCount === 50) {
      showAchievement('🎯 50회 달성!', '정말 대단합니다!');
    } else if (clickCount === 100) {
      showAchievement('🚀 100회 달성!', '당신은 클릭 마스터입니다!');
    }
  }

  // 카드 추가 핸들러
  function handleAddCard() {
    cardCount++;
    if (cardCountElement) {
      cardCountElement.textContent = cardCount;
      cardCountElement.style.transform = 'scale(1.2)';
      setTimeout(() => {
        cardCountElement.style.transform = 'scale(1)';
      }, 200);
    }

    if (!cardContainer) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';

    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];
    const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];
    const currentTime = new Date().toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });

    card.innerHTML = `
      <div class="card-emoji">${randomEmoji}</div>
      <h3>${randomTitle}</h3>
      <p>${randomDescription}</p>
      <div class="card-time">${currentTime}</div>
    `;

    // 카드 클릭 이벤트 추가
    card.addEventListener('click', () => {
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        card.style.transform = 'scale(1)';
      }, 150);
      
      const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      card.style.borderColor = randomColor + '50';
      
      setTimeout(() => {
        card.style.borderColor = 'rgba(255, 255, 255, 0.08)';
      }, 1000);
    });

    cardContainer.appendChild(card);

    // 애니메이션 효과
    setTimeout(() => {
      card.style.transition = 'all 0.5s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 50);

    // 자동 스크롤
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 600);
  }

  // 성취 메시지 표시 함수
  function showAchievement(title, message) {
    const achievement = document.createElement('div');
    achievement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.4);
      z-index: 1000;
      transform: translateX(400px);
      transition: all 0.5s ease;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    
    achievement.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 4px;">${title}</div>
      <div style="font-size: 14px; opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(achievement);
    
    setTimeout(() => {
      achievement.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      achievement.style.transform = 'translateX(400px)';
      setTimeout(() => {
        document.body.removeChild(achievement);
      }, 500);
    }, 3000);
  }

  // 키보드 단축키 추가
  document.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleStartClick();
    } else if (event.key === 'c' || event.key === 'C') {
      handleAddCard();
    }
  });

  // 이벤트 리스너 등록
  if (startButton) {
    startButton.addEventListener('click', handleStartClick);
  }

  if (addCardButton) {
    addCardButton.addEventListener('click', handleAddCard);
  }

  // 초기 상태 설정
  if (countElement) countElement.textContent = clickCount;
  if (cardCountElement) cardCountElement.textContent = cardCount;

  // 웰컴 메시지
  setTimeout(() => {
    showAchievement('🎉 환영합니다!', 'Field Nine App이 준비되었습니다.');
  }, 1000);

  // 자동 저장 시뮬레이션
  setInterval(() => {
    if (clickCount > 0 || cardCount > 0) {
      console.log(`💾 자동 저장됨 - 클릭: ${clickCount}, 카드: ${cardCount}`);
    }
  }, 30000);

  console.log('✅ All event listeners registered successfully');
  console.log('🎮 Keyboard shortcuts: Space/Enter = 시작하기, C = 카드 추가');
});