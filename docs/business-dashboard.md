# Business dashboard

The authenticated business home is `/business/dashboard`. It summarizes real
operational data for every business connected to the signed-in user and links
to the existing request, notification, storefront, coverage, public-profile,
and account areas.

## Layout

The dashboard shows one business at a time. A user who manages several
businesses switches between them with the tabs at the top; the selection is
kept in the `business` query parameter and defaults to the first approved
business.

1. **Needs your attention** lists concrete actions, most urgent first, each
   linking to the screen that resolves it. Work that affects customers now
   (unanswered requests, stale availability, missing service or coverage) comes
   before profile improvements (hours, map pins, images, profile confirmation),
   which come before notices that need no action (pending review, pending
   media). Staff see customer work but not management tasks. Published
   products are optional and never appear as a task.
2. **Last 30 days** shows the request funnel and typical response time.
3. **Manage your business** groups the management screens into "What customers
   see" and "How you operate", beside a setup checklist whose unfinished steps
   are links.
4. **Recent matched requests** and **recent notifications** cover every
   business the user belongs to.

## Metric definitions

- **Open matches** are non-expired requests with an open or matched status and
  a visible match status. Counts remain hidden until the business is active and
  approved.
- **Awaiting response** are open matches that have no saved response.
- **Responses sent** are saved responses across the approved business's match
  history.
- **Customer selections** are interactions whose outcome was explicitly
  confirmed by the customer.
- **Last 30 days — matched** counts matches created in the last 30 days,
  whatever their current status. **Responded** counts those matches that have a
  saved response, so it can never exceed matched. **Chosen** counts confirmed
  interactions resolved in the last 30 days.
- **Typical response time** is the median time between a match being sent (or
  created, when no send time was recorded) and its response, over matches
  created in the last 30 days. It is hidden when there are no responses.
- **Locations without a pin or hours** count active locations only. A missing
  pin is a suggestion, not a fault: businesses that customers do not visit
  should leave it empty.
- **Unread alerts** are notification rows belonging to the signed-in user.
- Published product, published review, pending media, and setup figures are
  derived directly from their corresponding records; Zed360 does not estimate
  views, revenue, conversion, or popularity.

## Access and performance

Every dashboard request requires a verified Supabase access token. Business
data is limited by current membership. Request summaries are included only for
active, approved businesses, following the same boundary as the full matched
request screen.

The dashboard is assembled in one PostgreSQL query so the local API does not
serially cross the network for totals, requests, and notifications. The web
page then makes one authenticated API request for the complete overview.
