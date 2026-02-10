/* target: app.js */
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Field Nine Platform: System Initialized');

  // UI Elements
  const loadingOverlay = document.getElementById('loadingOverlay');
  const mainApp = document.getElementById('mainApp');
  const startBtn = document.getElementById('startDevelopmentBtn');
  
  // 1. Loading Sequence
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 30;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      setTimeout(() => {
        if(loadingOverlay) loadingOverlay.classList.add('hidden');
        if(mainApp) mainApp.classList.add('loaded');
      }, 500);
    }
    const fill = document.getElementById('loadingProgress');
    const text = document.getElementById('loadingPercent');
    if(fill) fill.style.width = `${progress}%`;
    if(text) text.textContent = `${Math.round(progress)}%`;
  }, 200);

  // 2. LocalStorage Security Fix (에러 방지용 예외 처리)
  const safeStorage = {
    getItem: (key) => {
      try { return localStorage.getItem(key); } 
      catch (e) { return null; }
    },
    setItem: (key, value) => {
      try { localStorage.setItem(key, value); } 
      catch (e) { console.warn('Storage Access Denied'); }
    }
  };

  // 3. Interaction Logic
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      alert('Field Nine AI 엔진을 가동합니다!');
      console.log('Engine Started');
    });
  }
});