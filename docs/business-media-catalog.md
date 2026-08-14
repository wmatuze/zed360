# Business media and display-only catalog

## Product boundary

The catalog gives an approved business a visual storefront without making
Zed360 an e-commerce intermediary. Customers can discover products and work
samples, then contact the business directly. Zed360 does not accept payment,
place orders, hold stock, or guarantee owner-supplied prices and availability.

## Data model

- `business_products` stores display-only products, price guidance,
  availability, publication state, and freshness.
- `business_media_assets` stores curated metadata and an object-storage path.
  Image bytes never pass through PostgreSQL.
- Product records can be archived instead of deleted.
- Logo and cover images begin as `pending` and are excluded from public APIs
  until a Zed360 reviewer approves them.
- Gallery, work-sample, and product images publish immediately after the
  existing file type, size, path, ownership, and metadata validation succeeds.
- Approving a new logo or cover image replaces the previous approved image of
  the same type. Gallery, work-sample, and product images can have multiple
  approved entries.

## Image restrictions

The first version accepts JPG, PNG, and WebP files up to 5 MB. SVG is excluded
because active content and external references make user-supplied SVG harder to
serve safely. Videos are deferred until upload cost, moderation, transcoding,
and delivery have been designed.

Supabase supports bucket-level MIME and size restrictions. Public buckets are
appropriate for public media and remain protected for upload, update, and
delete operations. See [Storage bucket access](https://supabase.com/docs/guides/storage/buckets/fundamentals)
and [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

## One-time Supabase setup

In the Supabase dashboard:

1. Open **Storage** and create a bucket named `business-media`.
2. Mark the bucket **Public**.
3. Set its maximum file size to **5 MB**.
4. Restrict allowed MIME types to:
   - `image/jpeg`
   - `image/png`
   - `image/webp`

Then apply the repository policies:

```powershell
pnpm.cmd storage:configure-business-media
```

The command is safe to rerun. It permits only authenticated owners and managers
to write within the folder named after their own business UUID. The publishable
key cannot bypass these policies; the Supabase service key is never sent to the
browser.

## Upload flow

1. The owner requests an upload path from the authenticated Zed360 API.
2. Zed360 verifies owner/manager membership and generates a UUID object path
   under that business's folder.
3. The signed upload URL is created using the owner's Supabase session.
4. The browser uploads directly to Storage.
5. The API records identity images as `pending` and other valid images as
   `approved` with an automatic-publication audit note.
6. A reviewer approves or rejects pending logos and covers at
   `/admin/media-reviews`.
7. Only approved media is returned by public business APIs.

Signed upload URLs are short-lived and require `INSERT` permission when they are
created. See [Supabase signed upload URLs](https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl).

## Current routes

- Owner storefront: `/business/[businessId]/catalog`
- Media moderation: `/admin/media-reviews`
- Public profiles: `/businesses/[slug]`

Image transformations are intentionally not required in this release because
Supabase currently limits that feature by plan and charges separately beyond
quota. The first release serves owner-compressed originals and can introduce
responsive transformations after usage is measured. See
[Supabase image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations).

## Logo and cover standards

A logo may be an official symbol, wordmark, or business-name mark the business
is authorized to use. Square artwork is preferred for profile cards, but a
legitimate horizontal wordmark is acceptable. A product photograph, portrait,
premises photograph, advertisement, contact-number poster, or imitation PACRA,
Zed360, or verification badge does not qualify as a logo.

A cover should be a wide image that genuinely represents the business, its
premises, work, or products. Approval checks relevance and identity safety; it
does not certify ownership of every intellectual-property element or endorse
the business.

## Owner removal

An owner or manager can permanently remove any pending, approved, or rejected
image from the storefront manager. The API verifies membership, deletes the
object through the signed-in user's Storage permission, and removes its database
metadata. Removal is immediate and does not require moderation. If an active
logo or cover is removed, the public profile returns to its default appearance
until a replacement is approved. Removing a product image does not remove the
product itself.
