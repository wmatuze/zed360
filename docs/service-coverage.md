# Business service coverage

Coverage is configured per service rather than inferred from the business's
physical address. This allows one business to deliver a product nationwide
while offering an installation or in-person service only in selected areas.

## Fulfilment modes

- `at_business`: the customer visits the business location;
- `customer_pickup`: the customer collects an item;
- `business_travel`: the business travels to the customer;
- `delivery`: the business or a courier delivers;
- `remote`: the work is completed remotely or online.

Travel and delivery may cover selected districts, selected provinces, or the
whole country. They can include an owner-provided fee range, delivery-time
range, and explanatory note.

## Trust boundary

Only an authenticated owner or manager can edit coverage. Every save replaces
the selected service's previous configuration in one database transaction and
sets `last_confirmed_at`. The platform must label this information as
owner-provided until an independent verification process exists.

The initial exact-district matcher remains unchanged in this branch. A later
delivery-aware matching branch will consume confirmed coverage explicitly and
will explain why a non-local business was included.
