function initializeAnalytics() {
  checkAnalyticsAvailability();
  updateAnalyticsDisplay();
  
  if (ANALYTICS_CONFIG.isDemoMode) {
    startDemoSimulation();
  } else {
    startRealAnalytics();
  }
}

function checkAnalyticsAvailability() {
  REAL_ANALYTICS.hasGoogleAnalytics = typeof gtag !== 'undefined' || typeof ga !== 'undefined';
  REAL_ANALYTICS.hasOtherTracker = false;
  REAL_ANALYTICS.initialized = REAL_ANALYTICS.hasGoogleAnalytics || REAL_ANALYTICS.hasOtherTracker;
  
  if (!REAL_ANALYTICS.initialized) {
    console.log('📊 No real analytics detected - using demo mode');
    ANALYTICS_CONFIG.isDemoMode = true;
  }
}

function updateAnalyticsDisplay() {
  var liveVisitors = document.getElementById('liveVisitors');
  var todayVisits = document.getElementById('todayVisits');
  var pageViews = document.getElementById('pageViews');
  var dataStatus = document.getElementById('dataStatus');
  var analyticsStatus = document.getElementById('analyticsStatus');
  var systemStatus = document.getElementById('systemStatus');
  
  if (ANALYTICS_CONFIG.isDemoMode) {
    if (liveVisitors) liveVisitors.innerHTML = '<span class="demo-badge">DEMO</span> ' + ANALYTICS_CONFIG.demoData.liveVisitors;
    if (todayVisits) todayVisits.innerHTML = '<span class="demo-badge">DEMO</span> ' + ANALYTICS_CONFIG.demoData.todayVisits.toLocaleString();
    if (pageViews) pageViews.innerHTML = '<span class="demo-badge">DEMO</span> ' + ANALYTICS_CONFIG.demoData.pageViews.toLocaleString();
    if (dataStatus) dataStatus.textContent = ANALYTICS_CONFIG.messages.demoMode;
    if (analyticsStatus) analyticsStatus.textContent = 'Demo Data Active';
    if (systemStatus) systemStatus.innerHTML = '<span class="status-dot warning"></span>DEMO MODE';
  } else {
    if (dataStatus) dataStatus.textContent = ANALYTICS_CONFIG.messages.realMode;
    if (analyticsStatus) analyticsStatus.textContent = 'Real Analytics Connected';
    if (systemStatus) systemStatus.innerHTML = '<span class="status-dot online"></span>LIVE DATA';
  }
}

function startDemoSimulation() {
  var sessionDuration = Date.now() - ANALYTICS_CONFIG.demoData.sessionStart;
  var minutesElapsed = Math.floor(sessionDuration / (1000 * 60));
  
  ANALYTICS_CONFIG.demoData.liveVisitors = Math.max(1, 
    DEMO_SIMULATION.baseVisitors + Math.floor(Math.random() * 
    (DEMO_SIMULATION.visitorsRange.max - DEMO_SIMULATION.visitorsRange.min)) + 
    DEMO_SIMULATION.visitorsRange.min);
  
  ANALYTICS_CONFIG.demoData.todayVisits = DEMO_SIMULATION.dailyVisitsBase + 
    (minutesElapsed * Math.floor(Math.random() * 
    (DEMO_SIMULATION.dailyIncrement.max - DEMO_SIMULATION.dailyIncrement.min)) + 
    DEMO_SIMULATION.dailyIncrement.min);
  
  ANALYTICS_CONFIG.demoData.pageViews = Math.floor(
    ANALYTICS_CONFIG.demoData.todayVisits * DEMO_SIMULATION.pageViewsMultiplier);
  
  updateAnalyticsDisplay();
  
  setTimeout(startDemoSimulation, 8000);
}

function startRealAnalytics() {
  if (REAL_ANALYTICS.hasGoogleAnalytics) {
    fetchGoogleAnalyticsData();
  }
  
  setInterval(function() {
    if (REAL_ANALYTICS.hasGoogleAnalytics) {
      fetchGoogleAnalyticsData();
    }
  }, 60000);
}

function fetchGoogleAnalyticsData() {
  console.log('📊 Fetching real analytics data...');
  
  var liveVisitors = document.getElementById('liveVisitors');
  var todayVisits = document.getElementById('todayVisits');
  var pageViews = document.getElementById('pageViews');
  
  if (liveVisitors) liveVisitors.textContent = ANALYTICS_CONFIG.messages.loading;
  if (todayVisits) todayVisits.textContent = ANALYTICS_CONFIG.messages.loading;
  if (pageViews) pageViews.textContent = ANALYTICS_CONFIG.messages.loading;
  
  setTimeout(function() {
    if (liveVisitors) liveVisitors.textContent = ANALYTICS_CONFIG.messages.noData;
    if (todayVisits) todayVisits.textContent = ANALYTICS_CONFIG.messages.noData;
    if (pageViews) pageViews.textContent = ANALYTICS_CONFIG.messages.noData;
  }, 3000);
}

function toggleTrafficMonitor() {
  var monitor = document.getElementById('trafficMonitor');
  if (!monitor) return;
  
  monitor.classList.toggle('collapsed');
  
  var title = monitor.classList.contains('collapsed') ? 
    'Click to expand analytics' : 'Real-time traffic monitoring';
  monitor.title = title;
}