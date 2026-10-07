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

## Email alerts

Owners and managers are emailed when a customer request is matched to one of
their businesses and when a customer chooses them. Customers pick from the
businesses that answer first, so an alert that reaches the owner's phone is
what makes the request model work.

### What is sent

- Only `request_matched` and `customer_selected` notifications are emailed.
  Review decisions stay in the notification centre.
- The email repeats the notification's title and text and links back into
  Zed360. It adds nothing the notification centre does not already show: no
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
