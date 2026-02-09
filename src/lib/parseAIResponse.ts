export interface ParsedCodeBlock {
  language: string;
  code: string;
  targetFile: string;
}

export interface ParsedAIResponse {
  explanation: string;
  codeBlocks: ParsedCodeBlock[];
}

const TARGET_COMMENT_PATTERNS: Record<string, RegExp> = {
  html: /^<!--\s*target:\s*(.+?)\s*-->\s*\n?/,
  css: /^\/\*\s*target:\s*(.+?)\s*\*\/\s*\n?/,
  javascript: /^\/\/\s*target:\s*(.+?)\s*\n?/,
  js: /^\/\/\s*target:\s*(.+?)\s*\n?/,
  typescript: /^\/\/\s*target:\s*(.+?)\s*\n?/,
  ts: /^\/\/\s*target:\s*(.+?)\s*\n?/,
};

const LANGUAGE_TO_FILE: Record<string, string> = {
  html: "index.html",
  css: "style.css",
  javascript: "app.js",
  js: "app.js",
  typescript: "app.js",
  ts: "app.js",
};

export function parseAIResponse(text: string): ParsedAIResponse {
  const codeBlocks: ParsedCodeBlock[] = [];
  const fenceRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;

  let explanation = text;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(text)) !== null) {
    const language = (match[1] || "html").toLowerCase();
    let code = match[2].trimEnd();
    const targetFile = LANGUAGE_TO_FILE[language];

    // Skip unknown languages (python, bash, etc.) to avoid overwriting files
    if (!targetFile) continue;

    let resolvedTarget = targetFile;

    // Try to extract target comment from first line
    const pattern = TARGET_COMMENT_PATTERNS[language];
    if (pattern) {
      const targetMatch = code.match(pattern);
      if (targetMatch) {
        const extracted = targetMatch[1].trim();
        // Only accept filenames with valid extensions
        if (/\.\w+$/.test(extracted)) {
          resolvedTarget = extracted;
        }
        code = code.replace(pattern, "");
      }
    }

    codeBlocks.push({ language, code, targetFile: resolvedTarget });
  }

  // Remove code fences from explanation
  explanation = explanation.replace(/```(\w+)?\s*\n[\s\S]*?```/g, "").trim();

  return { explanation, codeBlocks };
}
