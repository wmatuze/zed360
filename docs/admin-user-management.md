# User and role administration

Administrators use `/admin/users` to find Zed360 users and open a user's page
at `/admin/users/:userId` to change their access. Reviewers cannot use these
screens or endpoints.

"Users" are people with a Zed360 account: the Zed360 team and the people who
run businesses. Customers do not have accounts and never appear here.

## The list

- Search covers display name, username, email, and phone.
- Filters: everyone, Zed360 team (any platform role), administrators,
  reviewers, business users (no platform role), and suspended accounts.
- Each row shows platform roles, the number of linked businesses, account
  status, and a warning when a team member has not set up an authenticator.

## A user's page

- **Platform roles** — each role shows whether the user holds it, with only the
  action that applies: grant or remove.
- **Authenticator app** — whether one is set up, and a reset for a lost device.
- **Businesses** — every business the account belongs to, with the membership
  role, review state, and links to the public profile and review record.
- **Account access** — suspend or reinstate.
- **Access history** — who changed this user's roles or access, when, and why.

## Role boundary

Platform roles are independent from business membership roles. `admin` and
`reviewer` control platform operations; `owner`, `manager`, and `staff` control
access to a particular business.

Every role, status, or authenticator change requires a reason of at least 10
characters and creates an immutable `admin_audit_events` record containing the
previous and resulting state. The API locks active administrator assignments
while changing them so concurrent actions cannot remove or suspend the final
active administrator.

## Self-protection

An administrator cannot suspend their own account, remove their own
administrator role, or reset their own authenticator. Those changes must come
from another administrator, so one mistaken or compromised session cannot
remove its own safeguards. The API enforces this; the screen also hides the
controls.

## Adding a team member

1. The person needs a Zed360 account. Find them in the list and open their
   page.
2. Grant the reviewer or administrator role. The first role requires a sign-in
   username (3–50 letters, numbers, dots, underscores, or hyphens), which must
   be unique. Later role changes keep the existing username.
3. The person opens `/admin/sign-in`, chooses "Forgot password" with that
   username to set a password, and enrols an authenticator on first sign-in.

No database access or terminal command is needed. `pnpm admin:grant-role`
remains for creating the very first administrator.

Inviting someone who has no Zed360 account by email is not supported: it needs
a Supabase secret key, which the project deliberately does not hold.

## Resetting a lost authenticator

On the user's page, "Reset authenticator" removes the user's authenticator
factors and ends all of their sessions, so they enrol a new device at next
sign-in. Confirm the person's identity through a separate channel first and
record how in the reason. The reset is written to the audit log with the number
of factors removed.

The API deletes from Supabase's `auth.mfa_factors` and `auth.sessions` tables
through the application database connection. On a database without the
Supabase `auth` schema, authenticator status is reported as unknown rather
than failing the screen.

## Suspension

Suspension is enforced after Supabase verifies the token and before an API
request receives the authenticated Zed360 user. The local account record is
checked on every request, so a valid Supabase session does not bypass a Zed360
suspension. Records and attributable history are retained; administrators
reinstate the same account rather than creating a replacement identity.

Suspending a user does not hide their businesses. Suspend a business from its
review record.

## API

- `GET /v1/admin/users` accepts `q`, `page`, `pageSize`, `role`
  (`all`, `team`, `admin`, `reviewer`, `none`), and `status`
  (`all`, `active`, `suspended`).
- `GET /v1/admin/users/:userId` returns the user, their businesses, and their
  access history.
- `POST /v1/admin/users/:userId/actions` accepts `role_granted` (with an
  optional `username`), `role_revoked`, `suspended`, `reinstated`, or
  `authenticator_reset`, each with a written reason. Refusals carry a `code`:
  `self-action`, `last-admin`, `username-required`, or `username-taken`.
