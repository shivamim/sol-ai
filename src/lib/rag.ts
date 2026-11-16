import { createHash } from "node:crypto";
import { publicContext } from "./taxonomy";

export type KnowledgeDocument = {
  id: string;
  label: string;
  text: string;
  approved: boolean;
  kind: "resume" | "profile";
};
export type Evidence = {
  id: string;
  documentId: string;
  label: string;
  kind: "resume" | "profile";
  start: number;
  end: number;
  hash: string;
  score: number;
  skills: string[];
};
export type RetrievalResult = {
  version: "lexical-bm25-v1";
  querySkills: string[];
  evidence: Evidence[];
  generationSkills: string[];
  warnings: string[];
};
const stopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "have",
  "your",
  "you",
  "our",
  "are",
  "will",
  "can",
  "all",
  "job",
  "role",
  "candidate",
  "experience",
  "skills",
]);
export function tokens(text: string) {
  return (
    text
      .toLowerCase()
      .match(/[\p{L}\p{N}+#.]+/gu)
      ?.filter((t) => t.length > 1 && !stopwords.has(t)) || []
  );
}
export function mentions(text: string, skill: string) {
  const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    "u",
  ).test(text.toLowerCase());
}
export function chunkDocument(
  doc: KnowledgeDocument,
  size = 600,
  overlap = 100,
) {
  if (size < 100 || overlap < 0 || overlap >= size)
    throw new Error("Invalid chunk configuration");
  if (!doc.approved) return [];
  const chunks: {
    doc: KnowledgeDocument;
    start: number;
    end: number;
    text: string;
    terms: string[];
  }[] = [];
  for (
    let start = 0;
    start < Math.min(doc.text.length, 100000);
    start += size - overlap
  ) {
    const end = Math.min(start + size, doc.text.length, 100000),
      text = doc.text.slice(start, end);
    if (text.trim())
      chunks.push({ doc, start, end, text, terms: tokens(text) });
    if (end === Math.min(doc.text.length, 100000)) break;
  }
  return chunks;
}
export function retrieveEvidence(
  documents: KnowledgeDocument[],
  confirmedSkills: string[],
  role: string,
  description: string,
  limit = 5,
): RetrievalResult {
  const approvedSkills = publicContext(confirmedSkills, role).skills;
  const querySkills = approvedSkills.filter((s) => mentions(description, s));
  const query = [
    ...new Set(
      tokens(
        [
          role,
          ...(querySkills.length ? querySkills : approvedSkills),
          description.slice(0, 20000),
        ].join(" "),
      ),
    ),
  ].slice(0, 128);
  const chunks = documents.flatMap((d) => chunkDocument(d));
  const averageLength =
    chunks.reduce((n, c) => n + c.terms.length, 0) / Math.max(1, chunks.length);
  const termCounts = chunks.map((chunk) => {
    const counts = new Map<string, number>();
    for (const term of chunk.terms)
      counts.set(term, (counts.get(term) || 0) + 1);
    return counts;
  });
  const frequency = new Map(
    query.map((term) => [
      term,
      termCounts.filter((counts) => counts.has(term)).length,
    ]),
  );
  const ranked = chunks
    .map((chunk, index) => {
      let score = 0;
      for (const term of query) {
        const tf = termCounts[index].get(term) || 0;
        if (!tf) continue;
        const df = frequency.get(term) || 0;
        const idf = Math.log(1 + (chunks.length - df + 0.5) / (df + 0.5));
        score +=
          (idf * (tf * 2.2)) /
          (tf +
            1.2 *
              (0.25 +
                (0.75 * chunk.terms.length) / Math.max(averageLength, 1)));
      }
      const skills = approvedSkills.filter((s) => mentions(chunk.text, s));
      score += 2 * skills.filter((s) => querySkills.includes(s)).length;
      // A chunk with no confirmed, provider-safe fact cannot support writing.
      return { chunk, score: skills.length ? score : 0, skills };
    })
    .filter((c) => c.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.chunk.doc.id.localeCompare(b.chunk.doc.id) ||
        a.chunk.start - b.chunk.start,
    );
  const selected: typeof ranked = [];
  for (const candidate of ranked) {
    if (
      selected.some(
        (s) =>
          s.chunk.doc.id === candidate.chunk.doc.id &&
          Math.abs(s.chunk.start - candidate.chunk.start) < 400,
      )
    )
      continue;
    selected.push(candidate);
    if (selected.length >= limit) break;
  }
  const evidence = selected.map(({ chunk, score, skills }) => {
    const hash = createHash("sha256").update(chunk.text).digest("hex");
    return {
      id:
        "E" +
        createHash("sha256")
          .update(chunk.doc.id + ":" + chunk.start + ":" + hash)
          .digest("hex")
          .slice(0, 12),
      documentId: chunk.doc.id,
      label: chunk.doc.label,
      kind: chunk.doc.kind,
      start: chunk.start,
      end: chunk.end,
      hash,
      score: Math.round(score * 1000) / 1000,
      skills,
    };
  });
  const available = [...new Set(evidence.flatMap((e) => e.skills))];
  const generationSkills = (
    querySkills.length
      ? available.filter((s) => querySkills.includes(s))
      : available
  ).slice(0, 8);
  return {
    version: "lexical-bm25-v1",
    querySkills,
    evidence,
    generationSkills,
    warnings: [
      ...(!description.trim()
        ? [
            "No job description: prepare an expression of interest, not a vacancy-specific claim.",
          ]
        : []),
      ...(!generationSkills.length
        ? [
            "No approved, relevant skill evidence was retrieved. Confirm your profile or resume first.",
          ]
        : []),
      "Lexical relevance is not an eligibility decision or hiring probability.",
    ],
  };
}
// Only this closed taxonomy projection may be included in provider requests.
export function providerEvidence(retrieval: RetrievalResult) {
  return retrieval.evidence
    .map((e) => ({
      id: e.id,
      skills: e.skills.filter((s) => retrieval.generationSkills.includes(s)),
    }))
    .filter((e) => e.skills.length);
}
export class EvidenceValidationError extends Error {}
export function validateEvidenceIds(ids: string[], allowed: { id: string }[]) {
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !allowed.some((e) => e.id === id))
  )
    throw new EvidenceValidationError(
      "AI output contains missing or unsupported evidence citations",
    );
  return ids;
}
