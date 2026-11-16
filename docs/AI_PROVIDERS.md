# Gemini and Groq

Only these two providers are implemented. Official endpoints:
- Gemini: `https://generativelanguage.googleapis.com/v1beta/models` and `models/{model}:generateContent`.
- Groq: `https://api.groq.com/openai/v1/models` and `chat/completions`.

Connection testing lists available models. Save accepts only a returned identifier; no model names are hardcoded. Model listing is not proof of free quota or JSON capability. Some models may reject structured mode or token limits; the error is visible, the reserved budget remains conservative, and no draft is lost or marked sent.

Model configuration: enabled provider, model, manually confirmed free eligibility, daily requests, daily token budget, max output. Keys can be replaced or deleted. No default/fallback/task-specific routing UI is implemented; the user selects provider per draft. No implicit fallback or retry occurs. This avoids unintentionally sending data to another provider or hammering rate limits. 429 returns a cooling-off message with Retry-After where present. Request timeout is 25 seconds.

Before each generation, PostgreSQL atomically reserves one request and max-output + 1000 input tokens. The fixed prompt/input taxonomy stays below that input allowance. Successful calls store provider-reported usage. Failed/timeout calls retain the conservative reservation because upstream billing may have occurred. UTC budgets reset by date-filtered reservation history; there is no midnight destructive reset. Models that do not return usage show zero reported tokens while retaining reservation accounting.

Only fixed role categories and confirmed skills from `publicContext()` cross the boundary. Arbitrary profile text, job descriptions, private threads, recruiter addresses, names and resume files never enter the writer prompt. The resulting expression of interest is intentionally less tailored than the full requested opportunity-analysis workflow. Signature is appended locally. AI can still produce unsupported claims: explicit human fact confirmation is mandatory.

Terms reviewed: Gemini unpaid-service terms warn against submitting personal/sensitive/confidential information. Groq docs were blocked with HTTP 403 during development; verify current data handling terms in your account before use. No claim is made that either model/account is permanently free.
