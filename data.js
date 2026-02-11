var appConfig = {
  version: '1.0.0',
  lastUpdate: null,
  refreshInterval: 30000,
  autoRefresh: true
};

var serviceData = {
  github: {
    name: 'GitHub',
    status: 'operational',
    icon: '🐙',
    responseTime: 89,
    lastCommit: '2분 전'
  },
  vercel: {
    name: 'Vercel',
    status: 'operational',
    icon: '▲',
    responseTime: 156,
    deployments: 12,
    lastDeploy: '5분 전'
  },
  supabase: {
    name: 'Supabase',
    status: 'operational',
    icon: '🗄️',
    responseTime: 45,
    connections: 23,
    storage: '2.1 GB'
  },
  cloudflare: {
    name: 'Cloudflare',
    status: 'operational',
    icon: '☁️',
    responseTime: 12,
    requests: '1.2M/일',
    bandwidth: '45.2 GB',
    cacheHit: '94%'
  }
};

var systemMetrics = {
  uptime: 99.9,
  avgResponseTime: 142,
  dailyRequests: '2.4M'
};