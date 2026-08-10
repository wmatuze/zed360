# Public business profiles

## Purpose

Public profiles give customers a second discovery path alongside posting a
request. They support deliberate browsing and comparison without turning
Zed360 into a static directory: profiles expose current services, fulfilment
methods, service coverage, and specific trust signals that can later improve
request matching.

## Publication boundary

A business is public only when both conditions are true:

- `businesses.status = active`
- `businesses.review_status = approved`

Draft, rejected, suspended, and closed businesses return no public profile.
Public endpoints do not expose members, ownership evidence, internal review
notes, customer requests, or private account data.

Application addresses are not automatically published because they may be
home or correspondence addresses. A future profile editor may expose an exact
storefront address only after the owner explicitly marks it public.

## Public routes

- `GET /v1/businesses` lists approved businesses with search, category,
  location, fulfilment, and page filters.
- `GET /v1/businesses/:slug` returns one approved profile.
- `/businesses` is the customer-facing browse page.
- `/businesses/[slug]` displays a business profile.

Location searches include businesses physically located in the selected area
and businesses whose active service coverage includes it. Nationwide and
remote services remain discoverable across Zambia.

## Trust language

`Zed360 approved`, `Contact verified`, and `Registration verified` are separate
signals. Approval does not imply service-quality certification. Contact
verification proves control of a contact method, while registration
verification is displayed only when that specific check has passed.

Services, prices, contact details, and service coverage remain explicitly
business-supplied information.

## Next boundary

Media galleries and product showcases belong to the next feature branch. This
keeps public-profile access and publication rules independently testable before
object storage and upload moderation are introduced.
