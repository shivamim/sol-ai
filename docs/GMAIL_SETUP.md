# Gmail setup

1. Create a Google Cloud project and enable Gmail API.
2. Configure Google Auth Platform branding, audience and OAuth consent. For a personal external testing application, add your own Gmail address as a test user.
3. Create an OAuth 2.0 **Web application** client. Add the precise callback `https://YOUR_DOMAIN/api/gmail/callback`. For local development also add `http://localhost:3000/api/gmail/callback`.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_BASE_URL`, encryption variables and Clerk variables. Redeploy.
5. Click Connect Gmail. Default scopes: `openid email gmail.send`. Drafts live in PostgreSQL; no Gmail draft-write permission is needed.
6. Optional: enable reply monitoring to explicitly add `gmail.readonly`, a restricted scope. The implementation reads only threads associated with tracked applications, although the OAuth scope itself permits wider access.

OAuth state is random, HTTP-only, same-site, ten-minute, user-bound and single-use. Server exchanges code; refresh tokens are AES-256-GCM encrypted. Access tokens are short-lived server memory only. Reconnection replaces the refresh token. Disconnect revokes the grant and deletes local tokens (if Google revocation fails, manually revoke in Google Account and retry).

External apps in Testing may receive refresh tokens that expire after seven days when requesting these Gmail scopes. Token revocation and expiry block work without losing queued applications. A publicly distributed application using sensitive/restricted Gmail scopes can require Google verification and potentially a security assessment. Review Google's current requirements; personal testing is not public-production verification.

Sending uses `users.messages.send` with multipart MIME and the exact approved resume bytes. `SENT` means **Gmail accepted**, not recipient delivery. Network failures after dispatch become `SEND_UNCERTAIN` with no automatic retry. Check Gmail Sent manually; this release does not provide automatic reconciliation or a manual resend override for uncertain operations.

Manual Sync Replies polls up to the 20 most recently sent tracked threads. It uses snippets, not full attachment retrieval. Keyword classification is deliberately advisory: interview/assessment/rejection/acknowledgement/out-of-office/bounce/opt-out/unknown. Bounce and opt-out suppress the recorded recipient. No automatic replies or follow-ups are sent.

References:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/protocols/oauth2#expiration
- https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send
- https://developers.google.com/gmail/api/reference/rest/v1/users.threads/get
- https://developers.google.com/workspace/gmail/api/auth/scopes
