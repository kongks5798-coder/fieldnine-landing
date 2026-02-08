'use client';

import React, { useEffect, useState } from 'react';

export type StageStatus = 'pending' | 'active' | 'completed' | 'error';

export interface PipelineStage {
  label: string;
  status: StageStatus;
}

export interface PipelineState {
  stages: [PipelineStage, PipelineStage, PipelineStage, PipelineStage];
  commitSha: string | null;
  commitMessage: string | null;
  buildStartedAt: number | null;
  deployUrl: string | null;
}

export const INITIAL_PIPELINE: PipelineState = {
  stages: [
    { label: 'Code Changed', status: 'pending' },
    { label: 'Committing', status: 'pending' },
    { label: 'Building', status: 'pending' },
    { label: 'Deployed', status: 'pending' },
  ],
  commitSha: null,
  commitMessage: null,
  buildStartedAt: null,
  deployUrl: null,
};

function StageNode({ stage }: { stage: PipelineStage }) {
  const base = 'flex items-center justify-center w-9 h-9 rounded-full border-2 text-xs font-bold transition-all duration-300';

  switch (stage.status) {
    case 'pending':
      return <div className={`${base} border-zinc-600 text-zinc-600 bg-zinc-900`}>●</div>;
    case 'active':
      return (
        <div className={`${base} border-blue-500 text-blue-400 bg-blue-950 animate-pipeline-pulse`}>
          ◉
        </div>
      );
    case 'completed':
      return (
        <div className={`${base} border-green-500 text-green-400 bg-green-950 animate-pipeline-complete`}>
          ✓
        </div>
      );
    case 'error':
      return (
        <div className={`${base} border-red-500 text-red-400 bg-red-950`}>
          ✕
        </div>
      );
  }
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="relative flex-1 h-0.5 mx-1 bg-zinc-700 self-center overflow-hidden">
      {active && (
        <div
          className="absolute top-[-1px] w-2 h-1 rounded-full bg-blue-400 animate-pipeline-travel"
        />
      )}
    </div>
  );
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [startedAt]);

  return <span className="text-blue-400">Building… {elapsed}s</span>;
}

interface DeployPipelineProps {
  pipeline: PipelineState;
}

export default function DeployPipeline({ pipeline }: DeployPipelineProps) {
  const { stages, commitSha, commitMessage, buildStartedAt, deployUrl } = pipeline;

  const hasActive = stages.some((s) => s.status === 'active');

  return (
    <div className="flex flex-col gap-3 p-3 h-full text-sm">
      {/* Pipeline Nodes */}
      <div className="flex items-center gap-0">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.label}>
            <div className="flex flex-col items-center gap-1">
              <StageNode stage={stage} />
              <span className="text-[10px] text-zinc-400 whitespace-nowrap">{stage.label}</span>
            </div>
            {i < stages.length - 1 && (
              <Connector
                active={
                  stages[i].status === 'completed' && stages[i + 1].status === 'active'
                }
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-1 text-xs text-zinc-500 border-t border-zinc-800 pt-2">
        {commitSha && (
          <div>
            <span className="text-zinc-400">Commit:</span>{' '}
            <code className="text-orange-400">{commitSha.slice(0, 7)}</code>
            {commitMessage && <span className="ml-2 text-zinc-500">&ldquo;{commitMessage}&rdquo;</span>}
          </div>
        )}
        {buildStartedAt && stages[2].status === 'active' && (
          <div>
            <ElapsedTimer startedAt={buildStartedAt} />
          </div>
        )}
        {deployUrl && stages[3].status === 'completed' && (
          <div>
            <span className="text-zinc-400">URL:</span>{' '}
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 underline hover:text-green-300"
            >
              {deployUrl}
            </a>
          </div>
        )}
        {!hasActive && stages.every((s) => s.status === 'pending') && (
          <div className="text-zinc-600">Waiting for changes…</div>
        )}
      </div>
    </div>
  );
}
