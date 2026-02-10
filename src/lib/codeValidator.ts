/**
 * Client-side JavaScript code validation.
 * Only catches real syntax errors and known AI hallucination variables.
 * Minimizes false positives to prevent infinite auto-fix loops.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Known AI mistake variables — always flag these */
const BLOCKLIST = new Set([
  "pp", "el2", "btn2", "div2", "sec2", "txt", "hdr", "ftr",
  "cnt", "lst", "itm", "wrp", "tgl", "inp2", "lbl", "dlg",
]);

/**
 * Sanitize AI-generated JS: strip non-JS first lines (stray filenames, labels).
 * Instead of matching known filenames, we check if the first line is a valid JS start.
 * If not, we strip it. This catches "pp.js", "app.js", "a.js", "script", etc.
 */
export function sanitizeJS(code: string): string {
  // Patterns that indicate a valid JS first line (keep these)
  const VALID_JS_START =
    /^\s*(?:\/\/|\/\*|'use strict'|"use strict"|document\b|window\b|const\b|let\b|var\b|function\b|class\b|import\b|export\b|if\b|for\b|while\b|switch\b|try\b|async\b|await\b|return\b|\(|;|\{|\[|void\b|typeof\b|new\b|delete\b|throw\b|!|~|-|\+|`)/;

  const firstNewline = code.search(/[\r\n]/);
  if (firstNewline === -1) return code; // single-line code, keep as-is

  const firstLine = code.slice(0, firstNewline);

  // If the first line looks like valid JS, keep everything
  if (VALID_JS_START.test(firstLine)) return code;

  // Otherwise, strip the first line (it's likely a stray filename/label)
  return code.slice(firstNewline).replace(/^[\r\n]+/, "");
}

/** Validate JavaScript syntax using Function constructor + blocklist only */
export function validateJS(code: string): ValidationResult {
  const errors: string[] = [];

  // 1. Syntax check via Function constructor (catches real errors)
  try {
    new Function(code);
  } catch (e) {
    if (e instanceof SyntaxError) {
      errors.push(`SyntaxError: ${e.message}`);
    }
  }

  // 2. Check blocklisted variable names (common AI hallucinations)
  for (const blocked of BLOCKLIST) {
    const pattern = new RegExp(`(?<![.\\w$])${blocked}\\s*(?:\\.|\\[|=(?!=)|\\(|;|,|\\+|\\-)`, "g");
    if (pattern.test(code)) {
      const declPattern = new RegExp(`(?:const|let|var|function)\\s+${blocked}\\b`);
      if (!declPattern.test(code)) {
        errors.push(`Blocked undeclared variable: "${blocked}"`);
      }
    }
  }

  // NOTE: Removed the "detect undefined variables" heuristic (sections 3+)
  // because it produced massive false positives on JS keywords (if, for, while),
  // CSS functions in template literals (hsl, rgb), and common names (app, nav).
  // The Function constructor check (step 1) catches real syntax errors.
  // The blocklist (step 2) catches known AI hallucinations.

  return { valid: errors.length === 0, errors };
}

/* ===== Code Completeness Check (anti-truncation guard) ===== */

/**
 * Strip string literals and comments so brace counting isn't fooled.
 * Handles unterminated strings gracefully (truncated code).
 */
function stripStringsAndComments(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")             // single-line comments
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, "") // multi-line comments (or unterminated)
    .replace(/`(?:[^`\\]|\\.)*(`|$)/g, "") // template literals
    .replace(/"(?:[^"\\]|\\.)*?("|$)/g, "") // double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*?('|$)/g, ""); // single-quoted strings
}

/**
 * Detect truncated/incomplete code by checking balanced braces.
 * Returns { complete: true } or { complete: false, reason: "..." }.
 */
export function isCodeComplete(
  code: string,
  language: string
): { complete: boolean; reason?: string } {
  const trimmed = code.trim();
  if (!trimmed) return { complete: true };

  if (language === "javascript" || language === "typescript") {
    const stripped = stripStringsAndComments(trimmed);
    const curlyOpen = (stripped.match(/\{/g) || []).length;
    const curlyClose = (stripped.match(/\}/g) || []).length;
    if (curlyOpen !== curlyClose) {
      return { complete: false, reason: `Unbalanced {}: ${curlyOpen} open, ${curlyClose} close` };
    }
    const parenOpen = (stripped.match(/\(/g) || []).length;
    const parenClose = (stripped.match(/\)/g) || []).length;
    if (parenOpen !== parenClose) {
      return { complete: false, reason: `Unbalanced (): ${parenOpen} open, ${parenClose} close` };
    }
    return { complete: true };
  }

  if (language === "css") {
    const stripped = stripStringsAndComments(trimmed);
    const curlyOpen = (stripped.match(/\{/g) || []).length;
    const curlyClose = (stripped.match(/\}/g) || []).length;
    if (curlyOpen !== curlyClose) {
      return { complete: false, reason: `Unbalanced {}: ${curlyOpen} open, ${curlyClose} close` };
    }
    return { complete: true };
  }

  if (language === "html") {
    if (/<html[\s>]/i.test(trimmed) && !/<\/html\s*>/i.test(trimmed)) {
      return { complete: false, reason: "Missing </html> closing tag" };
    }
    return { complete: true };
  }

  return { complete: true };
}

/** Map file extension to language for completeness check */
export function extToLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "js" || ext === "mjs") return "javascript";
  if (ext === "ts" || ext === "tsx") return "typescript";
  if (ext === "css") return "css";
  if (ext === "html" || ext === "htm") return "html";
  return ext;
}
