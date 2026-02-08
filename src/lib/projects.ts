import { supabase } from "./supabase";

/* ===== Types ===== */
export interface ProjectRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  prompt: string;
  files: Record<string, { name: string; language: string; content: string }>;
  deployed_url: string | null;
  created_at: string;
  updated_at: string;
}

/* ===== Helpers ===== */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

/* ===== CRUD ===== */

/** Create a new project record in Supabase, returns the created project */
export async function createProject(opts: {
  name: string;
  description?: string;
  prompt?: string;
  files?: Record<string, { name: string; language: string; content: string }>;
}): Promise<ProjectRecord | null> {
  if (!supabase) return null;

  const slug = generateSlug(opts.name || "untitled");
  const { data, error } = await supabase
    .from("projects")
    .insert({
      slug,
      name: opts.name || "Untitled",
      description: opts.description ?? "",
      prompt: opts.prompt ?? "",
      files: opts.files ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("[projects] create failed:", error);
    return null;
  }
  return data as ProjectRecord;
}

/** List all projects, newest first */
export async function listProjects(): Promise<ProjectRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("projects")
    .select("id, slug, name, description, prompt, deployed_url, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[projects] list failed:", error);
    return [];
  }
  return (data ?? []) as ProjectRecord[];
}

/** Get a single project by slug */
export async function getProject(slug: string): Promise<ProjectRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("[projects] get failed:", error);
    return null;
  }
  return data as ProjectRecord;
}

/** Get a single project by ID */
export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[projects] getById failed:", error);
    return null;
  }
  return data as ProjectRecord;
}

/** Update project fields (files, name, deployed_url, etc.) */
export async function updateProject(
  slug: string,
  updates: Partial<Pick<ProjectRecord, "name" | "description" | "files" | "deployed_url">>,
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("slug", slug);

  if (error) {
    console.error("[projects] update failed:", error);
    return false;
  }
  return true;
}

/** Delete a project by slug */
export async function deleteProject(slug: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from("projects").delete().eq("slug", slug);

  if (error) {
    console.error("[projects] delete failed:", error);
    return false;
  }
  return true;
}
