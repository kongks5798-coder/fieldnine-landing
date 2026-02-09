'use client';

import * as React from 'react';
import { initWebVitals } from '@/lib/webVitals';

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    initWebVitals();
    // Register service worker for offline cache
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return <>{children}</>;
}
