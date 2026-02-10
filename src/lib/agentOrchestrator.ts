/**
 * Agent Orchestrator — Multi-agent pipeline for autonomous code generation
 *
 * Pipeline: Planner → Coder → Reviewer → Fixer (max 2 rounds)
 */

import { generateObject, streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { classifyComplexity, selectModel } from "./costRouter";

// ===== Types =====

export interface SubTask {
  id: string;
  description: string;
  targetFile: string;
  complexity: "simple" | "complex";
  status: "pending" | "active" | "done";
}

export interface AgentEvent {
  type: "stage" | "subtask" | "code" | "review" | "complete" | "error";
  [key: string]: unknown;
}

export interface FileChange {
  path: string;
  content: string;
}

type SSEWriter = (event: AgentEvent) => void;

// ===== Model Helpers =====

function getModel(complexity: "simple" | "complex") {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  const modelId = selectModel(complexity, "auto");

  if (modelId === "gpt-4o-mini" && hasOpenAI) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o-mini");
  }
  if (hasAnthropic) {
    return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })("claude-sonnet-4-20250514");
  }
  if (hasOpenAI) {
    return createOpenAI({ apiKey: process.env.OPENAI_API_KEY! })("gpt-4o");
  }
  throw new Error("No AI provider configured");
}

// ===== 1. Planner Agent =====

const PlanSchema = z.object({
  subtasks: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      targetFile: z.string(),
      complexity: z.enum(["simple", "complex"]),
    }),
  ),
});

async function plannerAgent(
  userRequest: string,
  fileContext: Record<string, string>,
  emit: SSEWriter,
): Promise<SubTask[]> {
  emit({ type: "stage", stage: "planning" });

  const fileList = Object.keys(fileContext).join(", ");
  const model = getModel("complex");

  const result = await generateObject({
    model,
    schema: PlanSchema,
    prompt: `You are a senior full-stack planner. Break down the user's request into subtasks.

Available files: ${fileList}

File contents:
${Object.entries(fileContext)
  .map(([name, content]) => `--- ${name} ---\n${content.slice(0, 1000)}`)
  .join("\n\n")}

User request: ${userRequest}

Rules:
- Each subtask should target exactly one file
- Assign complexity: "simple" for CSS/text changes, "complex" for logic/structure changes
- Use IDs like "task-1", "task-2", etc.
- Maximum 5 subtasks
- If the request involves creating a new app, plan for: index.html, style.css, data.js, ui.js, app.js`,
  });

  const subtasks: SubTask[] = result.object.subtasks.map((st) => ({
    ...st,
    status: "pending" as const,
  }));

  for (const st of subtasks) {
    emit({ type: "subtask", id: st.id, description: st.description, status: "pending" });
  }

  return subtasks;
}

// ===== 2. Coder Agent =====

async function coderAgent(
  subtask: SubTask,
  userRequest: string,
  fileContext: Record<string, string>,
  emit: SSEWriter,
): Promise<FileChange> {
  emit({ type: "subtask", id: subtask.id, description: subtask.description, status: "active" });

  const model = getModel(subtask.complexity);
  const existingContent = fileContext[subtask.targetFile] ?? "";

  const result = streamText({
    model,
    prompt: `You are a senior developer. Generate COMPLETE file content for: ${subtask.targetFile}

Task: ${subtask.description}
Overall request: ${userRequest}

Current file content:
${existingContent || "(empty/new file)"}

Rules:
- Output ONLY the complete file content, no markdown fences, no explanations
- The output replaces the entire file
- For HTML: complete document with <!DOCTYPE html>
- For JS: use var, function declarations, addEventListener
- For CSS: complete stylesheet
- Keep code clean, production-ready`,
    maxOutputTokens: 8192,
  });

  let content = "";
  for await (const chunk of result.textStream) {
    content += chunk;
  }

  emit({ type: "code", file: subtask.targetFile, content });
  emit({ type: "subtask", id: subtask.id, description: subtask.description, status: "done" });

  return { path: subtask.targetFile, content };
}

// ===== 3. Reviewer Agent =====

const ReviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()),
});

async function reviewerAgent(
  files: FileChange[],
  userRequest: string,
  emit: SSEWriter,
): Promise<{ passed: boolean; issues: string[] }> {
  emit({ type: "stage", stage: "reviewing" });

  const model = getModel("complex");

  const fileContents = files
    .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 2000)}`)
    .join("\n\n");

  const result = await generateObject({
    model,
    schema: ReviewSchema,
    prompt: `You are a senior code reviewer. Review the generated code for quality and correctness.

User request: ${userRequest}

Generated files:
${fileContents}

Check for:
1. Missing variable declarations
2. Undefined references across files (data.js→ui.js→app.js)
3. Missing HTML elements referenced in JS
4. CSS syntax errors
5. Overall completeness vs the user request

If everything looks good, set passed=true and issues=[].
If there are problems, set passed=false and list specific issues.
Maximum 5 issues.`,
  });

  const review = result.object;
  if (review.issues.length > 0) {
    emit({ type: "review", issues: review.issues });
  }
  return review;
}

// ===== 4. Fixer Agent =====

async function fixerAgent(
  files: FileChange[],
  issues: string[],
  emit: SSEWriter,
): Promise<FileChange[]> {
  emit({ type: "stage", stage: "fixing" });

  const model = getModel("complex");

  const fileContents = files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const result = streamText({
    model,
    prompt: `You are a senior developer fixing code issues.

Current files:
${fileContents}

Issues to fix:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Output ALL files with fixes applied. Format each file as:
--- filename.ext ---
(complete file content)

Rules:
- Output COMPLETE file contents (not just patches)
- Fix all listed issues
- Don't introduce new issues
- Maintain the same file structure`,
    maxOutputTokens: 16384,
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  // Parse fixed files from output
  const fixedFiles: FileChange[] = [];
  const fileRegex = /---\s+(\S+)\s+---\n([\s\S]*?)(?=---\s+\S+\s+---|$)/g;
  let match;
  while ((match = fileRegex.exec(fullText)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    if (path && content) {
      fixedFiles.push({ path, content });
      emit({ type: "code", file: path, content });
    }
  }

  // If parsing failed, return original files
  return fixedFiles.length > 0 ? fixedFiles : files;
}

// ===== Main Orchestrator =====

export async function runAgentPipeline(
  userRequest: string,
  fileContext: Record<string, string>,
  emit: SSEWriter,
): Promise<void> {
  try {
    // 1. Plan
    const subtasks = await plannerAgent(userRequest, fileContext, emit);

    // 2. Code (sequential for now to avoid rate limits)
    emit({ type: "stage", stage: "coding" });
    let files: FileChange[] = [];
    for (const subtask of subtasks) {
      const file = await coderAgent(subtask, userRequest, fileContext, emit);
      files.push(file);
    }

    // 3. Review
    const review = await reviewerAgent(files, userRequest, emit);

    // 4. Fix if needed (max 2 rounds)
    let fixRound = 0;
    let currentIssues = review.issues;
    while (!review.passed && currentIssues.length > 0 && fixRound < 2) {
      fixRound++;
      files = await fixerAgent(files, currentIssues, emit);

      // Re-review
      const reReview = await reviewerAgent(files, userRequest, emit);
      if (reReview.passed) break;
      currentIssues = reReview.issues;
    }

    // 5. Complete
    emit({ type: "stage", stage: "complete" });
    emit({ type: "complete", files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    emit({ type: "error", message });
  }
}
