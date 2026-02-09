/**
 * Environment variable validation.
 * Logs warnings at server startup for missing critical env vars.
 * Does NOT throw — allows graceful degradation.
 */

interface EnvVar {
  key: string;
  required: boolean;
  hint: string;
}

const ENV_VARS: EnvVar[] = [
  { key: "ACCESS_TOKEN_SECRET", required: true, hint: "Auth will fail — all requests blocked" },
  { key: "OPENAI_API_KEY", required: false, hint: "AI chat (OpenAI) unavailable" },
  { key: "ANTHROPIC_API_KEY", required: false, hint: "AI chat (Anthropic) unavailable" },
  { key: "GITHUB_TOKEN", required: false, hint: "Shadow commit + git history unavailable" },
  { key: "GITHUB_REPO", required: false, hint: "Defaults to kongks5798-coder/field-nine-os" },
];

export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.key];
    if (!value) {
      const level = v.required ? "ERROR" : "WARN";
      console.warn(`[ENV ${level}] ${v.key} not set — ${v.hint}`);
      if (v.required) missing.push(v.key);
    }
  }

  // Check that at least one AI provider is configured
  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    console.warn("[ENV WARN] No AI provider configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)");
  }

  if (missing.length > 0) {
    console.error(`[ENV] ${missing.length} required variable(s) missing: ${missing.join(", ")}`);
  } else {
    console.log("[ENV] All required environment variables OK");
  }

  return { valid: missing.length === 0, missing };
}
