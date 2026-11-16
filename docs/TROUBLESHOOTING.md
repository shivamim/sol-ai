# Troubleshooting

- **Setup required / authentication unavailable:** set both Clerk keys, redeploy, verify allowed production origin. No guest data identity exists.
- **Database unavailable:** verify pooled and direct URLs, TLS and migration deployment. Prisma CLI does not automatically load `.env.local`.
- **Encryption error:** verify a base64-encoded 32-byte master key. Do not change the key without preserving the previous version.
- **OAuth redirect mismatch:** `APP_BASE_URL` must exactly match the deployed origin; register its `/api/gmail/callback` URL in Google Cloud. Avoid a trailing slash.
- **Gmail token expired:** reconnect, particularly for Google external apps in Testing. Queued work is preserved.
- **Sending paused:** enable reviewed sending in Automation; content still requires approval.
- **Cooldown / limit:** recipient/company cooldown is 30 days; sending caps reset at UTC midnight. Uncertain operations reserve safety capacity indefinitely until manual investigation. There is no unsafe resend override.
- **SEND_UNCERTAIN:** inspect Gmail Sent using the recorded recipient and subject/Message-ID. Do not create a replacement blindly. Automatic reconciliation is not implemented.
- **Provider 429:** wait for provider quota recovery; do not rotate accounts/keys. Failed calls conservatively retain budget reservations. Your draft inputs remain in the UI; provider generation can be retried deliberately.
- **No models / structured-output failure:** discover again and select a provider-supported text/JSON model. Free eligibility is your account-specific confirmation, not a discovery result.
- **No extracted PDF text:** scanned PDFs require OCR, which is not implemented. Upload a text-based PDF/DOCX/TXT.
- **Import issues:** use a valid Email/Email Address/Work Email header; supported aliases include Apollo First Name/Last Name/Company Name for Emails/Job Title. Arbitrary custom column mapping is not yet implemented. XLSX uses its first worksheet. Do not import unknown/unrelated contacts.
- **No replies:** enable read consent and synchronize manually. Only 20 recent tracked threads are inspected per call. Classification is keyword-based and needs human review.
- **Clerk blocked by CSP:** add the precise configured custom Clerk domain to CSP script/connect/frame lists. Do not weaken unrelated policies.
- **Daily cron not exact:** expected on Vercel Hobby; frequent precision requires other infrastructure.

Never share credentials, full tokens or private resume/email data in bug reports. Include only error category, action and redacted record ID.
