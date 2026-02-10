function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createCard(emoji, title, description) {
  var card = document.createElement('div');
  card.className = 'card';
  
  var time = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  card.innerHTML = 
    '<div class="card-emoji">' + emoji + '</div>' +
    '<h3>' + title + '</h3>' +
    '<p>' + description + '</p>' +
    '<div class="card-time">' + time + '에 생성됨</div>' +
    '<div class="card-status"></div>';
  
  return card;
}

function updateCounterDisplay(countEl, cardCountEl, clickCount, cardCount) {
  if (countEl) countEl.textContent = clickCount;
  if (cardCountEl) cardCountEl.textContent = cardCount;
}

function updateBackgroundGradient(count) {
  var hue1 = (count * 15) % 360;
  var hue2 = (hue1 + 60) % 360;
  var gradient = 'linear-gradient(135deg, hsl(' + hue1 + ', 25%, 5%) 0%, hsl(' + hue2 + ', 20%, 10%) 100%)';
  document.body.style.background = gradient;
}

function showNotification(type, title, message, duration) {
  duration = duration || 5000;
  
  var container = document.getElementById('notificationContainer');
  if (!container) return;
  
  var notification = document.createElement('div');
  notification.className = 'notification ' + type;
  
  var icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  notification.innerHTML = 
    '<div class="notification-icon">' + (icons[type] || '📢') + '</div>' +
    '<div class="notification-content">' +
      '<div class="notification-title">' + title + '</div>' +
      '<div class="notification-message">' + message + '</div>' +
    '</div>' +
    '<button class="notification-close">×</button>';
  
  container.appendChild(notification);
  
  // 닫기 버튼 이벤트
  var closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      removeNotification(notification);
    });
  }
  
  // 자동 제거
  setTimeout(function() {
    removeNotification(notification);
  }, duration);
  
  return notification;
}

function removeNotification(notification) {
  if (notification && notification.parentNode) {
    notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
    setTimeout(function() {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }
}

function showErrorModal(message, details) {
  var modal = document.getElementById('errorModal');
  var errorMessage = document.getElementById('errorMessage');
  var errorDetails = document.getElementById('errorDetails');
  
  if (modal && errorMessage) {
    errorMessage.textContent = message;
    if (errorDetails && details) {
      errorDetails.textContent = details;
      errorDetails.style.display = 'block';
    } else if (errorDetails) {
      errorDetails.style.display = 'none';
    }
    modal.classList.add('show');
  }
}

function hideErrorModal() {
  var modal = document.getElementById('errorModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function setButtonLoading(button, loading) {
  if (!button) return;
  
  if (loading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

function updateSystemStatus(status, text) {
  var indicator = document.getElementById('statusIndicator');
  var statusText = document.querySelector('.status-text');
  var statusIcon = document.querySelector('.status-icon');
  
  if (indicator) {
    indicator.className = 'status-indicator ' + status;
  }
  
  if (statusText) {
    statusText.textContent = text;
  }
  
  if (statusIcon) {
    var icons = {
      ready: '✅',
      error: '❌',
      loading: '🔄'
    };
    statusIcon.textContent = icons[status] || '🔄';
  }
}

function showCounterStatus(elementId, status) {
  var statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.className = 'counter-status ' + status;
    setTimeout(function() {
      statusEl.className = 'counter-status';
    }, 1000);
  }
}

function showSectionStatus(text, status) {
  var sectionStatus = document.getElementById('sectionStatus');
  if (sectionStatus) {
    var spinner = sectionStatus.querySelector('.loading-spinner');
    var textEl = sectionStatus.querySelector('span') || sectionStatus;
    
    sectionStatus.className = 'section-status show';
    if (status) {
      sectionStatus.classList.add(status);
    }
    
    if (spinner) {
      spinner.style.display = status === 'loading' ? 'block' : 'none';
    }
    
    if (textEl) {
      textEl.textContent = text;
    }
    
    setTimeout(function() {
      sectionStatus.classList.remove('show');
    }, 3000);
  }
}