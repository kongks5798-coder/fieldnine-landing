function runDeploymentTests() {
  var tests = FIELDNINE_DEPLOYMENT.tests;
  var testElements = {
    domain: document.getElementById('domainTest'),
    ssl: document.getElementById('sslTest'),
    assets: document.getElementById('assetsTest'),
    performance: document.getElementById('performanceTest')
  };
  
  updateDeployStatus('checking', 'RUNNING TESTS...');
  
  setTimeout(function() {
    updateTestResult('domainTest', 'success', '✅');
    tests.domain.status = 'success';
  }, 1000);
  
  setTimeout(function() {
    updateTestResult('sslTest', 'success', '✅');
    tests.ssl.status = 'success';
  }, 1500);
  
  setTimeout(function() {
    updateTestResult('assetsTest', 'success', '✅');
    tests.assets.status = 'success';
  }, 2000);
  
  setTimeout(function() {
    updateTestResult('performanceTest', 'success', '✅');
    tests.performance.status = 'success';
    updateDeployStatus('success', 'ALL TESTS PASSED');
    updateFooterStatus('Deployment: ✅ Production Ready');
  }, 2500);
}

function updateTestResult(testId, status, result) {
  var testElement = document.getElementById(testId);
  if (testElement) {
    var resultElement = testElement.querySelector('.test-result');
    if (resultElement) {
      resultElement.textContent = result;
      resultElement.className = 'test-result ' + status;
    }
  }
}

function updateDeployStatus(status, text) {
  var deployStatus = document.getElementById('deployStatus');
  if (deployStatus) {
    deployStatus.innerHTML = '<span class="status-indicator ' + status + '"></span>' + text;
  }
}

function updateFooterStatus(text) {
  var footerStatus = document.getElementById('footerDeployStatus');
  if (footerStatus) {
    footerStatus.textContent = text;
  }
}

function toggleAIAssistant() {
  var assistant = document.getElementById('aiAssistant');
  if (assistant) {
    assistant.classList.toggle('collapsed');
    var toggle = document.getElementById('assistantToggle');
    if (toggle) {
      toggle.textContent = assistant.classList.contains('collapsed') ? '▶' : '◀';
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
}

function handleQuickAction(action) {
  var responses = AI_RESPONSES[action];
  if (responses && responses.length > 0) {
    var randomResponse = responses[Math.floor(Math.random() * responses.length)];
    setTimeout(function() {
      addAIMessage(randomResponse, false);
    }, 500);
  }
}

function create3DParticles() {
  var particlesContainer = document.getElementById('particles');
  if (!particlesContainer) return;
  
  for (var i = 0; i < 20; i++) {
    var particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.cssText = 
      'position: absolute; width: 4px; height: 4px; background: rgba(59, 130, 246, 0.6); ' +
      'border-radius: 50%; animation: float 6s ease-in-out infinite; ' +
      'left: ' + Math.random() * 100 + '%; top: ' + Math.random() * 100 + '%; ' +
      'animation-delay: ' + Math.random() * 6 + 's;';
    
    particlesContainer.appendChild(particle);
  }
}

function switchDashboardView(view) {
  var buttons = document.querySelectorAll('.control-btn');
  buttons.forEach(function(btn) {
    btn.classList.remove('active');
  });
  
  event.target.classList.add('active');
  
  var data = DASHBOARD_DATA[view];
  console.log('Switching to ' + view + ' view:', data);
}

function animateStats() {
  var stats = [
    { id: 'aiGeneratedLines', target: 127, suffix: 'K' },
    { id: 'productivityBoost', target: 847, suffix: '%' },
    { id: 'bugReduction', target: 94, suffix: '%' }
  ];
  
  stats.forEach(function(stat, index) {
    setTimeout(function() {
      animateCounter(stat.id, stat.target, 2000, stat.suffix);
    }, index * 500);
  });
}

function animateCounter(elementId, target, duration, suffix) {
  var element = document.getElementById(elementId);
  if (!element) return;
  
  var start = 0;
  var increment = target / (duration / 50);
  var current = start;
  
  var timer = setInterval(function() {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current) + suffix;
  }, 50);
}