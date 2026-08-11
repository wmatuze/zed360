# Customer request outcomes

Request outcomes close the loop between a customer need and a useful business
connection without requiring a customer account.

## Customer actions

On the private response-comparison page, the link holder can:

- mark an eligible responding business as contacted;
- choose one responding business, which resolves the request;
- close an open request without choosing, which cancels it; or
- reopen a resolved or cancelled request.

Contact markers remain when a request is reopened. Reopening clears the
confirmed choice so the customer can continue comparing current responses.

## Authorization and integrity

The unguessable request share token is a bearer secret and authorizes both
reading and updating the private request. No customer account is required.

A contacted or chosen business must belong to the request, have submitted a
visible response, and still be active and approved. Unavailable responses
cannot be selected. Database constraints allow only one interaction per
request and business and only one confirmed business per request.

## Meaning of the data

`contacted` means the customer says they used one of the business contact
channels. `chosen` means the customer says they selected that business and the
request is resolved. Neither signal proves that money changed hands, delivery
occurred, or the work was satisfactory. Those stronger outcomes require a
separate confirmation or review flow.
