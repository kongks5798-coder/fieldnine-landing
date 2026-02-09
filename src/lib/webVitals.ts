/**
 * Web Vitals performance monitoring.
 * Reports LCP, FID, CLS, TTFB, INP to console in development.
 */

interface Metric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

const thresholds: Record<string, [number, number]> = {
  LCP: [2500, 4000],
  FID: [100, 300],
  CLS: [0.1, 0.25],
  TTFB: [800, 1800],
  INP: [200, 500],
};

function getRating(name: string, value: number): Metric["rating"] {
  const t = thresholds[name];
  if (!t) return "good";
  if (value <= t[0]) return "good";
  if (value <= t[1]) return "needs-improvement";
  return "poor";
}

const ratingColors = { good: "#00B894", "needs-improvement": "#F59E0B", poor: "#EF4444" };

function logMetric(metric: Metric) {
  const color = ratingColors[metric.rating];
  const unit = metric.name === "CLS" ? "" : "ms";
  const val = metric.name === "CLS" ? metric.value.toFixed(3) : Math.round(metric.value);
  console.log(
    `%c[Perf] ${metric.name}: ${val}${unit} (${metric.rating})`,
    `color: ${color}; font-weight: bold;`,
  );
}

/**
 * Initialize Web Vitals monitoring.
 * Uses PerformanceObserver API (no external dependencies).
 */
export function initWebVitals() {
  if (typeof window === "undefined") return;
  if (typeof PerformanceObserver === "undefined") return;

  // LCP (Largest Contentful Paint)
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        const value = last.startTime;
        logMetric({ name: "LCP", value, rating: getRating("LCP", value) });
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  // CLS (Cumulative Layout Shift)
  try {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(entry as any).hadRecentInput) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          clsValue += (entry as any).value ?? 0;
        }
      }
      logMetric({ name: "CLS", value: clsValue, rating: getRating("CLS", clsValue) });
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}

  // FID (First Input Delay)
  try {
    new PerformanceObserver((list) => {
      const entry = list.getEntries()[0];
      if (entry) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (entry as any).processingStart - entry.startTime;
        logMetric({ name: "FID", value, rating: getRating("FID", value) });
      }
    }).observe({ type: "first-input", buffered: true });
  } catch {}

  // TTFB (Time to First Byte)
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      const value = nav.responseStart - nav.requestStart;
      logMetric({ name: "TTFB", value, rating: getRating("TTFB", value) });
    }
  } catch {}
}
