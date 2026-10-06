# Merit ordering and homepage sections

Zed360 never sells position. Every order a customer can see is either earned
by the business or a plain fact about it. This follows the "No payments" rule in the
[product principles](product-principles.md).

## Orders

`GET /v1/businesses` accepts `sort`. Anything else is rejected.

| `sort`               | Lists                                                | Ordered by                                    |
| -------------------- | ---------------------------------------------------- | --------------------------------------------- |
| `recently_confirmed` | every approved business (the default)                | most recent profile confirmation by the owner |
| `top_rated`          | only businesses with at least one published review   | weighted rating, then number of reviews       |
| `recently_verified`  | only businesses with a contact or registration check | most recent completed check                   |
| `newest`             | every approved business                              | newest first                                  |

Ties are broken by name. The same filters (search, category, province,
district, fulfilment) apply to every order.

### Weighted rating

A plain average would rank one 5-star review above fifty 4.8-star reviews. Each
business is therefore scored as though it also held three 4-star reviews:

```text
score = (sum of ratings + 4 × 3) / (number of reviews + 3)
```

One 5-star review scores 4.25; fifty reviews averaging 4.8 score about 4.75. The
displayed rating is always the true average and review count. Only the order
uses the weighted score. Only published reviews count, and reviews come only
from customers who chose the business through a Zed360 request.

### Recently verified

Only checks that are shown on a public profile count: contact and
registration. Ownership checks are internal and never place a business in this
list. Each card names the specific check ("Contact verified" or "Registration
verified") and its date, so a contact check is never read as proof of PACRA
registration. See [business verification](business-verification.md).

## Homepage

Below "Businesses worth discovering", the homepage shows up to three sections,
each under a plain title with one short line beneath it: Top rated, Recently
verified, and Newly added. For each section:

- every card states why that business is there (its rating and review count,
  the check and its date, or the date it joined);
- at most four businesses are shown, with a link to the full list;
- a business without a reason is never shown, and a section with no
  businesses is left out entirely rather than padded.

The pages do not announce that position cannot be bought. That rule governs
how the lists are built and is recorded here; customers simply see ordinary
section titles.

The directory at `/businesses` has an "Order by" control offering the same
orders, with a short note when a non-default order narrows the list.

## What must never feed an order

- Payment of any kind.
- Profile views, contact taps, shares, or saves. These are easy to inflate and
  are shown only to the owner and administrators. See
  [profile activity](profile-activity.md).
- Administrator preference. There is no manual "featured" list.

"Trending" and "most visited" sections were considered and left out for the
second reason: they would rank businesses by a figure anyone can inflate.

## Adding a section

Add the order to `publicBusinessSortSchema`, its `ORDER BY` to
`directoryOrder` in the API, and its title, rule, and per-business reason to
`meritSections` in the web app. A section must be able to state its rule in one
sentence a customer can check against what they see.
