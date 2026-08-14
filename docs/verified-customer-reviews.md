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
