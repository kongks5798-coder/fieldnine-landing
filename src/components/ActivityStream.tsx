'use client';

import React, { useEffect, useRef } from 'react';

export type ActivityEventType =
  | 'file-edit'
  | 'auto-save'
  | 'shadow-commit'
  | 'vercel-build'
  | 'vercel-ready'
  | 'vercel-error'
  | 'ai-generate'
  | 'ai-insert';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  title: string;
  detail?: string;
  timestamp: number;
}

const EVENT_CONFIG: Record<ActivityEventType, { color: string; icon: string }> = {
  'file-edit':      { color: '#3b82f6', icon: '✏️' },
  'auto-save':      { color: '#22c55e', icon: '💾' },
  'shadow-commit':  { color: '#f97316', icon: '📦' },
  'vercel-build':   { color: '#f97316', icon: '🔨' },
  'vercel-ready':   { color: '#22c55e', icon: '🚀' },
  'vercel-error':   { color: '#ef4444', icon: '❌' },
  'ai-generate':    { color: '#a855f7', icon: '🤖' },
  'ai-insert':      { color: '#a855f7', icon: '⚡' },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface ActivityStreamProps {
  events: ActivityEvent[];
}

export default function ActivityStream({ events }: ActivityStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        No activity yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto h-full p-2 text-sm">
      {events.map((ev) => {
        const cfg = EVENT_CONFIG[ev.type];
        return (
          <div
            key={ev.id}
            className="flex items-start gap-2 rounded px-2 py-1.5 animate-activity-slide-in"
            style={{ borderLeft: `3px solid ${cfg.color}`, background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="shrink-0 text-xs leading-5">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-zinc-200">{ev.title}</span>
              {ev.detail && (
                <span className="ml-1.5 text-zinc-500 truncate">{ev.detail}</span>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-zinc-600 leading-5 tabular-nums">
              {formatTime(ev.timestamp)}
            </span>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
