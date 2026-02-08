'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ActivityStream, { type ActivityEvent, type ActivityEventType } from './ActivityStream';
import DeployPipeline, { type PipelineState, INITIAL_PIPELINE, type StageStatus } from './DeployPipeline';
import useDeployStatus, { type VercelState } from '@/hooks/useDeployStatus';

/* ─── Types ─── */
type ConsoleTab = 'console' | 'pipeline' | 'activity';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface PreviewOverlay {
  type: 'scanline' | 'ai-modifying' | null;
}

/* ─── Helpers ─── */
let _evtCounter = 0;
function makeEvent(type: ActivityEventType, title: string, detail?: string): ActivityEvent {
  return { id: `evt-${++_evtCounter}`, type, title, detail, timestamp: Date.now() };
}

function setPipelineStage(
  prev: PipelineState,
  index: number,
  status: StageStatus,
  meta?: Partial<Pick<PipelineState, 'commitSha' | 'commitMessage' | 'buildStartedAt' | 'deployUrl'>>
): PipelineState {
  const stages = [...prev.stages] as PipelineState['stages'];
  stages[index] = { ...stages[index], status };
  return { ...prev, ...meta, stages };
}

/* ─── Component ─── */
export default function LiveEditor() {
  /* Code state */
  const [code, setCode] = useState('<h1>Hello World</h1>\n<p>Start editing…</p>');
  const fileName = 'index.html';

  /* Save state */
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Console / UI state */
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('console');
  const [consoleLogs, setConsoleLogs] = useState<string[]>(['[Field Nine OS] Ready.']);

  /* Activity stream */
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const pushEvent = useCallback((type: ActivityEventType, title: string, detail?: string) => {
    setActivityEvents((prev) => {
      const next = [...prev, makeEvent(type, title, detail)];
      return next.length > 200 ? next.slice(-200) : next;
    });
  }, []);

  /* Pipeline */
  const [pipeline, setPipeline] = useState<PipelineState>(INITIAL_PIPELINE);

  /* Preview */
  const [previewOverlay, setPreviewOverlay] = useState<PreviewOverlay>({ type: null });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewKey, setPreviewKey] = useState(0);

  /* Deploy hook */
  const { deploy } = useDeployStatus();

  /* ─── Throttled file-edit event ─── */
  const lastEditEventRef = useRef(0);
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);

      // Throttled activity event (2s)
      const now = Date.now();
      if (now - lastEditEventRef.current > 2000) {
        lastEditEventRef.current = now;
        pushEvent('file-edit', `Edited ${fileName}`);
      }

      // Auto-save debounce
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveStatus('saving');
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus('saved');
        pushEvent('auto-save', `Saved ${fileName}`);
        // Reset to idle after 2s
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);
    },
    [fileName, pushEvent]
  );

  /* ─── Shadow Commit handler ─── */
  const handleShadowCommit = useCallback(
    async (message?: string) => {
      const commitMsg = message ?? `Update ${fileName}`;
      const fakeSha = Math.random().toString(16).slice(2, 9);

      // Stage 0: Code Changed → completed
      setPipeline((p) => setPipelineStage(p, 0, 'completed'));
      pushEvent('shadow-commit', 'Shadow Commit', commitMsg);

      // Stage 1: Committing → active
      await new Promise((r) => setTimeout(r, 300));
      setPipeline((p) =>
        setPipelineStage(p, 1, 'active', { commitSha: fakeSha, commitMessage: commitMsg })
      );

      // Stage 1: completed, Stage 2: Building → active
      await new Promise((r) => setTimeout(r, 800));
      setPipeline((p) => {
        let next = setPipelineStage(p, 1, 'completed');
        next = setPipelineStage(next, 2, 'active', { buildStartedAt: Date.now() });
        return next;
      });
      pushEvent('vercel-build', 'Build started', `Commit ${fakeSha.slice(0, 7)}`);

      setConsoleLogs((l) => [...l, `[deploy] Building commit ${fakeSha.slice(0, 7)}…`]);
    },
    [fileName, pushEvent]
  );

  /* ─── AI Insert handler ─── */
  const handleInsertCode = useCallback(
    (generatedCode: string) => {
      setCode((prev) => prev + '\n' + generatedCode);
      pushEvent('ai-generate', 'AI Code Generated');
      pushEvent('ai-insert', 'AI Code Insert', `Inserted into ${fileName}`);

      // Scanline overlay
      setPreviewOverlay({ type: 'scanline' });
      setTimeout(() => setPreviewOverlay({ type: null }), 800);

      // Refresh preview
      setPreviewKey((k) => k + 1);
    },
    [fileName, pushEvent]
  );

  /* ─── Vercel state → pipeline sync ─── */
  const prevVercelState = useRef<VercelState>(deploy.state);
  const syncVercelState = useCallback((curr: VercelState) => {
    if (curr === 'ready') {
      setPipeline((p) => {
        let next = setPipelineStage(p, 2, 'completed');
        next = setPipelineStage(next, 3, 'completed', { deployUrl: deploy.url });
        return next;
      });
      pushEvent('vercel-ready', 'Deployment live', deploy.url ?? undefined);
      setConsoleLogs((l) => [...l, `[deploy] ✓ Ready at ${deploy.url}`]);
    } else if (curr === 'error') {
      setPipeline((p) => setPipelineStage(p, 2, 'error'));
      pushEvent('vercel-error', 'Build failed', deploy.error ?? undefined);
      setConsoleLogs((l) => [...l, `[deploy] ✕ Error: ${deploy.error}`]);
    } else if (curr === 'building') {
      setPipeline((p) =>
        setPipelineStage(p, 2, 'active', {
          buildStartedAt: Date.now(),
          commitSha: deploy.commitSha,
        })
      );
    }
  }, [deploy, pushEvent]);

  if (deploy.state !== prevVercelState.current) {
    prevVercelState.current = deploy.state;
    syncVercelState(deploy.state);
  }

  /* ─── Preview srcDoc ─── */
  const previewSrcDoc = `<!DOCTYPE html>
<html><head><style>body{font-family:system-ui;padding:16px;background:#111;color:#eee;}</style></head>
<body>${code}</body></html>`;

  /* ─── Compute tab indicators ─── */
  const pipelineActive = pipeline.stages.some((s) => s.status === 'active');
  const activityCount = activityEvents.length;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200">
      {/* ─── Top Bar ─── */}
      <header className="flex items-center gap-3 px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <span className="text-xs font-bold tracking-wider text-blue-400">FIELD NINE OS</span>
        <span className="text-zinc-600">|</span>
        <span className="text-xs text-zinc-400">{fileName}</span>
        <div className="flex-1" />
        {saveStatus === 'saving' && <span className="text-xs text-yellow-400">Saving…</span>}
        {saveStatus === 'saved' && <span className="text-xs text-green-400">Saved ✓</span>}
        <button
          onClick={() => handleShadowCommit()}
          className="text-xs px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white transition-colors"
        >
          Shadow Commit
        </button>
        <button
          onClick={() => handleInsertCode('<div class="ai-block">AI Generated Content</div>')}
          className="text-xs px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white transition-colors"
        >
          AI Insert
        </button>
      </header>

      {/* ─── Main Layout ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Pane */}
        <div className="flex flex-col w-1/2 border-r border-zinc-800">
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="flex-1 p-4 bg-zinc-950 text-green-300 font-mono text-sm resize-none outline-none"
            spellCheck={false}
          />
        </div>

        {/* Right Pane: Preview + Console */}
        <div className="flex flex-col w-1/2">
          {/* Preview */}
          <div className="relative flex-1 border-b border-zinc-800">
            <iframe
              ref={iframeRef}
              key={previewKey}
              srcDoc={previewSrcDoc}
              className="w-full h-full bg-zinc-900 animate-preview-fade-in"
              sandbox="allow-scripts"
              title="Preview"
            />

            {/* Scanline overlay */}
            {previewOverlay.type === 'scanline' && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                  className="absolute left-0 w-full h-0.5 bg-purple-400 opacity-80 animate-preview-scanline"
                  style={{ boxShadow: '0 0 8px rgba(168,85,247,0.6)' }}
                />
              </div>
            )}

            {/* AI-modifying overlay */}
            {previewOverlay.type === 'ai-modifying' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30">
                <span className="text-purple-300 text-sm font-medium animate-pulse">
                  AI modifying…
                </span>
              </div>
            )}
          </div>

          {/* Console Area */}
          <div className="flex flex-col h-56 bg-zinc-950">
            {/* Tab Bar */}
            <div className="flex items-center gap-0 border-b border-zinc-800 text-xs">
              <button
                onClick={() => setConsoleTab('console')}
                className={`px-3 py-1.5 transition-colors ${
                  consoleTab === 'console'
                    ? 'text-zinc-200 border-b-2 border-blue-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Console
              </button>
              <button
                onClick={() => setConsoleTab('pipeline')}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                  consoleTab === 'pipeline'
                    ? 'text-zinc-200 border-b-2 border-blue-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Pipeline
                {pipelineActive && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setConsoleTab('activity')}
                className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                  consoleTab === 'activity'
                    ? 'text-zinc-200 border-b-2 border-blue-500'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Activity
                {activityCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-zinc-700 text-[10px] text-zinc-300 tabular-nums">
                    {activityCount > 99 ? '99+' : activityCount}
                  </span>
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {consoleTab === 'console' && (
                <div className="h-full overflow-y-auto p-2 font-mono text-xs text-zinc-400">
                  {consoleLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
              {consoleTab === 'pipeline' && <DeployPipeline pipeline={pipeline} />}
              {consoleTab === 'activity' && <ActivityStream events={activityEvents} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
