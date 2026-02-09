import { useRef, useCallback } from "react";

const MAX_SNAPSHOTS = 30;

/**
 * Per-file undo/redo history stack.
 * Returns pushUndoSnapshot, undoFile, redoFile.
 */
export function useUndoHistory() {
  const historyRef = useRef<Record<string, string[]>>({});
  const indexRef = useRef<Record<string, number>>({});

  const pushUndoSnapshot = useCallback((fileName: string, content: string) => {
    if (!historyRef.current[fileName]) {
      historyRef.current[fileName] = [];
      indexRef.current[fileName] = -1;
    }
    const history = historyRef.current[fileName];
    const idx = indexRef.current[fileName];
    // Discard any redo entries after current index
    history.splice(idx + 1);
    history.push(content);
    if (history.length > MAX_SNAPSHOTS) history.shift();
    indexRef.current[fileName] = history.length - 1;
  }, []);

  const undoFile = useCallback((fileName: string) => {
    const history = historyRef.current[fileName];
    if (!history) return null;
    const idx = indexRef.current[fileName];
    if (idx <= 0) return null;
    indexRef.current[fileName] = idx - 1;
    return history[idx - 1];
  }, []);

  const redoFile = useCallback((fileName: string) => {
    const history = historyRef.current[fileName];
    if (!history) return null;
    const idx = indexRef.current[fileName];
    if (idx >= history.length - 1) return null;
    indexRef.current[fileName] = idx + 1;
    return history[idx + 1];
  }, []);

  return { pushUndoSnapshot, undoFile, redoFile };
}
