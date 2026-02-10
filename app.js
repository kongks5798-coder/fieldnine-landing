document.addEventListener('DOMContentLoaded', function() {
  var startCodingBtn = document.getElementById('startCodingBtn');
  var view3DBtn = document.getElementById('view3DBtn');
  var launchIdeBtn = document.getElementById('launchIdeBtn');
  var runTestsBtn = document.getElementById('runTestsBtn');
  var toggleMonitor = document.getElementById('toggleMonitor');
  var assistantToggle = document.getElementById('assistantToggle');
  var sendBtn = document.getElementById('sendBtn');
  var chatInput = document.getElementById('chatInput');

  function handleStartCoding() {
    if (startCodingBtn) {
      startCodingBtn.innerHTML = '<span>🤖 AI 초기화 중...</span><span class="btn-arrow">⚡</span>';
      startCodingBtn.style.transform = 'translateY(-2px)';
    }
    
    setTimeout(function() {
      toggleAIAssistant();
      addAIMessage('안녕하세요! Field Nine AI Assistant입니다. 어떤 프로젝트를 시작하시겠어요?', false);
      
      if (startCodingBtn) {
        startCodingBtn.innerHTML = '<span>🤖 AI와 코딩 시작</span><span class="btn-arrow">→</span>';
        startCodingBtn.style.transform = '';
      }
    }, 2000);
  }

  function handleView3D() {
    if (view3DBtn) {
      view3DBtn.innerHTML = '<span class="cube-icon">🔄</span>로딩 중...';
      view3DBtn.style.opacity = '0.7';
    }
    
    setTimeout(function() {
      var dashboard = document.getElementById('dashboard');
      if (dashboard) {
        dashboard.scrollIntoView({ behavior: 'smooth' });
      }
      
      setTimeout(function() {
        if (view3DBtn) {
          view3DBtn.innerHTML = '<span class="cube-icon">📊</span>3D Dashboard';
          view3DBtn.style.opacity = '';
        }
      }, 1500);
    }, 1000);
  }

  function handleLaunchIDE() {
    if (launchIdeBtn) {
      launchIdeBtn.textContent = 'Launching...';
      launchIdeBtn.style.background = 'var(--accent-pink)';
    }
    
    setTimeout(function() {
      var message = '🚀 Field Nine IDE\n\n';
      message += '• AI Code Generator: 활성화\n';
      message += '• 3D Dashboard: 준비완료\n';
      message += '• Smart Debugging: 온라인\n';
      message += '• Performance Monitor: 실행중\n\n';
      message += 'fieldnine.io에서 차세대 개발 경험을 시작하세요!';
      
      alert(message);
      
      if (launchIdeBtn) {
        launchIdeBtn.textContent = 'Launch IDE';
        launchIdeBtn.style.background = 'var(--accent-purple)';
      }
    }, 2000);
  }

  function handleSendMessage() {
    var input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;
    
    var message = input.value.trim();
    addAIMessage(message, true);
    input.value = '';
    
    setTimeout(function() {
      var responses = [
        '🤖 분석 중입니다... 최적의 솔루션을 찾고 있어요.',
        '⚡ 코드를 생성하고 있습니다. 잠시만 기다려주세요.',
        '🎯 요청사항을 처리했습니다. 결과를 확인해보세요!',
        '🔍 더 구체적인 요구사항이 있다면 알려주세요.',
        '✨ Field Nine AI가 최고의 코드를 제공해드릴게요!'
      ];
      var randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addAIMessage(randomResponse, false);
    }, 1000);
  }

  function handleDeploymentMonitor() {
    var monitor = document.getElementById('deploymentMonitor');
    if (monitor) {
      if (monitor.style.display === 'none') {
        monitor.style.display = 'block';
        if (toggleMonitor) toggleMonitor.textContent = 'Minimize';
      } else {
        monitor.style.display = 'none';
        if (toggleMonitor) toggleMonitor.textContent = 'Show Monitor';
      }
    }
  }

  if (startCodingBtn) startCodingBtn.addEventListener('click', handleStartCoding);
  if (view3DBtn) view3DBtn.addEventListener('click', handleView3D);
  if (launchIdeBtn) launchIdeBtn.addEventListener('click', handleLaunchIDE);
  if (runTestsBtn) runTestsBtn.addEventListener('click', runDeploymentTests);
  if (toggleMonitor) toggleMonitor.addEventListener('click', handleDeploymentMonitor);
  if (assistantToggle) assistantToggle.addEventListener('click', toggleAIAssistant);
  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
  
  if (chatInput) {
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleSendMessage();
    });
  }

  var quickBtns = document.querySelectorAll('.quick-btn');
  quickBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = this.getAttribute('data-action');
      addAIMessage(this.textContent + ' 기능을 실행합니다.', true);
      handleQuickAction(action);
    });
  });

  var controlBtns = document.querySelectorAll('.control-btn');
  controlBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var view = this.getAttribute('data-view');
      switchDashboardView(view);
    });
  });

  create3DParticles();
  animateStats();
  
  setTimeout(function() {
    runDeploymentTests();
  }, 2000);
  
  document.body.style.opacity = '0';
  setTimeout(function() {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.8s ease';
  }, 300);

  console.log('🚀 Field Nine v2.0 Initialized');
  console.log('🌐 Domain:', window.location.hostname);
  console.log('🤖 AI Assistant: Ready');
  console.log('📊 3D Dashboard: Active');
  console.log('🔧 Deployment Tests: Running');
  
  var deploymentCheck = setInterval(function() {
    if (window.location.hostname === FIELDNINE_DEPLOYMENT.domain) {
      console.log('✅ Production deployment confirmed: fieldnine.io');
      clearInterval(deploymentCheck);
    } else {
      console.log('🔧 Development environment detected');
    }
  }, 5000);
});