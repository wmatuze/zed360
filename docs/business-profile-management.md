# Business profile management

Owners and managers edit public business details at
`/business/[businessId]/profile`. Routine description and contact changes
publish immediately.

Every update creates an audit revision containing the previous and new values,
the responsible user, and the publication time. The business update and audit
record are committed in one database transaction. Legacy or future flagged
exceptions can still be handled at `/admin/profile-revisions`.

Business names, verification declarations, services, coverage, media, and
products have separate workflows and are intentionally excluded from this
revision form. Staff members cannot submit profile revisions.
