function simulateDataUpdate() {
  updateServiceResponseTimes();
  
  var connections = Math.floor(Math.random() * 10) + 20;
  var element = document.getElementById('supabase-connections');
  if (element) {
    element.textContent = connections + '개';
  }
  
  var deployments = Math.floor(Math.random() * 5) + 10;
  var deploymentsElement = document.getElementById('vercel-deployments');
  if (deploymentsElement) {
    deploymentsElement.textContent = deployments + '개';
  }
  
  var cacheHit = Math.floor(Math.random() * 5) + 92;
  var cacheElement = document.getElementById('cloudflare-cache');
  if (cacheElement) {
    cacheElement.textContent = cacheHit + '%';
  }
  
  updateGlobalStatus();
}

function handleRefresh() {
  updateRefreshButton(true);
  simulateDataUpdate();
  updateLastRefreshTime();
  showNotification('시스템 상태를 성공적으로 새로고침했습니다.', 'success');
  
  setTimeout(function() {
    updateRefreshButton(false);
  }, 1200);
}

function loadSettings() {
  var autoRefreshToggle = document.getElementById('autoRefreshToggle');
  var refreshInterval = document.getElementById('refreshInterval');
  var themeSelect = document.getElementById('themeSelect');
  
  if (autoRefreshToggle) autoRefreshToggle.checked = settings.autoRefresh;
  if (refreshInterval) refreshInterval.value = settings.refreshInterval;
  if (themeSelect) themeSelect.value = settings.theme;
}

function saveSettings() {
  var autoRefreshToggle = document.getElementById('autoRefreshToggle');
  var refreshInterval = document.getElementById('refreshInterval');
  var themeSelect = document.getElementById('themeSelect');
  
  if (autoRefreshToggle) settings.autoRefresh = autoRefreshToggle.checked;
  if (refreshInterval) settings.refreshInterval = parseInt(refreshInterval.value);
  if (themeSelect) settings.theme = themeSelect.value;
  
  appConfig.autoRefresh = settings.autoRefresh;
  appConfig.refreshInterval = settings.refreshInterval * 1000;
  
  hideSettingsModal();
  showNotification('설정이 저장되었습니다.', 'success');
  
  setupAutoRefresh();
}

function resetSettings() {
  settings.autoRefresh = true;
  settings.refreshInterval = 30;
  settings.theme = 'dark';
  
  loadSettings();
  showNotification('설정이 초기화되었습니다.', 'info');
}

var refreshTimer = null;

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  
  if (appConfig.autoRefresh) {
    refreshTimer = setInterval(function() {
      simulateDataUpdate();
      updateLastRefreshTime();
    }, appConfig.refreshInterval);
  }
}

function initializeApp() {
  var refreshButton = document.getElementById('refreshBtn');
  var settingsButton = document.getElementById('settingsBtn');
  var closeButton = document.getElementById('notificationClose');
  var modalClose = document.getElementById('modalClose');
  var saveSettingsBtn = document.getElementById('saveSettings');
  var resetSettingsBtn = document.getElementById('resetSettings');
  
  if (refreshButton) {
    refreshButton.addEventListener('click', handleRefresh);
  }
  
  if (settingsButton) {
    settingsButton.addEventListener('click', showSettingsModal);
  }
  
  if (closeButton) {
    closeButton.addEventListener('click', hideNotification);
  }
  
  if (modalClose) {
    modalClose.addEventListener('click', hideSettingsModal);
  }
  
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', resetSettings);
  }
  
  var modal = document.getElementById('settingsModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        hideSettingsModal();
      }
    });
  }
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideSettingsModal();
      hideNotification();
    }
  });
  
  simulateDataUpdate();
  updateLastRefreshTime();
  loadSettings();
  setupAutoRefresh();
  updateGlobalStatus();
  
  showNotification('Field Nine OS Dashboard v' + appConfig.version + ' 초기화 완료', 'success');
  
  console.log('🚀 Field Nine OS Dashboard v' + appConfig.version + ' initialized successfully');
  console.log('📊 Services loaded:', Object.keys(serviceData).length);
  console.log('⚙️ Auto-refresh:', appConfig.autoRefresh ? 'enabled (' + (appConfig.refreshInterval / 1000) + 's)' : 'disabled');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}