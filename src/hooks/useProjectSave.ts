"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ===== Types ===== */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SerializableFile {
  name: string;
  language: string;
  content: string;
}

type FileMap = Record<string, SerializableFile & { icon: React.ElementType }>;

const LS_PREFIX = "fn-ide-project-";

/* ===== Hook ===== */
export function useProjectSave(
  getFileInfo: (fileName: string) => { language: string; icon: React.ElementType; color: string },
  projectSlug: string | null,
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lsKey = `${LS_PREFIX}${projectSlug ?? "default"}`;

  /* --- Serialize: strip icon (React component) --- */
  const serialize = useCallback((files: FileMap): Record<string, SerializableFile> => {
    const out: Record<string, SerializableFile> = {};
    for (const [key, f] of Object.entries(files)) {
      out[key] = { name: f.name, language: f.language, content: f.content };
    }
    return out;
  }, []);

  /* --- Deserialize: restore icon via getFileInfo --- */
  const deserialize = useCallback(
    (data: Record<string, SerializableFile>): FileMap => {
      const out: FileMap = {} as FileMap;
      for (const [key, f] of Object.entries(data)) {
        const info = getFileInfo(f.name);
        out[key] = { name: f.name, language: f.language, content: f.content, icon: info.icon };
      }
      return out;
    },
    [getFileInfo],
  );

  /* --- LocalStorage save (always runs) --- */
  const saveToLocalStorage = useCallback(
    (files: FileMap) => {
      try {
        localStorage.setItem(lsKey, JSON.stringify(serialize(files)));
      } catch (e) {
        console.error("[useProjectSave] localStorage save failed", e);
      }
    },
    [serialize, lsKey],
  );

  /* --- Supabase upsert --- */
  const saveToSupabase = useCallback(
    async (files: FileMap): Promise<boolean> => {
      if (!supabase || !projectSlug) return false;
      try {
        const { error } = await supabase.from("projects").upsert(
          { slug: projectSlug, files: serialize(files) },
          { onConflict: "slug" },
        );
        if (error) throw error;
        return true;
      } catch (e) {
        console.error("[useProjectSave] Supabase save failed", e);
        return false;
      }
    },
    [serialize, projectSlug],
  );

  /* --- Show "saved" then reset to idle after 3s --- */
  const showSaved = useCallback((_isSupabaseOk: boolean) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    // localStorage always succeeds, so show "saved" regardless of Supabase
    setSaveStatus("saved");
    savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
  }, []);

  /* --- Auto-save: 2s debounce + beforeunload flush --- */
  const pendingFilesRef = useRef<FileMap | null>(null);

  const triggerAutoSave = useCallback(
    (files: FileMap) => {
      pendingFilesRef.current = files;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        pendingFilesRef.current = null;
        setSaveStatus("saving");
        saveToLocalStorage(files);
        const ok = await saveToSupabase(files);
        showSaved(ok);
      }, 2000);
    },
    [saveToLocalStorage, saveToSupabase, showSaved],
  );

  // Flush pending save on tab close / navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingFilesRef.current) {
        try { localStorage.setItem(lsKey, JSON.stringify(serialize(pendingFilesRef.current))); } catch { /* best effort */ }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [lsKey, serialize]);

  /* --- Manual save: immediate --- */
  const manualSave = useCallback(
    async (files: FileMap) => {
      setSaveStatus("saving");
      saveToLocalStorage(files);
      const ok = await saveToSupabase(files);
      showSaved(ok);
    },
    [saveToLocalStorage, saveToSupabase, showSaved],
  );

  /* --- Load: Supabase first, LocalStorage fallback --- */
  const loadFromStorage = useCallback(async (): Promise<FileMap | null> => {
    // Try Supabase
    if (supabase && projectSlug) {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("files")
          .eq("slug", projectSlug)
          .single();

        if (!error && data?.files && typeof data.files === "object") {
          const loaded = data.files as Record<string, SerializableFile>;
          if (Object.keys(loaded).length > 0) {
            return deserialize(loaded);
          }
        }
      } catch (e) {
        console.warn("[useProjectSave] Supabase load failed, trying localStorage", e);
      }
    }

    // Fallback: LocalStorage
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, SerializableFile>;
        if (Object.keys(parsed).length > 0) {
          return deserialize(parsed);
        }
      }
    } catch (e) {
      console.error("[useProjectSave] localStorage load failed", e);
    }

    return null;
  }, [deserialize, projectSlug, lsKey]);

  /* --- Cleanup timers on unmount --- */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  /* --- Clear local storage (for reset) --- */
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(lsKey);
    } catch {
      // ignore
    }
  }, [lsKey]);

  return {
    saveStatus,
    triggerAutoSave,
    manualSave,
    loadFromStorage,
    clearLocalStorage,
  };
}
