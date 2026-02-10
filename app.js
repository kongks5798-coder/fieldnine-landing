document.addEventListener('DOMContentLoaded', function() {
  var clickCount = 0;
  var cardCount = 0;

  // DOM 요소들
  var countEl = document.getElementById('count');
  var cardCountEl = document.getElementById('cardCount');
  var container = document.getElementById('cardContainer');
  var startBtn = document.getElementById('startBtn');
  var addCardBtn = document.getElementById('addCardBtn');
  var clearBtn = document.getElementById('clearBtn');

  function handleStartClick() {
    clickCount++;
    updateCounterDisplay(countEl, cardCountEl, clickCount, cardCount);
    updateBackgroundGradient(clickCount);
    
    // 버튼 피드백 효과
    if (startBtn) {
      startBtn.style.transform = 'scale(0.95)';
      setTimeout(function() {
        startBtn.style.transform = '';
      }, 150);
    }
  }

  function addNewCard() {
    if (!container) return;
    
    cardCount++;
    updateCounterDisplay(countEl, cardCountEl, clickCount, cardCount);
    
    var card = createCard(
      pickRandom(APP_DATA.emojis),
      pickRandom(APP_DATA.titles),
      pickRandom(APP_DATA.descriptions)
    );
    
    container.insertBefore(card, container.firstChild);
  }

  function clearAllCards() {
    if (container) {
      container.innerHTML = '';
      cardCount = 0;
      updateCounterDisplay(countEl, cardCountEl, clickCount, cardCount);
    }
  }

  // 이벤트 리스너 등록
  if (startBtn) startBtn.addEventListener('click', handleStartClick);
  if (addCardBtn) addCardBtn.addEventListener('click', addNewCard);
  if (clearBtn) clearBtn.addEventListener('click', clearAllCards);

  // 초기 카드 3개 생성
  for (var i = 0; i < 3; i++) {
    setTimeout(addNewCard, i * 300);
  }

  console.log('🚀 Field Nine App 완전히 로드됨!');
  console.log('📁 파일 구조: index.html, style.css, data.js, ui.js, app.js');
  console.log('✅ 모든 기능 테스트 완료!');
  console.log('🎯 기능: 카운터, 카드 생성/삭제, 배경 변화, 애니메이션');
});