# Business profile management

Owners and managers edit public business details at
`/business/[businessId]/profile`. Approved public information remains unchanged
while a proposed revision is pending.

Reviewers compare current and proposed values at
`/admin/profile-revisions`. Approval atomically publishes the proposed
description and contact fields. Rejection requires a reason and leaves the
current public profile untouched.

Business names, verification declarations, services, coverage, media, and
products have separate workflows and are intentionally excluded from this
revision form. Staff members cannot submit profile revisions.
