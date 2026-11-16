import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("../src/lib/ai", () => ({
  generateDraft: vi.fn(),
  planEvidence: vi.fn(),
}));
import { generateDraft, planEvidence } from "../src/lib/ai";
import { prepareApplication } from "../src/lib/workflow";
import { EvidenceValidationError } from "../src/lib/rag";
const resumes = [
  {
    id: "sql",
    name: "Private SQL Resume",
    role: "Data Analyst",
    text: "SQL reporting",
    hash: "hash-sql",
    approved: true,
  },
  {
    id: "python",
    name: "Private Python Resume",
    role: "Data Scientist",
    text: "Python analysis",
    hash: "hash-python",
    approved: true,
  },
];
const input = {
  userId: "user",
  provider: "groq" as const,
  skills: ["SQL", "Python"],
  role: "Data Analyst",
  description: "SQL reporting",
  signature: "Local Candidate",
  resumes,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(generateDraft).mockImplementation(
    async (_u, _p, _s, _r, retrieval) => ({
      subject: "Expression of interest",
      body: "I would welcome the opportunity to discuss suitable positions in data analytics. My confirmed skills include SQL. My resume is attached for your review, and I would be happy to share further information.",
      provider: "groq",
      model: "test-model",
      evidenceIds: retrieval?.evidence.slice(0, 1).map((e) => e.id),
    }),
  );
  vi.mocked(planEvidence).mockResolvedValue({
    tool: "retrieve_evidence",
    resume: "R1",
    focusSkills: ["SQL"],
    reason: "evidence_overlap",
  });
});
describe("bounded planning and tool workflow", () => {
  it("uses AI planning for multiple approved resumes, then waits for human review", async () => {
    const run = await prepareApplication(input);
    expect(planEvidence).toHaveBeenCalledTimes(1);
    expect(run.resume.id).toBe("sql");
    expect(run.intelligence.steps.at(-1)).toMatchObject({
      tool: "human_review",
      status: "waiting",
    });
    expect(
      run.intelligence.steps.some((step) => String(step.tool) === "send_email"),
    ).toBe(false);
  });
  it("skips planning when the user explicitly chooses a resume", async () => {
    const run = await prepareApplication({ ...input, resumeId: "sql" });
    expect(planEvidence).not.toHaveBeenCalled();
    expect(run.resume.id).toBe("sql");
  });
  it("stops when the planner requests human review", async () => {
    vi.mocked(planEvidence).mockResolvedValue({
      tool: "request_review",
      resume: "",
      focusSkills: [],
      reason: "insufficient_evidence",
    });
    await expect(prepareApplication(input)).rejects.toThrow(
      /more approved evidence/,
    );
    expect(generateDraft).not.toHaveBeenCalled();
  });
  it("does not generate without approved evidence", async () => {
    await expect(
      prepareApplication({
        ...input,
        resumes: resumes.map((r) => ({ ...r, approved: false })),
      }),
    ).rejects.toThrow(/approve a resume/);
    expect(generateDraft).not.toHaveBeenCalled();
  });
  it("repairs unsupported citations at most once", async () => {
    vi.mocked(generateDraft).mockRejectedValue(
      new EvidenceValidationError("bad citations"),
    );
    await expect(
      prepareApplication({ ...input, resumeId: "sql" }),
    ).rejects.toThrow("bad citations");
    expect(generateDraft).toHaveBeenCalledTimes(2);
    expect(vi.mocked(generateDraft).mock.calls[1][5]).toBe(true);
  });
  it("does not retry quota/provider failures", async () => {
    vi.mocked(generateDraft).mockRejectedValue(
      new Error("Daily AI budget exhausted"),
    );
    await expect(
      prepareApplication({ ...input, resumeId: "sql" }),
    ).rejects.toThrow(/budget exhausted/);
    expect(generateDraft).toHaveBeenCalledTimes(1);
  });
  it("keeps private resume names/text out of planner input", async () => {
    await prepareApplication(input);
    const plannerInput = JSON.stringify(vi.mocked(planEvidence).mock.calls[0]);
    expect(plannerInput).not.toContain("Private SQL Resume");
    expect(plannerInput).not.toContain("SQL reporting");
    expect(plannerInput).not.toContain("Local Candidate");
  });
});
