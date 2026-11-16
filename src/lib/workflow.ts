import { runEvidenceAgent } from "./agent";
import {
  analyzeOpportunity,
  normalizeWriting,
  auditDraft,
} from "./opportunity";
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
    | "agent_decision"
    | "analyze_opportunity"
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
  mode?: "assisted" | "agentic";
  onStep?: (step: WorkflowStep) => Promise<void>;
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
  const record = async (step: WorkflowStep) => {
    steps.push(step);
    await input.onStep?.(step);
  };
  const opportunity = analyzeOpportunity(
    input.skills,
    input.role,
    input.description,
  );
  await record({
    tool: "analyze_opportunity",
    status: "completed",
    detail: `Detected ${opportunity.requestedSkills.length} known skill categories, ${opportunity.matchedSkills.length} confirmed matches and ${opportunity.missingSkills.length} unconfirmed categories. Eligibility needs your review.`,
  });
  const approved = input.resumes.filter((r) => r.approved);
  if (!approved.length) throw new Error("Upload and approve a resume first");
  const profile: KnowledgeDocument = {
    id: "profile:confirmed-skills",
    label: "Confirmed profile skills",
    text: input.skills.join(", "),
    approved: true,
    kind: "profile",
  };
  const document = (resume: (typeof approved)[number]): KnowledgeDocument => ({
    id: resume.id,
    label: resume.name,
    text: resume.text,
    approved: true,
    kind: "resume",
  });
  const scored = approved
    .map((resume) => {
      const retrieval = retrieveEvidence(
        [document(resume)],
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
  await record({
    tool: "plan",
    status: "completed",
    detail:
      input.mode === "agentic"
        ? "Start an observe-and-act loop. The agent can retrieve approved evidence, request review or draft after inspecting the results. Maximum two decisions and one writing call."
        : input.description.trim()
          ? "Retrieve approved evidence relevant to the provided description and prepare an introduction."
          : "No verified vacancy was supplied. Prepare an honest expression of interest.",
  });
  let resume = input.resumeId
    ? approved.find((r) => r.id === input.resumeId)
    : scored[0]?.resume;
  if (!resume) throw new Error("The selected resume is missing or unapproved");
  let focus = input.skills;
  let retrieval;
  if (input.mode === "agentic") {
    const result = await runEvidenceAgent({
      userId: input.userId,
      provider: input.provider,
      role: input.role,
      skills: input.skills,
      description: input.description,
      missingSkills: opportunity.missingSkills,
      candidates: input.resumeId ? [resume] : scored.map((s) => s.resume),
      onStep: record,
    });
    resume = result.resume;
    retrieval = result.retrieval;
  } else {
    if (!input.resumeId && scored.length > 1) {
      const candidates = scored
        .slice(0, 3)
        .map((item, index) => ({
          code: `R${index + 1}`,
          role: item.resume.role,
          skills: item.skills,
        }));
      const requested = retrieveEvidence(
        [profile],
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
      const selected = candidates.findIndex((c) => c.code === plan.resume);
      resume = scored[selected]?.resume;
      focus = plan.focusSkills;
      if (!resume) throw new Error("Planner selected an unavailable resume");
    }
    await record({
      tool: "select_resume",
      status: "completed",
      detail: input.resumeId
        ? "Selected the user-approved immutable resume version specified in the request."
        : "Selected an approved immutable resume using role alignment and source relevance.",
    });
    retrieval = retrieveEvidence(
      [profile, document(resume)],
      focus,
      input.role,
      input.description,
    );
    await record({
      tool: "retrieve_evidence",
      status: "completed",
      detail: `Retrieved ${retrieval.evidence.length} approved passages supporting ${retrieval.generationSkills.length} safe skill categories. Raw private passages stay local.`,
    });
  }
  if (!retrieval.generationSkills.length)
    throw new Error(
      "No approved skill evidence found. Confirm your profile and resume first.",
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
    if (!(error instanceof EvidenceValidationError) || input.mode === "agentic")
      throw error;
    await record({
      tool: "repair_citations",
      status: "completed",
      detail:
        "The first response used invalid source references. One budgeted correction was requested.",
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
  await record({
    tool: "generate_draft",
    status: "completed",
    detail: `Generated with ${draft.provider}. Source IDs were validated; private passages were not transmitted.`,
  });
  const body = normalizeWriting(
    `Hello,\n\n${draft.body}\n\n${input.signature}`,
  );
  const errors = quality(draft.subject, body);
  if (errors.length) throw new Error(errors.join("; "));
  const checks = auditDraft(draft.body, retrieval.generationSkills);
  if (checks.unsupportedSkills.length || checks.unverifiedMetrics)
    throw new Error(
      "The draft included unsupported skill or numeric claims. No application was created. Review your evidence or try another model.",
    );
  await record({
    tool: "validate",
    status: "completed",
    detail:
      "Checked source references, supported skill categories, numeric claims, formatting and placeholders. This does not prove every sentence; factual review is still required.",
  });
  await record({
    tool: "human_review",
    status: "waiting",
    detail:
      "Draft prepared. Review facts, suitability, recipient and attachment. The agent cannot send or approve an application.",
  });
  return {
    resume,
    draft,
    body,
    intelligence: {
      version: "bounded-rag-agent-v2",
      mode: input.mode || "assisted",
      opportunity,
      checks,
      retrieval,
      steps,
      citations: draft.evidenceIds || [],
      resumeHash: resume.hash,
      reviewRequired: true,
    },
  };
}
