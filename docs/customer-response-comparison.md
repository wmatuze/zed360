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

## Request outcomes

The holder of the private request link can record that they contacted a
business, choose one responding business, or close the request without making
a selection. Choosing a business resolves the request, while closing without a
selection cancels it. Either state removes the request from active business
matching, but the customer can still read the existing responses and reopen an
accidentally closed request.

Only an active, approved business with a visible response can be selected. A
request can have several contacted businesses but only one confirmed choice.
These signals measure useful customer-to-business connections; they do not
claim that payment, delivery, or service quality has been verified by Zed360.

The private share token remains the authorization boundary. Customers are not
forced to create an account, so anyone who obtains the link can also change the
request outcome.

## Link retention

The browser remembers up to five private requests using local storage. Visiting
a private request page also adds it to the recent list, so an existing link can
be remembered on a new browser after it is opened once.

The request form shows **My recent requests** with a Forget control for shared
devices. Confirmation and comparison pages provide copy, native device sharing,
and WhatsApp sharing controls. Browser storage is only a convenience: clearing
site data or changing devices removes the recent list, so optional verified
email or WhatsApp recovery remains a future feature.
