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

/** Sanitize AI-generated JS: strip known stray lines like "pp.js" at top */
export function sanitizeJS(code: string): string {
  // Strip any non-JS first line that looks like a stray filename or label
  // Handles: "pp.js", "pp", "app.js", "script.js", etc.
  // Also handles \r\n line endings and leading/trailing whitespace
  return code.replace(/^\s*(?:pp\.js|pp|app\.js|script\.js|main\.js|index\.js)\s*[\r\n]+/, "");
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
