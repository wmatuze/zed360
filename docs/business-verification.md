# Business verification and PACRA integration

## Decision

Zed360 must not depend on privileged PACRA access to launch or continue
operating. PACRA data strengthens registration verification, but delayed,
restricted, unavailable, or denied access must not block business onboarding.

Registration verification is only one trust signal. It is not proof of service
quality, ownership, availability, or good conduct.

## Trust signals remain separate

Zed360 records and communicates these checks independently:

- Contact verified
- Ownership verified
- PACRA registration verified
- Registration not verified
- Registration not provided
- Confirmed customer interaction history

The interface must never collapse these signals into a generic "verified
business" claim. A business may participate without PACRA registration, but it
must not receive a PACRA registration badge.

## Phase 1: manual registry checking

During business onboarding, ask whether the business claims PACRA
registration. If it does, collect:

- Exact registered legal name
- PACRA registration number
- Entity type
- Trading name, when different from the registered legal name

The administrator checks the claim using PACRA's official public Business
Search. Store the result, source, reviewer, date checked, and a non-sensitive
explanation. Do not collect directors, shareholders, or beneficial-owner data
unless a defined legal or security requirement makes it necessary.

A failed search must not cause automatic rejection. It may indicate an input
error, trading-name difference, changed record, informal business, or temporary
registry problem. The normal outcome is correction requested or registration
not verified. Rejection is reserved for substantiated impersonation, fraud,
prohibited activity, or another documented policy reason.

## Phase 2: PACRA cooperation

After Zed360 has real usage and measurable outcomes, approach PACRA for a
narrow, read-only verification arrangement. Prefer requesting only the minimum
fields needed to answer:

1. Does this registration number exist?
2. What is the exact registered name?
3. What is the entity type?
4. What current registry status may legally be disclosed?

Do not request a complete registry dump when a minimal verification response
is sufficient. Continue supporting manual checks while discussions or approval
are pending.

## Phase 3: automated integration

PACRA access must sit behind a provider interface in the Zed360 API. Business
onboarding and review call the interface rather than depending directly on one
external endpoint. Supported providers are:

- Manual PACRA public-search review
- Future official PACRA read-only API or approved data service

If the automated provider is unavailable, the check returns to the manual
review queue. It must not silently mark a business verified or prevent all
businesses from joining.

## Name availability is a different process

Zed360 profile creation does not reserve or approve a legal business name.
PACRA name clearance remains the authoritative process for registering a new
legal name. Zed360 only prevents duplicate platform profiles and supports
claiming an existing profile.

## Data freshness and audit requirements

- Record the source and time of every registration check.
- Treat a registration result as time-bound rather than permanently true.
- Recheck periodically and when material business details change.
- Preserve previous decisions in an audit log.
- Never interpret PACRA registration as a guarantee of service quality.
- Do not let AI assign or override legal-registration verification.

## Sources checked on 7 August 2026

- PACRA public Business Search: <https://search.pacra.org.zm/>
- PACRA name-clearance guidance:
  <https://info.pacra.org.zm/does-my-name-conform-to-pacra-guideline/>
- PACRA legal entity printout guidance:
  <https://info.pacra.org.zm/how-do-i-view-the-details-of-my-company/>

No publicly documented PACRA integration API was identified during this
review. This observation must be rechecked before implementing an automated
provider.
