"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "assets";

export interface AssetFile {
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
}

export function useAssets(projectSlug: string | null) {
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [uploading, setUploading] = useState(false);

  /** List all assets for the current project */
  const loadAssets = useCallback(async () => {
    if (!supabase || !projectSlug) return;

    const folder = `${projectSlug}/`;
    const { data, error } = await supabase.storage.from(BUCKET).list(projectSlug, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      console.error("[useAssets] list failed:", error);
      return;
    }

    const items: AssetFile[] = (data ?? [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => {
        const { data: urlData } = supabase!.storage
          .from(BUCKET)
          .getPublicUrl(`${folder}${f.name}`);
        return {
          name: f.name,
          url: urlData?.publicUrl ?? "",
          size: f.metadata?.size ?? 0,
          type: f.metadata?.mimetype ?? "",
          createdAt: f.created_at ?? "",
        };
      });

    setAssets(items);
  }, [projectSlug]);

  /** Upload one or more files */
  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!supabase || !projectSlug) return;
      setUploading(true);

      const files = Array.from(fileList);
      const results: AssetFile[] = [];

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${projectSlug}/${Date.now()}-${safeName}`;

        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (error) {
          console.error(`[useAssets] upload "${file.name}" failed:`, error);
          continue;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

        results.push({
          name: safeName,
          url: urlData?.publicUrl ?? "",
          size: file.size,
          type: file.type,
          createdAt: new Date().toISOString(),
        });
      }

      setAssets((prev) => [...results, ...prev]);
      setUploading(false);
    },
    [projectSlug],
  );

  /** Delete an asset */
  const deleteAsset = useCallback(
    async (name: string) => {
      if (!supabase || !projectSlug) return;

      // Find the full path (assets store with timestamp prefix)
      const { data } = await supabase.storage.from(BUCKET).list(projectSlug);
      const match = data?.find((f) => f.name.endsWith(name) || f.name === name);
      if (!match) return;

      const { error } = await supabase.storage
        .from(BUCKET)
        .remove([`${projectSlug}/${match.name}`]);

      if (error) {
        console.error("[useAssets] delete failed:", error);
        return;
      }

      setAssets((prev) => prev.filter((a) => a.name !== name));
    },
    [projectSlug],
  );

  return { assets, uploading, loadAssets, uploadFiles, deleteAsset };
}
