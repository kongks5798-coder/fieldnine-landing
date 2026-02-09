'use client';

import * as React from 'react';
import { initWebVitals } from '@/lib/webVitals';

/** ErrorBoundary — catches render crashes, shows recovery UI instead of blank screen */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackLabel?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; fallbackLabel?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <div className="text-3xl">!</div>
          <p className="text-sm text-[#86868b]">
            {this.props.fallbackLabel ?? "Something went wrong"}
          </p>
          <p className="text-xs text-[#86868b]/60 max-w-xs truncate">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-4 py-1.5 text-xs bg-[#0079F2] text-white rounded-lg hover:bg-[#0066cc] transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export { ErrorBoundary };

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    initWebVitals();
    // Register service worker for offline cache
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <ErrorBoundary fallbackLabel="Application error — click Retry to recover">
      {children}
    </ErrorBoundary>
  );
}
