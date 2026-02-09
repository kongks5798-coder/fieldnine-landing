import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../rateLimit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const key = `test-${Date.now()}`;
    const result = checkRateLimit(key, { limit: 5, windowSec: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("counts down remaining tokens", () => {
    const key = `test-count-${Date.now()}`;
    checkRateLimit(key, { limit: 3, windowSec: 60 });
    const r2 = checkRateLimit(key, { limit: 3, windowSec: 60 });
    expect(r2.remaining).toBeLessThan(3);
    expect(r2.allowed).toBe(true);
  });

  it("blocks when limit exceeded", () => {
    const key = `test-block-${Date.now()}`;
    const config = { limit: 2, windowSec: 60 };
    checkRateLimit(key, config); // 1
    checkRateLimit(key, config); // 2
    const r3 = checkRateLimit(key, config); // should be blocked
    expect(r3.allowed).toBe(false);
    expect(r3.retryAfterSec).toBeGreaterThan(0);
  });

  it("uses different buckets for different keys", () => {
    const key1 = `test-a-${Date.now()}`;
    const key2 = `test-b-${Date.now()}`;
    const config = { limit: 1, windowSec: 60 };
    checkRateLimit(key1, config);
    const r2 = checkRateLimit(key2, config);
    expect(r2.allowed).toBe(true);
  });
});
