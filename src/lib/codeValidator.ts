/**
 * Client-side JavaScript code validation.
 * Catches syntax errors before code is inserted into the editor/preview.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate JavaScript syntax using Function constructor */
export function validateJS(code: string): ValidationResult {
  const errors: string[] = [];

  // 1. Syntax check via Function constructor
  try {
    new Function(code);
  } catch (e) {
    if (e instanceof SyntaxError) {
      errors.push(`SyntaxError: ${e.message}`);
    }
  }

  // 2. Detect obviously undefined variables (common AI mistakes)
  // Find variable usages that are NOT declared anywhere in the code
  const declared = new Set<string>();

  // Collect const/let/var/function declarations
  const declRegex = /(?:const|let|var|function)\s+([a-zA-Z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = declRegex.exec(code)) !== null) declared.add(m[1]);

  // Collect function parameter names
  const paramRegex = /(?:function\s*\w*|=>)\s*\(([^)]*)\)/g;
  while ((m = paramRegex.exec(code)) !== null) {
    m[1].split(",").forEach((p) => {
      const name = p.trim().replace(/\s*=.*$/, "");
      if (name) declared.add(name);
    });
  }

  // Collect destructuring and for-of/for-in vars
  const destructRegex = /(?:const|let|var)\s*\{([^}]+)\}/g;
  while ((m = destructRegex.exec(code)) !== null) {
    m[1].split(",").forEach((p) => {
      const name = p.trim().split(":").pop()?.trim().replace(/\s*=.*$/, "");
      if (name) declared.add(name);
    });
  }

  // Built-in globals that are always available
  const builtins = new Set([
    "window", "document", "console", "navigator", "location", "history",
    "setTimeout", "setInterval", "clearTimeout", "clearInterval",
    "requestAnimationFrame", "cancelAnimationFrame",
    "fetch", "URL", "URLSearchParams", "JSON", "Math", "Date", "Array",
    "Object", "String", "Number", "Boolean", "Promise", "Symbol", "Map", "Set",
    "parseInt", "parseFloat", "isNaN", "isFinite", "undefined", "null", "NaN",
    "Infinity", "Error", "TypeError", "RangeError", "SyntaxError",
    "alert", "confirm", "prompt", "atob", "btoa",
    "localStorage", "sessionStorage", "performance",
    "HTMLElement", "Event", "CustomEvent", "IntersectionObserver",
    "MutationObserver", "ResizeObserver", "Image", "Audio",
    "this", "arguments", "true", "false", "new", "class", "super", "import", "export",
    "e", "el", "i", "j", "k", "x", "y", "n", "p", "s", "t", "v", "w", "h",
    "err", "res", "req", "data", "item", "event", "target", "value", "key", "idx",
  ]);

  // Check standalone assignments/calls to undeclared 2-char+ variables
  // Pattern: identifier at start of expression that's not a property access
  const usageRegex = /(?:^|[;{}\n,=(])\s*([a-zA-Z_$][a-zA-Z0-9_$]+)\s*(?:\(|\.|\[|=(?!=)|;|\+|-|\*|\/|%)/gm;
  while ((m = usageRegex.exec(code)) !== null) {
    const name = m[1];
    if (name.length >= 2 && !declared.has(name) && !builtins.has(name)) {
      // Check if it's used as object property (preceded by .)
      const prefix = code.slice(Math.max(0, m.index - 1), m.index + 1);
      if (prefix.includes(".")) continue;

      // High-confidence: short unknown variable used as function call or assignment
      if (name.length <= 3) {
        errors.push(`Likely undefined variable: "${name}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
