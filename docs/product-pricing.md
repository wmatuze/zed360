# Product pricing

Business owners choose how a catalogue product is priced instead of editing
database-oriented minimum and maximum fields directly.

| Option | Stored values | Public display |
| --- | --- | --- |
| Fixed price | `price_from` and `price_to` are equal | One ZMW amount |
| Starting from | `price_from` only | `From K…` |
| Price range | Different `price_from` and `price_to` values | `K… – K…` |
| Contact for price | Both values are null | `Contact for price` |

The existing two-column database model remains unchanged. Existing equal-value
ranges automatically display as fixed prices, and legacy maximum-only records
continue to display as `Up to K…` until the owner edits their pricing.
