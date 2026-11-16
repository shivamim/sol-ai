import { generateDraft, planEvidence, type ProviderKind } from "./ai";
import { quality } from "./domain";
import {
  retrieveEvidence,
  EvidenceValidationError,
  type KnowledgeDocument,
} from "./rag";
export type WorkflowStep = {
  tool:
    | "plan"
    | "select_resume"
    | "retrieve_evidence"
    | "generate_draft"
    | "repair_citations"
    | "validate"
    | "human_review";
  status: "completed" | "waiting";
  detail: string;
};
export async function prepareApplication(input: {
  userId: string;
  provider: ProviderKind;
  skills: string[];
  role: string;
  description: string;
  signature: string;
  resumeId?: string;
  resumes: {
    id: string;
    name: string;
    role: string;
    text: string;
    approved: boolean;
    hash: string;
  }[];
}) {
  const steps: WorkflowStep[] = [];
  steps.push({
    tool: "plan",
    status: "completed",
    detail: input.description.trim()
      ? "Retrieve approved evidence relevant to the provided opportunity, then prepare a reviewed introduction."
      : "No vacancy evidence supplied: prepare an honest expression of interest.",
  });
  const approved = input.resumes.filter((r) => r.approved);
  if (!approved.length) throw new Error("Upload and approve a resume first");
  const profileDoc: KnowledgeDocument = {
    id: "profile:confirmed-skills",
    label: "Confirmed profile skills",
    text: input.skills.join(", "),
    approved: true,
    kind: "profile",
  };
  const scored = approved
    .map((resume) => {
      const retrieval = retrieveEvidence(
        [
          {
            id: resume.id,
            label: resume.name,
            text: resume.text,
            approved: true,
            kind: "resume",
          },
        ],
        input.skills,
        input.role,
        input.description,
      );
      return {
        resume,
        skills: retrieval.generationSkills,
        score:
          retrieval.evidence.reduce((n, e) => n + e.score, 0) +
          (resume.role.toLowerCase() === input.role.toLowerCase() ? 5 : 0),
      };
    })
    .sort(
      (a, b) => b.score - a.score || a.resume.id.localeCompare(b.resume.id),
    );
  let focusSkills = input.skills;
  let resume = input.resumeId
    ? approved.find((r) => r.id === input.resumeId)
    : scored[0]?.resume;
  if (!input.resumeId && scored.length > 1) {
    const candidates = scored
      .slice(0, 3)
      .map((item, index) => ({
        code: `R${index + 1}`,
        role: item.resume.role,
        skills: item.skills,
      }));
    const requested = retrieveEvidence(
      [profileDoc],
      input.skills,
      input.role,
      input.description,
    ).generationSkills;
    const plan = await planEvidence(
      input.userId,
      input.provider,
      input.role,
      candidates,
      requested,
    );
    if (plan.tool === "request_review")
      throw new Error(
        "The planner needs more approved evidence. Review your profile and resume, or explicitly choose an approved version.",
      );
    const index = candidates.findIndex((c) => c.code === plan.resume);
    resume = scored[index]?.resume;
    focusSkills = plan.focusSkills;
    steps[0] = {
      tool: "plan",
      status: "completed",
      detail: `AI selected retrieve_evidence using ${plan.reason}; only approved resume codes and skill categories were available. No sending tool was exposed.`,
    };
  }
  if (!resume) throw new Error("The selected resume is missing or unapproved");
  steps.push({
    tool: "select_resume",
    status: "completed",
    detail: input.resumeId
      ? "User-selected approved immutable resume version."
      : "Selected by approved-document lexical relevance and target-role alignment.",
  });
  const retrieval = retrieveEvidence(
    [
      profileDoc,
      {
        id: resume.id,
        label: resume.name,
        text: resume.text,
        approved: true,
        kind: "resume",
      },
    ],
    focusSkills,
    input.role,
    input.description,
  );
  steps.push({
    tool: "retrieve_evidence",
    status: "completed",
    detail: `Retrieved ${retrieval.evidence.length} approved passages; ${retrieval.generationSkills.length} relevant skill categories may cross the provider boundary.`,
  });
  if (!retrieval.generationSkills.length)
    throw new Error(
      retrieval.warnings[0] || "No approved skill evidence found",
    );
  let draft;
  try {
    draft = await generateDraft(
      input.userId,
      input.provider,
      retrieval.generationSkills,
      input.role,
      retrieval,
    );
  } catch (error) {
    if (!(error instanceof EvidenceValidationError)) throw error;
    steps.push({
      tool: "repair_citations",
      status: "completed",
      detail:
        "First output used invalid evidence references. One budgeted correction was requested; no external actions were available.",
    });
    draft = await generateDraft(
      input.userId,
      input.provider,
      retrieval.generationSkills,
      input.role,
      retrieval,
      true,
    );
  }
  steps.push({
    tool: "generate_draft",
    status: "completed",
    detail: `Generated with ${draft.provider}; raw source passages and job notes stayed local.`,
  });
  const body = `Hello,\n\n${draft.body}\n\n${input.signature}`;
  const errors = quality(draft.subject, body);
  if (errors.length) throw new Error(errors.join("; "));
  steps.push({
    tool: "validate",
    status: "completed",
    detail:
      "Validated structured output, allowed evidence references, length, headers and unresolved placeholders. Factual entailment still requires your review.",
  });
  steps.push({
    tool: "human_review",
    status: "waiting",
    detail:
      "No send tool is available to the writing workflow. Review every claim and explicitly approve content before sending.",
  });
  return {
    resume,
    draft,
    body,
    intelligence: {
      version: "bounded-rag-agent-v1",
      retrieval,
      steps,
      citations: draft.evidenceIds || [],
      resumeHash: resume.hash,
      reviewRequired: true,
    },
  };
}
