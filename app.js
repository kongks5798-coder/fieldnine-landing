var ANALYTICS_CONFIG = {
  isDemoMode: true,
  realAnalyticsId: 'GA_MEASUREMENT_ID',
  demoData: {
    liveVisitors: 0,
    todayVisits: 0,
    pageViews: 0,
    sessionStart: Date.now()
  },
  messages: {
    demoMode: 'DEMO MODE',
    realMode: 'LIVE DATA',
    loading: 'LOADING...',
    noData: 'NO DATA',
    error: 'ERROR'
  }
};

var DEMO_SIMULATION = {
  baseVisitors: 15,
  visitorsRange: { min: 8, max: 45 },
  dailyVisitsBase: 127,
  dailyIncrement: { min: 1, max: 5 },
  pageViewsMultiplier: 2.3
};

var REAL_ANALYTICS = {
  initialized: false,
  hasGoogleAnalytics: false,
  hasOtherTracker: false,
  lastUpdate: null
};