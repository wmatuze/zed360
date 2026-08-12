# Business notifications

Zed360 gives signed-in owners and managers a private notification centre at
`/business/notifications`. The first notification types are new matched
requests and a customer selecting the business after comparing responses.

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

## Current boundary

This release is in-app only. It does not claim that an email or WhatsApp alert
was sent. External delivery will be enabled only after a provider, consent,
sender identity, unsubscribe behavior, and retry policy are configured.
