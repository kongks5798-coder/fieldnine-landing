"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import ErrorBoundary from "./ErrorBoundary";
import ReplitApp from "./ReplitApp";

const LiveEditor = dynamic(() => import("./LiveEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-screen bg-[#0e1525] flex items-center justify-center">
      <div className="text-[#5c6b8a] text-sm animate-pulse">Loading IDE...</div>
    </div>
  ),
});

type AppView = "dashboard" | "ide";

export default function LiveEditorWrapper() {
  const [view, setView] = useState<AppView>("dashboard");
  const [prompt, setPrompt] = useState<string | undefined>(undefined);
  const [projectSlug, setProjectSlug] = useState<string | null>(null);

  const handleStartProject = useCallback((userPrompt: string, slug: string) => {
    setPrompt(userPrompt);
    setProjectSlug(slug);
    setView("ide");
  }, []);

  const handleOpenProject = useCallback((slug?: string) => {
    setPrompt(undefined);
    setProjectSlug(slug ?? null);
    setView("ide");
  }, []);

  const [refreshKey, setRefreshKey] = useState(0);

  const handleGoHome = useCallback(() => {
    setView("dashboard");
    setPrompt(undefined);
    setProjectSlug(null);
    setRefreshKey((k) => k + 1);
  }, []);

  if (view === "ide") {
    return (
      <ErrorBoundary fallbackMessage="IDE에서 오류가 발생했습니다">
        <LiveEditor
          initialPrompt={prompt}
          projectSlug={projectSlug}
          onGoHome={handleGoHome}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallbackMessage="대시보드에서 오류가 발생했습니다">
      <ReplitApp
        onStartProject={handleStartProject}
        onOpenProject={handleOpenProject}
        currentView="dashboard"
        refreshKey={refreshKey}
      />
    </ErrorBoundary>
  );
}
