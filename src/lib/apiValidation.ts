/**
 * Shared API request validation helpers using Zod v4.
 * Each schema validates + limits payload size to prevent DoS.
 */
import { z } from "zod";
import { NextResponse } from "next/server";

/* ===== Reusable Primitives ===== */
const safeString = (max = 500) => z.string().max(max);
const safeLongString = (max = 50_000) => z.string().max(max);

/* ===== Chat Route ===== */
export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: safeString(30_000),
      })
    )
    .max(100)
    .optional(),
  model: safeString(50).optional(),
  mode: safeString(20).optional(),
  file: safeString(500_000).optional(),
  filename: safeString(200).optional(),
  fileContext: z
    .array(
      z.object({
        name: safeString(200),
        content: safeLongString(200_000),
      })
    )
    .max(20)
    .optional(),
  livePreviewUrl: safeString(500).optional(),
});

/* ===== Save Code Route ===== */
export const saveCodeSchema = z.object({
  files: z
    .array(
      z.object({
        path: safeString(200),
        content: safeLongString(500_000),
      })
    )
    .min(1)
    .max(50),
  message: safeString(500),
});

/* ===== Memory Route ===== */
export const memorySchema = z.object({
  action: z.enum(["get", "set", "delete", "list"]),
  key: safeString(200).optional(),
  content: safeLongString(10_000).optional(),
});

/* ===== Autocomplete Route ===== */
export const autocompleteSchema = z.object({
  prefix: safeLongString(50_000),
  suffix: safeLongString(50_000),
  language: safeString(30),
  fileName: safeString(200),
});

/* ===== Semantic Search Route ===== */
export const semanticSearchSchema = z.object({
  action: z.enum(["index", "search"]),
  query: safeString(1000).optional(),
  files: z
    .record(safeString(200), safeLongString(200_000))
    .optional(),
});

/* ===== Agent Run Route ===== */
export const agentRunSchema = z.object({
  prompt: safeString(5000),
  files: z
    .record(safeString(200), safeLongString(200_000))
    .optional(),
  model: safeString(50).optional(),
});

/* ===== Validator Helper ===== */

/**
 * Validate request body against a Zod schema.
 * Returns { data } on success, { error: NextResponse } on failure.
 */
export async function validateRequest<T>(
  req: Request,
  schema: z.ZodType<T>,
  maxBodyBytes = 2 * 1024 * 1024, // 2MB default
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  // Check Content-Length header (fast reject)
  const cl = req.headers.get("content-length");
  if (cl && parseInt(cl, 10) > maxBodyBytes) {
    return {
      error: NextResponse.json(
        { error: "Payload too large" },
        { status: 413 },
      ),
    };
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 },
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Validation failed", details: result.error.issues.map((i) => i.message).slice(0, 5) },
        { status: 400 },
      ),
    };
  }

  return { data: result.data };
}
