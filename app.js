document.addEventListener('DOMContentLoaded', function() {
  var refreshBtn = document.getElementById('refreshBtn');
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      animateRefresh();
      updateTimestamp();
    });
  }
  
  updateTimestamp();
  
  setInterval(function() {
    updateTimestamp();
  }, appData.refreshInterval);
});