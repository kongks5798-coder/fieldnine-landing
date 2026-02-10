/**
 * Client-side JavaScript code validation.
 * Catches syntax errors before code is inserted into the editor/preview.
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

  // 2. Check blocklisted variable names (common AI hallucinations)
  for (const blocked of BLOCKLIST) {
    // Match: standalone usage like `pp.`, `pp =`, `pp[`, `pp(`, `pp;`
    const pattern = new RegExp(`(?<![.\\w$])${blocked}\\s*(?:\\.|\\[|=(?!=)|\\(|;|,|\\+|\\-)`, "g");
    if (pattern.test(code)) {
      // Verify it's NOT declared
      const declPattern = new RegExp(`(?:const|let|var|function)\\s+${blocked}\\b`);
      if (!declPattern.test(code)) {
        errors.push(`Blocked undeclared variable: "${blocked}"`);
      }
    }
  }

  // 3. Detect obviously undefined variables
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

  // Collect array destructuring
  const arrDestructRegex = /(?:const|let|var)\s*\[([^\]]+)\]/g;
  while ((m = arrDestructRegex.exec(code)) !== null) {
    m[1].split(",").forEach((p) => {
      const name = p.trim().replace(/\s*=.*$/, "");
      if (name && name !== "...") declared.add(name);
    });
  }

  // Built-in globals
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
    "HTMLElement", "Element", "Node", "Event", "CustomEvent",
    "IntersectionObserver", "MutationObserver", "ResizeObserver",
    "Image", "Audio", "FileReader", "Blob", "FormData",
    "this", "arguments", "true", "false", "new", "class", "super", "import", "export",
    "globalThis", "self", "top", "parent", "frames", "screen", "crypto",
    "AbortController", "TextEncoder", "TextDecoder", "Headers", "Request", "Response",
    "e", "el", "i", "j", "k", "x", "y", "n", "p", "s", "t", "v", "w", "h",
    "err", "res", "req", "data", "item", "event", "target", "value", "key", "idx",
    "cb", "fn", "ctx", "ref", "btn", "img", "svg", "div", "sec", "nav", "ul", "li",
  ]);

  // Check property access on undeclared variables: `foo.bar`, `foo[x]`, `foo()`
  const propAccessRegex = /(?:^|[;{}\n,=(!\s])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:\.|(?:\[))/gm;
  while ((m = propAccessRegex.exec(code)) !== null) {
    const name = m[1];
    if (name.length >= 2 && name.length <= 5 && !declared.has(name) && !builtins.has(name)) {
      const charBefore = code[m.index] || "";
      if (charBefore === ".") continue; // property of something else
      if (!errors.some((e) => e.includes(`"${name}"`))) {
        errors.push(`Likely undefined variable: "${name}" (used with property access)`);
      }
    }
  }

  // Check assignment to undeclared short variables: `foo = ...`
  const assignRegex = /(?:^|[;{}\n,])\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=(?!=)/gm;
  while ((m = assignRegex.exec(code)) !== null) {
    const name = m[1];
    if (name.length >= 2 && name.length <= 4 && !declared.has(name) && !builtins.has(name)) {
      if (!errors.some((e) => e.includes(`"${name}"`))) {
        errors.push(`Likely undefined variable: "${name}" (assigned without declaration)`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
