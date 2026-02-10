// target: app.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Field Nine Platform loaded!');

  const startBtn = document.getElementById('startBtn');
  const analyticsBtn = document.getElementById('analyticsBtn');
  const dashboard = document.getElementById('dashboard');
  const performanceScore = document.getElementById('performanceScore');
  const accuracy = document.getElementById('accuracy');
  const processedTasks = document.getElementById('processedTasks');

  let isAnalyticsVisible = false;
  let simulationInterval = null;

  function animateValue(element, start, end, duration, suffix) {
    if (!element) return;
    const startTime = performance.now();
    const range = end - start;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = start + (range * eased);
      element.textContent = (suffix === '%')
        ? current.toFixed(1) + '%'
        : (Number.isInteger(end) ? Math.round(current).toLocaleString() : current.toFixed(1));
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  function showDashboard() {
    if (!dashboard) return;
    dashboard.classList.add('visible');
    setTimeout(() => {
      animateValue(performanceScore, 0, 98.5, 1200, '');
      animateValue(accuracy, 0, 99.2, 1400, '%');
      animateValue(processedTasks, 0, 1247, 1600, '');
    }, 300);
  }

  function hideDashboard() {
    if (!dashboard) return;
    dashboard.classList.remove('visible');
  }

  function startSimulation() {
    if (simulationInterval) return;
    simulationInterval = setInterval(() => {
      if (!isAnalyticsVisible) return;
      if (performanceScore) {
        const val = parseFloat(performanceScore.textContent) || 98.5;
        const next = Math.max(95, Math.min(100, val + (Math.random() - 0.5) * 0.3));
        performanceScore.textContent = next.toFixed(1);
      }
      if (processedTasks) {
        const val = parseInt(processedTasks.textContent.replace(/,/g, '')) || 1247;
        processedTasks.textContent = (val + Math.floor(Math.random() * 3)).toLocaleString();
      }
    }, 3000);
  }

  function handleStart() {
    if (startBtn) {
      startBtn.style.transform = 'scale(0.95)';
      setTimeout(() => { startBtn.style.transform = ''; }, 150);
    }
    if (!isAnalyticsVisible) {
      isAnalyticsVisible = true;
      showDashboard();
      startSimulation();
      if (analyticsBtn) {
        analyticsBtn.querySelector('span:last-child').textContent = '분석 숨기기';
      }
    }
  }

  function handleAnalytics() {
    isAnalyticsVisible = !isAnalyticsVisible;
    if (isAnalyticsVisible) {
      showDashboard();
      startSimulation();
      if (analyticsBtn) {
        const label = analyticsBtn.querySelector('span:last-child');
        if (label) label.textContent = '분석 숨기기';
      }
    } else {
      hideDashboard();
      if (analyticsBtn) {
        const label = analyticsBtn.querySelector('span:last-child');
        if (label) label.textContent = '분석 보기';
      }
    }
  }

  if (startBtn) {
    startBtn.addEventListener('click', handleStart);
  }
  if (analyticsBtn) {
    analyticsBtn.addEventListener('click', handleAnalytics);
  }

  // Subtle status dot animation
  const statusDot = document.querySelector('.status-dot');
  if (statusDot) {
    setInterval(() => {
      statusDot.style.opacity = '0.4';
      setTimeout(() => { statusDot.style.opacity = '1'; }, 500);
    }, 2000);
  }

  console.log('📦 Files: index.html, style.css, app.js');
  console.log('✅ Ready!');
});
