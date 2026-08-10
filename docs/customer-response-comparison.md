# Customer response comparison

Customers do not need an account to compare responses. A submitted request
receives a random UUID share token and the confirmation screen links to
`/request/{shareToken}`.

## Privacy boundary

The share token acts as a bearer secret. It is not derived from the request ID,
customer details, or predictable values. Customers are told to save the link
and not post it publicly.

The shared API response omits the share token itself, raw request answers,
matching scores and reasons, business membership data, reviewer data, and
responses from businesses that are no longer active and approved.

## Comparison and contact

The page displays each approved business's availability, price range, message,
and submitted business contact channels. The customer decides which business
to contact. An unavailable response remains visible for transparency but does
not show contact buttons.

Recording a confirmed connection and allowing customers to close their request
are later milestones.
