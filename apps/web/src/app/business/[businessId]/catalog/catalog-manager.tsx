"use client";

import type { BusinessCatalog } from "@zed360/contracts";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  completeMediaUpload,
  prepareMediaUpload,
  removeMedia,
  saveProduct,
  type CatalogActionState,
} from "./actions";

const initialState: CatalogActionState = { status: "idle", message: "" };

const availabilityLabels = {
  available: "Available",
  out_of_stock: "Out of stock",
  made_to_order: "Made to order",
  contact_business: "Contact business",
} as const;

const purposeLabels = {
  logo: "Business logo",
  cover: "Cover image",
  gallery: "Gallery photo",
  work_sample: "Work sample",
  product: "Product image",
} as const;

type ProductPricingType = "fixed" | "from" | "range" | "contact";

const pricingTypeLabels: Record<ProductPricingType, string> = {
  fixed: "Fixed price",
  from: "Starting from",
  range: "Price range",
  contact: "Contact for price",
};

function productPricingType(
  product?: BusinessCatalog["products"][number],
): ProductPricingType {
  if (!product) return "fixed";
  if (product.priceFrom === null && product.priceTo === null) return "contact";
  if (product.priceFrom !== null && product.priceTo !== null) {
    return product.priceFrom === product.priceTo ? "fixed" : "range";
  }
  if (product.priceFrom !== null) return "from";
  return "range";
}

function ProductForm({
  businessId,
  product,
}: {
  businessId: string;
  product?: BusinessCatalog["products"][number];
}) {
  const action = saveProduct.bind(null, businessId, product?.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [pricingType, setPricingType] = useState<ProductPricingType>(() =>
    productPricingType(product),
  );
  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/65">
          Product name
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
            defaultValue={product?.name}
            maxLength={120}
            name="name"
            required
          />
        </label>
        <label className="text-sm text-white/65">
          Availability
          <select
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 outline-none focus:border-[var(--lime)]/55"
            defaultValue={product?.availability ?? "contact_business"}
            name="availability"
          >
            {Object.entries(availabilityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-sm text-white/65">
        Description
        <textarea
          className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
          defaultValue={product?.description ?? ""}
          maxLength={1200}
          name="description"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/65">
          Pricing
          <select
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 outline-none focus:border-[var(--lime)]/55"
            name="pricingType"
            onChange={(event) =>
              setPricingType(event.target.value as ProductPricingType)
            }
            value={pricingType}
          >
            {Object.entries(pricingTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {pricingType === "fixed" || pricingType === "from" ? (
          <label className="text-sm text-white/65">
            {pricingType === "fixed" ? "Price (ZMW)" : "Starting price (ZMW)"}
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
              defaultValue={product?.priceFrom ?? ""}
              min="0"
              name="price"
              required
              step="0.01"
              type="number"
            />
          </label>
        ) : null}
      </div>
      {pricingType === "range" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-white/65">
            Minimum price (ZMW)
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
              defaultValue={product?.priceFrom ?? ""}
              min="0"
              name="priceFrom"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-sm text-white/65">
            Maximum price (ZMW)
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
              defaultValue={product?.priceTo ?? ""}
              min="0"
              name="priceTo"
              required
              step="0.01"
              type="number"
            />
          </label>
        </div>
      ) : null}
      {pricingType === "contact" ? (
        <p className="rounded-xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-white/45">
          No amount will be displayed. Customers will be invited to contact the
          business for the current price.
        </p>
      ) : null}
      {product ? (
        <label className="text-sm text-white/65">
          Catalog status
          <select
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 outline-none focus:border-[var(--lime)]/55"
            defaultValue={product.status}
            name="status"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      ) : null}
      <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-black/15 p-4 text-sm text-white/65">
        <input
          className="mt-1 accent-[var(--lime)]"
          defaultChecked={product?.isPublished ?? false}
          name="isPublished"
          type="checkbox"
        />
        <span>
          <strong className="block text-white/82">
            Show on public profile
          </strong>
          Customers can view this product but will contact you to transact.
        </span>
      </label>
      {state.message ? (
        <p
          className={`text-sm ${state.status === "error" ? "text-red-200/80" : "text-[var(--lime)]"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <button className="button button-primary w-fit" disabled={pending}>
        {pending ? "Saving..." : product ? "Update product" : "Add product"}
      </button>
    </form>
  );
}

function MediaUploadForm({
  businessId,
  products,
}: {
  businessId: string;
  products: BusinessCatalog["products"];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [purpose, setPurpose] = useState<keyof typeof purposeLabels>("gallery");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function upload(formData: FormData) {
    setUploading(true);
    setMessage("");
    setIsError(false);
    try {
      const file = formData.get("image");
      if (!(file instanceof File) || !file.size) {
        throw new Error("Choose an image to upload.");
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Use a JPG, PNG, or WebP image.");
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("The image must be 5 MB or smaller.");
      }
      const productId =
        purpose === "product"
          ? String(formData.get("productId") ?? "")
          : undefined;
      const prepared = await prepareMediaUpload(businessId, {
        fileName: file.name,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
        fileSizeBytes: file.size,
        purpose,
        productId,
      });
      if (prepared.status === "error") throw new Error(prepared.message);

      const dimensions = await createImageBitmap(file);
      const width = dimensions.width;
      const height = dimensions.height;
      dimensions.close();
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type,
        });
      if (error) throw new Error("The image could not be uploaded to storage.");

      const completed = await completeMediaUpload(businessId, {
        storagePath: prepared.path,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
        fileSizeBytes: file.size,
        width,
        height,
        purpose,
        productId,
        title: String(formData.get("title") ?? ""),
        altText: String(formData.get("altText") ?? ""),
        caption: String(formData.get("caption") ?? ""),
      });
      if (completed.status === "error") throw new Error(completed.message);
      setMessage(completed.message);
      formRef.current?.reset();
      setPurpose("gallery");
      startTransition(() => router.refresh());
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={upload} className="grid gap-4" ref={formRef}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/65">
          Image type
          <select
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 outline-none focus:border-[var(--lime)]/55"
            name="purpose"
            onChange={(event) =>
              setPurpose(event.target.value as keyof typeof purposeLabels)
            }
            value={purpose}
          >
            {Object.entries(purposeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {purpose === "product" ? (
          <label className="text-sm text-white/65">
            Product
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 outline-none focus:border-[var(--lime)]/55"
              name="productId"
              required
            >
              <option value="">Choose a product</option>
              {products
                .filter((product) => product.status === "active")
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
      </div>
      <label className="text-sm text-white/65">
        Choose image
        <input
          accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--lime)] file:px-4 file:py-2 file:font-semibold file:text-[var(--ink)]"
          name="image"
          required
          type="file"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-white/65">
          Short title (optional)
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
            maxLength={120}
            name="title"
          />
        </label>
        <label className="text-sm text-white/65">
          Image description
          <input
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
            maxLength={180}
            minLength={3}
            name="altText"
            placeholder="What is visible in this image?"
            required
          />
        </label>
      </div>
      <label className="text-sm text-white/65">
        Caption (optional)
        <textarea
          className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/55"
          maxLength={500}
          name="caption"
        />
      </label>
      <p className="text-xs leading-5 text-white/35">
        JPG, PNG, or WebP only; maximum 5 MB. Gallery, work-sample, and product
        images publish after validation. Logos and covers require Zed360 review.
      </p>
      {purpose === "logo" ? (
        <p className="text-xs leading-5 text-white/45">
          Use an official symbol, wordmark, or business-name mark you are
          authorized to use. A square image is preferred. Product photos,
          portraits, advertisements, and imitation verification badges are not
          logos.
        </p>
      ) : null}
      {purpose === "cover" ? (
        <p className="text-xs leading-5 text-white/45">
          Use a wide image that genuinely represents the business, its premises,
          work, or products. Avoid contact-number posters and misleading badges.
        </p>
      ) : null}
      {message ? (
        <p
          className={`text-sm ${isError ? "text-red-200/80" : "text-[var(--lime)]"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
      <button
        className="button button-primary w-fit"
        disabled={uploading || (purpose === "product" && !products.length)}
      >
        {uploading
          ? "Uploading..."
          : purpose === "logo" || purpose === "cover"
            ? "Upload for review"
            : "Upload and publish"}
      </button>
    </form>
  );
}

function MediaCard({
  businessId,
  media,
}: {
  businessId: string;
  media: BusinessCatalog["media"][number];
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [removeMessage, setRemoveMessage] = useState("");

  async function remove() {
    if (
      !window.confirm("Remove this image from Zed360? This cannot be undone.")
    )
      return;
    setRemoving(true);
    setRemoveMessage("");
    const result = await removeMedia(businessId, media.id);
    setRemoving(false);
    if (result.status === "success") router.refresh();
    else setRemoveMessage(result.message);
  }
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-black/15">
      <div className="relative aspect-[4/3] bg-white/5">
        <Image
          alt={media.altText}
          className="object-cover"
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          src={media.url}
          unoptimized
        />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">
            {media.title || purposeLabels[media.purpose]}
          </p>
          <span
            className={`rounded-full px-2 py-1 text-[0.65rem] ${
              media.moderationStatus === "approved"
                ? "bg-[var(--lime)]/10 text-[var(--lime)]"
                : media.moderationStatus === "rejected"
                  ? "bg-red-300/10 text-red-200/80"
                  : "bg-amber-200/10 text-amber-100/75"
            }`}
          >
            {media.moderationStatus}
          </span>
        </div>
        {media.moderationNote ? (
          <p className="mt-2 text-xs leading-5 text-white/42">
            Status note: {media.moderationNote}
          </p>
        ) : null}
        <button
          className="mt-4 text-xs font-semibold text-red-200/70 hover:text-red-100 disabled:opacity-40"
          disabled={removing}
          onClick={remove}
          type="button"
        >
          {removing ? "Removing..." : "Remove image"}
        </button>
        {removeMessage ? (
          <p className="mt-2 text-xs text-red-200/75" role="status">
            {removeMessage}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function CatalogManager({ catalog }: { catalog: BusinessCatalog }) {
  const allMedia = [
    ...catalog.media,
    ...catalog.products.flatMap((product) => product.media),
  ];
  return (
    <div className="mt-10 space-y-8">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lime)]">
            Display-only products
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Add a product</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Products help customers discover what you sell. Payments and orders
            stay directly between you and the customer.
          </p>
          <div className="mt-6">
            <ProductForm businessId={catalog.business.id} />
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lime)]">
            Visual storefront
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Upload an image</h2>
          <p className="mt-2 text-sm leading-6 text-white/45">
            Add product photos, work samples, and profile images customers can
            trust.
          </p>
          <div className="mt-6">
            <MediaUploadForm
              businessId={catalog.business.id}
              products={catalog.products}
            />
          </div>
        </section>
      </div>

      {catalog.products.length ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold">Your products</h2>
            <span className="text-sm text-white/38">
              {catalog.products.length} total
            </span>
          </div>
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">
            {catalog.products.map((product) => (
              <details
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6"
                key={product.id}
              >
                <summary className="cursor-pointer list-none text-lg font-semibold">
                  {product.name}
                  <span className="ml-3 text-xs font-normal text-white/38">
                    {product.isPublished ? "Published" : "Private draft"} ·{" "}
                    {availabilityLabels[product.availability]}
                  </span>
                </summary>
                <div className="mt-6">
                  <ProductForm
                    businessId={catalog.business.id}
                    product={product}
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {allMedia.length ? (
        <section>
          <h2 className="text-2xl font-semibold">Your images</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allMedia.map((media) => (
              <MediaCard
                businessId={catalog.business.id}
                key={media.id}
                media={media}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
