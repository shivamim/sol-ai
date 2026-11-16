# CAREERPILOT AI
## Production-Grade Autonomous Job Search and Application Intelligence Platform

## 1. Your role

Act as an exceptional principal software architect, senior full-stack engineer, AI engineer, automation specialist, cybersecurity engineer, DevOps engineer and premium SaaS product designer.

You are responsible for designing and implementing my complete personal AI job application platform, CareerPilot AI.

I have a busy professional schedule and cannot manually spend hours every day searching for jobs, finding recruiters, personalizing applications, sending resumes and following up.

I want to automate as much of this process as reasonably possible.

The application must become my personal job-search operating system.

The system must be:

- Exceptionally intelligent.
- Highly automated.
- Extremely fast.
- Free-tier-first.
- Secure.
- Reliable.
- Premium in design.
- Easy to operate.
- Production-ready.
- Extensible for future commercialization.

Do not build a basic email generator or a dashboard that only looks functional.

Build a real working product.

The system must help me find relevant jobs, import recruiter contacts, understand opportunities, personalize applications, select resumes, send emails, manage follow-ups, track replies and prepare me for interviews.

My current AI API providers are:

- Google Gemini.
- Groq.

These are the only AI providers I want to integrate initially.

I intend to use their available free quotas.

Do not require any paid AI provider.

Keep the architecture extensible for additional providers in the future, but prioritize completing the actual application.

---

# 2. Core product vision

Build CareerPilot AI around this experience:

I configure my professional profile once.

I upload multiple resumes once.

I connect my Gmail account.

I add my Gemini and Groq API keys.

I configure my job preferences and automation policies.

After that, I should be able to:

- Paste one recruiter email.
- Paste multiple recruiter emails.
- Upload an Apollo-style CSV.
- Paste a LinkedIn job URL.
- Paste any other job posting URL.
- Paste a job description.
- Import a list of companies.
- Configure authorized job discovery sources.

The system should intelligently process these inputs and prepare relevant applications with minimal manual intervention.

For applications eligible for controlled automation, the system should send personalized emails from my Gmail account.

The system should monitor relevant replies, schedule appropriate follow-ups, detect interview invitations and notify me when action is required.

The application must save me time, not create another complicated tool that requires constant management.

The user-facing philosophy is:

**Configure once. Discover intelligently. Apply thoughtfully. Review exceptions. Focus on interviews.**

---

# 3. Initial personal career profile

Make every profile field editable.

Do not permanently hardcode my identity or qualifications into the application.

During onboarding, allow me to configure the following target roles:

- AI Engineer.
- Data Scientist.
- Data Analyst.
- Business Intelligence Analyst.
- Data Engineer.
- Machine Learning Engineer.
- Analytics Engineer.
- Product Analyst.
- Business Data Analyst.
- Operations Analyst.
- Data Visualization Developer.
- Data Analytics Specialist.

The professional profile should support skills such as:

- Python.
- SQL.
- JavaScript.
- Pandas.
- NumPy.
- Excel.
- Google Sheets.
- Power BI.
- Power Query.
- ETL.
- PySpark.
- Machine Learning.
- Deep Learning.
- Generative AI.
- Agentic AI.
- RAG.
- LangChain.
- LlamaIndex.
- APIs.
- Automation.
- PostgreSQL.
- MongoDB.
- Data visualization.

These are suggested onboarding categories.

Only use skills, experience, achievements and qualifications that I have actually confirmed.

The application must never fabricate experience to match a job.

---

# 4. Non-negotiable development rules

Before implementing anything:

1. Inspect the entire repository.
2. Identify the current application structure.
3. Understand existing functionality.
4. Check current package compatibility and official documentation.
5. Identify missing dependencies.
6. Design the complete architecture.
7. Create `docs/IMPLEMENTATION_PLAN.md`.
8. Create `docs/IMPLEMENTATION_STATUS.md`.

If the repository is empty, initialize a clean project.

Do not unnecessarily overwrite working code.

Throughout development:

- Implement actual functionality.
- Never create fake buttons.
- Never fabricate dashboard statistics.
- Never use mock integrations in production.
- Never leave core routes unfinished.
- Never silently swallow errors.
- Never expose credentials.
- Never invent provider model names.
- Never hardcode user secrets.
- Never fabricate recruiter identities.
- Never invent active job openings.
- Never fabricate company research.
- Never mark an application sent unless a real sending operation succeeds.
- Never claim delivery merely because Gmail accepted an email.
- Never claim a portal application was submitted unless there is actual confirmation or explicit user confirmation.
- Never remove functionality to make the build pass.

Use strict TypeScript.

Run linting, type checking, tests and builds throughout implementation.

Document missing external configuration honestly.

Do not stop after creating a plan.

Implement working software.

---

# 5. Technology stack

Use a modern, maintainable, cost-conscious technology architecture.

## Frontend

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Radix UI.
- Motion for React.
- Lucide icons.
- TanStack Table.
- React Hook Form.
- Zod.
- Recharts.

Use stable, mutually compatible package versions.

## Backend

Prefer a unified TypeScript architecture:

- Next.js Route Handlers.
- Server Actions where appropriate.
- Typed service modules.
- Durable background workers.
- Provider-independent AI gateway.

Use Python or FastAPI only if genuinely required.

Avoid unnecessary microservices.

## Database

- Neon PostgreSQL.
- Prisma ORM.
- Proper migrations.
- Transaction-safe workflows.
- Strong ownership constraints.
- Database indexes.

## Authentication

Use Clerk or another suitable, secure authentication solution.

Support personal-use deployment initially.

Implement:

- Sign in.
- Protected routes.
- Secure sessions.
- Account recovery.
- User-level authorization.

Keep the system capable of supporting multiple isolated users in the future.

## Resume storage

Choose a secure, economical storage solution.

Options:

- Private S3-compatible object storage.
- Cloudflare R2.
- Secure local filesystem for local development.

Do not publicly expose resumes.

## Background execution

Choose a durable job orchestration solution after verifying current free-tier availability and suitability.

Options may include:

- Inngest.
- Trigger.dev.
- A PostgreSQL-backed worker.
- A locally hosted persistent worker.

The cloud deployment must support scheduled processing even when my computer is turned off.

If the selected free hosting setup cannot provide this, clearly explain the limitation and provide a functional alternative.

Do not rely on an open browser tab to execute automation.

## Email

- Gmail API.
- OAuth 2.0.
- Secure token storage.
- MIME email generation.
- Resume attachments.
- Thread-aware follow-ups.

## Deployment

Preferred:

- Vercel.
- Neon.
- Secure object storage.
- Durable background execution infrastructure.

Provide a complete local deployment option as well.

Avoid paid infrastructure dependencies unless essential and explicitly documented.

---

# 6. AI provider architecture — Gemini and Groq only

This is a mandatory requirement.

Implement only these two AI providers initially:

1. Gemini.
2. Groq.

Do not implement OpenAI, Claude, OpenRouter or any other provider during the initial development unless I explicitly request it.

However, design a clean provider abstraction so additional adapters can be introduced later.

Example conceptual interface:

```typescript
interface AIProvider {
  readonly id: string;

  validateConnection(): Promise<ConnectionResult>;

  listModels(): Promise<ModelInfo[]>;

  generateText(
    request: TextGenerationRequest
  ): Promise<TextGenerationResult>;

  generateStructuredOutput<T>(
    request: StructuredGenerationRequest<T>
  ): Promise<StructuredGenerationResult<T>>;

  getCapabilities(
    modelId: string
  ): ModelCapabilities;
}
```

Improve the interface where necessary.

Normalize all provider results into a common internal representation.

Support:

- Structured JSON responses.
- Zod schema validation.
- Model capability detection.
- Request cancellation.
- Request timeout.
- Token usage reporting.
- Rate-limit detection.
- Error classification.
- Bounded retries.
- Streaming where useful.
- Fallback models.
- Provider health.

Do not assume both providers support identical features.

## Future provider architecture

Keep the adapter system compatible with future integrations:

- OpenAI.
- Anthropic.
- OpenRouter.
- DeepSeek.
- Mistral.
- Together AI.
- Fireworks AI.
- Ollama.
- Custom OpenAI-compatible services.

Do not create fake implementations for future providers.

Future integrations should be absent or clearly disabled until implemented.

---

# 7. Bring-your-own-key settings

Create an excellent AI configuration dashboard.

I must be able to enter my own:

- Gemini API key.
- Groq API key.

The application must support:

- Add key.
- Test connection.
- Replace key.
- Delete key.
- Enable provider.
- Disable provider.
- Select default provider.
- Select default model.
- Discover available models.
- Enter a supported model identifier manually.
- Configure task-specific models.
- Configure fallback provider.
- Configure daily request budgets.
- Configure daily token budgets.
- Set maximum output tokens.
- View provider errors.
- View provider health.
- View usage history.

Store API keys using authenticated server-side encryption.

Never return plaintext keys to the frontend.

Show masked values only.

Do not log keys.

Do not store keys in browser local storage.

Do not require me to edit source code to change providers or models.

## Dynamic model discovery

Use official supported APIs to retrieve available models.

Do not permanently hardcode today's model identifiers.

For providers without complete model discovery, allow validated manual configuration.

Track model capabilities.

Display whether a selected model supports the required task.

Allow only user-approved models.

Do not assume that every discovered model is free.

Clearly distinguish verified free-tier eligibility, paid eligibility and unknown billing eligibility.

---

# 8. Free-tier optimization engine

Design the entire application to minimize AI API usage.

Use deterministic application code for everything that does not actually require AI.

Do not call AI for:

- Email syntax validation.
- Email normalization.
- Duplicate detection.
- Contact deduplication.
- File attachment.
- Scheduling.
- Authentication.
- Database queries.
- Analytics.
- Gmail operations.
- Sending quotas.
- Follow-up eligibility.
- Import validation.
- Status changes.
- Basic filtering.
- Queue management.

Use AI only when meaningful intelligence is required.

## Default provider routing

Use Groq for:

- Short text generation.
- Application email generation.
- Lightweight job classification.
- Skills matching.
- Follow-up writing.
- Non-sensitive structured classification tasks.

Use Gemini for:

- Analysis of public job descriptions.
- Public company research synthesis.
- Complex opportunity analysis.
- Interview preparation using de-identified information.
- More advanced reasoning when required.

Allow users to override every routing rule.

Apply data privacy restrictions before model routing.

Never send personal or confidential information to Gemini's unpaid services.

## Optimize prompts

Implement:

- Context reduction.
- Short structured prompts.
- Token budgeting.
- Output token limits.
- Request deduplication.
- Cached analysis.
- Conditional agent execution.
- Hash-based reuse of unchanged inputs.
- Structured result caching.
- Parallel processing where safe.

Do not send my complete professional history to every request.

Do not repeatedly analyze an unchanged resume.

Reuse company research across opportunities when still valid.

Reuse job-description analysis for duplicate postings.

Target one or two AI requests for a straightforward recruiter-email application where possible.

More complex workflows can use additional requests when justified.

---

# 9. Privacy-first AI processing

This is critical because I intend to use free AI API quotas.

The application must process sensitive information locally before sending anything to an external AI provider.

Build a data minimization and redaction layer.

Do not send the following to unpaid Gemini services:

- Raw resume files containing personal information.
- Full names.
- Personal email addresses.
- Recruiter email addresses.
- Phone numbers.
- Home addresses.
- Government identifiers.
- Credentials.
- Confidential employer information.
- Private recruiter emails.
- Full private email threads.
- Sensitive personal information.

Parse documents locally.

Create a sanitized candidate skills profile.

Replace identifiable fields with internal placeholders where appropriate.

Example:

```text
Candidate: CANDIDATE
Experience category: Early career
Relevant skills: Python, SQL, Power BI
Relevant achievements: User-approved anonymized metrics
Target role: Data Analyst
```

Use deterministic code to insert the actual candidate name, recruiter name, email signature and other approved personal details after generation.

Do not simply remove names and assume all text is anonymous.

Detect contextual identifiers and sensitive facts.

Use only genuinely de-identified, non-confidential content for unpaid Gemini requests.

For Groq:

- Verify current provider data-handling terms.
- Use minimal necessary data.
- Support privacy controls.
- Avoid raw private email transmission by default.
- Do not send sensitive data merely because another provider failed.

Treat Gmail-derived data as subject to Google Workspace API user-data policies.

Do not send Gmail content to an external AI provider unless the specific use and transfer are permitted and appropriately authorized.

Use local deterministic classification as the default for incoming Gmail messages.

Provide manual review when local classification is insufficient.

Keep raw prompts containing sensitive information out of production logs.

Never automatically fall back to a provider that is not authorized for the data classification.

---

# 10. Intelligent quota and fallback management

Create a robust AI gateway.

When a provider returns a recoverable error:

1. Classify the error.
2. Check whether a retry is permitted.
3. Respect Retry-After information.
4. Apply bounded exponential backoff.
5. Consider an authorized fallback provider.
6. Validate the fallback response.
7. Record the execution result.

Do not repeatedly hammer an unavailable API.

Do not bypass rate limits.

Do not rotate multiple accounts or keys to evade restrictions.

If both providers are unavailable:

- Pause affected AI jobs.
- Preserve all queued applications.
- Display the reason.
- Schedule a safe retry.
- Notify me.
- Resume processing when permitted.

Do not lose application data.

## Free-tier mode

Enable Free-Tier Mode by default.

When enabled:

- Use only configured Groq and Gemini models.
- Do not select paid or unknown-cost models automatically.
- Enforce local token and request budgets.
- Pause jobs when budgets are exhausted.
- Prevent unauthorized provider fallback.
- Clearly display quota-related failures.

Do not claim the application can guarantee zero external charges.

Actual provider billing settings and quotas remain authoritative.

Provide instructions for configuring an account intended to remain within its free tier.

---

# 11. Personal career knowledge base

Build a structured candidate knowledge base.

This is the foundation of all personalization.

The system should store:

- Candidate profile.
- Education.
- Work experience.
- Skills.
- Projects.
- Certifications.
- Achievements.
- Professional summary.
- Portfolio links.
- LinkedIn URL.
- GitHub URL.
- Preferred roles.
- Job preferences.
- Approved application statements.
- Approved resume versions.

## Resume ingestion

Support:

- PDF.
- DOCX.
- Plain text.

Parse uploaded documents locally.

Extract:

- Skills.
- Experience.
- Education.
- Projects.
- Qualifications.
- Achievement statements.

Create a review interface for extracted information.

Allow the user to confirm, edit or reject extracted claims.

Every application claim should come from:

- A confirmed profile fact.
- An approved resume.
- A user-approved achievement.
- Another verified user-provided source.

Do not invent facts.

## Multiple resumes

Allow me to upload different resume versions, such as:

- AI Engineer resume.
- Data Scientist resume.
- Data Analyst resume.
- Data Engineer resume.
- Business Analyst resume.
- Operations Analyst resume.

Support:

- Resume categorization.
- Resume preview.
- Version history.
- Default resume.
- Approval status.
- Resume relevance analysis.
- Automatic selection.
- Manual override.

The system should automatically select the best approved resume for each opportunity.

Store an immutable reference to the resume version used for every sent application.

---

# 12. Apollo-style recruiter contact import

Build an exceptionally smooth recruiter import system.

This must be one of the strongest features.

I should be able to import professional recruiter contacts from an authorized Apollo CSV export or another permitted source.

No Apollo API key should be required for basic CSV import.

## Supported input formats

- CSV.
- XLSX.
- Plain text.
- Copy-pasted email lists.
- Single email entry.
- Multiple email entry.

Support flexible column mapping.

Recognize common columns including:

```text
First Name
Last Name
Name
Title
Job Title
Company
Company Name
Company Name for Emails
Email
Email Status
Company Website
Website
Company Domain
Industry
City
State
Country
LinkedIn URL
Company LinkedIn URL
Departments
Seniority
```

Normalize different header names automatically.

Do not require an exact template.

Allow a custom column mapping screen.

## Import workflow

1. Upload the file.
2. Detect columns.
3. Suggest field mapping.
4. Show a preview.
5. Normalize emails.
6. Validate records.
7. Detect duplicate contacts.
8. Identify missing information.
9. Group contacts by company.
10. Check previous application history.
11. Classify recruiter relevance.
12. Display import issues.
13. Require confirmation before creating applications.
14. Create a processing batch.

An import must not immediately trigger uncontrolled sending.

## Contact eligibility

Prioritize professional contacts with appropriate hiring responsibilities:

- Recruiter.
- Technical Recruiter.
- Talent Acquisition Specialist.
- Talent Acquisition Partner.
- Talent Acquisition Manager.
- HR Recruiter.
- Recruitment Manager.
- Relevant Hiring Manager.

Do not treat every employee as an appropriate recruiter.

Do not infer that a person is hiring merely from their title.

Do not automatically contact unrelated employees.

Use source provenance and professional relevance.

Retain the original source and import date.

Allow the user to confirm permitted use of the contact data.

Do not implement email harvesting, email guessing, unauthorized Apollo extraction, hidden scraping or bypassing subscription restrictions.

Prefer verified professional email addresses and official application contacts.

A provider verification status is not a guarantee of validity or permission to contact.

## Company-level deduplication

Prevent sending the same application to several employees at the same company.

If an imported file contains multiple recruiters at one company:

- Rank them according to relevance.
- Select the best appropriate contact.
- Flag the remaining contacts.
- Avoid simultaneous duplicate outreach.
- Allow a manual override with a clear reason.

Use configurable company-level and recipient-level cooldowns.

## Apollo-style batch experience

Display:

- Total imported records.
- Valid records.
- Invalid records.
- Duplicate contacts.
- Potentially relevant recruiters.
- Existing applications.
- Companies represented.
- Contacts requiring review.
- Applications ready for drafting.

Allow me to select relevant records and create application drafts in one operation.

Provide processing progress and individual row status.

---

# 13. Quick Apply — the most important interface

Build a beautiful, extremely fast Quick Apply page.

It should have multiple input modes.

## Mode A: Email only

I enter a recruiter email.

Optional fields:

- Recruiter name.
- Company name.
- Target role.
- Job description.
- Job URL.
- Additional instructions.

Use my configured preferences if a target role is not selected.

If there is no confirmed active vacancy, create an honest general expression of interest.

Do not invent an opening.

## Mode B: Multiple emails

Allow me to paste several professional email addresses.

Parse:

- Newlines.
- Commas.
- Semicolons.
- Copied spreadsheet cells.

Normalize and deduplicate.

Generate individual applications.

## Mode C: Job description

I paste a complete job description.

The system analyzes:

- Job title.
- Company.
- Mandatory skills.
- Preferred skills.
- Experience requirement.
- Location.
- Work mode.
- Responsibilities.
- Eligibility requirements.
- Application instructions.

Select my best approved resume.

Generate a tailored application.

## Mode D: Job URL

I paste a job URL.

Retrieve information only through permitted access methods.

If fetching is unavailable, ask me to paste the job description.

Never bypass:

- Login restrictions.
- CAPTCHAs.
- Anti-bot controls.
- Paywalls.
- Platform access restrictions.

## Mode E: Company-based application

I enter a company.

The system:

- Loads available public company information.
- Checks my relevant career preferences.
- Identifies appropriate career directions.
- Prepares a speculative application if appropriate.

Clearly label speculative outreach.

---

# 14. LinkedIn Application Copilot

Implement a highly useful LinkedIn-assisted application workflow.

Do not implement unauthorized LinkedIn bots.

Do not automate login, scrape restricted content, intercept cookies, manipulate sessions or bypass Easy Apply restrictions.

Do not use stealth browser automation.

Instead, build an application preparation assistant.

## LinkedIn input

Allow:

- User-provided LinkedIn job URL.
- Pasted job description.
- Manually entered company.
- Manually entered job title.
- User-provided recruiter details.
- Authorized job-alert imports where permitted.

Store the original job link.

## LinkedIn preparation workflow

When I import a LinkedIn job:

1. Analyze the provided job information.
2. Calculate relevance.
3. Extract requirements.
4. Select the best approved resume.
5. Generate a relevant cover letter.
6. Generate application-answer suggestions.
7. Identify potential dealbreakers.
8. Prepare recruiter outreach where an appropriate contact exists.
9. Create an application checklist.
10. Allow me to open the official job page.

Provide actions:

- Copy cover letter.
- Copy application answers.
- Download selected resume.
- Download approved tailored resume.
- Open original job.
- Save opportunity.
- Mark manually applied.
- Prepare recruiter email.

Do not mark the job as applied simply because the link is opened.

Allow the user to confirm successful submission.

If an official, authorized application API becomes available for the intended candidate workflow, design the connector architecture so it can be added later.

Do not represent employer-facing APIs as candidate auto-apply APIs.

## Common application questions

Create a reusable answer vault containing my confirmed information.

Examples:

- Years of experience.
- Current designation.
- Expected compensation.
- Notice period.
- Work authorization.
- Preferred location.
- Relocation availability.
- Remote work preference.
- Experience with Python.
- Experience with SQL.
- Relevant project explanations.

Never invent answers.

Treat legal eligibility, salary, sponsorship and authorization questions as requiring confirmed information.

---

# 15. Automated job discovery

Create a modular job discovery engine.

The goal is to reduce the time I spend manually searching for relevant opportunities.

Support authorized sources such as:

- Public company careers pages where permitted.
- Official job-board APIs.
- Licensed job feeds.
- Public ATS job boards with permitted access.
- RSS feeds.
- User-provided job listings.
- Authorized saved-search alert integrations.

Possible ATS connectors include official public job feeds from services such as Greenhouse and Lever, subject to their applicable terms and documentation.

Verify actual API availability before implementation.

Do not scrape restricted LinkedIn or Indeed pages.

## Job discovery configuration

Allow me to configure:

- Target roles.
- Required skills.
- Preferred skills.
- Preferred companies.
- Excluded companies.
- Industries.
- Locations.
- Remote, hybrid or onsite.
- Experience level.
- Minimum salary when available.
- Job age.
- Country.
- Work authorization requirements.
- Minimum match score.

## Discovery execution

1. Retrieve jobs from configured sources.
2. Normalize job information.
3. Remove duplicates.
4. Detect stale postings.
5. Apply deterministic filters.
6. Score remaining opportunities.
7. Rank high-quality opportunities.
8. Save relevant jobs.
9. Prepare application drafts where permitted.
10. Notify me about important opportunities.

## Scheduled discovery

Support configurable recurring schedules.

Examples:

- Discover relevant jobs every morning.
- Discover remote AI Engineer jobs daily.
- Discover Data Scientist jobs matching Python and ML.
- Discover Data Analyst jobs requiring SQL and Power BI.

Use my configured timezone.

Only email recruiters when an appropriate, permitted contact exists.

For portal-only jobs, create a prepared application package and direct me to the official application page.

---

# 16. Gmail job-alert intelligence

Build an optional module to process job-alert emails from my connected Gmail account.

This can help reduce manual job searching.

Allow the user to define:

- Relevant senders.
- Relevant Gmail labels.
- Search filters.
- Authorized alert sources.

Potential sources include job-alert subscriptions and company career notifications.

Retrieve only relevant messages whenever possible.

Extract locally:

- Job title.
- Company.
- Location.
- Job link.
- Date received.
- Available description.

Deduplicate against existing opportunities.

Do not assume an alert proves a job is still available.

Verify the posting through an authorized source where practical.

Do not automatically visit restricted websites or simulate authenticated activity.

Do not transmit raw Gmail alert contents to unpaid Gemini.

Process permitted, de-identified information only when necessary.

---

# 17. Smart opportunity scoring engine

Build an explainable job matching system.

Do not rely exclusively on an LLM-generated score.

Use a hybrid matching approach.

## Deterministic scoring

Calculate weighted compatibility based on:

- Required skills.
- Preferred skills.
- Experience requirements.
- Education requirements.
- Preferred role.
- Location.
- Work mode.
- User preferences.
- Eligibility.
- Job recency.
- Confirmed profile facts.

Suggested initial weights:

```yaml
required_skills: 30
preferred_skills: 10
experience: 20
role_alignment: 15
location_and_work_mode: 10
education: 5
industry_preference: 5
job_recency: 5
```

Make the weights configurable.

These are suggested heuristic weights.

Do not present the resulting score as a scientifically validated hiring probability.

## Hard requirements

Distinguish hard eligibility requirements from preferences.

Examples:

- Mandatory work authorization.
- Required professional license.
- Required degree.
- Required location.
- Mandatory years of experience.
- Explicit technical requirements.

If a hard requirement is clearly not satisfied, flag the application.

Do not automatically override dealbreakers.

Unknown requirements must be labeled unknown.

## Match output

Return:

```json
{
  "matchScore": 84,
  "confidence": "high",
  "recommendation": "apply",
  "matchedSkills": [],
  "missingSkills": [],
  "verifiedStrengths": [],
  "dealbreakers": [],
  "unknownRequirements": [],
  "recommendedResumeId": "",
  "explanation": ""
}
```

Use actual profile and job data to populate these fields.

For speculative email-only applications without a job description, do not manufacture a precise job-fit score.

Use company and role relevance with an explicit low-information label.

---

# 18. Modular intelligent agent architecture

Implement focused AI modules, not uncontrolled agent swarms.

Every module must have:

- Typed input.
- Typed output.
- Schema validation.
- Configurable provider.
- Configurable model.
- Data classification.
- Timeout.
- Retry policy.
- Execution trace.
- Clear error handling.

Implement these intelligence modules.

## Agent A: Profile Intelligence

Uses locally parsed, user-approved profile information.

Responsibilities:

- Organize skills.
- Normalize experience categories.
- Identify relevant achievements.
- Suggest profile improvements.

## Agent B: Opportunity Intelligence

Responsibilities:

- Extract job requirements.
- Identify responsibilities.
- Identify mandatory skills.
- Distinguish requirements from preferences.
- Normalize role categories.

## Agent C: Company Intelligence

Responsibilities:

- Analyze permitted public company information.
- Identify business context.
- Determine relevant company characteristics.
- Summarize useful information for personalization.

Every company research result must preserve source URLs and retrieval dates.

AI-generated company claims without source evidence must not be treated as facts.

## Agent D: Resume Selection

Use deterministic scoring first.

Use AI only when an ambiguous decision requires it.

Select the most relevant approved resume.

Explain the decision.

## Agent E: Application Writing

Generate:

- Personalized subject line.
- Personalized application body.
- Optional cover letter.
- Relevant strengths.
- Clear call to action.

Ground all candidate claims in approved facts.

## Agent F: Quality Assurance

Check:

- Unsupported claims.
- Incorrect company names.
- Wrong job titles.
- Incorrect recruiter names.
- Missing attachments.
- Unresolved placeholders.
- Excessive length.
- Inappropriate tone.
- Contradictions.
- Duplicates.

Deterministic validation must remain authoritative.

## Agent G: Reply Intelligence

Classify relevant replies using local processing by default.

Where necessary and permitted, use sanitized AI inputs.

Categories:

- Positive recruiter reply.
- Interview invitation.
- Screening request.
- Assessment invitation.
- Additional information required.
- Rejection.
- Automated acknowledgement.
- Out-of-office.
- Bounce.
- Opt-out.
- Unknown.

## Agent H: Follow-Up Writing

Generate a polite, context-aware follow-up.

Avoid repetitive messages.

Use only necessary permitted information.

## Agent I: Career Intelligence

Analyze application outcomes.

Identify patterns and suggest improvements.

Do not confuse correlation with causation.

## Agent J: Interview Preparation

Generate role-specific interview preparation materials.

Use confirmed candidate experience and permitted public company information.

## Agent execution optimization

Do not run every agent for every application.

Use a workflow planner that selects only necessary modules.

Simple applications should require very few AI calls.

---

# 19. Human-quality application generation

This must be exceptionally good.

The generated emails should sound like a real candidate who genuinely cares about the opportunity.

Avoid generic mass-mailing language.

Default style:

- Warm.
- Professional.
- Concise.
- Natural.
- Specific.
- Confident without exaggeration.
- Respectful of the recruiter's time.

Support selectable styles:

- Concise professional.
- Warm and genuine.
- Technical.
- Startup-oriented.
- Formal.
- Referral request.
- General expression of interest.

## Email structure

A good application should typically include:

1. Natural greeting.
2. Reason for contacting the recipient.
3. Relevant target role or opportunity.
4. One or two strong verified qualifications.
5. Brief explanation of potential contribution.
6. Mention of attached resume.
7. Polite call to action.
8. Professional sign-off.

Target approximately 80–160 words by default when appropriate.

Allow the user to adjust length.

Do not make emails unnecessarily long.

## Example generation principles

Bad:

"I hope this email finds you well. I am writing to express my keen interest in joining your esteemed organization."

Better:

"Hi Priya, I came across the Data Analyst opportunity at your company and wanted to reach out directly. My experience with Python, SQL and operational reporting has helped me build solutions that turn everyday business data into practical decisions."

This is an illustrative example.

Use actual confirmed context.

Do not claim the user discovered a posting unless one exists.

For speculative outreach:

"Hi Priya, I wanted to introduce myself and ask whether your team might have suitable opportunities in data analytics. My background includes Python, SQL and dashboard development, and I would welcome the chance to share how I could contribute."

Do not pretend to know the recruiter personally.

Do not invent company achievements.

Do not fabricate familiarity with products or projects.

## Personalization hierarchy

Use the strongest available evidence:

1. Verified job description.
2. Verified company information.
3. User-provided recruiter context.
4. Confirmed candidate qualifications.
5. Target-role relevance.

If detailed information is unavailable, use a straightforward general application.

Never make up personalization to fill missing fields.

## Writing memory

Allow me to rate generated emails.

Support:

- Good.
- Too generic.
- Too long.
- Too formal.
- Too sales-oriented.
- Needs more technical details.
- Needs more warmth.

Store writing preferences.

Allow saving approved email examples.

Use this feedback to improve future drafts through retrieval and prompt configuration.

Do not pretend the application fine-tunes models automatically.

---

# 20. Application content preview

Before sending, create a complete preview interface.

Display:

- Recipient.
- Company.
- Position.
- Source.
- Job requirements.
- Match explanation.
- Selected resume.
- Email subject.
- Email body.
- Attachment name.
- Personalization evidence.
- AI provider used.
- Model used.
- QA results.
- Follow-up rules.
- Sending schedule.

Actions:

- Edit email.
- Regenerate.
- Shorten.
- Add warmth.
- Make more professional.
- Make more technical.
- Change resume.
- Change model.
- Save draft.
- Approve.
- Schedule.
- Send.
- Reject.

Support autosaving edits.

Make the approval screen extremely efficient.

Allow approving several independently reviewed applications together.

Show meaningful differences between applications.

---

# 21. Gmail integration

Implement genuine Gmail API integration.

Use secure OAuth 2.0.

Never ask me to provide my Gmail password.

Never store Gmail credentials insecurely.

Use the minimum scope necessary for each feature.

## Email sending

Use Gmail's sending capability through the official API.

Allow:

- Plain-text email.
- Safe HTML email.
- PDF resume attachment.
- Approved cover letter attachment.
- Email signature.
- Thread-aware replies.

Use `gmail.send` for sending where sufficient.

Keep drafts in the application database if this avoids needing broader Gmail draft permissions.

Request additional Gmail read permissions only when reply monitoring is explicitly enabled.

Document the sensitive and restricted scope requirements.

## OAuth setup

Provide an exact setup guide for:

- Google Cloud project creation.
- Gmail API enablement.
- OAuth consent configuration.
- OAuth client credentials.
- Authorized redirect URLs.
- Test users.
- Required scopes.
- Token refresh.
- Reauthorization.
- Production verification requirements.

Handle OAuth testing limitations, including any refresh-token expiry rules applicable to the selected configuration.

Do not assume the system can remain connected indefinitely.

Display clear reauthorization notifications.

## Token security

Encrypt refresh tokens.

Never expose access tokens.

Never log token values.

Use secure OAuth state validation and other supported protections.

Handle revoked access correctly.

## Sending reliability

Create a durable email outbox.

Each email operation should contain:

- Internal application ID.
- User ID.
- Sending account.
- Recipient.
- Immutable content version.
- Approved resume version.
- Idempotency key.
- Send status.
- Retry count.
- Gmail message ID.
- Gmail thread ID.
- Timestamp.
- Last error.

Implement transaction-safe state changes.

Prevent multiple workers from sending the same email.

If Gmail might have accepted a message but the network request fails:

- Do not blindly retry.
- Attempt reconciliation when appropriate permissions exist.
- Mark as SEND_UNCERTAIN if confirmation is unavailable.
- Require manual resolution when necessary.

Use stable message metadata where supported.

Ensure actual delivery and Gmail acceptance are clearly distinguished.

---

# 22. Automation control center

Create a central Autopilot configuration page.

This should be the heart of the application.

Implement four operating modes.

## Mode 1: Manual

AI prepares drafts.

I decide when to send each application.

## Mode 2: Assisted

The system discovers opportunities, prepares applications and groups them into a review queue.

I approve individual applications or batches.

## Mode 3: Controlled Autopilot

The system prepares and sends eligible applications automatically according to my explicit configuration.

Default activation must be off.

The user must intentionally enable it.

## Mode 4: Pause

No new automatic sending.

Discovery and draft preparation may continue if permitted by the user's pause configuration.

Preserve queued work.

## Example personal automation policy

```yaml
autopilot:
  enabled: false

  mode: assisted

  discovery:
    enabled: true
    schedule: "07:00"
    timezone: "Asia/Kolkata"

  application_preparation:
    enabled: true
    auto_select_resume: true
    use_approved_profile_only: true
    require_quality_validation: true

  automatic_sending:
    enabled: false
    daily_limit: 8
    hourly_limit: 2
    minimum_match_score: 80
    require_verified_opportunity: true
    require_approved_resume: true
    require_appropriate_recipient: true
    require_no_dealbreakers: true
    exclude_unknown_eligibility: true

    allowed_days:
      - Monday
      - Tuesday
      - Wednesday
      - Thursday
      - Friday

    timezone: "recipient_or_configured"
    start_time: "09:00"
    end_time: "17:30"

  speculative_outreach:
    enabled: true
    automatic_sending: false
    require_contact_review: true
    company_cooldown_days: 30

  follow_ups:
    enabled: true
    delay_days: 7
    maximum_follow_ups: 1
    require_recent_reply_sync: true
    stop_on_meaningful_reply: true

  safety:
    prevent_duplicates: true
    respect_opt_outs: true
    pause_on_repeated_bounces: true
    pause_on_provider_warnings: true
    pause_on_quota_errors: true
    emergency_stop_enabled: true
```

These are proposed conservative application settings, not Gmail's official sending limits.

Make all appropriate values configurable.

Do not increase limits automatically to evade provider restrictions.

## Smart sending rules

Before every automatic send, verify:

- Automation is enabled.
- Sending account is connected.
- Recipient is appropriate.
- Contact provenance is available.
- Required permissions exist.
- The application is not a duplicate.
- Company cooldown has passed.
- User policy permits this application type.
- The resume is approved.
- The email passed validation.
- No unresolved placeholders remain.
- There are no unverified candidate claims.
- Relevant eligibility requirements are satisfied.
- Sending quota remains available.
- Current time is within the sending window.
- Recipient is not suppressed.
- The application has not been withdrawn.

If any required check fails, move the item to a review queue.

Do not use an LLM as the final authority for sending permission.

## Exception-first management

I should not need to review every normal operation when Autopilot is enabled.

Create a Needs Attention dashboard containing:

- Missing recruiter information.
- Low-confidence opportunities.
- Unknown eligibility.
- Potential duplicates.
- Failed sends.
- Expired Gmail connection.
- AI quota issues.
- Suspicious or unsupported content.
- Uncertain sending status.
- Recruiter requests requiring a personal response.

This should allow me to manage the system in a few minutes.

## Emergency stop

Create a prominent Pause All Automation control.

When activated:

- Stop starting new sends.
- Stop follow-up execution.
- Pause relevant scheduled jobs.
- Preserve all application data.
- Clearly display operations already in flight.

The kill switch must be checked server-side.

Do not rely only on a frontend toggle.

---

# 23. Smart follow-up engine

Implement intelligent, restrained follow-up automation.

Default policy:

- One initial application.
- One follow-up after approximately seven days if appropriate.
- No further automatic messages unless explicitly configured.

Before sending a follow-up:

1. Check the original email was accepted by Gmail.
2. Check the application remains active.
3. Check the latest available thread.
4. Check recipient suppression.
5. Check whether a meaningful reply has arrived.
6. Check whether an interview exists.
7. Check whether the application was rejected.
8. Check whether an out-of-office response requires delaying.
9. Check sending limits.
10. Check automation policy.
11. Check duplicate follow-up status.
12. Generate the follow-up.
13. Validate the message.
14. Send within the original thread.

Stop or pause follow-ups when:

- A meaningful recruiter reply arrives.
- An interview is scheduled.
- A rejection arrives.
- A bounce occurs.
- The recipient requests no further communication.
- The user pauses the application.
- The maximum number is reached.
- Gmail connection is unavailable.
- Reply synchronization is stale.
- The sending result is uncertain.

Do not send follow-ups indefinitely.

Follow-ups should be genuine and concise.

Never falsely claim the recruiter promised a response.

---

# 24. Smart recruiter inbox

Build a dedicated application inbox.

Only access relevant email messages whenever feasible.

Use supported Gmail synchronization mechanisms.

Maintain persistent synchronization cursors.

Support recovery if a synchronization cursor becomes invalid.

## Inbox categories

- All relevant replies.
- Positive responses.
- Interviews.
- Assessments.
- Screening questions.
- Additional documents requested.
- Rejections.
- Automated acknowledgements.
- Out-of-office.
- Bounces.
- Unknown.

## Reply handling

When a recruiter responds:

1. Find the linked application.
2. Classify the response.
3. Cancel or pause pending follow-ups appropriately.
4. Update application status.
5. Extract available next steps.
6. Notify me.
7. Prepare an optional reply draft.

Do not automatically answer sensitive questions.

Do not automatically:

- Accept a job offer.
- Negotiate salary.
- Confirm interview availability.
- Provide identification documents.
- Provide bank details.
- Share confidential information.
- Complete assessment questions dishonestly.

Require my approval for meaningful recruiter communications.

## Safe response generation

Use verified candidate information.

Preserve context without transmitting unnecessary private messages to AI providers.

Allow editing before sending.

---

# 25. Daily intelligent job-search routine

Build a configurable daily workflow.

Example:

## Morning

- Check authorized job sources.
- Process relevant job alerts.
- Deduplicate new postings.
- Rank opportunities.
- Prepare applications for appropriate jobs.
- Create a review summary.

## During configured sending hours

- Process eligible approved or policy-authorized applications.
- Select approved resumes.
- Send individualized emails.
- Update application records.
- Monitor sending errors and quotas.

## Throughout the day

- Synchronize relevant recruiter replies.
- Detect interviews.
- Cancel inappropriate follow-ups.
- Create necessary notifications.

## Evening

Generate a concise daily report:

```text
CAREERPILOT — DAILY SUMMARY

New relevant opportunities: [actual count]
Applications prepared: [actual count]
Applications sent: [actual count]
Applications awaiting approval: [actual count]
Recruiter replies: [actual count]
Interview invitations: [actual count]
Follow-ups completed: [actual count]
Blocked operations: [actual count]
```

Include actionable items.

The system should focus my attention on things that actually require me.

Do not generate fake activity.

Allow configurable daily and weekly summaries.

---

# 26. Premium application design

Build an exceptionally polished user experience.

Design inspiration:

- Linear.
- Stripe.
- Notion.
- Modern premium productivity platforms.

Create an original identity.

Use:

- Excellent typography.
- Clean whitespace.
- Subtle borders.
- Premium neutral color palette.
- Carefully chosen accent colors.
- Beautiful cards.
- Smooth transitions.
- Responsive layouts.
- Accessible components.
- Dark and light themes.
- Meaningful animations.
- Skeleton loading states.
- Intelligent empty states.

Avoid:

- Generic AI avatars.
- Excessive gradients.
- Neon-heavy design.
- Overloaded dashboards.
- Unnecessary glassmorphism.
- Excessive animation.
- Fake marketing statistics.

Every interface should feel fast and intentional.

## Dashboard navigation

Create:

- Overview.
- Autopilot.
- Quick Apply.
- Job Discovery.
- Recruiter Contacts.
- Imports.
- Application Queue.
- Applications.
- Inbox.
- Follow-Ups.
- Resume Library.
- Interview Center.
- Analytics.
- AI Providers.
- Integrations.
- Settings.

Provide:

- Collapsible sidebar.
- Mobile navigation.
- Global search.
- Command palette.
- Keyboard shortcuts.
- Notifications.
- Clear automation status.

---

# 27. Dashboard overview

The overview should immediately answer:

- Is Autopilot working?
- How many applications were sent?
- What needs my attention?
- Did any recruiters reply?
- Are interviews scheduled?
- Are AI providers available?
- Is Gmail connected?

Display real database-derived metrics:

- Applications today.
- Applications this week.
- Applications this month.
- Prepared applications.
- Pending approvals.
- Positive replies.
- Interviews.
- Follow-ups due.
- Failed operations.
- Reply rate.
- Interview conversion rate.

## Dashboard sections

1. Autopilot health.
2. Application activity.
3. Needs Attention.
4. Upcoming interviews.
5. Top matching opportunities.
6. Recruiter reply summary.
7. Recent automated activity.
8. AI usage.
9. Gmail connection health.
10. Quick Apply entry.

All metrics must come from real records.

For an empty database, show onboarding guidance.

---

# 28. Application tracker

Create both Kanban and table views.

## Application statuses

Use a clear state machine.

Suggested states:

```text
DISCOVERED
DRAFT
ANALYZING
REVIEW_REQUIRED
APPROVED
QUEUED
SCHEDULED
SENDING
SENT
SEND_UNCERTAIN
FAILED
REPLIED
SCREENING
ASSESSMENT
INTERVIEW
OFFER
REJECTED
WITHDRAWN
ARCHIVED
MANUALLY_APPLIED
```

Keep communication transport status distinct from career/application outcome where appropriate.

Do not conflate SENT with DELIVERED.

Maintain status history.

## Table functionality

- Search.
- Sort.
- Filter.
- Pagination.
- Column visibility.
- Saved views.
- Date filtering.
- Role filtering.
- Company filtering.
- Resume filtering.
- Status filtering.
- Bulk actions.
- CSV export.

Application detail pages must show:

- Original job information.
- Contact information.
- Research evidence.
- Match score.
- Selected resume.
- Email content.
- Gmail thread reference.
- Follow-up history.
- AI execution history.
- Status timeline.
- Interview details.
- Notes.
- Error information.

---

# 29. Resume tailoring

Implement a future-ready resume tailoring module.

It should be functional but not unnecessarily invoked for every application.

If a suitable approved resume already exists, use it.

When tailoring is requested:

- Reorder existing skills.
- Highlight relevant projects.
- Improve summary wording.
- Emphasize verified achievements.
- Align terminology with the job description.
- Preserve original facts.

Do not:

- Invent experience.
- Add unsupported qualifications.
- Modify employment dates.
- Inflate achievement numbers.
- Add skills the user does not have.
- Falsify years of experience.

Show a clear original-versus-proposed comparison.

Require approval for new resume variants.

Generate professional downloadable PDF and DOCX versions where practical.

Only approved resume versions may be automatically attached.

---

# 30. Interview center

When an interview invitation is detected:

- Associate it with the application.
- Extract the stated date and time.
- Extract the stated timezone.
- Store the meeting link when provided.
- Identify preparation requirements.
- Notify me.

Do not invent missing interview details.

Provide:

- Technical question preparation.
- Behavioral questions.
- Role-specific interview guidance.
- Relevant project explanations.
- Company research.
- Suggested questions for interviewers.
- Preparation checklist.
- Interview notes.

Use verified candidate profile information.

Optional calendar integration can be added.

Require confirmation before creating or modifying calendar events unless an appropriate explicit policy permits it.

---

# 31. Application analytics

Create meaningful career analytics.

Include:

- Applications by role.
- Applications by company.
- Applications by source.
- Applications by resume.
- Response rate.
- Positive reply rate.
- Interview conversion rate.
- Rejection rate.
- Time to first meaningful reply.
- Follow-up performance.
- Job discovery conversion.
- AI provider utilization.
- Application processing latency.

Use explicit metric definitions.

Exclude drafts from sent-application metrics.

Distinguish:

- Email sent.
- Portal submission confirmed.
- Recruiter replied.
- Interview invitation.
- Offer.

Do not present a speculative email as a confirmed application to an active vacancy.

## Intelligent insights

Provide observations such as:

- Which target roles receive more responses.
- Which resume versions perform better.
- Which sources generate stronger opportunities.
- Which common requirements I do not currently satisfy.
- Whether application quality can be improved.

Require sufficient data before making strong recommendations.

Do not imply guaranteed employment outcomes.

---

# 32. AI usage and system health

Create a separate system health page.

Display:

- Gemini request usage.
- Groq request usage.
- Tokens consumed.
- Usage by task.
- Usage by model.
- Average latency.
- Provider errors.
- Fallback events.
- Rate-limit events.
- Cache hit rate.
- Queued AI tasks.
- Paused AI tasks.
- Email sending activity.
- Background worker health.
- Last Gmail synchronization.
- Upcoming scheduled jobs.

Use real provider quota information when available.

Otherwise, clearly label usage as locally tracked.

Never fabricate quota availability.

Show useful troubleshooting instructions.

---

# 33. Database architecture

Design a normalized Prisma schema.

Suggested entities:

```text
User
UserProfile
UserPreferences
ProfessionalExperience
Education
Skill
Project
VerifiedProfileClaim

Resume
ResumeVersion
ResumeAnalysis

AIProviderConnection
AIModelConfiguration
AIRoutingRule
AIUsageLog
AITaskExecution
AIBudget

EmailAccount
EmailSyncCursor
EmailThread
EmailMessage
EmailOutbox
EmailSuppression

RecruiterContact
Company
CompanyResearch
ContactSource
ImportBatch
ImportRow

JobSource
JobPosting
JobMatch
SavedSearch

Application
ApplicationDraft
ApplicationAttachment
ApplicationStatusHistory
ApplicationQualityReport

FollowUp
FollowUpPolicy

AutomationPolicy
AutomationExecution
ScheduledJob
SendingQuota

Interview
InterviewPreparation

Notification
AuditLog
WritingPreference
ApprovedWritingExample
UserSetting
```

Improve or consolidate the proposed models where appropriate.

Do not blindly create excessive tables.

Requirements:

- Foreign keys.
- Unique constraints.
- User ownership constraints.
- Idempotency keys.
- Transactions.
- Indexed foreign keys.
- Indexed frequently filtered fields.
- Consistent timestamps.
- Appropriate enums.
- Carefully reviewed cascading behavior.
- Immutable sent-content references.
- Clear deletion behavior.

All private records must be isolated by user.

If using PostgreSQL row-level security, implement it correctly with the actual Prisma and connection-pooling architecture.

Application-layer authorization remains mandatory.

---

# 34. Contact and research safety

Implement a secure public information retrieval service.

Requirements:

- Allowlisted protocols.
- SSRF protection.
- DNS resolution validation.
- Redirect validation.
- Block private network addresses.
- Block localhost.
- Block cloud metadata endpoints.
- Response size limits.
- Request timeouts.
- Safe parsing.
- Content-type validation.

Treat all retrieved content as untrusted.

Respect website access restrictions.

Do not invent search results.

An LLM is not an authoritative company database.

Use actual public source evidence.

If company information cannot be established reliably, generate a generic application rather than hallucinating.

---

# 35. Security architecture

Treat this as a real sensitive-data application.

Protect:

- Resumes.
- Candidate information.
- Recruiter contacts.
- Email contents.
- Gmail OAuth tokens.
- AI API keys.
- Application history.

Implement:

- Authentication.
- Authorization.
- Tenant isolation.
- Input validation.
- Output sanitization.
- Secure cookies.
- CSRF protections where applicable.
- Rate limiting.
- Content Security Policy.
- Webhook verification.
- Replay protection.
- Audit logging.
- Secure file uploads.
- Secret redaction.
- Dependency security checks.

## Key encryption

Use authenticated encryption such as AES-256-GCM or managed KMS.

Implement:

- Unique nonces.
- Authentication tags.
- Encryption key versioning.
- Secure master-key storage.
- Key rotation support.

Never place the master encryption key in the frontend.

## Prompt injection protection

Treat these inputs as untrusted:

- Job descriptions.
- Recruiter emails.
- Imported contact data.
- Resume documents.
- Company websites.
- AI provider responses.
- External API responses.

External content must never override system instructions.

AI agents must not directly execute:

- Email sending.
- Database mutations.
- Arbitrary code.
- Credential access.
- Unauthorized web requests.

All actions must pass through validated, deterministic application services.

## Privacy controls

Support:

- Account deletion.
- Resume deletion.
- Contact deletion.
- API key deletion.
- Gmail disconnection.
- Data export.
- Retention configuration.
- Sensitive log redaction.

Do not collect unnecessary personal information.

Do not include hidden tracking pixels.

Do not implement invasive recruiter profiling.

Do not build unsolicited bulk messaging infrastructure.

The purpose is targeted personal job applications.

---

# 36. Background processing and workflow reliability

Create durable background execution for:

- Resume parsing.
- Job discovery.
- Company research.
- Job analysis.
- Contact import.
- Application generation.
- Email sending.
- Gmail synchronization.
- Follow-up processing.
- Interview detection.
- Daily summaries.
- Maintenance.

Support:

- Persistent job state.
- Retry policies.
- Exponential backoff.
- Concurrency control.
- Job cancellation.
- Idempotency.
- Timeout.
- Worker leases.
- Execution history.
- Terminal failure handling.
- Progress reporting.
- Pause and resume.

Do not run indefinitely inside web requests.

If a worker crashes, recover unfinished jobs safely.

Prevent duplicate emails after a worker restart.

Recheck sending authorization immediately before execution.

Persist queue state so restarting the application does not lose work.

---

# 37. Repository architecture

Use a clean feature-oriented structure.

Suggested:

```text
src/
  app/
    (auth)/
    (dashboard)/
    api/

  components/
    ui/
    dashboard/
    autopilot/
    applications/
    contacts/
    resumes/
    jobs/
    inbox/
    analytics/
    settings/

  features/
    auth/
    profiles/
    resumes/
    contacts/
    imports/
    jobs/
    companies/
    applications/
    automation/
    inbox/
    followups/
    interviews/
    analytics/

  lib/
    ai/
      providers/
        gemini.ts
        groq.ts
      gateway/
      routing/
      schemas/
      agents/
      prompts/
      privacy/
      usage/

    email/
      gmail/
      oauth/
      mime/
      sync/
      outbox/

    security/
    storage/
    database/
    validation/
    logging/
    scheduling/

  services/
    application.service.ts
    contact.service.ts
    company.service.ts
    job.service.ts
    resume.service.ts
    email.service.ts
    automation.service.ts
    analytics.service.ts

  jobs/
    discover-jobs.ts
    process-import.ts
    prepare-application.ts
    send-application.ts
    synchronize-inbox.ts
    process-followups.ts
    daily-summary.ts

  hooks/
  types/
  config/

prisma/
  schema.prisma
  migrations/

tests/
  unit/
  integration/
  e2e/

docs/
  IMPLEMENTATION_PLAN.md
  IMPLEMENTATION_STATUS.md
  ARCHITECTURE.md
  AI_PROVIDERS.md
  GMAIL_SETUP.md
  DATABASE.md
  SECURITY.md
  AUTOMATION.md
  DEPLOYMENT.md
  TROUBLESHOOTING.md
```

Adapt the structure as needed.

Separate business logic from UI components.

Keep AI provider logic centralized.

Keep sending logic centralized.

Keep authorization centralized.

---

# 38. Development phases and priorities

Implement in the following order.

## Phase 0: Architecture and repository audit

- Repository inspection.
- Architecture planning.
- Dependency validation.
- Database design.
- Security design.
- Implementation roadmap.

## Phase 1: Core foundation

- Next.js project.
- Authentication.
- Neon database.
- Prisma.
- Dashboard layout.
- Professional profile.
- Settings.
- Design system.

## Phase 2: Resume and AI infrastructure

- Resume library.
- Local resume parsing.
- Verified candidate profile.
- Gemini integration.
- Groq integration.
- Encrypted API keys.
- Dynamic model configuration.
- Provider routing.
- Privacy filters.
- AI usage tracking.

## Phase 3: Gmail and single Quick Apply

- Gmail OAuth.
- Token encryption.
- Application generation.
- Resume selection.
- Application preview.
- Manual approval.
- Email outbox.
- Resume attachment.
- Actual sending.
- Application persistence.

At this stage, I must be able to send one real personalized application.

Do not build advanced dashboards before this works.

## Phase 4: Apollo-style imports and automation

- CSV and XLSX imports.
- Column mapping.
- Contact normalization.
- Duplicate protection.
- Recruiter relevance.
- Company grouping.
- Batch draft generation.
- Review queue.
- Controlled automatic sending.
- Scheduling.
- Automation policies.
- Emergency stop.

## Phase 5: Gmail reply intelligence and follow-ups

- Relevant inbox synchronization.
- Reply classification.
- Application status updates.
- Follow-up eligibility.
- Thread-aware follow-up sending.
- Bounce handling.
- Opt-out handling.
- Interview detection.

## Phase 6: Job discovery and LinkedIn Copilot

- Authorized job-source connectors.
- Job matching.
- Job-alert ingestion.
- LinkedIn job preparation.
- Application answer vault.
- Resume tailoring.
- Opportunity ranking.

## Phase 7: Analytics and interview intelligence

- Application analytics.
- Career insights.
- Interview preparation.
- Daily summaries.
- Notifications.
- Provider health.
- System activity.

## Phase 8: Production hardening

- Security audit.
- Performance optimization.
- Accessibility.
- Mobile testing.
- Unit tests.
- Integration tests.
- End-to-end tests.
- Deployment verification.
- Documentation.
- Final UI polish.

Complete each phase as a functional vertical slice.

Update implementation status after every phase.

---

# 39. Testing requirements

Create comprehensive tests.

## Unit tests

Test:

- Contact normalization.
- Email validation.
- CSV parsing.
- Duplicate detection.
- Company-level cooldown.
- Job scoring.
- Resume selection.
- Provider routing.
- Data redaction.
- AI schema validation.
- Encryption.
- Automation policy evaluation.
- Quota accounting.
- Follow-up eligibility.
- Status transitions.

## Integration tests

Test:

- Database persistence.
- Tenant isolation.
- Gmail OAuth handling.
- Gmail sending.
- Resume attachments.
- AI fallback.
- Job orchestration.
- Outbox concurrency.
- Uncertain-send reconciliation.
- Gmail synchronization.
- Reply classification.
- Automatic follow-up cancellation.
- Suppression enforcement.
- Contact import.
- Queue recovery.

## End-to-end tests

Test this complete scenario:

1. Sign in.
2. Configure professional profile.
3. Upload a resume.
4. Add Gemini and Groq keys.
5. Connect Gmail.
6. Enter recruiter email.
7. Generate a personalized application.
8. Preview application.
9. Approve sending.
10. Send with resume attachment.
11. Display real application status.
12. Process a simulated reply.
13. Cancel follow-up.
14. Display updated analytics.

Use mocked external services for automated tests.

Do not send real emails during automated testing.

Provide an explicit test mode.

Test mode must never silently behave like production.

Clearly distinguish mocked integration verification from real integration verification.

## Critical failure tests

Verify:

- Two workers cannot send the same email.
- An expired Gmail token does not lose queued work.
- AI quota exhaustion does not lose drafts.
- Failed imports do not create partial corrupted records.
- Another user cannot access my data.
- Prompt injection cannot trigger unauthorized email sending.
- Emergency pause prevents new automatic sends.
- A meaningful reply blocks an eligible follow-up.
- Private data cannot leak into unpaid Gemini prompts.
- Automatic fallback respects data classification.

---

# 40. Environment configuration

Create a complete `.env.example`.

Include actual required environment variables for selected services.

Example:

```env
DATABASE_URL=
DIRECT_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

APP_BASE_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

ENCRYPTION_MASTER_KEY=
ENCRYPTION_KEY_VERSION=

STORAGE_PROVIDER=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

BACKGROUND_JOB_EVENT_KEY=
BACKGROUND_JOB_SIGNING_KEY=
```

Do not require server-level Gemini or Groq API keys.

I should configure my AI keys securely through the dashboard.

For local development, optionally support environment-based AI keys as a clearly documented development convenience.

Do not commit credentials.

Provide secure key-generation instructions.

Document which environment variables are essential and which are optional.

---

# 41. Deployment documentation

Create a complete deployment guide.

Include:

1. Dependency installation.
2. Local environment configuration.
3. Neon database creation.
4. Prisma migration execution.
5. Authentication configuration.
6. Gmail OAuth setup.
7. Storage configuration.
8. Worker configuration.
9. Local development commands.
10. Testing commands.
11. Production build.
12. Deployment steps.
13. Production callback URLs.
14. Background job verification.
15. Health-check verification.
16. Real email integration testing.
17. Troubleshooting.

Explain which services have free tiers and their actual limitations after verifying current documentation.

Do not promise permanently free hosting.

Distinguish:

- AI API usage cost.
- Database hosting cost.
- File storage cost.
- Background worker cost.
- Authentication cost.
- Optional monitoring cost.

Provide a personal-use, low-cost deployment configuration.

---

# 42. Required acceptance scenarios

The project is not complete until these scenarios work.

## Scenario A: Single recruiter email

I paste a recruiter email.

The system:

- Validates the email.
- Checks for duplicates.
- Identifies available company context.
- Selects a suitable approved resume.
- Generates a natural personalized application.
- Validates it.
- Displays a preview.
- Sends after approval.
- Records the real result.

## Scenario B: Apollo-style CSV

I import a permitted CSV containing recruiter contacts.

The system:

- Maps columns.
- Validates records.
- Removes duplicates.
- Groups companies.
- Identifies relevant hiring contacts.
- Flags questionable records.
- Creates individual application drafts.
- Provides a review queue.
- Sends only eligible approved or policy-authorized applications.

## Scenario C: Free AI providers

I configure Gemini and Groq.

The system:

- Tests both connections.
- Discovers or validates models.
- Uses my selected models.
- Records actual usage.
- Supports authorized fallback.
- Pauses when quotas are exhausted.
- Protects sensitive data.

## Scenario D: LinkedIn Copilot

I provide a LinkedIn job link and description.

The system:

- Analyzes the opportunity.
- Explains my suitability.
- Selects a resume.
- Prepares answers.
- Generates an optional cover letter.
- Provides the official application link.
- Allows me to confirm manual submission.

It does not perform unauthorized LinkedIn automation.

## Scenario E: Controlled Autopilot

I enable automatic sending.

The system:

- Applies my configured policies.
- Checks every hard validation requirement.
- Sends within allowed limits.
- Prevents duplicate sends.
- Preserves approved resume versions.
- Records every decision.
- Moves exceptions to review.

## Scenario F: Follow-up

An appropriate application receives no reply.

The system:

- Checks current thread information.
- Verifies eligibility.
- Generates a concise follow-up.
- Sends according to policy.
- Records the result.

## Scenario G: Interview response

A recruiter sends an interview invitation.

The system:

- Identifies the linked application.
- Updates the status.
- Stops follow-ups.
- Extracts available details.
- Notifies me.
- Creates an interview preparation workflow.

## Scenario H: Provider failure

Gemini or Groq becomes unavailable.

The system:

- Classifies the error.
- Uses a safe fallback if permitted.
- Preserves work.
- Pauses if necessary.
- Displays recovery information.

## Scenario I: Daily autonomous routine

The scheduled workflow runs while I am away.

The system:

- Discovers jobs from configured sources.
- Processes relevant job alerts.
- Prepares applications.
- Sends only eligible applications.
- Monitors replies.
- Creates a daily summary.
- Highlights actions requiring my attention.

This must work on supported deployed infrastructure without requiring my browser to remain open.

---

# 43. Future expansion

Keep the product architecture extensible.

Potential future additions:

- Additional AI providers.
- Official authorized job application integrations.
- Google Calendar.
- Additional email providers.
- Authorized contact provider APIs.
- Browser-independent application preparation tools.
- Local AI models.
- Team accounts.
- Subscription billing.
- Multi-language applications.
- Advanced career intelligence.

Do not implement all future features now.

Do not let future commercialization delay my personal working product.

Focus on automation, quality and reliability.

---

# 44. Final implementation command

Start building CareerPilot AI now.

Do not simply provide suggestions.

Do not stop at UI mockups.

Do not create an unfinished prototype.

Inspect the repository, establish the implementation plan and begin making concrete working changes.

After each phase:

1. Implement the functionality.
2. Run type checking.
3. Run linting.
4. Run relevant tests.
5. Run the production build.
6. Fix discovered issues.
7. Update documentation.
8. Record remaining work.

If credentials are missing, implement the genuine integration and document the exact required setup.

Do not invent test results.

Do not represent mock integrations as live functionality.

The highest-priority workflow is:

**Import recruiter email or contact CSV → Understand opportunity → Select approved resume → Generate personalized application using Gemini or Groq → Validate → Review or apply explicit automation policy → Send through Gmail → Track → Detect reply → Follow up if appropriate.**

The second priority is:

**Discover authorized jobs → Rank by career relevance → Prepare application packages → Allow official portal submission or permitted recruiter outreach.**

The third priority is:

**Run autonomously on a configured schedule → Surface exceptions → Deliver a daily summary → Help me focus on interviews instead of repetitive application work.**

Build CareerPilot AI to an exceptional engineering and product-design standard.

Make it intelligent, fast, genuinely useful, reliable, private, secure and economical.

Most importantly, make the actual job application workflow work end-to-end.

Begin implementation.