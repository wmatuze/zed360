# Business workspace

The screens an owner or manager uses to run one business on Zed360. They are
designed around one finding from real use: businesses were approved but then
left hours, cover photos, map pins, and coverage unset, and most customer
requests went unanswered. Each screen should make the next useful step obvious
and quick.

## Navigation

Every screen under `/business/:businessId/` shares one header and a row of
tabs: Profile, Services, Coverage, Storefront, Locations, Hours, Availability,
and Reviews. An owner moves between them without returning to the dashboard.
The header also links back to the dashboard for that business, to requests,
and to notifications.

## Profile

`/business/:businessId/profile` leads with **Logo and cover photo**, then the
description and contact details.

- A file is uploaded as soon as it is chosen. The owner sees the image and its
  state: "Awaiting Zed360 review", "Live on your profile", or "Not approved"
  with the reviewer's reason.
- Logos and cover photos are identity images and are reviewed before they are
  shown publicly. Uploading a new one replaces the old one once approved.
- The same images can still be managed under Storefront, which also holds
  gallery, work-sample, and product images.

The cover photo leads the business's card on the homepage, so the screen says
so.

## Hours

Each location's week can be started from a common pattern (Monday to Friday,
six days with a half-day Saturday, every day, or open 24 hours) and then
adjusted. Any day's hours can be copied to the weekdays or to every day.
Nothing is published until the owner saves, and the screen says when there are
unsaved changes.

## Services and coverage

A service can only receive customer requests once it says where and how it is
provided. The two are separate screens, so the flow joins them:

- Adding a service continues straight to Coverage, with a notice that one more
  step is needed.
- On Services, an active service without coverage shows a warning and a
  "Set coverage" button.
- On Coverage, services that still need coverage are listed first and marked.

## Reviews

`/business/:businessId/reviews` lists the business's published customer
reviews, with those awaiting a reply first, and the average rating.

- Owners and managers can post one public reply to each review and edit it
  later. They cannot edit or remove a review.
- The reply appears under the review on the public profile as "Reply from
  (business name)".
- The screen warns not to include the customer's name, number, or other
  private details.
- The dashboard lists unanswered reviews under "Needs your attention".

## Requests

`/business/requests` has two views.

- **Active** shows open requests matched to the user's businesses and the
  response form.
- **Past** shows requests that have ended: what the business answered, the
  price it quoted, and how it ended ("The customer chose you", "The customer
  chose another business", "Expired without a choice", or "Closed by the
  customer"), with totals for received, answered, and chosen.

Past requests show only the summary, category, and district that were visible
while the request was open. They never show the customer's details or other
businesses' responses. The most recent 100 are listed.

## Known gaps

- **Alerts.** Owners are told about new requests only inside Zed360. Email or
  WhatsApp delivery is not built; see
  [business notifications](business-notifications.md).
- **Team members.** Manager and staff roles exist, but an owner cannot yet add
  people to a business.
- **Business name.** An owner cannot change it or request a change.
