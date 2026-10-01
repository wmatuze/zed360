# Verified customer reviews

Zed360 reviews are tied to the customer request outcome flow. A customer can
submit one review only after choosing a responding business and completing the
request. The private request link remains the authorization boundary, so a
customer account is not required.

## Eligibility and meaning

- The reviewed business must be the request's currently confirmed choice.
- One review is allowed per confirmed customer-business interaction.
- A customer can update their review; the update is checked using the same
  eligibility and exception rules.
- Reopening a request clears the confirmed choice and removes its review from
  public display until that business is selected again.
- “Verified interaction” means the reviewer selected the business through a
  Zed360 request. It does not prove payment, delivery, satisfaction, or every
  statement in the review.

## WhatsApp confirmation

A private request link alone can be created by anyone, including a business
owner reviewing themselves. Every review submission therefore confirms a
WhatsApp number with a one-time code. This is not an account: there is no
password, profile, or sign-in, and browsing, requests, and contacting
businesses are unaffected.

- `POST /v1/requests/shared/:shareToken/review/code` sends a six-digit code
  using an approved WhatsApp authentication template. The review submission
  then includes `verificationId` and `code`.
- Numbers are normalized to E.164 (`0977…`, `977…`, and `+260 977…` are the
  same number) and stored only as an HMAC keyed by `CONTACT_HASH_SECRET`.
  Codes are stored only as hashes.
- Codes expire after 10 minutes, work once, and are invalidated after five
  checks.
- A number can review the same business once every 180 days.
- The business's own phone and WhatsApp numbers, and those of its members,
  cannot review it.
- Code sending is limited per IP, per number, and per request because each
  code is a paid WhatsApp message.

Without WhatsApp credentials outside production, codes are written to the API
log so the flow can be tested. In production, reviews cannot be submitted
until `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, and
`WHATSAPP_AUTH_TEMPLATE` are configured. `CONTACT_HASH_SECRET` must never
change once reviews exist.

Reviews made before this rule have no stored number and remain published.

## Exception-based moderation

Eligible new and updated reviews publish immediately unless deterministic
safety checks detect an external link, email address, phone number, or obvious
repeated-character spam. A flagged review starts as `pending` and remains
private. A platform admin or reviewer can approve or reject it at
`/admin/customer-reviews`. Rejections require a reason, which the customer can
see on the private request page before editing and resubmitting.

Only approved, published reviews tied to a currently confirmed interaction are
returned by public business profiles. Public reviews identify the author only
as “Verified customer”; Zed360 does not collect or expose a reviewer name in
this account-free flow.

The checks flag content for judgment; they do not automatically reject it.

## Ratings

Ratings are integers from one to five. Written comments are optional and
limited to 1,200 characters. Public profiles calculate the average from the
currently visible approved reviews only.
