import { describe, it, expect } from "vitest";
import { parseAIResponse } from "../parseAIResponse";

describe("parseAIResponse", () => {
  it("extracts HTML code block with target comment", () => {
    const input = `설명입니다.

\`\`\`html
<!-- target: index.html -->
<!DOCTYPE html>
<html><body>Hello</body></html>
\`\`\``;

    const result = parseAIResponse(input);
    expect(result.codeBlocks).toHaveLength(1);
    expect(result.codeBlocks[0].targetFile).toBe("index.html");
    expect(result.codeBlocks[0].code).toContain("<!DOCTYPE html>");
    expect(result.codeBlocks[0].code).not.toContain("target:");
    expect(result.explanation).toBe("설명입니다.");
  });

  it("extracts multiple code blocks (html, css, js)", () => {
    const input = `코드 생성

\`\`\`html
<!-- target: index.html -->
<html></html>
\`\`\`

\`\`\`css
/* target: style.css */
body { color: red; }
\`\`\`

\`\`\`javascript
// target: app.js
console.log("hi");
\`\`\``;

    const result = parseAIResponse(input);
    expect(result.codeBlocks).toHaveLength(3);
    expect(result.codeBlocks[0].targetFile).toBe("index.html");
    expect(result.codeBlocks[1].targetFile).toBe("style.css");
    expect(result.codeBlocks[2].targetFile).toBe("app.js");
  });

  it("uses default file mapping when no target comment", () => {
    const input = `\`\`\`css
body { margin: 0; }
\`\`\``;

    const result = parseAIResponse(input);
    expect(result.codeBlocks[0].targetFile).toBe("style.css");
  });

  it("ignores unknown languages (python, bash)", () => {
    const input = `\`\`\`python
print("hello")
\`\`\`

\`\`\`html
<div>test</div>
\`\`\``;

    const result = parseAIResponse(input);
    expect(result.codeBlocks).toHaveLength(1);
    expect(result.codeBlocks[0].language).toBe("html");
  });

  it("handles empty input", () => {
    const result = parseAIResponse("");
    expect(result.codeBlocks).toHaveLength(0);
    expect(result.explanation).toBe("");
  });

  it("handles text with no code blocks", () => {
    const result = parseAIResponse("그냥 설명만 있는 텍스트입니다.");
    expect(result.codeBlocks).toHaveLength(0);
    expect(result.explanation).toBe("그냥 설명만 있는 텍스트입니다.");
  });

  it("strips standalone filename lines from code", () => {
    const input = `\`\`\`javascript
app.js
console.log("test");
\`\`\``;

    const result = parseAIResponse(input);
    expect(result.codeBlocks[0].code).not.toMatch(/^app\.js/);
    expect(result.codeBlocks[0].code).toContain('console.log("test")');
  });
});
