import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("../src/lib/ai", () => ({ decideAgentAction: vi.fn() }));
import { decideAgentAction } from "../src/lib/ai";
import { runEvidenceAgent } from "../src/lib/agent";
const input = {
  userId: "a",
  provider: "groq" as const,
  role: "Data Analyst",
  skills: ["SQL"],
  description: "SQL reporting",
  missingSkills: ["Python"],
  candidates: [
    {
      id: "private-id",
      name: "Jane Doe Resume",
      role: "Data Analyst",
      text: "Jane Doe SQL jane@example.com",
      hash: "hash",
      approved: true,
    },
  ],
};
beforeEach(() => vi.resetAllMocks());
describe("observe-and-act agent loop", () => {
  it("retrieves evidence then feeds observations into a second decision", async () => {
    vi.mocked(decideAgentAction)
      .mockResolvedValueOnce({
        tool: "retrieve_evidence",
        resume: "R1",
        focusSkills: ["SQL"],
        reason: "evidence_overlap",
      })
      .mockResolvedValueOnce({
        tool: "draft_application",
        resume: "R1",
        focusSkills: ["SQL"],
        reason: "sufficient_evidence",
      });
    const checkpoint = vi.fn(async () => {});
    const result = await runEvidenceAgent({ ...input, onStep: checkpoint });
    expect(result.resume.id).toBe("private-id");
    expect(decideAgentAction).toHaveBeenCalledTimes(2);
    const observation = vi.mocked(decideAgentAction).mock.calls[1][2];
    expect(observation.stage).toBe("observe");
    expect(observation.evidence.length).toBeGreaterThan(0);
    expect(JSON.stringify(observation)).not.toMatch(
      /Jane Doe|jane@example.com|private-id/,
    );
    expect(checkpoint).toHaveBeenCalledTimes(4);
  });
  it("can stop before retrieval", async () => {
    vi.mocked(decideAgentAction).mockResolvedValue({
      tool: "request_review",
      resume: "",
      focusSkills: [],
      reason: "insufficient_evidence",
    });
    await expect(runEvidenceAgent(input)).rejects.toThrow(
      /more approved evidence/,
    );
    expect(decideAgentAction).toHaveBeenCalledTimes(1);
  });
  it("can stop after inspecting evidence", async () => {
    vi.mocked(decideAgentAction)
      .mockResolvedValueOnce({
        tool: "retrieve_evidence",
        resume: "R1",
        focusSkills: ["SQL"],
        reason: "evidence_overlap",
      })
      .mockResolvedValueOnce({
        tool: "request_review",
        resume: "",
        focusSkills: [],
        reason: "skill_gap",
      });
    await expect(runEvidenceAgent(input)).rejects.toThrow(
      /human clarification/,
    );
    expect(decideAgentAction).toHaveBeenCalledTimes(2);
  });
  it("does not execute more decisions after a provider failure", async () => {
    vi.mocked(decideAgentAction).mockRejectedValue(
      new Error("Provider rate limited"),
    );
    await expect(runEvidenceAgent(input)).rejects.toThrow(/rate limited/);
    expect(decideAgentAction).toHaveBeenCalledTimes(1);
  });
});
