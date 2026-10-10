# Opportunity information model

Source inspected 10 October 2026: `shared/opportunity-utils.mjs`, submission/management handlers, `netlify/lib/opportunities.mjs`, and trusted feed imports.

| Fields | Meaning and limits |
| --- | --- |
| `id` | Generated record ID; feed imports use a source and external ID |
| `title`, `organization`, `category`, `summary` | Basic listing description; admin creation requires these |
| `sourceUrl` | Original application/source link; HTTP/HTTPS only after this review |
| `deadline` | Date-only inclusive through UTC/Ghana day, or an explicitly unstated/rolling deadline |
| `audience`, `location`, `whyItFits` | Descriptions, not eligibility certification |
| `steps`, `tips`, `tags` | Application guidance and navigation |
| `listingType` | `verified` or `member_advertised`; these are distinct from status |
| `status` | `draft`, `pending_review`, or `published` in management handlers |
| `createdAt`, `updatedAt`, `publishedAt` | Record lifecycle, not source publication time |
| `sourceCheckedAt`, `sourceUpdatedAt`, `verificationMethod` | Automated-feed provenance when present; not uniformly populated for manual entries |
| `submittedByName`, `submittedByEmail`, `rawNotes` | Internal submission/review data; omitted from public listing projections |
| `postStatus`, `postedAt`, `reminderAt` | Publishing workflow records; not proof an external post was delivered |

Public submission overrides caller-supplied trust/status fields. Admin actions require a configured shared token. Operator HTML pages themselves are not an authenticated identity system: the server enforces management access. There is no per-user role model or complete steward audit trail.

## New publication policy

Published does not automatically mean suitable for public display. Invalid/expired deadlines, unknown listing types, and stale automated source checks fail eligibility. A blank deadline stays visible as unknown; it must not be described as rolling unless the source says so. Arbitrary free-text deadlines need review rather than automatic interpretation.

Featured reads load the latest listing instead of trusting the cached copy. List queries apply the same policy. The seven-day automated-source freshness limit is a new rule. Manual listings with unknown deadlines still require human maintenance; this policy does not revalidate every source URL.

## Corrections

Operators can update status/type or replace a record through existing workflows; automated syncs refresh matching feed records. Removal from an upstream feed is not immediately reconciled to a tombstone: freshness expiry provides a bounded fallback. A dedicated correction inbox and source-removal reconciliation remain future work.
