# Business locations and branches

Business owners and managers can maintain multiple physical locations from the
business dashboard. Location information is owner-provided and publishes
immediately; it does not imply that Zed360 independently verified the address.

## Rules

- Every business keeps at least one active location.
- A business may have up to 20 active locations during the pilot.
- Only one active location should be designated as primary.
- Deactivating the primary location automatically selects another active
  location as primary.
- Deactivation is reversible. Records are retained instead of permanently
  deleted so operating hours and future historical references are preserved.
- Operating hours remain attached to their individual location.
- Owners and managers can change locations; staff accounts cannot.

Districts must come from Zed360's verified Zambia reference data.

## Map pins

Owners and managers can add an optional map pin to each location, either from
the device's current position or by pasting coordinates or a full Google Maps
link. Short `maps.app.goo.gl` links cannot be read without contacting Google,
so owners are asked to paste the coordinates instead.

- Pins must fall inside Zambia's bounding box. The check is a sanity check,
  not proof that the pin matches the selected district.
- Coordinates are stored as a PostGIS point and published with the location.
  Like the address, a pin is owner-provided and is not verified by Zed360.
- The form tells owners to pin only places customers should visit. A business
  that travels to customers from home should leave the pin empty, because a
  published pin would reveal a private address.
- A pin can be removed; the location then falls back to a text search for
  directions.

Pinned locations make proximity search ("businesses near you") possible later
without changing the location records.
