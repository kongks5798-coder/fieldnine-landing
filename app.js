document.addEventListener('DOMContentLoaded', function() {
  var clickCount = 0;
  var cardCount = 0;
  var isSystemReady = false;
  var lastOperation = null;

  // DOM 요소들
  var countEl = document.getElementById('count');
  var cardCountEl = document.getElementById('cardCount');
  var container = document.getElementById('cardContainer');
  var startBtn = document.getElementById('startBtn');
  var addCardBtn = document.getElementById('addCardBtn');
  var clearBtn = document.getElementById('clearBtn');
  var modalClose = document.getElementById('modalClose');
  var retryBtn = document.getElementById('retryBtn');
  var dismissBtn = document.getElementById('dismissBtn');

  // 시스템 초기화
  function initializeSystem() {
    updateSystemStatus('loading', '시스템 초기화 중...');
    showSectionStatus('시스템 로딩 중...', 'loading');
    
    // 시뮬레이션: 초기화 과정
    setTimeout(function() {
      try {
        // 가상의 시스템 체크
        if (Math.random() > 0.1) { // 90% 성공률
          isSystemReady = true;
          updateSystemStatus('ready', '시스템 준비 완료');
          showSectionStatus('모든 시스템 정상', 'success');
          showNotification('success', '시스템 준비', '모든 시스템이 정상적으로 로드되었습니다.');
          
          // 초기 카드 생성
          for (var i = 0; i < 3; i++) {
            setTimeout(function() {
              addNewCard(true);
            }, i * 500);
          }
        } else {
          throw new Error('시스템 초기화 실패');
        }
      } catch (error) {
        handleSystemError('초기화 오류', error.message);
      }
    }, 2000);
  }

  function handleSystemError(title, message, details) {
    isSystemReady = false;
    updateSystemStatus('error', '시스템 오류');
    showSectionStatus('시스템 오류 발생', 'error');
    showNotification('error', title, message);
    showErrorModal(message, details);
  }

  function simulateOperation(operation, successCallback, errorCallback) {
    // 시뮬레이션: 90% 성공률
    var success = Math.random() > 0.1;
    var delay = Math.random() * 1000 + 500; // 0.5-1.5초
    
    setTimeout(function() {
      try {
        if (!isSystemReady) {
          throw new Error('시스템이 준비되지 않았습니다.');
        }
        
        if (success) {
          successCallback();
        } else {
          throw new Error(pickRandom(APP_DATA.errorMessages));
        }
      } catch (error) {
        errorCallback(error);
      }
    }, delay);
  }

  function handleStartClick() {
    if (!isSystemReady) {
      showNotification('warning', '시스템 대기', '시스템이 아직 준비되지 않았습니다.');
      return;
    }

    setButtonLoading(startBtn, true);
    lastOperation = 'start';
    
    simulateOperation('start',
      function() { // 성공
        clickCount++;
        updateCounterDisplay(countEl, cardCountEl, clickCount, cardCount);
        updateBackgroundGradient(clickCount);
        showCounterStatus('countStatus', 'success');
        setButtonLoading(startBtn, false);
        showNotification('success', '시작 완료', '클릭 카운터가 증가했습니다.');
      },
      function(error) { // 실패
        setButtonLoading(startBtn, false);
        showCounterStatus('countStatus', 'error');
        showNotification('error', '시작 실패', error.message);
        showErrorModal('시작 버튼 처리 중 오류가 발생했습니다.', error.message);
      }
    );
  }

  function addNewCard(isInitial) {
    if (!isSystemReady && !isInitial) {
      showNotification('warning', '시스템 대기', '시스템이 아직 준비되지 않았습니다.');
      return;
    }

    if (!container) {
      showNotification('error', '컨테이너 오류', '카드 컨테이너를 찾을 수 없습니다.');
      return;
    }

    if (!isInitial) {
      setButtonLoading(addCardBtn, true);
      lastOperation = 'addCard';
    }
    
    simulateOperation('addCard',
      function() { // 성공
        cardCount++;
        updateCounterDisplay(countEl, cardCountEl, clickCount, cardCount);
        showCounterStatus('cardStatus', 'success');
        
        var card = createCard(
          pickRandom(APP_DATA.emojis),
          pickRandom(APP_DATA.titles),
          pickRandom(APP_DATA.descriptions)
        );
        
        container.insertBefore(card, container.firstChild);
        
        // 카드에 성공 표시
        setTimeout(function() {
          var cardStatus = card.querySelector('.card-status');
          if (cardStatus) {
            cardStatus.classList.add('success');
          }
          card.classList.add('success');
        }, 100);
        
        if (!isInitial) {
          setButtonLoading(addCardBtn, false);
          showNotification('success', '카드 추가', '새로운 카드가 성공적으로 생성되었습니다.');
        }
      },
      function(error) { // 실패
        if (!isInitial) {
          setButtonLoading(addCardBtn, false);
          showCounterStatus('cardStatus', 'error');
          showNotification('error', '카드 생성 실패', error.message);
          showErrorModal('카드 생성 중 오류가 발생했습니다.', error.message);
        }
      }
    );
  }

  function clearAllCards() {
    if (!isSystemReady) {
      showNotification('warning', '시스템 대기', '시스템이 아직 준비되지 않았습니다.');
      return;
    }

    setButtonLoading(clearBtn, true);
    lastOperation = 'clear';
    
    simulateOperation('clear',
      function() { // 성공
        if (container) {
          container.innerHTML = '';
          cardCount = 0;
          updateCounterDisplay(countEl, cardCountEl, clickCount, cardCount);
          showCounterStatus('cardStatus', 'success');
        }
        setButtonLoading(clearBtn, false);
        showNotification('success', '초기화 완료', '모든 카드가 삭제되었습니다.');
      },
      function(error) { // 실패
        setButtonLoading(clearBtn, false);
        showCounterStatus('cardStatus', 'error');
        showNotification('error', '초기화 실패', error.message);
        showErrorModal('카드 초기화 중 오류가 발생했습니다.', error.message);
      }
    );
  }

  function retryLastOperation() {
    hideErrorModal();
    
    if (APP_DATA.retryAttempts >= APP_DATA.maxRetries) {
      showNotification('error', '재시도 한계', '최대 재시도 횟수를 초과했습니다.');
      return;
    }
    
    APP_DATA.retryAttempts++;
    showNotification('info', '재시도 중', '작업을 다시 시도하고 있습니다... (' + APP_DATA.retryAttempts + '/' + APP_DATA.maxRetries + ')');
    
    switch (lastOperation) {
      case 'start':
        handleStartClick();
        break;
      case 'addCard':
        addNewCard();
        break;
      case 'clear':
        clearAllCards();
        break;
      default:
        showNotification('warning', '재시도 불가', '재시도할 작업이 없습니다.');
    }
  }

  // 이벤트 리스너 등록
  if (startBtn) startBtn.addEventListener('click', handleStartClick);
  if (addCardBtn) addCardBtn.addEventListener('click', function() { addNewCard(false); });
  if (clearBtn) clearBtn.addEventListener('click', clearAllCards);
  
  // 모달 이벤트
  if (modalClose) modalClose.addEventListener('click', hideErrorModal);
  if (dismissBtn) dismissBtn.addEventListener('click', hideErrorModal);
  if (retryBtn) retryBtn.addEventListener('click', retryLastOperation);

  // ESC 키로 모달 닫기
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideErrorModal();
    }
  });

  // 전역 오류 처리
  window.addEventListener('error', function(e) {
    handleSystemError('전역 오류', e.message, e.filename + ':' + e.lineno);
  });

  // 시스템 시작
  initializeSystem();

  console.log('🚀 Field Nine App 로드 시작');
  console.log('📁 파일 구조: index.html, style.css, data.js, ui.js, app.js');
  console.log('🔧 오류 처리 시스템 활성화');
  console.log('✅ 알림 시스템 준비 완료');
});