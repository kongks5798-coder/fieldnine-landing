'use client';

import { useState, useEffect, useCallback } from 'react';

export type VercelState = 'idle' | 'building' | 'ready' | 'error';

export interface DeployInfo {
  state: VercelState;
  url: string | null;
  createdAt: number | null;
  commitSha: string | null;
  error: string | null;
}

const INITIAL_DEPLOY_INFO: DeployInfo = {
  state: 'idle',
  url: null,
  createdAt: null,
  commitSha: null,
  error: null,
};

interface UseDeployStatusOptions {
  projectId?: string;
  token?: string;
  pollInterval?: number;
}

export default function useDeployStatus(options: UseDeployStatusOptions = {}) {
  const { projectId, token, pollInterval = 10000 } = options;
  const [deploy, setDeploy] = useState<DeployInfo>(INITIAL_DEPLOY_INFO);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!projectId || !token) return;

    setLoading(true);
    try {
      const res = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`Vercel API ${res.status}`);

      const json = await res.json();
      const data = json.deployments?.[0];
      if (!data) return;

      const stateMap: Record<string, VercelState> = {
        BUILDING: 'building',
        READY: 'ready',
        ERROR: 'error',
        CANCELED: 'error',
      };

      setDeploy({
        state: stateMap[data.state] ?? 'idle',
        url: data.url ? `https://${data.url}` : null,
        createdAt: data.createdAt ?? null,
        commitSha: data.meta?.githubCommitSha ?? null,
        error: data.state === 'ERROR' ? (data.errorMessage ?? 'Build failed') : null,
      });
    } catch (err) {
      setDeploy((prev) => ({
        ...prev,
        state: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    } finally {
      setLoading(false);
    }
  }, [projectId, token]);

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(iv);
  }, [fetchStatus, pollInterval]);

  return { deploy, loading, refresh: fetchStatus };
}
