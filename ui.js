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

function showNotification(message) {
  var notification = document.getElementById('notification');
  var text = document.getElementById('notificationText');
  
  if (notification && text) {
    text.textContent = message;
    notification.classList.add('show');
    
    setTimeout(function() {
      hideNotification();
    }, 3000);
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