# Notification archiving

Zed360 treats business notifications as an activity inbox, not disposable
messages. Archiving removes an item from the active inbox and dashboard while
retaining its history for the business member who received it.

## Behaviour

- Inbox and Archived are separate views.
- Each view is paginated at 25 notifications per page.
- Archiving an unread notification also marks it as read.
- `Archive all read` archives only read, unarchived notifications.
- Archived notifications can be restored to the inbox.
- Archive state belongs to the recipient. One member cannot archive another
  member's notification.
- Notification events are not hard-deleted through the business interface.

## Security boundary

Every read, archive, and restore mutation filters by both notification ID and
the authenticated recipient user ID. A valid ID belonging to another account
is treated as unavailable.
