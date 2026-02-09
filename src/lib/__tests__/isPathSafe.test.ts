import { describe, it, expect } from "vitest";

// Re-create the isPathSafe function from save-code route for testing
const ALLOWED_EXTENSIONS = /\.(html|htm|css|js|ts|json|md|txt|svg|xml)$/i;
const SAFE_FILENAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function isPathSafe(path: string): boolean {
  if (!path || typeof path !== "string") return false;
  if (/[\x00-\x1f]/.test(path)) return false;
  if (path.includes("..") || path.includes("/") || path.includes("\\")) return false;
  if (path.startsWith(".")) return false;
  if (!SAFE_FILENAME.test(path)) return false;
  if (!ALLOWED_EXTENSIONS.test(path)) return false;
  if (path.length > 100) return false;
  return true;
}

describe("isPathSafe", () => {
  it("allows valid filenames", () => {
    expect(isPathSafe("index.html")).toBe(true);
    expect(isPathSafe("style.css")).toBe(true);
    expect(isPathSafe("app.js")).toBe(true);
    expect(isPathSafe("data.json")).toBe(true);
    expect(isPathSafe("README.md")).toBe(true);
    expect(isPathSafe("my-file.ts")).toBe(true);
    expect(isPathSafe("icon.svg")).toBe(true);
  });

  it("blocks path traversal", () => {
    expect(isPathSafe("../etc/passwd")).toBe(false);
    expect(isPathSafe("..\\windows\\system32")).toBe(false);
    expect(isPathSafe("foo/../bar.html")).toBe(false);
  });

  it("blocks directory paths", () => {
    expect(isPathSafe("src/index.html")).toBe(false);
    expect(isPathSafe("public\\style.css")).toBe(false);
  });

  it("blocks hidden files", () => {
    expect(isPathSafe(".env")).toBe(false);
    expect(isPathSafe(".gitignore")).toBe(false);
    expect(isPathSafe(".htaccess")).toBe(false);
  });

  it("blocks NUL bytes and control chars", () => {
    expect(isPathSafe("file\x00.html")).toBe(false);
    expect(isPathSafe("file\x01.js")).toBe(false);
  });

  it("blocks disallowed extensions", () => {
    expect(isPathSafe("virus.exe")).toBe(false);
    expect(isPathSafe("script.sh")).toBe(false);
    expect(isPathSafe("data.php")).toBe(false);
    expect(isPathSafe("config.py")).toBe(false);
  });

  it("blocks empty and invalid inputs", () => {
    expect(isPathSafe("")).toBe(false);
    expect(isPathSafe(null as unknown as string)).toBe(false);
    expect(isPathSafe(undefined as unknown as string)).toBe(false);
  });

  it("blocks overly long filenames", () => {
    expect(isPathSafe("a".repeat(101) + ".html")).toBe(false);
  });

  it("blocks special characters", () => {
    expect(isPathSafe("file name.html")).toBe(false); // space
    expect(isPathSafe("file<>.html")).toBe(false);
    expect(isPathSafe("file|.html")).toBe(false);
  });
});
