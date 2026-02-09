"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-[var(--r-bg)] px-6 py-12 text-center">
          <AlertCircle size={36} className="text-[#f87171] mb-4" />
          <h2 className="text-[16px] font-semibold text-[var(--r-text)] mb-2">
            {this.props.fallbackMessage ?? "Something went wrong"}
          </h2>
          <p className="text-[12px] text-[var(--r-text-secondary)] mb-4 max-w-md">
            {this.state.error?.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 bg-[#0079f2] text-white text-[13px] font-semibold rounded-xl hover:bg-[#0066cc] transition-colors"
          >
            <RotateCcw size={14} />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
