document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Field Nine App loaded successfully!');

  // State management
  let clickCount = 0;
  let cardCount = 0;
  let animationId = null;

  // Data arrays
  const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸', '🎪', '🎭', '🎨', '🎵', '🎸'];
  const titles = [
    '새로운 프로젝트 시작', 'AI 분석 완료', '배포 성공!', '성능 최적화 완료', 
    '버그 수정 완료', '코드 리뷰 통과', '테스트 케이스 추가', '문서화 완료',
    'UI/UX 개선', '보안 강화', '데이터베이스 최적화', 'API 통합 완료'
  ];
  const descriptions = [
    'Field Nine으로 빠르게 구축했습니다.', 'AI가 코드를 최적화했습니다.', 
    '전 세계에 성공적으로 배포되었습니다.', '성능이 크게 향상되었습니다.',
    '사용자 경험이 개선되었습니다.', '코드 품질이 향상되었습니다.',
    '새로운 기능이 추가되었습니다.', '보안이 강화되었습니다.'
  ];

  // DOM elements
  const countElement = document.getElementById('count');
  const cardCountElement = document.getElementById('cardCount');
  const userCountElement = document.getElementById('userCount');
  const projectCountElement = document.getElementById('projectCount');
  const codeLinesElement = document.getElementById('codeLines');
  const progressFillElement = document.getElementById('progressFill');
  const cardContainer = document.getElementById('cardContainer');
  const emptyState = document.getElementById('emptyState');
  const startButton = document.getElementById('startBtn');
  const addCardButton = document.getElementById('addCardBtn');
  const clearCardsButton = document.getElementById('clearCardsBtn');
  const mobileMenuButton = document.getElementById('mobileMenuBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Utility functions
  function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  function updateCounters() {
    if (countElement) countElement.textContent = clickCount;
    if (cardCountElement) cardCountElement.textContent = cardCount;
    
    // Update progress bar (max 20 clicks for 100%)
    if (progressFillElement) {
      const progress = Math.min((clickCount / 20) * 100, 100);
      progressFillElement.style.width = `${progress}%`;
    }
  }

  function updateStats() {
    if (userCountElement) {
      const currentCount = parseInt(userCountElement.textContent.replace(/,/g, ''));
      const newCount = currentCount + Math.floor(Math.random() * 5) + 1;
      userCountElement.textContent = formatNumber(newCount);
    }
    
    if (projectCountElement) {
      const currentCount = parseInt(projectCountElement.textContent.replace(/,/g, ''));
      const newCount = currentCount + Math.floor(Math.random() * 10) + 1;
      projectCountElement.textContent = formatNumber(newCount);
    }
  }

  function updateEmptyState() {
    if (!emptyState || !cardContainer) return;
    
    const hasCards = cardContainer.children.length > 1; // excluding empty state
    emptyState.style.display = hasCards ? 'none' : 'block';
  }

  function createCard() {
    cardCount++;
    updateCounters();
    
    if (!cardContainer) return;

    const card = document.createElement('div');
    card.className = 'card';
    
    const emoji = getRandomItem(emojis);
    const title = getRandomItem(titles);
    const description = getRandomItem(descriptions);
    const timestamp = new Date().toLocaleString('ko-KR');
    const cardId = Date.now();

    card.innerHTML = `
      <div class="card-emoji">${emoji}</div>
      <h3>${title}</h3>
      <p>${description}</p>
      <div class="card-meta">
        <span>생성 시간: ${timestamp}</span>
        <span>#${cardCount}</span>
      </div>
      <button class="card-remove" onclick="removeCard(${cardId})" aria-label="카드 삭제">×</button>
    `;
    
    card.dataset.cardId = cardId;
    card.style.animation = 'slideIn 0.5s ease';
    
    cardContainer.insertBefore(card, emptyState);
    updateEmptyState();
    
    showToast(`새 프로젝트 카드가 생성되었습니다: ${title}`);
  }

  function removeCard(cardId) {
    if (!cardContainer) return;
    
    const card = cardContainer.querySelector(`[data-card-id="${cardId}"]`);
    if (card) {
      card.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => {
        if (cardContainer.contains(card)) {
          cardContainer.removeChild(card);
          cardCount = Math.max(0, cardCount - 1);
          updateCounters();
          updateEmptyState();
          showToast('프로젝트 카드가 삭제되었습니다.', 'error');
        }
      }, 300);
    }
  }

  function clearAllCards() {
    if (!cardContainer) return;
    
    const cards = cardContainer.querySelectorAll('.card');
    if (cards.length === 0) {
      showToast('삭제할 카드가 없습니다.', 'error');
      return;
    }
    
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
          if (cardContainer.contains(card)) {
            cardContainer.removeChild(card);
          }
        }, 300);
      }, index * 100);
    });
    
    setTimeout(() => {
      cardCount = 0;
      updateCounters();
      updateEmptyState();
      showToast(`${cards.length}개의 카드가 모두 삭제되었습니다.`, 'error');
    }, cards.length * 100 + 300);
  }

  function animateBackground() {
    const hue = (clickCount * 15) % 360;
    const saturation = Math.min(20 + clickCount, 40);
    const lightness = Math.min(4 + clickCount * 0.5, 8);
    
    document.body.style.background = `linear-gradient(135deg, 
      hsl(${hue}, ${saturation}%, ${lightness}%) 0%, 
      hsl(${hue + 30}, ${saturation - 5}%, ${lightness + 2}%) 100%)`;
  }

  function handleStartClick() {
    clickCount++;
    updateCounters();
    animateBackground();
    updateStats();
    
    if (clickCount === 1) {
      showToast('환영합니다! Field Nine에서 개발을 시작하세요! 🚀');
    } else if (clickCount === 5) {
      showToast('좋습니다! 계속 탐험해보세요! ✨');
    } else if (clickCount === 10) {
      showToast('와우! 당신은 진정한 개발자입니다! 🎯');
    } else if (clickCount === 20) {
      showToast('완벽합니다! 프로그레스 바가 가득 찼습니다! 🎉');
    }
    
    // Add click ripple effect
    if (startButton) {
      startButton.style.transform = 'scale(0.95)';
      setTimeout(() => {
        startButton.style.transform = '';
      }, 150);
    }
  }

  function initializeCounterAnimation() {
    let startTime = Date.now();
    
    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 2000, 1);
      
      if (userCountElement) {
        const targetValue = 1247;
        const currentValue = Math.floor(targetValue * progress);
        userCountElement.textContent = formatNumber(currentValue);
      }
      
      if (projectCountElement) {
        const targetValue = 5832;
        const currentValue = Math.floor(targetValue * progress);
        projectCountElement.textContent = formatNumber(currentValue);
      }
      
      if (codeLinesElement) {
        const targetValue = 2.4;
        const currentValue = (targetValue * progress).toFixed(1);
        codeLinesElement.textContent = currentValue + 'M';
      }
      
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    }
    
    animate();
  }

  // Event listeners
  if (startButton) {
    startButton.addEventListener('click', handleStartClick);
  }

  if (addCardButton) {
    addCardButton.addEventListener('click', createCard);
  }

  if (clearCardsButton) {
    clearCardsButton.addEventListener('click', clearAllCards);
  }

  if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', () => {
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      }
    });
  }

  // Navigation link handling
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Add active class to clicked link
      link.classList.add('active');
      
      const section = link.dataset.section;
      showToast(`${link.textContent} 섹션으로 이동했습니다.`);
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          handleStartClick();
          break;
        case 'n':
          e.preventDefault();
          createCard();
          break;
        case 'Backspace':
          e.preventDefault();
          clearAllCards();
          break;
      }
    }
  });

  // Global function for card removal (needed for inline onclick)
  window.removeCard = removeCard;

  // Initialize animations
  initializeCounterAnimation();
  updateEmptyState();

  // Welcome message
  setTimeout(() => {
    showToast('Field Nine에 오신 것을 환영합니다! 🎉');
  }, 1000);

  console.log('✨ All event listeners attached and animations initialized!');
});