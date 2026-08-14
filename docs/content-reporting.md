# Public content reporting

Zed360 provides report controls on approved public business profiles and each
published verified customer review. A report can describe misleading content,
suspected fraud, impersonation, prohibited material, harassment, exposed
private information, spam, or another concern. Reporter email is optional.

## Safety boundary

A report is an allegation and never changes public content automatically.
The API verifies that the target is currently public, applies a five-reports-
per-hour in-memory limit to the requester, validates a hidden bot-trap field,
and stores no raw IP address. Production edge rate limiting and bot protection
should supplement this application limit before a large public launch.

## Decisions

Platform reviewers and administrators use `/admin/content-reports`. Every
decision requires a written reason and records the deciding user and time.

- A reviewer or administrator can dismiss an unsupported report.
- A reviewer or administrator can remove a reported customer review. Removal
  changes its moderation state to rejected and removes it from public profiles.
- Only an administrator can suspend an active approved business. The suspension
  is also written to the existing business-review audit table.

Reports do not establish that an allegation is true. Reviewers must examine the
target, available evidence, prior decisions, and proportionality before acting.
