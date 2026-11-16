import Papa from "papaparse";
import { z } from "zod";
export const emailSchema = z
  .email()
  .max(254)
  .transform((v) => v.trim().toLowerCase());
export const profileSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(120),
  skills: z.array(z.string().min(1).max(60)).max(80),
  summary: z.string().max(4000),
  signature: z.string().max(1000),
  claims: z.string().max(6000),
  location: z.string().max(150).default(""),
});
export const contactSchema = z.object({
  email: emailSchema,
  name: z.string().max(120).default(""),
  company: z.string().max(160).default(""),
  title: z.string().max(120).default(""),
  source: z.string().min(1).max(300),
});
export function normalizeEmails(text: string) {
  const entries = text.split(/[\s,;]+/).filter(Boolean),
    valid: string[] = [],
    invalid: string[] = [];
  for (const value of entries) {
    const parsed = emailSchema.safeParse(value);
    if (parsed.success) valid.push(parsed.data);
    else invalid.push(value);
  }
  return {
    valid: [...new Set(valid)],
    invalid,
    duplicates: valid.length - new Set(valid).size,
  };
}
export function parseContacts(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length)
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  if (parsed.data.length > 1000)
    throw new Error("Maximum 1000 contacts per import");
  const rows = parsed.data.map((row) => {
    const r = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k.toLowerCase().replace(/[^a-z]/g, ""),
        v?.trim() || "",
      ]),
    );
    return {
      email: r.email || r.emailaddress || r.workemail || "",
      name: r.name || [r.firstname, r.lastname].filter(Boolean).join(" "),
      company: r.company || r.companyname || r.companynameforemails || "",
      title: r.title || r.jobtitle || "",
      source: "CSV import",
    };
  });
  return rows;
}
export function classifyReply(text: string) {
  const t = text.toLowerCase();
  if (/unsubscribe|stop contacting|remove me|do not contact/.test(t))
    return "OPT_OUT";
  if (/delivery.*fail|undeliver|address not found|mailer-daemon/.test(t))
    return "BOUNCE";
  if (/out of (the )?office|automatic reply|on vacation/.test(t))
    return "OUT_OF_OFFICE";
  if (/unfortunately|not moving forward|other candidates|not selected/.test(t))
    return "REJECTION";
  if (/interview|schedule a call|availability for/.test(t)) return "INTERVIEW";
  if (/assessment|coding challenge/.test(t)) return "ASSESSMENT";
  if (/received your application|thank you for applying/.test(t))
    return "ACKNOWLEDGEMENT";
  return "REVIEW_REQUIRED";
}
export function matchSkills(skills: string[], description: string) {
  const lower = description.toLowerCase();
  const matched = skills.filter((s) => lower.includes(s.toLowerCase()));
  return {
    matched,
    explanation: description
      ? `${matched.length} of your ${skills.length} confirmed skills appear in this description. Eligibility requires your review.`
      : "Speculative outreach; no job-fit score available.",
  };
}
export function quality(subject: string, body: string) {
  const errors: string[] = [];
  if (!subject.trim() || subject.length > 180 || /[\r\n]/.test(subject))
    errors.push("Use a single-line subject of 1–180 characters");
  if (body.trim().length < 80 || body.length > 6000)
    errors.push("Body must be 80–6000 characters");
  if (/\{\{|\[insert|\[your|<candidate|CANDIDATE_NAME/i.test(body))
    errors.push("Resolve placeholders");
  return errors;
}
export function chooseResume<T extends { approved: boolean; role: string }>(
  resumes: T[],
  role: string,
) {
  return resumes
    .filter((r) => r.approved)
    .sort(
      (a, b) =>
        Number(b.role.toLowerCase() === role.toLowerCase()) -
        Number(a.role.toLowerCase() === role.toLowerCase()),
    )[0];
}
