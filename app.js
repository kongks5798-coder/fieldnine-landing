document.addEventListener('DOMContentLoaded', function() {
  var startCodingBtn = document.getElementById('startCodingBtn');
  var view3DBtn = document.getElementById('view3DBtn');
  var launchIdeBtn = document.getElementById('launchIdeBtn');
  var toggleMonitor = document.getElementById('toggleMonitor');
  var assistantToggle = document.getElementById('assistantToggle');
  var sendBtn = document.getElementById('sendBtn');
  var chatInput = document.getElementById('chatInput');

  function handleStartCoding() {
    if (!startCodingBtn) return;
    
    startCodingBtn.innerHTML = '<span>🤖 AI 초기화 중...</span><span class="btn-arrow">⚡</span>';
    startCodingBtn.style.transform = 'translateY(-2px)';
    startCodingBtn.disabled = true;
    
    setTimeout(function() {
      if (!AI_ASSISTANT_CONFIG.isExpanded) {
        toggleAIAssistant();
      }
      addAIMessage('Field Nine AI Assistant가 활성화되었습니다! 무엇을 도와드릴까요?', false);
      
      setTimeout(function() {
        resetStartCodingButton();
      }, 1500);
    }, 2000);
  }

  function handleView3D() {
    if (!view3DBtn) return;
    
    view3DBtn.innerHTML = '<span class="cube-icon">🔄</span>로딩 중...';
    view3DBtn.style.opacity = '0.7';
    
    setTimeout(function() {
      var dashboard = document.getElementById('dashboard');
      if (dashboard) {
        dashboard.scrollIntoView({ behavior: 'smooth' });
      }
      
      setTimeout(function() {
        view3DBtn.innerHTML = '<span class="cube-icon">📊</span>3D Dashboard';
        view3DBtn.style.opacity = '';
      }, 1000);
    }, 800);
  }

  function handleLaunchIDE() {
    if (!launchIdeBtn) return;
    
    launchIdeBtn.textContent = 'Launching...';
    launchIdeBtn.style.background = 'var(--accent-pink)';
    
    setTimeout(function() {
      var message = '🚀 Field Nine IDE v2.0\n\n';
      message += '✅ AI Code Generator: 활성화\n';
      message += '✅ 3D Dashboard: 온라인\n';
      message += '✅ Smart Debugging: 준비완료\n';
      message += '✅ Real-time Collaboration: 연결됨\n\n';
      message += 'fieldnine.io에서 차세대 개발을 시작하세요!';
      
      alert(message);
      
      launchIdeBtn.textContent = 'Launch IDE';
      launchIdeBtn.style.background = 'var(--accent-purple)';
    }, 1500);
  }

  function handleSendMessage() {
    if (!chatInput || !chatInput.value.trim()) return;
    
    var message = chatInput.value.trim();
    addAIMessage(message, true);
    chatInput.value = '';
    
    setTimeout(function() {
      var responses = [
        '🤖 요청을 분석하고 있습니다. 잠시만 기다려주세요.',
        '⚡ AI가 최적의 솔루션을 생성 중입니다...',
        '🎯 완벽한 코드를 작성해드릴게요!',
        '🔍 더 자세한 요구사항이 있다면 알려주세요.',
        '✨ Field Nine AI가 도와드리겠습니다!'
      ];
      var randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addAIMessage(randomResponse, false);
    }, 800);
  }

  if (startCodingBtn) startCodingBtn.addEventListener('click', handleStartCoding);
  if (view3DBtn) view3DBtn.addEventListener('click', handleView3D);
  if (launchIdeBtn) launchIdeBtn.addEventListener('click', handleLaunchIDE);
  if (toggleMonitor) toggleMonitor.addEventListener('click', minimizeDeploymentMonitor);
  if (assistantToggle) assistantToggle.addEventListener('click', toggleAIAssistant);
  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
  
  if (chatInput) {
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleSendMessage();
      }
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
  animateCounters();
  
  document.body.style.opacity = '0';
  setTimeout(function() {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.8s ease';
  }, 200);

  console.log('✅ Field Nine v2.0 초기화 완료');
  console.log('🌐 Domain:', window.location.hostname);
  console.log('🤖 AI Assistant: 준비완료');
  console.log('📊 3D Dashboard: 활성화');
  console.log('🚀 All Systems: Operational');
});