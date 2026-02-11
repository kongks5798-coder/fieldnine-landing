// === Infrastructure Dashboard Entry Point ===
document.addEventListener('DOMContentLoaded', function() {
  var refreshBtn = document.getElementById('refreshBtn');
  var globalDot = document.getElementById('globalDot');
  var lastUpdated = document.getElementById('lastUpdated');
  var bodyGH = document.getElementById('body-github');
  var bodyVC = document.getElementById('body-vercel');
  var bodySB = document.getElementById('body-supabase');
  var badgeGH = document.getElementById('badge-github');
  var badgeVC = document.getElementById('badge-vercel');
  var badgeSB = document.getElementById('badge-supabase');
  var commitsList = document.getElementById('commitsList');
  var timer = null;

  function fetchStatus() {
    if (refreshBtn) refreshBtn.classList.add('spinning');

    fetch(window.INFRA_CONFIG ? window.INFRA_CONFIG.apiUrl : '/api/infra-status')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        if (data.error) {
          showError(data.error);
          return;
        }

        // GitHub
        var ghState = data.github && data.github.connected ? 'ok' : 'error';
        if (badgeGH) window.setBadge(badgeGH, ghState);
        if (bodyGH) {
          bodyGH.innerHTML = window.renderGitHubCard(data.github);
          bodyGH.classList.add('fade-in');
        }

        // Vercel
        var vcState = 'error';
        if (data.vercel && data.vercel.connected) {
          vcState = data.vercel.status === 'READY' ? 'ok' : data.vercel.status === 'BUILDING' ? 'warn' : 'ok';
        }
        if (badgeVC) window.setBadge(badgeVC, vcState);
        if (bodyVC) {
          bodyVC.innerHTML = window.renderVercelCard(data.vercel);
          bodyVC.classList.add('fade-in');
        }

        // Supabase
        var sbState = data.supabase && data.supabase.connected ? 'ok' : 'error';
        if (data.supabase && data.supabase.connected && data.supabase.responseMs > 1000) sbState = 'warn';
        if (badgeSB) window.setBadge(badgeSB, sbState);
        if (bodySB) {
          bodySB.innerHTML = window.renderSupabaseCard(data.supabase);
          bodySB.classList.add('fade-in');
        }

        // Global dot
        var states = [ghState, vcState, sbState];
        var globalState = 'ok';
        if (states.indexOf('error') !== -1) globalState = 'error';
        else if (states.indexOf('warn') !== -1) globalState = 'warn';
        if (globalDot) globalDot.className = 'global-dot ' + globalState;

        // Commits
        if (commitsList && data.github && data.github.recentCommits) {
          commitsList.innerHTML = window.renderCommitsList(data.github.recentCommits);
          commitsList.classList.add('fade-in');
        }

        // Timestamp
        if (lastUpdated && data.timestamp) {
          lastUpdated.textContent = 'Updated ' + new Date(data.timestamp).toLocaleTimeString('ko-KR');
        }

        // Remove skeleton
        var skeletons = document.querySelectorAll('.skeleton-card');
        for (var i = 0; i < skeletons.length; i++) {
          skeletons[i].classList.remove('skeleton-card');
        }
      })
      .catch(function(err) {
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        showError('Connection failed: ' + err.message);
      });
  }

  function showError(msg) {
    if (globalDot) globalDot.className = 'global-dot error';
    if (lastUpdated) lastUpdated.textContent = msg;
    if (badgeGH) window.setBadge(badgeGH, 'offline');
    if (badgeVC) window.setBadge(badgeVC, 'offline');
    if (badgeSB) window.setBadge(badgeSB, 'offline');
  }

  // Manual refresh
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      fetchStatus();
    });
  }

  // Initial fetch
  fetchStatus();

  // Auto-refresh (guard against missing config)
  var interval = window.INFRA_CONFIG ? window.INFRA_CONFIG.refreshIntervalMs : 60000;
  timer = setInterval(fetchStatus, interval);

  console.log('Field Nine OS: Infrastructure Dashboard loaded');
});