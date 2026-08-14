# Zed360 moderation and approval boundaries

## Decision

Zed360 uses risk-based moderation. Human approval is reserved for decisions
that affect identity, ownership, legal-registration claims, trust labels,
platform safety, or another person's reputation. Routine operational updates
must not wait in an administrator queue.

The default rule is: publish owner-controlled operational information
immediately, keep an audit history, provide reporting tools, and send only
exceptions to a reviewer.

## Human approval is required

- First publication of a business on Zed360.
- A business-name, legal-identity, ownership, or registration change.
- Granting, changing, or removing ownership and registration trust signals.
- Logo and cover-image changes because they represent business identity.
- Content flagged by deterministic safety rules, customer reports, repeated
  abuse signals, or a previous moderation decision.
- Business suspension, reinstatement, closure disputes, impersonation, fraud,
  prohibited activity, and appeals.
- A disputed or flagged customer review that may affect another party's
  reputation.

Approval of a business does not guarantee its quality, products, prices,
availability, or future conduct. Trust labels must continue to describe the
specific check performed.

## Publishes immediately with audit history

- Current availability and its short customer note.
- Service availability, fulfilment method, service area, delivery coverage,
  lead time, and indicative fees.
- Products, product descriptions, indicative prices, stock state, and
  publish/unpublish changes.
- Gallery, work-sample, and product images after file-safety validation.
- Business description, public phone, WhatsApp, email, and website.
- Confirmation that existing profile information is still current.
- A review from a confirmed Zed360 interaction when it passes normal validation
  and has not been flagged.

These changes remain attributable to the signed-in owner or manager. Zed360
keeps the previous value, change time, and actor so harmful or accidental
updates can be reversed.

## Verification is not admin approval

Some changes require proof but not a human reviewer:

- A new email or phone number must be verified before receiving a verified
  contact signal.
- Uploaded files must pass type, size, decoding, and malware/safety checks.
- Websites and external links must use allowed protocols and pass automated
  URL-safety checks.
- Customer reviews must pass interaction eligibility, length, duplication, and
  abuse-rate checks.

Failing an automated check does not silently publish the content. It either
returns a clear correction message or enters human review when judgment is
required.

## Roles

- Owners and managers can make immediate operational updates.
- Staff access remains limited and cannot change identity, trust, or other
  consequential settings unless a later permission system explicitly allows
  it.
- Reviewers handle content and evidence queues.
- Administrators handle platform roles, suspensions, reinstatements, serious
  abuse, and appeals.

## AI boundary

AI may later help detect duplicates, spam, unsafe images, or suspicious text
and explain why something was flagged. AI must not independently verify PACRA
registration, decide ownership, suspend a business, reject an appeal, or make
another consequential trust decision. Those outcomes require authoritative
evidence and a human decision.

## Implementation status

Routine profile edits now publish with before-and-after audit history. Gallery,
work-sample, and product images publish after file and ownership validation;
logos and covers remain human-reviewed. Eligible interaction-linked reviews
publish immediately unless deterministic checks flag contact details, external
links, or repeated-character spam for a human decision. Existing moderation
records and legacy pending items remain preserved.

## Operating principle

Measure the percentage of changes that require human handling, review time,
reversal rate, report rate, and confirmed abuse. Tighten or relax a rule using
those outcomes rather than assuming that more moderation always produces more
trust.
