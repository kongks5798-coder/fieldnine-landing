/**
 * Semantic Code Index — in-memory vector store.
 * Chunks code files, generates embeddings, and provides similarity search.
 * No external vector DB required (works entirely in server memory).
 */

import { embed, embedBatch, cosineSimilarity } from "./embeddings";

export interface CodeChunk {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
}

interface ProjectIndex {
  chunks: CodeChunk[];
  fileHashes: Map<string, string>; // file -> content hash (for incremental updates)
  lastIndexed: number;
}

// In-memory index per project
const indices = new Map<string, ProjectIndex>();

/** Simple hash for change detection */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}

/**
 * Split code into semantic chunks.
 * Strategy: split by functions/blocks for JS/TS, by selectors for CSS,
 * by sections for HTML. Falls back to line-based chunking.
 */
function chunkCode(file: string, content: string): { content: string; startLine: number; endLine: number }[] {
  const lines = content.split("\n");
  const chunks: { content: string; startLine: number; endLine: number }[] = [];

  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const CHUNK_SIZE = 30; // lines per chunk
  const OVERLAP = 5; // overlap lines for context continuity

  if (ext === "js" || ext === "ts") {
    // Split by top-level function/class/const declarations
    let currentChunk: string[] = [];
    let chunkStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isBlockStart =
        /^(function|class|const|let|var|export|async\s+function|\/\*\*)/i.test(line.trim()) &&
        currentChunk.length >= 5;

      if (isBlockStart && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join("\n"),
          startLine: chunkStart + 1,
          endLine: chunkStart + currentChunk.length,
        });
        // Start new chunk with overlap
        const overlapLines = currentChunk.slice(-OVERLAP);
        currentChunk = [...overlapLines, line];
        chunkStart = i - OVERLAP;
      } else {
        if (currentChunk.length === 0) chunkStart = i;
        currentChunk.push(line);
      }

      // Force split if chunk gets too large
      if (currentChunk.length >= CHUNK_SIZE * 2) {
        chunks.push({
          content: currentChunk.join("\n"),
          startLine: chunkStart + 1,
          endLine: chunkStart + currentChunk.length,
        });
        const overlapLines = currentChunk.slice(-OVERLAP);
        currentChunk = [...overlapLines];
        chunkStart = i - OVERLAP + 1;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join("\n"),
        startLine: chunkStart + 1,
        endLine: chunkStart + currentChunk.length,
      });
    }
  } else {
    // Generic line-based chunking with overlap
    for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
      const chunk = lines.slice(i, i + CHUNK_SIZE);
      if (chunk.length === 0) break;
      chunks.push({
        content: chunk.join("\n"),
        startLine: i + 1,
        endLine: i + chunk.length,
      });
    }
  }

  // Filter out trivially small chunks
  return chunks.filter((c) => c.content.trim().length > 20);
}

/**
 * Index code files for a project.
 * Only re-indexes changed files (incremental).
 */
export async function indexProject(
  projectId: string,
  files: Record<string, string>,
): Promise<{ indexed: number; cached: number }> {
  let index = indices.get(projectId);
  if (!index) {
    index = { chunks: [], fileHashes: new Map(), lastIndexed: 0 };
    indices.set(projectId, index);
  }

  const changedFiles: string[] = [];
  const unchangedFiles: string[] = [];

  for (const [file, content] of Object.entries(files)) {
    const hash = hashContent(content);
    if (index.fileHashes.get(file) === hash) {
      unchangedFiles.push(file);
    } else {
      changedFiles.push(file);
      index.fileHashes.set(file, hash);
    }
  }

  // Remove old chunks for changed files
  if (changedFiles.length > 0) {
    index.chunks = index.chunks.filter((c) => !changedFiles.includes(c.file));

    // Chunk changed files
    const newChunks: { file: string; content: string; startLine: number; endLine: number }[] = [];
    for (const file of changedFiles) {
      const fileChunks = chunkCode(file, files[file]);
      for (const chunk of fileChunks) {
        newChunks.push({ file, ...chunk });
      }
    }

    if (newChunks.length > 0) {
      // Batch embed all new chunks
      const texts = newChunks.map(
        (c) => `File: ${c.file} (lines ${c.startLine}-${c.endLine})\n${c.content}`
      );
      const embeddings = await embedBatch(texts);

      for (let i = 0; i < newChunks.length; i++) {
        const c = newChunks[i];
        index.chunks.push({
          id: `${c.file}:${c.startLine}-${c.endLine}`,
          file: c.file,
          startLine: c.startLine,
          endLine: c.endLine,
          content: c.content,
          embedding: embeddings[i],
        });
      }
    }
  }

  index.lastIndexed = Date.now();
  return { indexed: changedFiles.length, cached: unchangedFiles.length };
}

/**
 * Search for code chunks most relevant to a query.
 * Returns top-K chunks ranked by cosine similarity.
 */
export async function searchCode(
  projectId: string,
  query: string,
  topK: number = 5,
  minScore: number = 0.3,
): Promise<{ chunk: CodeChunk; score: number }[]> {
  const index = indices.get(projectId);
  if (!index || index.chunks.length === 0) return [];

  const queryEmbedding = await embed(query);

  const scored = index.chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return scored
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Check if a project has been indexed */
export function isIndexed(projectId: string): boolean {
  const index = indices.get(projectId);
  return !!index && index.chunks.length > 0;
}

/** Get index stats */
export function getIndexStats(projectId: string): { chunks: number; files: number; lastIndexed: number } | null {
  const index = indices.get(projectId);
  if (!index) return null;
  return {
    chunks: index.chunks.length,
    files: index.fileHashes.size,
    lastIndexed: index.lastIndexed,
  };
}
