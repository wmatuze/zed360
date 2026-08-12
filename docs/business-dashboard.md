# Business dashboard

The authenticated business home is `/business/dashboard`. It summarizes real
operational data for every business connected to the signed-in user and links
to the existing request, notification, storefront, coverage, public-profile,
and account areas.

## Metric definitions

- **Open matches** are non-expired requests with an open or matched status and
  a visible match status. Counts remain hidden until the business is active and
  approved.
- **Responses sent** are saved responses across the approved business's match
  history.
- **Customer selections** are interactions whose outcome was explicitly
  confirmed by the customer.
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
