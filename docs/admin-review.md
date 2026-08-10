# Business review administration

## Purpose and boundary

The review console implements the third Zed360 onboarding step. It lets an
authorised administrator or reviewer inspect a linked submission, approve it,
reject it, or request corrections. Every decision is retained in
`business_reviews` with the reviewer and time.

Approval changes the business publication status to `active` and confirms the
reviewed ownership application. It does not verify PACRA registration. A
rejection keeps the draft and its evidence for audit; it does not delete the
business.

## First administrator setup

The reviewer role is stored in PostgreSQL and checked by the API for every read
and decision. It is not inferred from a page URL, browser state, or email domain.

The first administrator must already have signed in and linked a business so a
local Zed360 user exists. From the project directory run:

```powershell
pnpm.cmd admin:grant-role
```

Enter the verified account email, then press Enter to accept `admin`. This
bootstrap command requires the private database connection and must only be run
by someone authorised to administer Zed360. It is safe to run again for the same
account and role.

Then open:

```text
http://localhost:3000/admin/reviews
```

If the session has expired, Zed360 sends a new magic link whose safe return path
is the review console.

## Review outcomes

- **Approve:** requires a linked owner, verified email contact, and ownership
  application. The business becomes active.
- **Request corrections:** keeps the business unpublished and records a reason
  visible to the owner.
- **Reject:** keeps the business unpublished, rejects the ownership check, and
  records a reason visible to the owner.
- **Suspend:** temporarily makes an approved business unavailable without
  discarding its approval history. It can later be reinstated.
- **Revoke approval:** returns an approved or suspended business to rejected,
  unpublished status.
- **Reopen review:** returns a rejected submission to the pending queue.

Reasons of at least 10 characters are required for correction requests,
rejections, suspensions, and approval revocations. Approval, reopening, and
reinstatement notes are optional. The API enforces allowed state transitions;
an approved business cannot be processed by the ordinary Reject action.
Customer requests are not returned by the review API.

## Owner notifications

Review results currently appear in the owner's business account, but Zed360
does not send an email or WhatsApp message yet. The planned notification layer
will queue email events for approvals, correction requests, rejections,
suspensions, revocations, and reinstatements; record delivery attempts; and
retry failures without reversing the review decision. WhatsApp will be added
only after consent, number verification, templates, and provider setup.

## Security basis

- Supabase Auth verifies the access token and signed-in identity.
- Zed360 PostgreSQL roles determine reviewer authority near the data source.
- The API repeats authorization for every queue read and every mutation.
- The web page and Server Action are convenience layers, not the security
  boundary.

Sources checked on 10 August 2026:

- Supabase RBAC guidance:
  <https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac>
- Supabase authenticated-user verification:
  <https://supabase.com/docs/reference/javascript/auth-getuser>
- Next.js authentication and authorization:
  <https://nextjs.org/docs/app/guides/authentication>
- Next.js data security:
  <https://nextjs.org/docs/app/guides/data-security>
