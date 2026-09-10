# Administration foundation

Zed360 administration extends the existing modular monolith. Administrative
routes remain owned by their business domains; `/admin` is a shared web shell,
not a second backend or an authorization boundary.

## Access model

- Reviewers can enter the administration workspace and operate human-review
  queues.
- Administrators can do everything a reviewer can do and will own platform
  roles, business lifecycle actions, appeals, reference data, and promotions.
- `PlatformAuthorizationService.requireReviewer` protects shared moderation
  work.
- `PlatformAuthorizationService.requireAdmin` protects administrator-only
  operations.
- Every API endpoint must authenticate and authorize independently. Hiding a
  link in the web interface never grants or removes authority.

The `GET /v1/admin/access` endpoint supplies the role needed to render the
administration landing page. Domain endpoints continue to repeat their own
authorization checks close to the underlying data.

## Audit events

`admin_audit_events` is the cross-domain record for consequential platform
changes that do not already have a more specific history table. It records the
actor, action, subject, reason, before and after state, metadata, and time.

The database prevents updates and deletions from this table. Corrections must
be represented by a later compensating event rather than changing history.
Domain-specific histories such as `business_reviews` remain authoritative for
their workflows and are not replaced by the generic log.

## Adding an administration module

Each new capability should be delivered as a vertical slice:

1. Add schema and a forward-only migration in `packages/database`.
2. Define request and response validation in `packages/contracts`.
3. Add the controller, service, authorization, transaction, and audit event in
   `apps/api`.
4. Add the server-side API client, Server Actions, and pages in `apps/web`.
5. Test authentication, role boundaries, validation, state transitions, audit
   creation, and concurrent decisions.

Mutations should archive or transition records instead of deleting referenced
history. Consequential changes require a written reason and should eventually
publish an outbox event for owner notification.
