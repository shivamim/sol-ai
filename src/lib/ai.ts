import { db } from "./db";
import { decrypt } from "./security";
import { z } from "zod";
import {
  providerEvidence,
  validateEvidenceIds,
  type RetrievalResult,
} from "./rag";
export type ProviderKind = "gemini" | "groq";
export async function providerFetch(
  kind: ProviderKind,
  key: string,
  path: string,
  init: RequestInit = {},
) {
  const base =
    kind === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta/"
      : "https://api.groq.com/openai/v1/";
  const headers: Record<string, string> =
    kind === "gemini"
      ? { "x-goog-api-key": key }
      : { Authorization: `Bearer ${key}` };
  const result = await fetch(base + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!result.ok)
    throw new Error(
      result.status === 429
        ? `Provider rate limited. Retry after ${result.headers.get("retry-after") || "a cooling-off period"}.`
        : `Provider request failed (${result.status}). Check model, key and provider permissions.`,
    );
  return result.json();
}
export async function listModels(
  kind: ProviderKind,
  key: string,
): Promise<string[]> {
  const data = await providerFetch(kind, key, "models");
  if (kind === "groq") return (data.data as { id: string }[]).map((m) => m.id);
  return (
    data.models as { name: string; supportedGenerationMethods?: string[] }[]
  )
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace("models/", ""));
}
const draftSchema = z.object({
  subject: z.string().min(1).max(180),
  body: z.string().min(80).max(5000),
  evidenceIds: z.array(z.string()).max(5).optional(),
});
// Only a fixed, non-personal taxonomy crosses the provider boundary. Private input is never interpolated.
export { publicContext } from "./taxonomy";
import { publicContext } from "./taxonomy";
async function structuredRequest<T>(
  userId: string,
  kind: ProviderKind,
  groundedPrompt: string,
  schema: z.ZodType<T>,
) {
  const provider = await db.provider.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  if (!provider?.enabled || !provider.freeConfirmed)
    throw new Error(
      "Enable a provider and confirm this model's free-tier eligibility first",
    );
  const reserve = provider.maxOutput + 1000,
    day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const usage = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + kind}))`;
    const used = await tx.aIUsage.aggregate({
      where: { userId, provider: kind, createdAt: { gte: day } },
      _count: true,
      _sum: { reserved: true },
    });
    if (
      used._count >= provider.dailyRequests ||
      (used._sum.reserved || 0) + reserve > provider.dailyTokens
    )
      throw new Error("Daily AI budget exhausted; your work is preserved");
    return tx.aIUsage.create({
      data: {
        userId,
        provider: kind,
        model: provider.model,
        tokens: 0,
        reserved: reserve,
        status: "RESERVED",
      },
    });
  });
  try {
    const key = decrypt(provider.secret);
    const data =
      kind === "groq"
        ? await providerFetch(kind, key, "chat/completions", {
            method: "POST",
            body: JSON.stringify({
              model: provider.model,
              messages: [
                {
                  role: "system",
                  content:
                    "You assist a bounded career workflow. Follow the requested JSON schema only; never invent facts or execute actions.",
                },
                { role: "user", content: groundedPrompt },
              ],
              response_format: { type: "json_object" },
              max_tokens: provider.maxOutput,
              temperature: 0.4,
            }),
          })
        : await providerFetch(
            kind,
            key,
            `models/${encodeURIComponent(provider.model)}:generateContent`,
            {
              method: "POST",
              body: JSON.stringify({
                contents: [{ parts: [{ text: groundedPrompt }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  maxOutputTokens: provider.maxOutput,
                  temperature: 0.4,
                },
              }),
            },
          );
    const raw =
      kind === "groq"
        ? data.choices?.[0]?.message?.content
        : data.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = schema.parse(JSON.parse(raw || "{}"));
    const tokens =
      kind === "groq"
        ? data.usage?.total_tokens
        : data.usageMetadata?.totalTokenCount;
    await db.aIUsage.update({
      where: { id: usage.id },
      data: {
        status: "SUCCEEDED",
        tokens: tokens || 0,
        reserved: Math.max(tokens || reserve, 0),
      },
    });
    return { result, model: provider.model, provider: kind };
  } catch (error) {
    await db.aIUsage.update({
      where: { id: usage.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

export async function generateDraft(
  userId: string,
  kind: ProviderKind,
  skills: string[],
  role: string,
  retrieval?: RetrievalResult,
  repair = false,
) {
  const context = publicContext(skills, role);
  if (!context.skills.length)
    throw new Error(
      "Confirm at least one supported skill in your profile before generation",
    );
  const evidence = retrieval ? providerEvidence(retrieval) : [];
  const prompt =
    `Return JSON with subject and body only${retrieval ? ", plus evidenceIds" : ""}. Write an honest, concise expression of interest for ${context.role}. Candidate confirmed skills: ${context.skills.join(", ")}. Do not invent experience, projects, credentials, an active vacancy, names or company facts. No greeting or signature; these are added locally. Mention an attached resume. Ask whether suitable opportunities exist. 80-140 words.` +
    (retrieval
      ? ` Retrieved approved evidence (IDs and confirmed skill categories only): ${JSON.stringify(evidence)}. Include evidenceIds listing supporting source IDs you used. Do not put citations in the email body. Use only skills from this evidence. Sources confirm skills, not years of experience or achievements.`
      : "") +
    (repair
      ? " Your previous output had invalid source references. Copy one or more exact IDs from the allowed evidence list; do not invent an ID."
      : "");
  const response = await structuredRequest(userId, kind, prompt, draftSchema);
  if (retrieval)
    validateEvidenceIds(response.result.evidenceIds || [], evidence);
  return {
    ...response.result,
    model: response.model,
    provider: response.provider,
  };
}
const planSchema = z.object({
  tool: z.enum(["retrieve_evidence", "request_review"]),
  resume: z.string().max(20),
  focusSkills: z.array(z.string().max(60)).max(8),
  reason: z.enum([
    "role_alignment",
    "evidence_overlap",
    "insufficient_evidence",
  ]),
});
export async function planEvidence(
  userId: string,
  kind: ProviderKind,
  role: string,
  candidates: { code: string; role: string; skills: string[] }[],
  requestedSkills: string[],
) {
  const safeCandidates = candidates.map((c) => ({
    code: c.code,
    ...publicContext(c.skills, c.role),
  }));
  const safeRequest = publicContext(requestedSkills, role);
  const { result } = await structuredRequest(
    userId,
    kind,
    `Choose an approved resume and retrieval focus for a factual job-interest introduction. Allowed tools: retrieve_evidence (select one listed resume code and relevant supported skills), request_review (stop if no supporting evidence). Return JSON {"tool":"retrieve_evidence" or "request_review","resume":"listed code","focusSkills":["supported skills"],"reason":"role_alignment" or "evidence_overlap" or "insufficient_evidence"}. Target: ${JSON.stringify(safeRequest)}. Approved candidate summaries: ${JSON.stringify(safeCandidates)}. Do not invent codes or skills.`,
    planSchema,
  );
  if (result.tool === "request_review") return result;
  const candidate = safeCandidates.find((c) => c.code === result.resume);
  if (
    !candidate ||
    !result.focusSkills.length ||
    result.focusSkills.some((skill) => !candidate.skills.includes(skill))
  )
    throw new Error(
      "Planner requested an unapproved resume or unsupported skill; no draft or email was created",
    );
  return result;
}
