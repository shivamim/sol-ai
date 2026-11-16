# SOL Ai 0.3

## Agent behavior

Quick Apply now offers Agent and Assisted modes. The UI defaults to Agent. The API defaults to Assisted when no mode is supplied, preserving compatibility with existing callers.

Agent mode is a bounded observe-and-act loop:

1. Analyze locally detected skill mentions and compare them with confirmed skills. Unknown eligibility stays unknown.
2. Present up to three approved resume candidates to the model as temporary codes and safe skill categories.
3. Ask the model to choose approved retrieval or request human review.
4. Execute local retrieval and return the privacy-safe evidence observations to the model.
5. Ask whether to draft or stop for review. Drafting is unavailable before retrieval.
6. Generate only after the second decision authorizes it, then validate source IDs, supported skill categories, numeric claims, placeholders and punctuation.
7. Save a review-required application. Email sending remains a separate approved action.

There are at most two decision calls and one writing call in Agent mode, each with a 15-second provider timeout. Invalid citations in Agent mode stop the run instead of adding a fourth call. Assisted mode retains direct preparation and one optional citation correction.

Allowed tools depend on the stage. Model output cannot grant extra permissions. The agent has no email, arbitrary URL-fetching, SQL, code-execution or credential-reading tool. A request for human review is a real terminal outcome, not silently converted into a draft.

## Persistence and inspection

The new AgentRun table stores owner, mode, generic goal, checkpoint summaries, status, application reference and sanitized failure classification. It does not store API keys or raw prompts. Every executed checkpoint is written in order. Source passages remain local; evidence identifiers and allowed skill categories cross the provider boundary.

Statuses include RUNNING, WAITING_REVIEW, NEEDS_REVIEW, FAILED, INTERRUPTED and APPROVED. Content approval updates the linked run; editing resets it to review. A run with no update for two minutes is marked INTERRUPTED when workspace state is refreshed. Runs are not automatically replayed. There is no claim of durable mid-call resumption or a continuously running autonomous worker.

Agent Studio displays the latest 50 owned runs, actual checkpoints, stop reasons and links to prepared applications. During preparation it polls the server for recorded progress; this polling does not execute agent work. Failed Quick Apply input is retained in browser component memory for the current signed-in session, with contact-use confirmation required again. It is not stored in local storage.

## Interface

The overview now emphasizes readiness and actions instead of a decorative illustration. Navigation uses a dark ink surface, with improved text sizes, contrast, controls, spacing and responsive layouts. Agent Studio has a run library, filters, execution inspector and stage timeline. Application review includes confirmed skill matches, unconfirmed mentions, local evidence and clear eligibility limitations.

Authored application text contains no em dashes. The writer prompt requests plain professional sentences, generated writing is normalized, and saved email validation rejects em dashes. Original uploaded documents are preserved.

## Deployment

Apply the new migration before using the updated code:

```sh
npm run db:deploy
```

Migration: `20261116020000_agent_runs`.

No extra paid service, vector database or AI provider is required. Agent mode consumes more requests than Assisted mode and still respects atomic daily budgets.

## Verification and limits

The suite includes a full authenticated API flow using all three Agent mode calls, real disposable PostgreSQL, and mocked AI/Gmail endpoints. It checks the observe-and-act loop, stops before and after retrieval, privacy-safe observations, invalid stage actions, persisted failures, stale-run handling, tenant isolation, numeric/skill checks and em-dash rules.

Browser tooling is unavailable in this managed environment, so interactive visual, mobile and accessibility QA has not been performed. No live user AI/Gmail credentials were supplied. The original platform still lacks complete follow-up automation, interview preparation and a full unattended daily routine.
