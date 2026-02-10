var FIELDNINE_SYSTEM = {
  mainHost: 'fieldnine.io',
  protocol: 'https',
  services: {
    api: 'api.fieldnine.io',
    cdn: 'cdn.fieldnine.io',
    docs: 'docs.fieldnine.io',
    community: 'community.fieldnine.io',
    status: 'status.fieldnine.io'
  },
  traffic: {
    realTimeVisitors: 247,
    todayVisits: 3842,
    responseTime: 23,
    activeSessions: 189,
    chartData: [60, 40, 80, 90, 70, 85, 95, 100]
  },
  monitoring: {
    updateInterval: 5000,
    chartUpdateInterval: 30000,
    maxVisitors: 500,
    alertThreshold: 1000
  }
};

var TRAFFIC_SIMULATION = {
  baseVisitors: 247,
  visitorsRange: { min: 180, max: 520 },
  responseTimeRange: { min: 18, max: 45 },
  sessionsRange: { min: 150, max: 300 },
  dailyVisitsIncrement: { min: 1, max: 8 }
};

var UI_MESSAGES = {
  systemOnline: 'All Systems Operational',
  systemMaintenance: 'Maintenance Mode',
  systemOffline: 'System Offline',
  trafficHigh: 'High Traffic Alert',
  monitorCollapsed: 'Click to expand monitor',
  monitorExpanded: 'Global Traffic Monitor Active'
};