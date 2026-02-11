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
  console.log('Notification:', message);
}

function updateLastRefreshTime() {
  appConfig.lastUpdate = new Date();
  console.log('Last updated:', appConfig.lastUpdate.toLocaleString('ko-KR'));
}