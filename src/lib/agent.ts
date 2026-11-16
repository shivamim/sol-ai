import { decideAgentAction, type ProviderKind } from "./ai";
import {
  retrieveEvidence,
  providerEvidence,
  type KnowledgeDocument,
} from "./rag";
import type { WorkflowStep } from "./workflow";
export async function runEvidenceAgent(input: {
  userId: string;
  provider: ProviderKind;
  role: string;
  skills: string[];
  description: string;
  missingSkills: string[];
  candidates: {
    id: string;
    name: string;
    role: string;
    text: string;
    hash: string;
    approved: boolean;
  }[];
  onStep?: (step: WorkflowStep) => Promise<void>;
}) {
  const candidates = input.candidates.slice(0, 3);
  const safe = candidates.map((resume, index) => ({
    code: `R${index + 1}`,
    role: resume.role,
    skills: retrieveEvidence(
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
    ).generationSkills,
  }));
  const decision = await decideAgentAction(input.userId, input.provider, {
    role: input.role,
    candidates: safe,
    requestedSkills: input.skills,
    missingSkills: input.missingSkills,
    evidence: [],
    stage: "select",
  });
  await input.onStep?.({
    tool: "agent_decision",
    status: "completed",
    detail: `Selected ${decision.tool}: ${decision.reason}. Only approved retrieval tools were available.`,
  });
  if (decision.tool === "request_review")
    throw new AgentReviewRequired(
      "The agent needs more approved evidence or clarification before drafting.",
    );
  const index = safe.findIndex((c) => c.code === decision.resume),
    resume = candidates[index];
  if (!resume) throw new Error("Agent selected an unavailable source");
  await input.onStep?.({
    tool: "select_resume",
    status: "completed",
    detail:
      "The approved resume selected by the agent was validated before retrieval.",
  });
  const documents: KnowledgeDocument[] = [
    {
      id: "profile:confirmed-skills",
      label: "Confirmed profile skills",
      text: input.skills.join(", "),
      approved: true,
      kind: "profile",
    },
    {
      id: resume.id,
      label: resume.name,
      text: resume.text,
      approved: true,
      kind: "resume",
    },
  ];
  const retrieval = retrieveEvidence(
    documents,
    decision.focusSkills,
    input.role,
    input.description,
  );
  await input.onStep?.({
    tool: "retrieve_evidence",
    status: "completed",
    detail: `Executed local retrieval. Found ${retrieval.evidence.length} approved passages and ${retrieval.generationSkills.length} supported skill categories.`,
  });
  if (!retrieval.generationSkills.length)
    throw new AgentReviewRequired(
      "No relevant approved skill evidence was found. Confirm your profile and resume first.",
    );
  const observation = await decideAgentAction(input.userId, input.provider, {
    role: input.role,
    candidates: safe,
    requestedSkills: retrieval.generationSkills,
    missingSkills: input.missingSkills,
    evidence: providerEvidence(retrieval),
    stage: "observe",
  });
  await input.onStep?.({
    tool: "agent_decision",
    status: "completed",
    detail: `After observing retrieved evidence, selected ${observation.tool}: ${observation.reason}.`,
  });
  if (observation.tool === "request_review")
    throw new AgentReviewRequired(
      "The agent reviewed the evidence and requested human clarification instead of writing unsupported claims.",
    );
  return { resume, retrieval };
}
export class AgentReviewRequired extends Error {}
