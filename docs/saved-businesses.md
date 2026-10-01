# Saved businesses, sharing, and directions

Customers can keep a shortlist, pass a business on to someone else, and find
their way to a location without creating an account.

## Saved businesses

- Any visitor can save a business from the public directory or its profile and
  see the list at `/businesses/saved`.
- The list is kept only in that browser using local storage. It is not attached
  to an account and is not sent to Zed360.
- Each entry stores the public slug, name, district, and the date it was saved
  so the list can be shown without contacting the API. Opening an entry always
  loads the current public profile.
- The list holds up to 50 businesses; saving another removes the oldest.
- Two or more saved businesses can be opened directly in the existing
  comparison, which accepts up to three.

Saving is a customer convenience, not a ranking signal. Save counts are not
collected and must not affect visibility.

## Sharing

A profile can be shared through the device's share sheet, by copying its link,
or straight into WhatsApp. Shared links contain only the public profile
address.

## Directions

Each public location with an address or district offers a "Get directions"
link that opens a Google Maps search for the business name, address, district,
and province. Owners cannot yet place an exact map pin, so locations without an
address or district show no directions link rather than a guess. When owners can
set coordinates, directions should use them instead of a text search.
