"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WebContainer, WebContainerProcess } from "@webcontainer/api";

export type WCStatus = "idle" | "booting" | "ready" | "error";

interface UseWebContainerReturn {
  status: WCStatus;
  /** Boot the WebContainer (lazy — only when user opts in) */
  boot: () => Promise<void>;
  /** Write a file to the WebContainer filesystem */
  writeFile: (path: string, content: string) => Promise<void>;
  /** Write multiple files at once */
  writeFiles: (files: Record<string, string>) => Promise<void>;
  /** Spawn a process (e.g., "node", "npm") */
  spawn: (cmd: string, args?: string[]) => Promise<WebContainerProcess | null>;
  /** Run a shell command and return output */
  runCommand: (cmd: string) => Promise<string>;
  /** URL of the dev server if one is running */
  serverUrl: string | null;
  /** Attach to a writable stream (for terminal input) */
  shellProcess: WebContainerProcess | null;
  /** Start an interactive shell (jsh) */
  startShell: () => Promise<WebContainerProcess | null>;
  /** Teardown */
  teardown: () => void;
}

let wcInstance: WebContainer | null = null;
let wcBootPromise: Promise<WebContainer> | null = null;

export function useWebContainer(): UseWebContainerReturn {
  const [status, setStatus] = useState<WCStatus>("idle");
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [shellProcess, setShellProcess] = useState<WebContainerProcess | null>(null);
  const containerRef = useRef<WebContainer | null>(null);

  const boot = useCallback(async () => {
    if (containerRef.current || status === "booting") return;

    setStatus("booting");
    try {
      // Singleton: only one WebContainer per page
      if (!wcBootPromise) {
        const { WebContainer: WC } = await import("@webcontainer/api");
        wcBootPromise = WC.boot();
      }
      const wc = await wcBootPromise;
      wcInstance = wc;
      containerRef.current = wc;

      // Listen for server-ready events (e.g., vite, express)
      wc.on("server-ready", (_port: number, url: string) => {
        setServerUrl(url);
      });

      setStatus("ready");
    } catch (err) {
      console.error("[WebContainer] Boot failed:", err);
      setStatus("error");
      wcBootPromise = null;
    }
  }, [status]);

  const writeFile = useCallback(async (path: string, content: string) => {
    const wc = containerRef.current;
    if (!wc) return;

    // Ensure parent directories exist
    const parts = path.split("/");
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join("/");
      await wc.fs.mkdir(dir, { recursive: true });
    }
    await wc.fs.writeFile(path, content);
  }, []);

  const writeFiles = useCallback(async (files: Record<string, string>) => {
    for (const [path, content] of Object.entries(files)) {
      await writeFile(path, content);
    }
  }, [writeFile]);

  const spawn = useCallback(async (cmd: string, args: string[] = []) => {
    const wc = containerRef.current;
    if (!wc) return null;
    return wc.spawn(cmd, args);
  }, []);

  const runCommand = useCallback(async (cmd: string): Promise<string> => {
    const wc = containerRef.current;
    if (!wc) return "[WebContainer not ready]";

    const parts = cmd.trim().split(/\s+/);
    const process = await wc.spawn(parts[0], parts.slice(1));

    let output = "";
    const reader = process.output.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      output += value;
    }

    return output;
  }, []);

  const startShell = useCallback(async () => {
    const wc = containerRef.current;
    if (!wc) return null;

    const process = await wc.spawn("jsh", {
      terminal: { cols: 80, rows: 24 },
    });
    setShellProcess(process);
    return process;
  }, []);

  const teardown = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.teardown();
      containerRef.current = null;
      wcInstance = null;
      wcBootPromise = null;
      setStatus("idle");
      setServerUrl(null);
      setShellProcess(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't teardown on unmount — WebContainer is a singleton
      // and re-booting is expensive. Let it persist.
    };
  }, []);

  return {
    status,
    boot,
    writeFile,
    writeFiles,
    spawn,
    runCommand,
    serverUrl,
    shellProcess,
    startShell,
    teardown,
  };
}
