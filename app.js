function resetStartCodingButton() {
  var startCodingBtn = document.getElementById('startCodingBtn');
  if (startCodingBtn) {
    startCodingBtn.innerHTML = '<span>🤖 AI와 코딩 시작</span><span class="btn-arrow">→</span>';
    startCodingBtn.style.transform = '';
    startCodingBtn.style.boxShadow = '0 0 40px rgba(139, 92, 246, 0.3)';
    startCodingBtn.disabled = false;
  }
}

function toggleAIAssistant() {
  var assistant = document.getElementById('aiAssistant');
  var toggle = document.getElementById('assistantToggle');
  
  if (assistant && toggle) {
    var isCollapsed = assistant.classList.contains('collapsed');
    
    if (isCollapsed) {
      assistant.classList.remove('collapsed');
      toggle.textContent = '◀';
      AI_ASSISTANT_CONFIG.isExpanded = true;
    } else {
      assistant.classList.add('collapsed');
      toggle.textContent = '▶';
      AI_ASSISTANT_CONFIG.isExpanded = false;
    }
  }
}

function addAIMessage(message, isUser) {
  var chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  
  var messageDiv = document.createElement('div');
  messageDiv.className = isUser ? 'user-message' : 'ai-message';
  
  messageDiv.innerHTML = 
    '<div class="message-avatar">' + (isUser ? '👤' : '🤖') + '</div>' +
    '<div class="message-content">' + message + '</div>';
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  AI_ASSISTANT_CONFIG.messageHistory.push({
    message: message,
    isUser: isUser,
    timestamp: new Date()
  });
}

function handleQuickAction(action) {
  var responses = AI_RESPONSES[action];
  if (responses && responses.length > 0) {
    var randomResponse = responses[Math.floor(Math.random() * responses.length)];
    setTimeout(function() {
      addAIMessage(randomResponse, false);
    }, AI_ASSISTANT_CONFIG.responseDelay);
  }
}

function minimizeDeploymentMonitor() {
  var monitor = document.getElementById('deploymentMonitor');
  var toggleBtn = document.getElementById('toggleMonitor');
  
  if (monitor && toggleBtn) {
    var isMinimized = monitor.classList.contains('minimized');
    
    if (isMinimized) {
      monitor.classList.remove('minimized');
      toggleBtn.textContent = 'Minimize';
    } else {
      monitor.classList.add('minimized');
      toggleBtn.textContent = 'Expand';
    }
  }
}

function create3DParticles() {
  var particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  for (var i = 0; i < 15; i++) {
    var particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = 
      'position: absolute; width: 3px; height: 3px; background: rgba(139, 92, 246, 0.7); ' +
      'border-radius: 50%; animation: float 8s ease-in-out infinite; ' +
      'left: ' + Math.random() * 100 + '%; top: ' + Math.random() * 100 + '%; ' +
      'animation-delay: ' + Math.random() * 8 + 's;';
    
    particlesContainer.appendChild(particle);
  }
}

function animateCounters() {
  var counters = [
    { id: 'aiGeneratedLines', target: 127, suffix: 'K' },
    { id: 'productivityBoost', target: 847, suffix: '%' },
    { id: 'bugReduction', target: 94, suffix: '%' }
  ];
  
  counters.forEach(function(counter, index) {
    setTimeout(function() {
      animateNumber(counter.id, counter.target, counter.suffix);
    }, index * 300);
  });
}

function animateNumber(elementId, target, suffix) {
  var element = document.getElementById(elementId);
  if (!element) return;
  
  var current = 0;
  var increment = target / 60;
  var timer = setInterval(function() {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current) + suffix;
  }, 30);
}

function switchDashboardView(view) {
  var buttons = document.querySelectorAll('.control-btn');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
  });
  
  event.target.classList.add('active');
  console.log('Dashboard view switched to:', view);
}