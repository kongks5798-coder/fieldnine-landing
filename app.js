document.addEventListener('DOMContentLoaded', function() {
  var exploreBtn = document.getElementById('exploreBtn');
  var watchDemoBtn = document.getElementById('watchDemoBtn');
  var getStartedBtn = document.getElementById('getStartedBtn');
  var monitorToggle = document.getElementById('monitorToggle');
  var isProcessing = false;

  function handleExplore() {
    if (isProcessing) return;
    isProcessing = true;
    
    if (exploreBtn) {
      exploreBtn.innerHTML = '<span>탐색 중...</span><span class="btn-arrow">⚡</span>';
      exploreBtn.style.transform = 'translateY(-4px)';
      exploreBtn.style.boxShadow = '0 0 80px rgba(59, 130, 246, 0.4)';
    }
    
    setTimeout(function() {
      var features = document.getElementById('features');
      if (features) {
        features.scrollIntoView({ behavior: 'smooth' });
      }
      
      setTimeout(function() {
        if (exploreBtn) {
          exploreBtn.innerHTML = '<span>플랫폼 탐색하기</span><span class="btn-arrow">→</span>';
          exploreBtn.style.transform = '';
          exploreBtn.style.boxShadow = '0 0 40px rgba(59, 130, 246, 0.15)';
        }
        isProcessing = false;
      }, 2000);
    }, 1000);
  }

  function handleDemo() {
    if (watchDemoBtn) {
      watchDemoBtn.innerHTML = '<span class="play-icon">⏸</span>로딩 중...';
      watchDemoBtn.style.opacity = '0.7';
      watchDemoBtn.style.transform = 'scale(0.95)';
    }
    
    setTimeout(function() {
      var message = '📊 Field Nine Analytics Demo\n\n';
      message += '현재 표시되는 데이터는 시뮬레이션입니다.\n\n';
      message += '실제 트래픽 데이터 연동을 위해서는:\n';
      message += '• Google Analytics 4 설정\n';
      message += '• Real-time API 연동\n';
      message += '• 서버 사이드 추적 구현\n\n';
      message += '데모 모드에서는 가상의 방문자 데이터가 표시됩니다.';
      
      alert(message);
      
      if (watchDemoBtn) {
        watchDemoBtn.innerHTML = '<span class="play-icon">▶</span>Demo 보기';
        watchDemoBtn.style.opacity = '';
        watchDemoBtn.style.transform = '';
      }
    }, 2000);
  }

  function handleGetStarted() {
    if (getStartedBtn) {
      getStartedBtn.textContent = '시작하는 중...';
      getStartedBtn.style.transform = 'scale(0.95)';
      getStartedBtn.style.background = 'var(--accent-purple)';
    }
    
    setTimeout(function() {
      var features = document.getElementById('features');
      if (features) {
        features.scrollIntoView({ behavior: 'smooth' });
      }
      
      setTimeout(function() {
        if (getStartedBtn) {
          getStartedBtn.textContent = '시작하기';
          getStartedBtn.style.transform = '';
          getStartedBtn.style.background = 'var(--text-primary)';
        }
      }, 1500);
    }, 800);
  }

  if (exploreBtn) exploreBtn.addEventListener('click', handleExplore);
  if (watchDemoBtn) watchDemoBtn.addEventListener('click', handleDemo);
  if (getStartedBtn) getStartedBtn.addEventListener('click', handleGetStarted);
  if (monitorToggle) monitorToggle.addEventListener('click', toggleTrafficMonitor);

  initializeAnalytics();
  createFloatingAnimation();
  initializeCounters();
  handleScrollNavigation();
  
  document.body.style.opacity = '0';
  setTimeout(function() {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.8s ease';
  }, 200);
  
  var featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach(function(card, index) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    setTimeout(function() {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
      card.style.transition = 'all 0.6s ease';
    }, 2000 + (index * 200));
  });

  console.log('📊 Field Nine Analytics System');
  console.log('🔧 Mode:', ANALYTICS_CONFIG.isDemoMode ? 'Demo' : 'Production');
  console.log('🌐 Domain:', window.location.hostname);
  console.log('⚠️  Current data is simulated for demonstration purposes');
});