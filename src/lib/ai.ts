import { db } from "./db";
import { decrypt } from "./security";
import { z } from "zod";
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
    signal: AbortSignal.timeout(25000),
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
});
// Only a fixed, non-personal taxonomy crosses the provider boundary. Private input is never interpolated.
const taxonomy = [
  "Python",
  "SQL",
  "JavaScript",
  "Pandas",
  "NumPy",
  "Excel",
  "Google Sheets",
  "Power BI",
  "Power Query",
  "ETL",
  "PySpark",
  "Machine Learning",
  "Deep Learning",
  "Generative AI",
  "Agentic AI",
  "RAG",
  "LangChain",
  "LlamaIndex",
  "APIs",
  "Automation",
  "PostgreSQL",
  "MongoDB",
  "Data visualization",
];
const roles = [
  "AI Engineer",
  "Data Scientist",
  "Data Analyst",
  "Business Intelligence Analyst",
  "Data Engineer",
  "Machine Learning Engineer",
  "Analytics Engineer",
  "Product Analyst",
  "Business Data Analyst",
  "Operations Analyst",
  "Data Visualization Developer",
  "Data Analytics Specialist",
];
export function publicContext(skills: string[], role: string) {
  return {
    skills: taxonomy.filter((t) =>
      skills.some((s) => s.toLowerCase() === t.toLowerCase()),
    ),
    role:
      roles.find((r) => r.toLowerCase() === role.toLowerCase()) ||
      "a suitable professional role",
  };
}
export async function generateDraft(
  userId: string,
  kind: ProviderKind,
  skills: string[],
  role: string,
) {
  const provider = await db.provider.findUnique({
    where: { userId_kind: { userId, kind } },
  });
  if (!provider?.enabled || !provider.freeConfirmed)
    throw new Error(
      "Enable a provider and confirm this model's free-tier eligibility first",
    );
  const context = publicContext(skills, role);
  if (!context.skills.length)
    throw new Error(
      "Confirm at least one supported skill in your profile before generation",
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
  const prompt = `Return JSON with subject and body only. Write an honest, concise expression of interest for ${context.role}. Candidate confirmed skills: ${context.skills.join(", ")}. Do not invent experience, projects, credentials, an active vacancy, names or company facts. No greeting or signature; these are added locally. Mention an attached resume. Ask whether suitable opportunities exist. 80-140 words.`;
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
                    "You draft factual job-interest emails. Return a JSON object only.",
                },
                { role: "user", content: prompt },
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
                contents: [{ parts: [{ text: prompt }] }],
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
    const result = draftSchema.parse(JSON.parse(raw || "{}"));
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
    return { ...result, model: provider.model, provider: kind };
  } catch (error) {
    await db.aIUsage.update({
      where: { id: usage.id },
      data: { status: "FAILED" },
    });
    throw error;
  }
}
