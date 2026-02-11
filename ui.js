function updateTimestamp() {
  var element = document.getElementById('lastUpdated');
  if (element) {
    element.textContent = 'Last updated: ' + new Date().toLocaleTimeString('ko-KR');
  }
}

function animateRefresh() {
  var button = document.getElementById('refreshBtn');
  if (button) {
    button.classList.add('spinning');
    setTimeout(function() {
      button.classList.remove('spinning');
    }, 1000);
  }
}