# Business availability and profile freshness

Owners and managers can maintain live business signals at
`/business/[businessId]/presence`. Staff members cannot change these signals.

## Availability

A business can report itself as `available`, `busy`, or
`temporarily_unavailable` and add an optional customer-facing note of up to 240
characters. The update is operational information and takes effect immediately;
it does not enter content moderation.

Availability is labelled current for seven days. Older information remains
visible as not recently confirmed rather than being presented as current.
Temporarily unavailable businesses are excluded from newly created request
matches. Existing matches, responses, and outcome history are preserved.

## Profile confirmation

The owner or manager can attest that the approved profile, services, products,
and coverage remain accurate. This updates `last_confirmed_at` without changing
profile content. Profiles are labelled current for 90 days. Content changes
continue to use the separately moderated profile, catalog, media, and coverage
workflows.

The business dashboard highlights stale or unconfirmed signals. Public browse
cards and profiles display only recently confirmed availability as a current
signal, alongside the profile confirmation date when it is current.
