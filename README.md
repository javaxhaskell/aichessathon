# AI Chessathon

Public website and registration MVP for [AI Chessathon](https://aichessathon.com): a five-day online AI chess qualification from 7–11 September 2026 followed by an in-person London final on 12 September 2026. Sponsored by Optiver.

## Included

- Next.js 16, TypeScript, Tailwind CSS 4
- Original animated three-board agent tournament hero
- Responsive homepage, registration, confirmation, privacy, rules, and archive routes
- Canonical/SEO/Open Graph metadata, generated favicon/social card, sitemap, and robots rules
- Strict server-side Zod validation, atomic rate limits, and idempotent transactional writes
- Supabase Postgres schema, RLS, private PDF storage, consent snapshots, review/audit model
- Direct-to-Supabase signed CV uploads (parseable PDF, 10 MB maximum) so files do not cross Vercel's function body limit
- Optional Resend confirmation email and a protected daily expired-upload cleanup job
- Fail-closed registration state when production configuration is incomplete

There is intentionally no public admin dashboard. Registration tables have RLS enabled and forced, client roles have no grants, and the private CV bucket has no public read policy.

## Local development

```bash
npm install
npm run dev
```

Without the required environment variables, `/register` clearly reports that registration is temporarily unavailable and the API returns `503`; it never pretends a submission was saved.

To run the complete stack locally:

```bash
supabase start
supabase db reset
```

Copy the local URL, publishable key, and secret key reported by `supabase status` into `.env.local` using the names in `.env.example`. Also set the legal/rules gates, `RATE_LIMIT_HMAC_SECRET`, and `CRON_SECRET`, then restart Next.js.

Checks:

```bash
npm test
npm run lint
npm run build
supabase db lint --local --level warning
```

## Activate production registration

Production currently remains closed until these steps are completed.

1. Create or select a Supabase project in an appropriate region.
2. Authenticate and apply the committed migration:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

3. In Supabase project settings, copy the project URL, publishable key, and server-only secret key. Add every required value below to the Vercel project's Production environment and redeploy.
4. Replace the privacy notice's organising-team placeholder with the actual legal controller name, review the privacy/rules text, then set `REGISTRATION_LEGAL_CONTROLLER_NAME` and the exact approved version `REGISTRATION_RULES_APPROVED=2026-08-25.v1`.
5. Confirm the `registration-cvs` bucket is private, limited to `application/pdf`, and capped at 10,485,760 bytes. The migration creates this configuration.
6. Run Supabase's Database and Security advisors. Anonymous/authenticated clients should be unable to read or write registration tables or download/list CV objects.

Required variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe project key used only with signed upload tokens |
| `SUPABASE_SECRET_KEY` | Server-only key; legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported |
| `REGISTRATION_LEGAL_CONTROLLER_NAME` | Legal identity shown in the privacy notice |
| `REGISTRATION_RULES_APPROVED` | Must equal `2026-08-25.v1` |
| `RATE_LIMIT_HMAC_SECRET` | Long random value used to rate-limit without storing raw IPs |
| `CRON_SECRET` | Long random value securing Vercel's daily upload-cleanup request |

Never expose the Supabase secret/service-role key with a `NEXT_PUBLIC_` name.

## Activate confirmation email

Email is optional. Registration is committed before delivery is attempted, so an email outage never loses or duplicates a submission.

1. Add and verify `aichessathon.com` in Resend.
2. Add only the exact provider-generated DKIM and return-path records to Vercel DNS. Preserve Google Workspace MX, the existing `google._domainkey` record, and any SPF/DMARC records. Never create a second apex SPF record; merge authorised senders if one already exists.
3. Create a restricted Resend API key.
4. Set:

   ```text
   RESEND_API_KEY=...
   EMAIL_FROM=AI Chessathon <events@aichessathon.com>
   EMAIL_REPLY_TO=events@aichessathon.com
   ```

5. Redeploy and submit a test registration. The confirmation page states truthfully whether email was sent.

## Registration flow

1. The server validates a small JSON payload, fingerprints it for safe retries, and calls one transactional database function to store the application and versioned consent decisions.
2. If a CV is present, the server creates a two-hour signed upload token for one random path in the private bucket.
3. The browser uploads directly to Supabase. No service key or public download URL reaches the browser.
4. A short database lease prevents duplicate verification work while the server downloads and verifies the stored object, size, MIME metadata, PDF signature and structure, and SHA-256 before a second transactional function finalises exactly one registration.
5. Files remain marked `unscanned` for any future malware-scanning workflow and are never exposed by a public admin route.
6. Failed or cancelled upload applications are deleted. A protected daily job deletes expired pending applications and drains a private, retryable file-cleanup queue.

CV sharing consent is separate, unchecked by default, saved with timestamp/version/text snapshot, and never affects eligibility or review state. Every consent decision also records the full published privacy-notice text and hash for that version. Participation-support information is isolated from routine reviewer data.

Confirmation pages require a short-lived, server-signed receipt; typing or modifying a confirmation URL cannot create a success state.

## Deployment

The project is configured for Vercel. `www.aichessathon.com` permanently redirects to the canonical apex `https://aichessathon.com`. Do not change domain MX, SPF, DKIM, or DMARC records when attaching the site.

## License

[MIT](LICENSE)
