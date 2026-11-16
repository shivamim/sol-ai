import { db } from "./db";
import { AgentReviewRequired } from "./agent";
import type { WorkflowStep } from "./workflow";
export async function trackPreparation<T extends { id: string }>(
  userId: string,
  mode: "assisted" | "agentic",
  execute: (checkpoint: (step: WorkflowStep) => Promise<void>) => Promise<T>,
) {
  const run = await db.agentRun.create({
    data: {
      userId,
      mode,
      goal: "Prepare one evidence-backed application for human review",
    },
  });
  const steps: WorkflowStep[] = [];
  try {
    const result = await execute(async (step) => {
      steps.push(step);
      await db.agentRun.update({
        where: { id: run.id },
        data: { steps, summary: step.detail },
      });
    });
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status: "WAITING_REVIEW",
        applicationId: result.id,
        summary:
          "Draft prepared. Review its claims, recipient and attachment before approval.",
      },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code =
      error instanceof AgentReviewRequired
        ? "NEEDS_EVIDENCE"
        : /budget|quota|rate limit/i.test(message)
          ? "PROVIDER_LIMIT"
          : /provider|fetch|timeout/i.test(message)
            ? "PROVIDER_UNAVAILABLE"
            : "VALIDATION_STOP";
    await db.agentRun.update({
      where: { id: run.id },
      data: {
        status:
          error instanceof AgentReviewRequired ? "NEEDS_REVIEW" : "FAILED",
        errorCode: code,
        summary:
          code === "NEEDS_EVIDENCE"
            ? "The agent stopped because the available evidence needs your review."
            : code === "PROVIDER_LIMIT"
              ? "Provider budget or quota blocked preparation. No email was sent."
              : "Preparation stopped. Check your evidence and provider settings. Any saved draft remains in Applications. No email was sent.",
      },
    });
    throw error;
  }
}

export async function listAgentRuns(userId: string) {
  await db.agentRun.updateMany({
    where: {
      userId,
      status: "RUNNING",
      updatedAt: { lt: new Date(Date.now() - 120000) },
    },
    data: {
      status: "INTERRUPTED",
      errorCode: "TIMEOUT",
      summary:
        "The run did not finish within its request window. No automatic send or retry was started.",
    },
  });
  return db.agentRun.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
