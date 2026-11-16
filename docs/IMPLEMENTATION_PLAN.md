# SOL Ai implementation plan

Empty workspace audited 2026-11-16. No existing application or package constraints.

Architecture: Next.js App Router + strict TypeScript, Clerk identity, Prisma/PostgreSQL (Neon), encrypted private resume bytes in PostgreSQL for the personal-use initial release, encrypted BYOK Gemini/Groq credentials, official Gmail OAuth/send APIs, persistent database outbox. Vercel web requests never act as an indefinite worker. A separately scheduled authenticated worker endpoint performs bounded tasks.

Priority: profile → approved resume → authorized contact import → AI draft → editable review → explicit approval → durable send → recorded Gmail acceptance. Never manufacture data or mark uncertain network outcomes as sent. All resources scoped to Clerk user; optional OWNER_USER_ID restricts deployment to one account. No unconfigured fallback identity.

1. Foundation and database migrations.
2. Profile, private resumes and contact import.
3. Model discovery, encrypted provider settings and bounded generation.
4. Gmail OAuth, review and transactional outbox.
5. Reply synchronization and authorized job discovery.
6. Type/lint/unit/build checks, deployment instructions and honest acceptance matrix.

Free-tier status must be treated as account-specific; no billing guarantee. No automatic sending without reviewed approval in this release. Full autonomous sending remains disabled until policy and integration verification are complete.

## Version 0.2: evidence and bounded planning

Add local lexical RAG over approved sources, provider-safe evidence projection, a constrained multi-resume LLM planner, one bounded citation-repair step and an inspectable review trace. Preserve explicit approval and deterministic Gmail sending. Validate retrieval quality, privacy, unsupported planner tools and migrations. Add an honest portfolio guide.
