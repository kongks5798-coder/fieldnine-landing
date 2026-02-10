/**
 * Supabase pgvector Long-Term Memory Store
 *
 * Stores code + conversation embeddings in Supabase for permanent RAG retrieval.
 * Requires pgvector extension and the memories table (see SETUP_SQL below).
 *
 * SETUP: Run SETUP_SQL in Supabase SQL Editor before first use.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { embed } from "./embeddings";

// Singleton admin client (service role for server-side DB operations)
let _admin: SupabaseClient | null = null;

function getAdmin(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.length < 20) return null;
  _admin = createClient(url, key);
  return _admin;
}

export interface MemoryRecord {
  id: number;
  project_id: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MemorySearchResult {
  memory: MemoryRecord;
  similarity: number;
}

/** Check if memory system is configured (keys available) */
export function isMemoryEnabled(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.OPENAI_API_KEY
  );
}

/** Store a memory with auto-generated embedding */
export async function storeMemory(
  projectId: string,
  type: "code" | "conversation" | "error",
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<boolean> {
  const client = getAdmin();
  if (!client || !process.env.OPENAI_API_KEY) return false;

  try {
    const vector = await embed(content.slice(0, 6000));
    const { error } = await client.from("memories").insert({
      project_id: projectId,
      type,
      content: content.slice(0, 10000),
      metadata,
      embedding: vector,
    });
    if (error) {
      console.warn("[memory] Store failed:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[memory] Store error:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Search memories by semantic similarity (requires search_memories Postgres function) */
export async function searchMemories(
  projectId: string,
  query: string,
  topK = 5,
  minSimilarity = 0.3,
): Promise<MemorySearchResult[]> {
  const client = getAdmin();
  if (!client || !process.env.OPENAI_API_KEY) return [];

  try {
    const queryVector = await embed(query.slice(0, 6000));
    const { data, error } = await client.rpc("search_memories", {
      query_embedding: queryVector,
      match_project_id: projectId,
      match_count: topK,
      min_similarity: minSimilarity,
    });

    if (error) {
      console.warn("[memory] Search failed:", error.message);
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) => ({
      memory: {
        id: row.id as number,
        project_id: row.project_id as string,
        type: row.type as string,
        content: row.content as string,
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        created_at: row.created_at as string,
      },
      similarity: row.similarity as number,
    }));
  } catch (e) {
    console.warn("[memory] Search error:", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Get memory count for a project */
export async function getMemoryCount(projectId: string): Promise<number> {
  const client = getAdmin();
  if (!client) return 0;
  try {
    const { count, error } = await client
      .from("memories")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Setup SQL for Supabase — run once in the SQL Editor.
 * https://supabase.com/dashboard → SQL Editor → New Query → Paste & Run
 */
export const SETUP_SQL = `-- Field Nine OS: Long-Term Memory (pgvector)
-- Run this ONCE in Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

-- 3. Similarity search function
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  match_project_id text,
  match_count int DEFAULT 5,
  min_similarity float DEFAULT 0.3
)
RETURNS TABLE (
  id bigint,
  project_id text,
  type text,
  content text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.project_id,
    m.type,
    m.content,
    m.metadata,
    m.created_at,
    (1 - (m.embedding <=> query_embedding))::float AS similarity
  FROM memories m
  WHERE m.project_id = match_project_id
    AND 1 - (m.embedding <=> query_embedding) > min_similarity
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_memories_project ON memories (project_id, type);
`;
