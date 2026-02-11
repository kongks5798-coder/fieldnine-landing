function handleRefresh() {
  updateRefreshButton(true);
  updateLastRefreshTime();
  showNotification('시스템 상태를 새로고침했습니다.');
  
  setTimeout(function() {
    updateRefreshButton(false);
  }, 1000);
}

function initializeApp() {
  var refreshButton = document.getElementById('refreshBtn');
  
  if (refreshButton) {
    refreshButton.addEventListener('click', handleRefresh);
  }
  
  updateLastRefreshTime();
  console.log('Field Nine OS Dashboard initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}