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

Submitting a response is a separate milestone. Viewing this page does not
change match state and does not contact the customer.
