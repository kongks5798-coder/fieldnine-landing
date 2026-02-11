// === UI Helper Functions ===

window.timeAgo = function(dateStr) {
  var diff = Date.now() - new Date(dateStr).getTime();
  var sec = Math.floor(diff / 1000);
  if (sec < 60) return sec + 's ago';
  var min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ago';
  var hr = Math.floor(min / 60);
  if (hr < 24) return hr + 'h ago';
  var d = Math.floor(hr / 24);
  return d + 'd ago';
};

window.formatDuration = function(ms) {
  if (!ms) return '-';
  var sec = Math.round(ms / 1000);
  if (sec < 60) return sec + 's';
  return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
};

window.setBadge = function(el, state) {
  var cfg = window.INFRA_CONFIG.states[state] || window.INFRA_CONFIG.states.offline;
  el.textContent = cfg.label;
  el.className = 'service-badge ' + cfg.cls;
};

window.renderGitHubCard = function(gh) {
  if (!gh || !gh.connected) {
    return '<div class="error-msg">' + (gh && gh.error ? gh.error : 'Not connected') + '</div>';
  }
  return '<div class="stat-row"><span class="stat-label">Repository</span><span class="stat-value mono">' + gh.repo + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Branch</span><span class="stat-value">' + gh.branch + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Last commit</span><span class="stat-value">' +
    (gh.recentCommits && gh.recentCommits[0] ? window.timeAgo(gh.recentCommits[0].date) : '-') + '</span></div>';
};

window.renderVercelCard = function(vc) {
  if (!vc || !vc.connected) {
    return '<div class="error-msg">' + (vc && vc.error ? vc.error : 'Not connected') + '</div>';
  }
  var statusText = vc.status || 'unknown';
  return '<div class="stat-row"><span class="stat-label">Status</span><span class="stat-value">' + statusText + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Build time</span><span class="stat-value">' + window.formatDuration(vc.buildDuration) + '</span></div>' +
    '<div class="stat-row"><span class="stat-label">Commit</span><span class="stat-value mono">' + (vc.commitSha || '-') + '</span></div>' +
    (vc.commitMessage ? '<div class="stat-row"><span class="stat-label">Message</span><span class="stat-value">' + vc.commitMessage.slice(0, 40) + '</span></div>' : '');
};

window.renderSupabaseCard = function(sb) {
  if (!sb || !sb.connected) {
    return '<div class="error-msg">' + (sb && sb.error ? sb.error : 'Not connected') + '</div>';
  }
  return '<div class="stat-row"><span class="stat-label">Response</span><span class="stat-value">' + sb.responseMs + 'ms</span></div>' +
    '<div class="stat-row"><span class="stat-label">Tables</span><span class="stat-value">' + sb.tablesCount + '</span></div>';
};

window.renderCommitsList = function(commits) {
  if (!commits || commits.length === 0) return '<div class="error-msg">No commits available</div>';
  return commits.map(function(c) {
    return '<div class="commit-item">' +
      '<div class="commit-msg">' + c.message + '</div>' +
      '<div class="commit-meta"><span class="commit-sha">' + c.sha + '</span> by ' + c.author + ' — ' + window.timeAgo(c.date) + '</div>' +
    '</div>';
  }).join('');
};