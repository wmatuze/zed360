# User and role administration

Administrators use `/admin/users` to search Zed360 users, inspect business
membership counts, grant or revoke platform roles, and suspend or reinstate
platform access. Reviewers cannot use these endpoints.

## Role boundary

Platform roles are independent from business membership roles. `admin` and
`reviewer` control platform operations; `owner`, `manager`, and `staff` control
access to a particular business.

Every role or status mutation requires a reason and creates an immutable
`admin_audit_events` record containing the previous and resulting state. The
API locks active administrator assignments while changing them so concurrent
actions cannot remove or suspend the final active administrator.

## Suspension

Suspension is enforced after Supabase verifies the token and before an API
request receives the authenticated Zed360 user. The local account record is
checked on every request, so a valid Supabase session does not bypass a Zed360
suspension. Records and attributable history are retained; administrators
reinstate the same account rather than creating a replacement identity.

## API

- `GET /v1/admin/users` accepts `q`, `page`, and `pageSize`.
- `POST /v1/admin/users/:userId/actions` accepts a validated role or account
  status action with a written reason.
