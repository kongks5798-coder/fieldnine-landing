document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Button Magic App loaded!');
  
  let totalClicks = 0;
  let currentScore = 0;
  
  const totalClicksEl = document.getElementById('totalClicks');
  const currentScoreEl = document.getElementById('currentScore');
  const logContainer = document.getElementById('logContainer');
  
  const primaryBtn = document.getElementById('primaryBtn');
  const secondaryBtn = document.getElementById('secondaryBtn');
  const successBtn = document.getElementById('successBtn');
  const warningBtn = document.getElementById('warningBtn');
  const dangerBtn = document.getElementById('dangerBtn');
  const magicBtn = document.getElementById('magicBtn');
  
  const buttonActions = {
    primary: { name: 'Launch', emoji: '🚀', points: 10, message: '로켓이 발사되었습니다!' },
    secondary: { name: 'Power Up', emoji: '⚡', points: 15, message: '에너지가 충전되었습니다!' },
    success: { name: 'Success', emoji: '✅', points: 20, message: '성공적으로 완료되었습니다!' },
    warning: { name: 'Warning', emoji: '⚠️', points: 5, message: '경고 신호가 활성화되었습니다!' },
    danger: { name: 'Explode', emoji: '💥', points: 25, message: '폭발 효과가 발동되었습니다!' },
    magic: { name: 'Magic', emoji: '🌈', points: 50, message: '마법이 시전되었습니다!' }
  };
  
  function updateStats() {
    if (totalClicksEl) totalClicksEl.textContent = totalClicks;
    if (currentScoreEl) currentScoreEl.textContent = currentScore;
  }
  
  function addLogEntry(message, emoji) {
    if (!logContainer) return;
    
    const logItem = document.createElement('p');
    logItem.className = 'log-item';
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    logItem.innerHTML = `${emoji} ${message} <span style="color: #64748b; font-size: 12px;">[${timestamp}]</span>`;
    
    logContainer.insertBefore(logItem, logContainer.firstChild);
    
    // Keep only last 10 entries
    const logItems = logContainer.querySelectorAll('.log-item');
    if (logItems.length > 10) {
      logItems[logItems.length - 1].remove();
    }
  }
  
  function handleButtonClick(actionKey) {
    const action = buttonActions[actionKey];
    if (!action) return;
    
    totalClicks++;
    currentScore += action.points;
    updateStats();
    
    addLogEntry(action.message, action.emoji);
    
    // Add screen shake effect for explosion
    if (actionKey === 'danger') {
      document.body.style.animation = 'shake 0.5s ease-in-out';
      setTimeout(() => {
        document.body.style.animation = '';
      }, 500);
    }
    
    // Change background color briefly for magic button
    if (actionKey === 'magic') {
      const originalBg = document.body.style.background;
      document.body.style.background = 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff80, #0080ff, #8000ff)';
      setTimeout(() => {
        document.body.style.background = originalBg || 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)';
      }, 1000);
    }
    
    // Create floating score animation
    createFloatingScore(action.points, action.emoji);
  }
  
  function createFloatingScore(points, emoji) {
    const floatingEl = document.createElement('div');
    floatingEl.textContent = `+${points} ${emoji}`;
    floatingEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
      pointer-events: none;
      z-index: 1000;
      animation: floatUp 2s ease-out forwards;
    `;
    
    document.body.appendChild(floatingEl);
    
    setTimeout(() => {
      if (floatingEl.parentNode) {
        floatingEl.parentNode.removeChild(floatingEl);
      }
    }, 2000);
  }
  
  // Add CSS for floating animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatUp {
      0% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -150px) scale(1.2);
      }
    }
  `;
  document.head.appendChild(style);
  
  // Event listeners
  if (primaryBtn) primaryBtn.addEventListener('click', () => handleButtonClick('primary'));
  if (secondaryBtn) secondaryBtn.addEventListener('click', () => handleButtonClick('secondary'));
  if (successBtn) successBtn.addEventListener('click', () => handleButtonClick('success'));
  if (warningBtn) warningBtn.addEventListener('click', () => handleButtonClick('warning'));
  if (dangerBtn) dangerBtn.addEventListener('click', () => handleButtonClick('danger'));
  if (magicBtn) magicBtn.addEventListener('click', () => handleButtonClick('magic'));
  
  // Initialize stats
  updateStats();
  
  // Welcome message
  setTimeout(() => {
    addLogEntry('버튼들을 클릭해서 점수를 모아보세요!', '🎯');
  }, 1000);
});