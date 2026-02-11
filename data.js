var appConfig = {
  version: '1.2.0',
  lastUpdate: null,
  refreshInterval: 30000,
  autoRefresh: true,
  theme: 'dark'
};

var serviceData = {
  github: {
    name: 'GitHub',
    status: 'operational',
    icon: '🐙',
    responseTime: 89,
    lastCommit: '2분 전',
    baseResponseTime: 85
  },
  vercel: {
    name: 'Vercel',
    status: 'operational',
    icon: '▲',
    responseTime: 156,
    deployments: 12,
    lastDeploy: '5분 전',
    baseResponseTime: 150
  },
  supabase: {
    name: 'Supabase',
    status: 'operational',
    icon: '🗄️',
    responseTime: 45,
    connections: 23,
    storage: '2.1 GB',
    baseResponseTime: 40
  },
  cloudflare: {
    name: 'Cloudflare',
    status: 'operational',
    icon: '☁️',
    responseTime: 12,
    requests: '1.2M/일',
    bandwidth: '45.2 GB',
    cacheHit: '94%',
    baseResponseTime: 10
  }
};

var systemMetrics = {
  uptime: 99.95,
  avgResponseTime: 75,
  dailyRequests: '2.4M',
  totalUptime: 99.95
};

var incidents = [];

var settings = {
  autoRefresh: true,
  refreshInterval: 30,
  theme: 'dark',
  notifications: true
};