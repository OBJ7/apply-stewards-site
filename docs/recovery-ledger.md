# APPLY! Stewards recovery ledger — 22 October 2026

Mission status: **incomplete**. Neither original hostname is verified restored.

## Completed

- Audited all nine HTML pages, shared/client modules, eleven Netlify functions, storage/auth helpers, deployment config and existing tests.
- Preserved main; implementation is on `migration/cloudflare-pages-2026-10`, starting at `8a90bbc`.
- Added a Cloudflare Worker retaining the existing `/.netlify/functions/*` paths and admin-token boundary.
- Added a request-scoped D1 adapter for both Blobs stores. Images are split into atomic 512 KiB chunks to retain the existing 2 MiB upload allowance within D1 row limits. Indexed prefetch avoids an N+1 query limit.
- Added safe static packaging, source/secret exclusion, original HTML URL handling, and www redirect configuration.
- Added explicit historical-data and outage messages; failed submissions retain the entered values.
- Retained daily 06:00 UTC rotation. Cloudflare scheduled rotation does not auto-import feeds; explicit protected sync is available. Imported unknown-deadline records cannot accidentally become featured.
- Existing eight automated tests pass. The Cloudflare-runtime integration scenario passes with local D1: page/assets, admin rejection, saving/featuring, forged submission fields, moderation, full 2 MiB image round-trip, publishing status, rotation, withdrawal, private-field exclusion and 65-record listing.
- Cloudflare dry-run bundles successfully. This is not a deployment.
- Sites fallback: public recovery copy created and deployment marked succeeded at `https://apply-stewards-recovery.obj7.chatgpt.site` (Site `appgprj_6ada3d1ae51081918f22aa0a47a6b764`, source `a303f26f001dc80320c4c5dc8a41420528c7c6d6`). This static copy labels archive recovery and pauses submissions.
- Browser QA on the local recovery preview confirmed original branding/logo, homepage, navigation and archive notices. No application console error was observed; one browser-extension metadata error was unrelated.

## Network and domain evidence

`recovery-network-baseline-2026-10-22.json` preserves public resolver responses. Google and Cloudflare DNS agree on four Name.com nameservers. Both hostnames resolve to `91.195.240.94`. No apex MX/TXT/CAA or DMARC TXT was returned. This does not prove there were never email records; DKIM selectors remain unknown and must be exported from the account.

Original-domain HTTPS checks failed. Registry RDAP requests returned 403, so registrar-account control/registration status was not independently confirmed from RDAP.

The Sites recovery hostname returns Cloudflare error 1010/HTTP 403 to this execution network. The public fetch tool cannot access it either. Therefore the hosting success response has **not** independently established public reachability. Do not claim otherwise.

Both custom domains are already attached, pending, to the older public APPLY preview Site `appgprj_6a510a534f50819196df261291bd027d`, from this morning. Do not delete/recreate these attachments casually. Its root/www certificates are pending validation.

## Netlify track

Read ticket #1146428 and today's existing follow-up. Netlify says paying the arrears also resumes paid billing for a new cycle. The follow-up already requests DNS/nameserver access, separation from hosting billing, Blobs export, and data-deletion deadlines without paid reactivation. No newer response found at this check. No new email sent.

Historical `apply-opportunities` and `apply-opportunity-images` have **not** been exported or recovered. No production record has been deleted or overwritten.

## Costs and approvals

No payment, subscription renewal, paid plan or domain transfer authorized or performed. Direct Cloudflare config targets Workers Free plus D1 Free. D1 free limits checked in official docs: 5 million reads/day, 100,000 writes/day, 500 MB per database; Workers/Pages Functions share 100,000 free requests/day. Limits are not a guarantee of indefinite capacity. No paid R2 activation is required by this implementation.

No DNS changes performed. Before modifying live DNS, obtain approval for an exact record-level plan after exporting all account records, including mail records. Nameservers and registrar transfer are not required by the pending Sites custom-domain path.

## Remaining blockers / next steps

1. Cloudflare signup currently shows API 403 and an unchecked human-verification challenge. No authenticated deployment account confirmed. User intervention is needed if retaining direct Cloudflare hosting.
2. Inspect the older Sites source and preserve the pending domain attachments; prepare the minimum DNS plan for that supported route.
3. Obtain Netlify/domain-account access or support-assisted record changes; only then apply an approved DNS change.
4. Provision/bind D1, apply `cloudflare/schema.sql`, configure `APPLY_ADMIN_TOKEN` as a runtime secret, and verify migrated APIs on a live host. Until configured, admin actions fail closed.
5. Export/import historical records and images with collision checks and backups; do not pretend a fresh database is historical recovery.
6. Verify root/www public HTTPS, redirects, external application links, essential workflows and a mobile viewport independently before declaring done.

## Direct Cloudflare maintenance

```sh
npm ci
npm test
npm run check:functions
npm run test:cloudflare
```

After the account is authenticated, create a D1 database and add its returned ID to a `d1_databases` entry in `wrangler.jsonc` with binding `DB`; apply schema remotely, set the admin token with `wrangler secret put APPLY_ADMIN_TOKEN`, then run `npm run deploy:cloudflare`. Never put the secret into Git or frontend code. The base config can deploy without DB for a clearly labeled read-only fallback. Keep `HISTORICAL_DATA_STATUS=pending` until an actual export/import has been reconciled.

Official references: https://developers.cloudflare.com/pages/functions/pricing/ ; https://developers.cloudflare.com/d1/platform/pricing/ ; https://developers.cloudflare.com/d1/platform/limits/ ; https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
