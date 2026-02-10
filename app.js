function updateStatus(status, message) {
  var statusDot = document.getElementById('statusDot');
  var statusText = document.getElementById('statusText');
  
  if (statusDot) {
    statusDot.className = 'status-dot ' + status;
  }
  if (statusText) {
    statusText.textContent = message;
  }
}

function createMemoryItem(key, value) {
  var item = document.createElement('div');
  item.className = 'memory-item';
  item.innerHTML = 
    '<div class="memory-key">' + key + '</div>' +
    '<div class="memory-value">' + value + '</div>' +
    '<button class="memory-delete" onclick="deleteMemoryItem(\'' + key + '\')">🗑️</button>';
  return item;
}

function calculateStorageSize() {
  var total = 0;
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.startsWith(MEMORY_CONFIG.prefix)) {
      total += key.length + localStorage.getItem(key).length;
    }
  }
  return Math.round(total / 1024 * 100) / 100;
}

function updateStats(apiCallCount) {
  var totalKeys = 0;
  for (var i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i).startsWith(MEMORY_CONFIG.prefix)) {
      totalKeys++;
    }
  }
  
  var totalKeysEl = document.getElementById('totalKeys');
  var totalSizeEl = document.getElementById('totalSize');
  var apiCallsEl = document.getElementById('apiCalls');
  
  if (totalKeysEl) totalKeysEl.textContent = totalKeys;
  if (totalSizeEl) totalSizeEl.textContent = calculateStorageSize() + 'KB';
  if (apiCallsEl) apiCallsEl.textContent = apiCallCount;
}