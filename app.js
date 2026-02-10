document.addEventListener('DOMContentLoaded', function() {
  var apiCallCount = 0;
  var keyInput = document.getElementById('keyInput');
  var valueInput = document.getElementById('valueInput');
  var saveBtn = document.getElementById('saveBtn');
  var loadBtn = document.getElementById('loadBtn');
  var clearBtn = document.getElementById('clearBtn');
  var memoryList = document.getElementById('memoryList');

  function incrementApiCalls() {
    apiCallCount++;
    updateStats(apiCallCount);
  }

  function saveMemory() {
    var key = keyInput ? keyInput.value.trim() : '';
    var value = valueInput ? valueInput.value.trim() : '';
    
    if (!key || !value) {
      alert('키와 값을 모두 입력해주세요!');
      return;
    }

    updateStatus('loading', API_MESSAGES.saving);
    incrementApiCalls();

    setTimeout(function() {
      try {
        localStorage.setItem(MEMORY_CONFIG.prefix + key, value);
        updateStatus('online', API_MESSAGES.success);
        if (keyInput) keyInput.value = '';
        if (valueInput) valueInput.value = '';
        refreshMemoryList();
      } catch (e) {
        updateStatus('error', API_MESSAGES.error);
      }
    }, 500);
  }

  function loadMemory() {
    var key = keyInput ? keyInput.value.trim() : '';
    if (!key) {
      alert('불러올 키를 입력해주세요!');
      return;
    }

    updateStatus('loading', API_MESSAGES.loading);
    incrementApiCalls();

    setTimeout(function() {
      var value = localStorage.getItem(MEMORY_CONFIG.prefix + key);
      if (value && valueInput) {
        valueInput.value = value;
        updateStatus('online', API_MESSAGES.success);
      } else {
        updateStatus('error', '키를 찾을 수 없음');
      }
    }, 300);
  }

  function clearAllMemory() {
    if (!confirm('모든 메모리 데이터를 삭제하시겠습니까?')) return;
    
    updateStatus('loading', '삭제중...');
    incrementApiCalls();

    setTimeout(function() {
      var keysToDelete = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith(MEMORY_CONFIG.prefix)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(function(key) {
        localStorage.removeItem(key);
      });
      
      updateStatus('online', API_MESSAGES.cleared);
      refreshMemoryList();
    }, 800);
  }

  function refreshMemoryList() {
    if (!memoryList) return;
    
    memoryList.innerHTML = '';
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key.startsWith(MEMORY_CONFIG.prefix)) {
        var displayKey = key.replace(MEMORY_CONFIG.prefix, '');
        var value = localStorage.getItem(key);
        memoryList.appendChild(createMemoryItem(displayKey, value));
      }
    }
    updateStats(apiCallCount);
  }

  window.deleteMemoryItem = function(key) {
    localStorage.removeItem(MEMORY_CONFIG.prefix + key);
    incrementApiCalls();
    refreshMemoryList();
    updateStatus('online', '항목 삭제됨');
  };

  if (saveBtn) saveBtn.addEventListener('click', saveMemory);
  if (loadBtn) loadBtn.addEventListener('click', loadMemory);
  if (clearBtn) clearBtn.addEventListener('click', clearAllMemory);

  updateStatus('online', API_MESSAGES.ready);
  refreshMemoryList();
  
  for (var i = 0; i < 2; i++) {
    localStorage.setItem(
      MEMORY_CONFIG.prefix + MEMORY_CONFIG.testKeys[i], 
      MEMORY_CONFIG.testValues[i]
    );
  }
  refreshMemoryList();
});