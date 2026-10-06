# Profile activity

Zed360 counts how often each public business profile is viewed and how often
customers tap its contact, directions, and share buttons. Owners see their own
figures on the business dashboard; administrators see platform totals on the
administration overview.

## What is counted

| Event              | Counted when a customer                          |
| ------------------ | ------------------------------------------------ |
| `profile_view`     | opens a public profile in a browser              |
| `contact_whatsapp` | taps the WhatsApp button                         |
| `contact_call`     | taps the call button                             |
| `contact_email`    | taps the email button                            |
| `contact_website`  | taps the website button                          |
| `directions`       | taps "Get directions" on a location              |
| `share`            | taps "Share" or "Share on WhatsApp" on a profile |

A tap means the button was pressed. Zed360 cannot see whether the call was
answered, the message was sent, or the share was completed, and the dashboard
says so.

Saved businesses are not counted. The saved list stays in the customer's
browser and is never sent to Zed360.

## Privacy

`business_activity_daily` holds one number per business, per day, per event.
It is a counter, not a log:

- There is no row per visit, so nothing identifies or follows a customer.
- No IP address, cookie, device identifier, or referrer is stored.
- The browser sends only the business address and the kind of event, with no
  sign-in credentials.

A day is the calendar day in Zambia (`Africa/Lusaka`).

## Keeping the figures honest

- A profile view is counted once per browser tab per day, so refreshing the
  page does not add views. The marker lives in the browser's session storage.
- Views are sent by the page's script, which keeps most crawlers out.
- The endpoint is rate limited per address (40 a minute, 400 an hour). Beyond
  that, counts are silently dropped.
- Activity for unknown, unapproved, or suspended businesses is ignored.

These measures stop accidents and casual inflation, not a determined person.
An owner could raise their own numbers by visiting their profile from several
devices. That is acceptable only because of the rule below.

## Activity never affects visibility

Profile activity is shown to the business and to administrators. It must never
influence search order, matching, featured sections, or any badge. Visibility
is earned through confirmed customer interactions, responsiveness, verified
reviews, verification, and current information, as set out in the
[product principles](product-principles.md). If these counts ever fed ranking,
they would become worth faking.

## API

`POST /v1/businesses/:slug/activity` with `{ "event": "<event>" }` returns
`204` and adds one to today's count. It is public and requires no session.
Counting failures are ignored by the web page so they can never get in a
customer's way.

## History

Counting began when migration `0022_business_activity` was applied. Earlier
views and taps were never recorded and cannot be reconstructed.
