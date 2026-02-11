// === Infrastructure Dashboard Configuration ===
window.INFRA_CONFIG = {
  apiUrl: '/api/infra-status',
  refreshIntervalMs: 60000,
  states: {
    ok:      { label: 'Operational', cls: 'ok' },
    warn:    { label: 'Degraded',    cls: 'warn' },
    error:   { label: 'Down',        cls: 'error' },
    offline: { label: 'Offline',     cls: 'offline' }
  }
};