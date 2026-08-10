# Zed360 ecosystem architecture

## Product boundary

Zed360 is not architected as a collection of business listings. It is a multi-sided ecosystem connecting customer intent, business capabilities, live operational signals, trust evidence, communication, and confirmed outcomes. Business profiles support that ecosystem but are not the product by themselves.

## Architectural style

Zed360 starts as a modular monolith in a pnpm/Turborepo monorepo. The public web application, API, and background worker are independently deployable, while business rules remain divided into explicit domain modules. This keeps the first release manageable and preserves a path to split high-volume modules later.

## Runtime topology

```text
Customers, businesses, administrators
                  |
             Next.js web
                  |
             NestJS API
        __________|____________
       |           |            |
 PostgreSQL     Redis        Object storage
 + PostGIS      + queues      + CDN
       |           |
 Search and     NestJS worker
 matching       notifications/jobs
```

## Domain modules

1. Identity and access
2. Businesses, branches, and team membership
3. Categories, services, products, and configurable attributes
4. Provinces, districts, coordinates, and service areas
5. Customer requests and category-specific answers
6. Matching, invitations, business responses, and outcomes
7. Availability and profile freshness
8. Trust, verification, reviews, reports, and moderation
9. Notifications and communication preferences
10. Administration, analytics, promotions, and billing

## Scale boundaries

- PostgreSQL full-text search and trigram matching are used first; a dedicated search service is introduced only when measured load requires it.
- Matching and notifications run asynchronously through queues so web requests remain fast.
- Images and videos never pass through the application database; they use S3-compatible object storage and a CDN.
- Geographic data is stored in PostGIS rather than tied to a single map vendor.
- Domain events and an outbox will allow reliable integrations and future service extraction.
- Public pages are cacheable, while private dashboards and request responses remain authorization-protected.

## Development infrastructure

The production data model uses PostgreSQL with PostGIS. Developers can connect to a managed PostgreSQL/PostGIS database and do not need to run Docker locally. The repository's Compose configuration is optional and exists only for machines with sufficient resources.

## Cold-start design

The request flow is shareable. A business can respond to a request with minimal onboarding, verify its contact method, and then claim or create a permanent profile. This lets customer demand recruit supply without requiring the founder to call businesses manually.

## Initial matching policy

The pilot begins with conservative, explainable candidate matching: the
business service category and active service district must both exactly match
an open customer request. Candidate matches for draft businesses stay queued
internally and do not expose request details or trigger notifications. Broader
geographic, category-parent, text, and behavioural scoring is introduced only
after the exact-match outcomes can be measured.

## Security baseline

- Secure cookie-based sessions and role-based access control
- Phone or email verification for consequential actions
- Rate limiting and bot protection on public forms
- Signed media uploads and strict file validation
- Audit records for verification and moderation actions
- Interaction-linked reviews instead of unrestricted anonymous ratings
- Explicit separation between ownership verification, registration verification, and paid promotion

The staged PACRA approach, manual fallback, trust labels, and data-minimisation
rules are defined in [Business verification and PACRA integration](business-verification.md).
