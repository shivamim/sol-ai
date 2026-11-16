# Security and privacy

Implemented: Clerk session verification and optional owner allowlist, fail-closed unconfigured APIs, per-user reads/writes, PostgreSQL foreign keys, origin validation on mutations, database-backed write/generation throttling, Zod validation, server-only AES-256-GCM secrets with unique 96-bit nonces and versioned keys, no plaintext key responses, no credential logs, private authenticated downloads, file extension/signature/size checks, no unsafe HTML rendering, CSP/security headers, OAuth state binding, stable MIME headers, constant-time cron secret checks, deterministic sending rules and auditable approval.

The server fetches only hardcoded Google/Groq/Gemini/Greenhouse/Lever hosts. Job-source identifiers are strictly constrained, redirects rejected for job discovery. Arbitrary user-provided URL fetching is intentionally absent, avoiding an unsupported SSRF-prone research service. Job descriptions are rendered as text, not HTML. React escapes output. External content is never executable.

Private data remains on the server. AI receives only role/skill taxonomy entries; not an assertion of mathematical anonymity, but a narrow data boundary. No Gmail message content or identity is sent to AI. User confirmation of provider data terms/free eligibility is required. Provider fallback is disabled rather than crossing a data boundary implicitly.

Key rotation: keep the previous key in `ENCRYPTION_MASTER_KEY_V<old version>`, set a new master key and version, replace saved provider keys and reconnect Gmail to re-encrypt. Verify no records retain the old version before removing the old key. Automatic bulk re-encryption is not implemented.

Limits requiring further hardening before broader production use: no independent security review; no antivirus/document sandbox; DOCX ZIP parsing can allocate significant memory; no automated retention policy; no suppression tombstone independent of explicitly deleted contacts; no OAuth PKCE; no automatic uncertain-send reconciliation; no persistent inbox cursors; no policy-authorized unreviewed sending. Do not expose the deployment broadly before reviewing these gaps. OWNER_USER_ID is recommended for the intended personal use.

Account-data deletion removes application data, not your Clerk identity or previously sent Gmail messages. Disconnect Gmail first to revoke Google's grant. Resume deletion retains historical sent-message text/identifiers; account-data deletion removes them. Export currently covers profile/contacts/applications/provider configuration without secrets; download resumes separately.
