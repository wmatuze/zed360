# Business directory

`/businesses` is built to stay usable with thousands of businesses: a customer
should be able to narrow the list quickly and scan many results per screen on a
phone with limited data.

## Layout

- **Search bar** — a search box, a province picker, and a Search button. The
  bar stays at the top of the screen while scrolling.
- **More filters** — category, district, how the business serves customers,
  order, "Open now", and "Available now" sit behind one control. A badge shows
  how many of them are in use.
- **Result line** — the number of matching businesses and the place, for
  example "1,024 businesses in Copperbelt".
- **Filter chips** — one chip per active filter. Selecting a chip removes that
  filter and returns to the first page. Removing a province also removes the
  district inside it.
- **Rows** — each business is a compact row, two columns on wide screens.
- **Pages** — 30 businesses per page with numbered pages: the first, the last,
  and those around the current page.

## What a row shows

Logo (or initials), name, the specific verification label, category and town,
rating with review count, "Open now" or "Closed now", and current
availability. Save and Compare sit on the right.

Cover images and descriptions are deliberately left to the profile page. Rows
without cover images keep the directory light on mobile data, and a row is
about a fifth of the height of the previous card.

A row shows only what is true and current:

- The rating appears only when the business has published reviews.
- "Open now" or "Closed now" appears only when opening hours have been added.
  A business is open if any of its active locations is open.
- Availability appears only when it was confirmed in the last 7 days.

## Filters

| Parameter     | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| `q`           | Text in the business name, description, services, or products   |
| `province`    | Province slug                                                   |
| `district`    | District id; takes precedence over `province`                   |
| `category`    | Category slug                                                   |
| `fulfillment` | How the business serves customers                               |
| `sort`        | See [merit ordering](merit-ordering.md)                         |
| `open=1`      | Only businesses with a location open at this moment             |
| `available=1` | Only businesses that said they are available in the last 7 days |

Unknown values for `sort`, `fulfillment`, `open`, and `available` are ignored
by the page and rejected by the API.

### Open now

"Open now" is decided in the database so it works across every page of
results. It follows the same rules as the label on a profile:

- times are Zambian time (`Africa/Lusaka`);
- a location is open if today's hours cover the current time, or if
  yesterday's hours run past midnight and have not ended;
- a business that recently marked itself temporarily unavailable is not open.

The row label is computed by the application and the filter by the database.
They must stay in step: if `describeOperatingHours` changes, change
`openNowFilter` with it.

## Saved and compared businesses

Save and Compare work as before and keep their lists in the customer's
browser. See [saved businesses](saved-businesses.md) and
[business comparison](business-comparison.md).
