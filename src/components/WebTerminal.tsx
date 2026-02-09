"use client";

import { useEffect, useRef } from "react";
import type { WebContainerProcess } from "@webcontainer/api";

interface WebTerminalProps {
  shellProcess: WebContainerProcess | null;
  className?: string;
}

export default function WebTerminal({ shellProcess, className = "" }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<string> | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    let terminal: import("@xterm/xterm").Terminal;
    let fitAddon: import("@xterm/addon-fit").FitAddon;

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      // Load xterm CSS via link element (avoids TS module resolution issue)
      if (!document.querySelector('link[data-xterm-css]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.min.css";
        link.setAttribute("data-xterm-css", "1");
        document.head.appendChild(link);
      }

      terminal = new Terminal({
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), 'Fira Code', 'Cascadia Code', monospace",
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#d4d4d4",
          selectionBackground: "#264f78",
          black: "#1e1e1e",
          red: "#f87171",
          green: "#00b894",
          yellow: "#fbbf24",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#22d3ee",
          white: "#d4d4d4",
        },
        cursorBlink: true,
        scrollback: 1000,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(terminalRef.current!);
      fitAddon.fit();

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      terminal.writeln("\x1b[1;34m[Field Nine OS]\x1b[0m WebContainer Terminal");
      terminal.writeln("Waiting for shell process...\r\n");
    })();

    // Resize observer
    const observer = new ResizeObserver(() => {
      fitAddonRef.current?.fit();
    });
    observer.observe(terminalRef.current);

    return () => {
      observer.disconnect();
      xtermRef.current?.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Connect shell process to terminal
  useEffect(() => {
    const terminal = xtermRef.current;
    if (!terminal || !shellProcess) return;

    // Pipe shell output to terminal
    const reader = shellProcess.output.getReader();
    let cancelled = false;

    (async () => {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        terminal.write(value);
      }
    })();

    // Pipe terminal input to shell
    const writer = shellProcess.input.getWriter();
    writerRef.current = writer;

    const disposable = terminal.onData((data) => {
      writer.write(data);
    });

    return () => {
      cancelled = true;
      reader.cancel();
      disposable.dispose();
      writerRef.current = null;
    };
  }, [shellProcess]);

  return (
    <div
      ref={terminalRef}
      className={`w-full h-full bg-[#1e1e1e] ${className}`}
    />
  );
}
