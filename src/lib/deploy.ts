import { supabase } from "./supabase";
import { updateProject } from "./projects";

const BUCKET = "deployments";

/**
 * Deploy a project by uploading the combined HTML to Supabase Storage.
 * Returns the public URL or null on failure.
 */
export async function deployProject(
  projectSlug: string,
  combinedHTML: string,
): Promise<string | null> {
  if (!supabase) return null;

  const filePath = `${projectSlug}/index.html`;

  // Upload (upsert) the combined HTML file
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, new Blob([combinedHTML], { type: "text/html" }), {
      cacheControl: "60",
      upsert: true,
      contentType: "text/html",
    });

  if (error) {
    console.error("[deploy] upload failed:", error);
    return null;
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  const publicUrl = urlData?.publicUrl ?? null;

  // Save deployed URL to project record
  if (publicUrl) {
    await updateProject(projectSlug, { deployed_url: publicUrl });
  }

  return publicUrl;
}
