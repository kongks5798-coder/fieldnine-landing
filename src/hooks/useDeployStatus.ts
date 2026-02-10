"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeployState = "idle" | "building" | "ready" | "error";

interface DeployInfo {
  status: DeployState;
  url: string | null;
  commitMessage: string | null;
}

/**
 * Polls /api/deploy-status at a configurable interval.
 * Provides real-time deploy badge state: idle → building → ready.
 */
export function useDeployStatus(enabled: boolean = true) {
  const [deploy, setDeploy] = useState<DeployInfo>({
    status: "idle",
    url: null,
    commitMessage: null,
  });
  const [polling, setPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/deploy-status");
      if (!res.ok) return;
      const data = await res.json();

      setDeploy({
        status: data.status ?? "idle",
        url: data.url ?? null,
        commitMessage: data.meta?.githubCommitMessage ?? null,
      });

      // If we were building and it's now ready, stop fast polling
      if (data.status === "ready" || data.status === "error") {
        pollCountRef.current = 0;
      }
    } catch {
      // silent fail
    }
  }, []);

  /** Start fast polling (every 3s) after a commit is pushed. Stops after 2 minutes or when ready. */
  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    pollCountRef.current = 0;
    setPolling(true);
    setDeploy((prev) => ({ ...prev, status: "building" }));

    intervalRef.current = setInterval(async () => {
      pollCountRef.current++;
      await fetchStatus();

      // Stop polling after 40 attempts (2 min) or when deployment is done
      if (pollCountRef.current >= 40) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPolling(false);
      }
    }, 3000);
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPolling(false);
  }, []);

  // Auto-stop when status becomes ready; auto-clear error after 10s
  useEffect(() => {
    if (deploy.status === "ready" && polling) {
      setTimeout(() => stopPolling(), 5000);
    }
    if (deploy.status === "error") {
      // Auto-clear error badge after 10 seconds → idle
      const timer = setTimeout(() => {
        setDeploy((prev) => prev.status === "error" ? { ...prev, status: "idle" } : prev);
        stopPolling();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [deploy.status, polling, stopPolling]);

  // Initial fetch on mount
  useEffect(() => {
    if (!enabled) return;
    const id = setTimeout(() => fetchStatus(), 0);
    return () => clearTimeout(id);
  }, [enabled, fetchStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    deployState: deploy.status,
    deployUrl: deploy.url,
    commitMessage: deploy.commitMessage,
    isPolling: polling,
    startPolling,
    stopPolling,
    refresh: fetchStatus,
  };
}
