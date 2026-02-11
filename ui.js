function updateRefreshButton(isRefreshing) {
  var button = document.getElementById('refreshBtn');
  if (!button) return;
  
  if (isRefreshing) {
    button.classList.add('spinning');
    button.disabled = true;
  } else {
    button.classList.remove('spinning');
    button.disabled = false;
  }
}

function showNotification(message, type) {
  var notification = document.getElementById('notification');
  var text = document.getElementById('notificationText');
  var icon = document.getElementById('notification').querySelector('.notification-icon');
  
  if (notification && text) {
    text.textContent = message;
    
    if (type === 'success') {
      icon.textContent = '✅';
    } else if (type === 'warning') {
      icon.textContent = '⚠️';
    } else if (type === 'error') {
      icon.textContent = '❌';
    } else {
      icon.textContent = 'ℹ️';
    }
    
    notification.classList.add('show');
    
    setTimeout(function() {
      hideNotification();
    }, 4000);
  }
}

function hideNotification() {
  var notification = document.getElementById('notification');
  if (notification) {
    notification.classList.remove('show');
  }
}

function updateLastRefreshTime() {
  var element = document.getElementById('lastUpdated');
  if (element) {
    var now = new Date();
    element.textContent = '마지막 업데이트: ' + now.toLocaleTimeString('ko-KR');
    appConfig.lastUpdate = now;
  }
}

function updateServiceResponseTimes() {
  Object.keys(serviceData).forEach(function(serviceKey) {
    var service = serviceData[serviceKey];
    var variation = Math.floor(Math.random() * 20) - 10;
    service.responseTime = Math.max(1, service.baseResponseTime + variation);
    
    var element = document.getElementById(serviceKey + '-response');
    if (element) {
      element.textContent = service.responseTime + 'ms';
    }
  });
  
  var totalResponse = Object.values(serviceData).reduce(function(sum, service) {
    return sum + service.responseTime;
  }, 0);
  systemMetrics.avgResponseTime = Math.round(totalResponse / Object.keys(serviceData).length);
  
  var avgElement = document.getElementById('responseValue');
  if (avgElement) {
    avgElement.textContent = systemMetrics.avgResponseTime + 'ms';
  }
}

function showSettingsModal() {
  var modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function hideSettingsModal() {
  var modal = document.getElementById('settingsModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

function updateGlobalStatus() {
  var allOperational = Object.values(serviceData).every(function(service) {
    return service.status === 'operational';
  });
  
  var statusDot = document.getElementById('globalStatus');
  var statusText = document.getElementById('statusText');
  
  if (statusDot && statusText) {
    if (allOperational) {
      statusDot.className = 'global-dot ok';
      statusText.textContent = '모든 시스템 정상';
    } else {
      statusDot.className = 'global-dot warn';
      statusText.textContent = '일부 시스템 확인 필요';
    }
  }
}