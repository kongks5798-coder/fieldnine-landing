"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
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

  const handleGoHome = useCallback(() => {
    setView("dashboard");
    setPrompt(undefined);
    setProjectSlug(null);
  }, []);

  if (view === "ide") {
    return (
      <LiveEditor
        initialPrompt={prompt}
        projectSlug={projectSlug}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <ReplitApp
      onStartProject={handleStartProject}
      onOpenProject={handleOpenProject}
      currentView="dashboard"
    />
  );
}
