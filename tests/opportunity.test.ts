import { describe, it, expect } from "vitest";
import {
  analyzeOpportunity,
  normalizeWriting,
  auditDraft,
} from "../src/lib/opportunity";
import { quality } from "../src/lib/domain";
describe("opportunity and writing checks", () => {
  it("separates confirmed matches from unconfirmed mentions", () => {
    const result = analyzeOpportunity(
      ["SQL"],
      "Data Analyst",
      "SQL and Python",
    );
    expect(result.matchedSkills).toEqual(["SQL"]);
    expect(result.missingSkills).toEqual(["Python"]);
    expect(result.coverage).toBe(50);
    expect(result.unknownRequirements.length).toBeGreaterThan(0);
  });
  it("does not manufacture coverage without a posting", () => {
    expect(analyzeOpportunity(["SQL"], "Data Analyst", "").coverage).toBeNull();
  });
  it("normalizes em dashes in generated writing", () => {
    expect(normalizeWriting("SQL\u2014reporting")).toBe("SQL, reporting");
    expect(quality("Hello", "x".repeat(100) + "\u2014")).toContain(
      "Use commas or full stops instead of em dashes",
    );
  });
  it.each([
    "I have 10 years of experience",
    "Improved outcomes by 25%",
    "Saved 2 million in expenses",
  ])("flags unsupported numeric claims: %s", (text) => {
    expect(auditDraft(text, ["SQL"]).unverifiedMetrics).toBe(true);
  });
  it("flags a fabricated skill", () => {
    expect(
      auditDraft("I use SQL and Python", ["SQL"]).unsupportedSkills,
    ).toEqual(["Python"]);
  });
});
