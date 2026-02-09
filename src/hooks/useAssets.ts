"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "assets";
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_SIZE = 500_000; // 500KB — compress above this

/** Compress/resize image files using Canvas API */
async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  if (file.size <= MAX_IMAGE_SIZE) return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_IMAGE_WIDTH) {
        height = Math.round(height * (MAX_IMAGE_WIDTH / width));
        width = MAX_IMAGE_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
          } else {
            resolve(file); // Original was smaller, keep it
          }
        },
        "image/webp",
        0.82,
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

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
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      setUploadError(null);

      const files = Array.from(fileList);
      const results: AssetFile[] = [];
      const failedNames: string[] = [];

      for (let file of files) {
        // Auto-optimize images (resize + WebP conversion)
        file = await optimizeImage(file);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${projectSlug}/${Date.now()}-${safeName}`;

        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (error) {
          console.error(`[useAssets] upload "${file.name}" failed:`, error);
          failedNames.push(file.name);
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

      if (failedNames.length > 0) {
        setUploadError(`업로드 실패: ${failedNames.join(", ")}`);
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

  return { assets, uploading, uploadError, setUploadError, loadAssets, uploadFiles, deleteAsset };
}
