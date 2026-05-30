# Opportunity System

This phase creates two clear opportunity lanes:

- `Verified opportunities`
  - Curated and published by APPLY! Stewards.
  - Eligible for the homepage `Opportunity of the Day`.
- `Member advertised opportunities`
  - Submitted by community members, partners, or recruiters.
  - Displayed separately with a due-diligence disclaimer.

## Public pages

- `/`
  - Landing page.
  - Keeps the brand story, trust signals, partnership call-to-action, and a single featured verified opportunity.
- `/opportunities.html`
  - Dedicated opportunities hub for the featured verified lane and the separate member-advertised board.
- `/help-desk.html`
  - Public coming-soon page for the APPLY! Opportunity Help Desk pilot: CV support, cover letter help, application checklists, and deadline follow-through.
- `/partners.html`
  - Public partnership page for organisations, recruiters, and programme teams.
- `/submit.html`
  - Public form for member-submitted opportunities.
- `/ops.html`
  - Internal team workflow for saving opportunities, reviewing submissions, publishing member listings, and featuring verified opportunities.
- `/desk.html`
  - Internal publishing workflow for turning saved opportunities into WhatsApp-ready posts, reminder copy, LinkedIn copy, and square branded post images.

## Netlify functions

- `/.netlify/functions/opportunity-of-day`
  - Public read endpoint for the featured verified opportunity.
- `/.netlify/functions/member-opportunities`
  - Public read endpoint for published member-advertised opportunities.
- `/.netlify/functions/submit-member-opportunity`
  - Public `POST` endpoint for member submissions. Submissions land as `pending_review`.
- `/.netlify/functions/save-opportunity`
  - Protected `POST` endpoint for the ops workflow.
- `/.netlify/functions/list-opportunities`
  - Protected `GET` endpoint for the full queue.
- `/.netlify/functions/update-opportunity-status`
  - Protected `POST` endpoint for publishing or reclassifying a saved opportunity.
- `/.netlify/functions/update-publishing-status`
  - Protected `POST` endpoint for marking opportunities as ready, scheduled, posted, skipped, or back under review for channel publishing.
- `/.netlify/functions/set-featured-opportunity`
  - Protected `POST` endpoint for changing the featured verified opportunity.
- `rotate-opportunity-of-day`
  - Scheduled function that rotates the featured verified opportunity every day at `06:00 UTC`.
- `sync-trusted-opportunities`
  - Protected `POST` endpoint for pulling live openings from a trusted whitelist of official careers feeds.
  - The homepage also uses this as a fallback if there is no featured verified opportunity yet.

## Required environment variable

Set this on Netlify before using the protected ops actions:

- `APPLY_ADMIN_TOKEN`

## Suggested operating flow

1. Team-sourced verified listings go through `/ops.html`.
2. Community-submitted listings come through `/submit.html`.
3. Pending submissions appear in the ops queue.
4. Approved community listings are published to the member board.
5. Trusted official sources can be synced from `/ops.html` to seed real verified opportunities automatically.
6. Published verified listings can be featured on the homepage and rotated automatically.
7. Ready listings move into `/desk.html`, where the team copies the formatted post, downloads or copies the branded image, schedules the item, and marks it posted after it reaches the channel.

## Publishing desk workflow

- Every published opportunity gets a publishing status.
- `ready` items appear in the daily post pack.
- `scheduled` items keep a planned posting time.
- `posted` items stay out of the active queue while preserving the posting record.
- `skipped` items are kept for history without being posted.
- Application links remain in the generated copy as full source URLs, so WhatsApp and most messaging apps can make them clickable.

## Trusted-source automation

- Current automation only uses a whitelist of official careers feeds.
- Matching rules are intentionally strict:
  - early-career titles only
  - Ghana or remote-friendly location checks, depending on source
  - explicit location restrictions are filtered out where detected
- This keeps the automated lane honest. If nothing matches the scope, the site waits instead of guessing.
