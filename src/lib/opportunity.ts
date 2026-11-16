import { publicContext, taxonomy } from "./taxonomy";
import { mentions } from "./rag";
export function analyzeOpportunity(
  skills: string[],
  role: string,
  description: string,
) {
  const confirmed = publicContext(skills, role).skills;
  const requested = taxonomy.filter((skill) => mentions(description, skill));
  const matched = requested.filter((skill) => confirmed.includes(skill));
  const missing = requested.filter((skill) => !confirmed.includes(skill));
  return {
    kind: description.trim()
      ? "user_provided_description"
      : "speculative_outreach",
    requestedSkills: requested,
    matchedSkills: matched,
    missingSkills: missing,
    unknownRequirements: [
      "Work authorization, experience, compensation and mandatory requirements require your review.",
    ],
    coverage: requested.length
      ? Math.round((matched.length / requested.length) * 100)
      : null,
    warnings: [
      ...(missing.length
        ? [
            "Some mentioned skills are not confirmed. They must not become candidate claims.",
          ]
        : []),
      ...(!description.trim()
        ? ["No vacancy has been verified. Use an expression of interest."]
        : []),
    ],
  };
}
export function normalizeWriting(text: string) {
  return text.replace(/\s*\u2014\s*/g, ", ").replace(/,\s*,/g, ",");
}
export function auditDraft(body: string, approvedSkills: string[]) {
  const allowed = publicContext(approvedSkills, "").skills;
  return {
    unsupportedSkills: taxonomy.filter(
      (skill) => mentions(body, skill) && !allowed.includes(skill),
    ),
    unverifiedMetrics:
      /\b\d+(?:\.\d+)?\s*(?:years?\b|%|percent\b|million\b|billion\b)/i.test(
        body,
      ),
    reviewRequired: true,
  };
}
