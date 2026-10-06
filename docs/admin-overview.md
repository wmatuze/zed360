# Administration overview and platform analytics

`/admin` is the first screen a reviewer or administrator sees. It answers two
questions in order: what is waiting for a decision, and how the platform is
doing. `GET /v1/admin/overview` supplies every figure in one read-only query
and requires a reviewer or administrator session confirmed with an
authenticator code.

## Review queues

Each queue shows how many items are waiting and how long the oldest has waited.
Queues are listed oldest first, and a queue whose oldest item has waited two
days or more is highlighted as overdue. Empty queues collapse into a single
"clear" row that still links to each screen.

| Queue                  | Counted when                            |
| ---------------------- | --------------------------------------- |
| Business applications  | `businesses.review_status` is `pending` |
| Profile revisions      | revision `status` is `pending`          |
| Customer reviews       | review `moderation_status` is `pending` |
| Logos and cover images | media `moderation_status` is `pending`  |
| Content reports        | report `status` is `open`               |

These filters mirror the queue screens. If a screen's filter changes, change
the overview with it so a count never disagrees with the list it links to.

## Platform figures

Every figure is counted from stored records. Nothing is estimated, sampled, or
projected, and draft requests are never counted.

- **Requests posted** are non-draft customer requests created in the last 30
  days, compared with the 30 days before.
- **Got a business response** counts those requests with at least one saved
  business response. **Customer chose a business** counts those with a
  confirmed interaction. Both can never exceed requests posted.
- **Open over a day with no response** counts open, unexpired requests older
  than 24 hours that no business has answered. It is the clearest sign of
  missing or inactive businesses and is highlighted when above zero.
- **Typical business response time** is the median time from a match being
  sent to its response, across all businesses, for matches created in the last
  30 days.
- **Business profiles, last 30 days** totals profile views, contact taps,
  directions opened, and shares across all businesses, compared with the 30
  days before, and the share of views that led to a contact tap. See
  [profile activity](profile-activity.md).
- **Live** businesses are active and approved. **Availability out of date**
  counts live businesses that have not confirmed availability in 7 days, the
  same rule customers see on a profile.
- **Where Zed360 is active** counts live businesses by the province of each
  active location, so a business with branches in two provinces is counted in
  both. Requests are counted by the province of the request's district. A
  province with requests but no live business is called out as unserved demand.
- **What customers asked for** lists the six most requested categories in the
  last 30 days and how many of those requests went unanswered.
- **Recent administrator actions** are the latest rows of `admin_audit_events`.
  Decisions recorded in domain histories such as `business_reviews` are not
  repeated here.

## Privacy

The overview contains counts, category and province names, and the names of
administrators who made audited changes. It never includes customer contact
details, request text, or review text. No per-visitor tracking exists behind
these figures; profile activity is stored only as daily totals.

## Not included

Zed360 takes no payments, so there are no revenue, subscription, or promotion
figures.
