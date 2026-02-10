document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Field Nine App loaded successfully!');

  // State management
  let state = {
    clickCount: 0,
    cardCount: 0,
    sessionStart: Date.now(),
    theme: localStorage.getItem('theme') || 'dark'
  };

  // Data arrays
  const emojis = ['🚀', '⚡', '🎨', '🔥', '💡', '🎯', '✨', '🌈', '🎮', '🛸', '🎪', '🎭', '🎨', '🎯'];
  const titles = [
    '새로운 프로젝트', 'AI 분석 완료', '배포 성공!', '성능 최적화', 
    '버그 수정됨', '코드 리뷰', '테스트 통과', '문서 업데이트',
    '보안 강화', '사용자 피드백', 'DB 최적화', '캐시 개선'
  ];
  const descriptions = [
    'Field Nine으로 빠르게 구축했습니다.',
    'AI가 코드를 최적화했습니다.',
    '전 세계에 성공적으로 배포되었습니다.',
    '성능이 크게 개선되었습니다.',
    '모든 테스트를 성공적으로 통과했습니다.',
    '사용자 경험이 향상되었습니다.'
  ];

  // DOM elements
  const elements = {
    count: document.getElementById('count'),
    cardCount: document.getElementById('cardCount'),
    sessionTime: document.getElementById('sessionTime'),
    container: document.getElementById('cardContainer'),
    startBtn: document.getElementById('startBtn'),
    addCardBtn: document.getElementById('addCardBtn'),
    clearBtn: document.getElementById('clearBtn'),
    themeToggle: document.getElementById('themeToggle'),
    cardStatus: document.getElementById('cardStatus'),
    loadingOverlay: document.getElementById('loadingOverlay')
  };

  // Initialize app
  function initializeApp() {
    loadSavedData();
    applyTheme();
    updateUI();
    startSessionTimer();
    setupEventListeners();
    showLoadingComplete();
  }

  // Load saved data from localStorage
  function loadSavedData() {
    const savedState = localStorage.getItem('fieldNineState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      state.clickCount = parsed.clickCount || 0;
      state.cardCount = parsed.cardCount || 0;
    }
  }

  // Save state to localStorage
  function saveState() {
    localStorage.setItem('fieldNineState', JSON.stringify({
      clickCount: state.clickCount,
      cardCount: state.cardCount
    }));
  }

  // Theme management
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (elements.themeToggle) {
      elements.themeToggle.textContent = state.theme === 'dark' ? '🌙' : '☀️';
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    applyTheme();
    
    // Add theme transition effect
    document.body.style.transition = 'all 0.5s ease';
    setTimeout(() => {
      document.body.style.transition = '';
    }, 500);
  }

  // Session timer
  function startSessionTimer() {
    setInterval(() => {
      const elapsed = Date.now() - state.sessionStart;
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      if (elements.sessionTime) {
        elements.sessionTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  // Update UI elements
  function updateUI() {
    if (elements.count) elements.count.textContent = state.clickCount;
    if (elements.cardCount) elements.cardCount.textContent = state.cardCount;
    
    // Update card status message
    if (elements.cardStatus) {
      if (state.cardCount === 0) {
        elements.cardStatus.textContent = '카드를 추가해보세요!';
      } else {
        elements.cardStatus.textContent = `${state.cardCount}개의 카드가 생성되었습니다.`;
      }
    }

    // Update clear button visibility
    if (elements.clearBtn) {
      elements.clearBtn.style.opacity = state.cardCount > 0 ? '1' : '0.5';
      elements.clearBtn.disabled = state.cardCount === 0;
    }
  }

  // Handle start button click
  function handleStart() {
    state.clickCount++;
    updateUI();
    saveState();
    
    // Dynamic background effect
    const hue = (state.clickCount * 25) % 360;
    const saturation = Math.min(20 + state.clickCount * 2, 40);
    document.body.style.background = 
      `linear-gradient(135deg, hsl(${hue}, ${saturation}%, 4%) 0%, hsl(${hue + 30}, ${saturation - 5}%, 8%) 100%)`;
    
    // Button feedback animation
    if (elements.startBtn) {
      elements.startBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        elements.startBtn.style.transform = '';
      }, 150);
    }
    
    // Show achievement notifications
    if (state.clickCount % 10 === 0) {
      showNotification(`🎉 ${state.clickCount}번 클릭 달성!`);
    }
  }

  // Add new card
  function addCard() {
    if (!elements.container) return;
    
    showLoading();
    
    setTimeout(() => {
      state.cardCount++;
      
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('role', 'gridcell');
      card.setAttribute('tabindex', '0');
      
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];
      const timestamp = new Date().toLocaleString('ko-KR');
      const cardId = `card-${Date.now()}`;
      
      card.innerHTML = `
        <div class="card-emoji">${emoji}</div>
        <h3>${title}</h3>
        <p>${description}</p>
        <div class="card-meta">
          <span>생성: ${timestamp}</span>
          <span>ID: #${state.cardCount}</span>
        </div>
        <button class="card-delete" onclick="deleteCard('${cardId}')" aria-label="카드 삭제">×</button>
      `;
      
      card.id = cardId;
      
      // Add entrance animation
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      
      elements.container.appendChild(card);
      
      // Trigger animation
      requestAnimationFrame(() => {
        card.style.transition = 'all 0.5s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
      
      updateUI();
      saveState();
      hideLoading();
      
      // Add keyboard support
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          card.click();
        } else if (e.key === 'Delete') {
          deleteCard(cardId);
        }
      });
      
      // Add click interaction
      card.addEventListener('click', () => {
        card.style.transform = 'scale(1.02)';
        setTimeout(() => {
          card.style.transform = '';
        }, 200);
      });
      
    }, 300);
  }

  // Delete specific card
  window.deleteCard = function(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    
    // Exit animation
    card.style.transition = 'all 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateX(100px)';
    
    setTimeout(() => {
      card.remove();
      state.cardCount--;
      updateUI();
      saveState();
    }, 300);
  };

  // Clear all cards
  function clearAllCards() {
    if (!elements.container || state.cardCount === 0) return;
    
    if (confirm('모든 카드를 삭제하시겠습니까?')) {
      const cards = elements.container.querySelectorAll('.card');
      
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.style.transition = 'all 0.3s ease';
          card.style.opacity = '0';
          card.style.transform = 'translateY(-20px)';
          
          setTimeout(() => {
            card.remove();
          }, 300);
        }, index * 50);
      });
      
      setTimeout(() => {
        state.cardCount = 0;
        updateUI();
        saveState();
      }, cards.length * 50 + 300);
    }
  }

  // Show loading overlay
  function showLoading() {
    if (elements.loadingOverlay) {
      elements.loadingOverlay.classList.add('active');
    }
  }

  // Hide loading overlay
  function hideLoading() {
    if (elements.loadingOverlay) {
      elements.loadingOverlay.classList.remove('active');
    }
  }

  // Show loading complete
  function showLoadingComplete() {
    setTimeout(() => {
      hideLoading();
    }, 800);
  }

  // Show notification
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: 10000;
      font-weight: 600;
      transform: translateX(400px);
      transition: all 0.5s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }

  // Setup event listeners with error handling
  function setupEventListeners() {
    try {
      // Button event listeners
      if (elements.startBtn) {
        elements.startBtn.addEventListener('click', handleStart);
      }
      
      if (elements.addCardBtn) {
        elements.addCardBtn.addEventListener('click', addCard);
      }
      
      if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', clearAllCards);
      }
      
      if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
      }
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key) {
            case 'Enter':
              e.preventDefault();
              handleStart();
              break;
            case 'n':
              e.preventDefault();
              addCard();
              break;
            case 'k':
              e.preventDefault();
              clearAllCards();
              break;
            case 't':
              e.preventDefault();
              toggleTheme();
              break;
          }
        }
      });
      
      // Smooth scrolling for navigation links
      document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('href').substring(1);
          const targetElement = document.getElementById(targetId);
          
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
          }
        });
      });
      
    } catch (error) {
      console.error('Event listener setup failed:', error);
    }
  }

  // Initialize the application
  initializeApp();
  
  // Performance monitoring
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    console.log(`⚡ App fully loaded in ${Math.round(loadTime)}ms`);
  });
});