function simulateDataUpdate() {
  serviceData.github.responseTime = Math.floor(Math.random() * 50) + 70;
  serviceData.vercel.responseTime = Math.floor(Math.random() * 100) + 120;
  serviceData.supabase.responseTime = Math.floor(Math.random() * 30) + 30;
  serviceData.cloudflare.responseTime = Math.floor(Math.random() * 20) + 5;
  
  var githubResponse = document.getElementById('github-response');
  var vercelResponse = document.getElementById('vercel-response');
  var supabaseResponse = document.getElementById('supabase-response');
  var cloudflareResponse = document.getElementById('cloudflare-response');
  
  if (githubResponse) githubResponse.textContent = serviceData.github.responseTime + 'ms';
  if (vercelResponse) vercelResponse.textContent = serviceData.vercel.responseTime + 'ms';
  if (supabaseResponse) supabaseResponse.textContent = serviceData.supabase.responseTime + 'ms';
  if (cloudflareResponse) cloudflareResponse.textContent = serviceData.cloudflare.responseTime + 'ms';
}

function handleRefresh() {
  updateRefreshButton(true);
  simulateDataUpdate();
  updateLastRefreshTime();
  showNotification('시스템 상태를 새로고침했습니다.');
  
  setTimeout(function() {
    updateRefreshButton(false);
  }, 1000);
}

function initializeApp() {
  var refreshButton = document.getElementById('refreshBtn');
  var closeButton = document.getElementById('notificationClose');
  
  if (refreshButton) {
    refreshButton.addEventListener('click', handleRefresh);
  }
  
  if (closeButton) {
    closeButton.addEventListener('click', hideNotification);
  }
  
  updateLastRefreshTime();
  
  if (appConfig.autoRefresh) {
    setInterval(function() {
      simulateDataUpdate();
      updateLastRefreshTime();
    }, appConfig.refreshInterval);
  }
  
  console.log('Field Nine OS Dashboard v' + appConfig.version + ' initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}