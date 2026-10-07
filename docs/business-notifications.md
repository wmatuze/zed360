# Business notifications

Zed360 gives signed-in owners and managers a private notification centre at
`/business/notifications`. The first notification types are new matched
requests and a customer selecting the business after comparing responses. The
same two events are also emailed; see [Email alerts](#email-alerts).

## Privacy and authorization

Notifications are materialized only for authenticated users who currently hold
an `owner` or `manager` membership for the related business. Staff members do
not receive request notifications because they cannot respond to customer
requests. Every read mutation is scoped to the authenticated recipient.

Notifications show the same limited request summary already authorized for the
business request screen. They do not contain the customer's private share
token, raw category answers, contact identity, match score, or internal review
information.

## Reliable event foundation

Business events are stored separately from recipient notification rows. Event
keys are unique, making creation idempotent when matching or selection logic is
retried. Recipient rows are created when the event occurs, so opening the
notification centre needs only one database read.

This event table is the durable foundation for later delivery adapters. Email
or WhatsApp delivery must use separate delivery-attempt records with retry and
provider identifiers; a provider failure must never reverse the underlying
request or review transaction.

## The notification centre

- New notifications are listed first under "New", with older ones under
  "Earlier". The inbox tab shows how many are new.
- **Opening** a notification marks it as read and goes to what it is about: the
  request itself if it is still open, or Past requests once it has ended. A
  "customer selected" notification names the request, using the summary the
  business was already shown.
- "Mark read" marks one as read without opening it; "Mark all read" does so
  for all. "Archive" puts a notification away; archived ones can be moved back.
- The page reloads its data every minute, and when the owner returns to the
  tab, so new notifications appear without a manual refresh. It pauses while
  the tab is in the background.

Opening goes through `/business/notifications/:id/open`, which only the
recipient can use. It is a plain link rather than a prefetched one, because
following it changes the notification's state.

## Email alerts

Owners and managers are emailed when a customer request is matched to one of
their businesses and when a customer chooses them. Customers pick from the
businesses that answer first, so an alert that reaches the owner's phone is
what makes the request model work.

### What is sent

- Only `request_matched` and `customer_selected` notifications are emailed.
  Review decisions stay in the notification centre.
- The email repeats the notification's title and text and links to the
  notification's open address, so following it marks the notification as read
  and lands on the request. A signed-out owner signs in first and is then
  taken there. It adds nothing the notification centre does not already show: no
  customer contact details, share token, or other businesses' responses.
- Links are built only from same-site paths stored with the notification, so
  an email can never point at another site. Customer-written text is escaped
  in the HTML version.
- Every email says why it was sent and links to the setting that turns alerts
  off.

### Who receives one

A person is emailed only if they have an email address, their account is
active, and email alerts are on. Alerts are on by default and are switched on
or off under "Email alerts" on `/business/account`; the setting belongs to the
person, not the business. A notification already read inside Zed360 is not
emailed.

Both conditions are checked again at the moment of sending, so turning alerts
off or being suspended stops a delivery that was already queued.

### How delivery works

`business_notification_deliveries` holds one row per notification and channel.
Once a minute the API:

1. queues a delivery for each eligible notification created in the last six
   hours (so switching alerts on never sends a backlog of old news);
2. claims up to 20 due deliveries, sends them, and records the result.

- **No duplicates.** The unique row per notification, an atomic claim that two
  API instances cannot both win, and a provider idempotency key each prevent a
  second send.
- **Retries.** A rate limit, provider fault, or network failure is retried
  with increasing delay (about 2, 4, 8, and 16 minutes) up to five attempts.
- **Permanent failures** such as a rejected address or an unverified sender
  are not retried. The reason is kept in `last_error`.
- **Isolation.** Delivery works from notification rows that already exist. A
  provider failure can never undo the request or selection behind them.

### Emails to customers

A customer has no account, so Zed360 can only reach them if they choose to
leave an address. The request form has an optional "Email me when a business
responds" field.

- The address is stored with the request as `notify_email`. It is never shown
  to a business, never returned by any business or public endpoint, and used
  for nothing except telling the customer about responses to that request.
- The customer is emailed once per business, the first time that business
  responds. Editing a response does not send another email.
- The email names the business, repeats the customer's own summary, and links
  to their private request page. It does not include the response or its
  price; those are read on the private page. It warns that the link is private
  and says what to do if the address was entered by someone else.
- If no address is given, the confirmation screen says plainly that Zed360
  cannot tell them about responses and that they should save their link.

These emails are stored ready to send in `email_outbox` and sent by the same
once-a-minute pass, with the same retry rules. Each has a unique key, so it is
sent at most once. A message still unsent after 24 hours is left unsent.

The address is not verified. Someone could enter another person's address, who
would then receive at most one short email per responding business. The public
request endpoint is rate limited, which bounds this.

### Configuration

Email is sent through [Resend](https://resend.com). Set both values in `.env`;
alerts stay off, and the API says so at start-up, until both are present.

```text
EMAIL_PROVIDER_API_KEY=re_...
EMAIL_FROM=Zed360 <alerts@your-domain>
```

`EMAIL_FROM` must use a domain verified in Resend. Resend's test sender
`onboarding@resend.dev` delivers only to the address on the Resend account, so
it suits testing but not real owners. Links use `NEXT_PUBLIC_APP_URL`.

## Current boundary

Email is the only external channel. WhatsApp alerts are not built: they need a
WhatsApp Business account and a message template approved by Meta, and would
be added as a second channel in the same delivery table.
