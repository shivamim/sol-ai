# Presenting SOL Ai as a project

Suggested title: **SOL Ai — Privacy-first job application assistant with lexical RAG and bounded AI planning**.

Suggested description:

> Built a Next.js/TypeScript application that retrieves evidence from approved candidate documents, uses constrained Gemini/Groq planning and generation, and requires human approval before sending applications through Gmail. Implemented encrypted BYOK credentials, tenant-scoped PostgreSQL persistence, auditable evidence traces and a transactional outbox that preserves uncertain send outcomes.

Resume/project bullets you can use if you can explain and demonstrate the implementation:

- Implemented local BM25-style retrieval over approved resume passages and confirmed profile skills, with stable source references and a privacy filter that excludes raw private documents from AI prompts.
- Added a bounded LLM planner with allowlisted retrieval decisions, validated model output, a single citation-repair step and mandatory human approval before email dispatch.
- Built Clerk-authenticated Next.js APIs backed by Prisma/PostgreSQL, AES-256-GCM encrypted credentials, Gmail OAuth and concurrency-safe outbox processing.
- Tested tenant isolation, authorization, quota reservation, concurrent sending, uncertain outcomes, retrieval grounding and planner restrictions using a real disposable PostgreSQL database and mocked external APIs.

Do not claim vector RAG, a trained/fine-tuned model, fully autonomous applications, guaranteed email delivery, measured job-search improvements, a completed interview agent or production-scale validation. Add live deployment and real integration results only after actually verifying them. Automated tests use mocked Gmail/AI; they do not establish live service reliability.

## Short demonstration

1. Show the architecture and explain why retrieval is local and lexical.
2. Confirm a profile and approve a test resume.
3. Configure a supported model and connect Gmail with your own accounts.
4. Paste a job description and an appropriate test recipient.
5. Generate; open **Why this draft?** to show passages, source references and workflow steps.
6. Explain why an unsupported tool/citation is rejected and why the writer cannot send mail.
7. Edit/review/approve; send only to an address you control. Show Gmail acceptance separately from delivery.
8. Explain the uncertain-send case and the test that prevents duplicate dispatch.

## Interview discussion points

- RAG versus putting a whole resume in a prompt; lexical versus embedding search.
- Why fixed taxonomy projection protects privacy but reduces personalization.
- A bounded planning workflow versus a general autonomous agent.
- Why citations are not a factuality guarantee.
- Atomic quota reservation, per-user send locks and uncertain distributed side effects.
- Vercel Hobby scheduling limits and why database persistence does not itself provide a frequent worker.
- What you would implement next: semantic retrieval evaluation, independently confirmed claim extraction, durable agent checkpoints, safe follow-ups, live/browser validation.
