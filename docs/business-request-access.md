# Business request access

Approved businesses can view customer requests matched to their services at
`/business/requests`.

## Access rules

The API returns a request only when all of these conditions are true:

- the caller has a valid, verified Supabase session;
- the caller is a member of the matched business;
- the business is both `active` and `approved`;
- the request remains open or matched and has not expired; and
- the match has not been declined or expired.

These checks happen in the API query. Hiding a link in the web interface is not
treated as authorization.

## Data minimisation

The business receives the request summary, optional details, service category,
district, timing, budget, and relevant dates. The response intentionally omits
the request share token, raw category answers, internal matching reasons, and
all customer account or contact data.

Viewing this page does not change match state and does not contact the
customer.

## Business responses

An owner or manager can submit one response for an active match. The response
contains an availability status, optional minimum and maximum prices in ZMW,
and a required message. Submitting again updates the existing response rather
than creating duplicates.

The response endpoint repeats all membership, approval, business status,
request status, match status, and expiry checks inside the database
transaction. Staff members cannot submit responses. If authorization fails,
the endpoint returns the same unavailable result used for a missing match so it
does not reveal whether another business received that request.
