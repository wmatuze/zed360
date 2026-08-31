import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import {
  CompareButton,
  ComparisonTray,
} from "@/components/business-comparison-controls";
import {
  fetchPublicBusinessDirectory,
  fetchPublicReferenceData,
  PublicBusinessApiError,
} from "@/lib/public-businesses";

export const metadata: Metadata = {
  title: "Browse businesses",
  description:
    "Browse approved Zambian businesses by service, location, and how they can serve you.",
};

const fulfillmentLabels = {
  at_business: "Visit the business",
  customer_pickup: "Customer pickup",
  business_travel: "Travels to customers",
  delivery: "Delivery available",
  remote: "Remote or online",
} as const;

const availabilityLabels = {
  available: "Available",
  busy: "Busy",
  temporarily_unavailable: "Temporarily unavailable",
} as const;

type DirectorySearchParams = {
  q?: string;
  category?: string;
  province?: string;
  district?: string;
  fulfillment?: string;
  page?: string;
};

function pageHref(filters: DirectorySearchParams, page: number) {
  const parameters = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value && name !== "page") parameters.set(name, value);
  }
  if (page > 1) parameters.set("page", String(page));
  const query = parameters.toString();
  return query ? `/businesses?${query}` : "/businesses";
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<DirectorySearchParams>;
}) {
  const requested = await searchParams;
  const filters = {
    q: requested.q?.trim() || undefined,
    category: requested.category || undefined,
    province: requested.province || undefined,
    district: requested.district || undefined,
    fulfillment: requested.fulfillment || undefined,
    page: requested.page || undefined,
  };

  let directory = null;
  let referenceData = null;
  let errorMessage = "";
  try {
    [directory, referenceData] = await Promise.all([
      fetchPublicBusinessDirectory(filters),
      fetchPublicReferenceData(),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof PublicBusinessApiError
        ? error.message
        : "Business profiles could not be loaded right now.";
  }

  const categories =
    referenceData?.categories.flatMap((category) => [
      { name: category.name, slug: category.slug },
      ...category.children,
    ]) ?? [];

  return (
    <main className="min-h-screen bg-[var(--ink)] text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            className="hidden text-sm text-white/55 transition hover:text-white sm:block"
            href="/for-business"
          >
            List your business
          </Link>
          <Link className="button button-primary" href="/request">
            Post a request
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-12 sm:px-8 lg:px-10 lg:pt-20">
        <p className="eyebrow">
          <span /> Business discovery
        </p>
        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
              Explore businesses before you ask.
            </h1>
            <p className="mt-5 max-w-2xl leading-7 text-white/50">
              Discover what approved businesses provide, where they operate, and
              whether they deliver, travel, or work remotely.
            </p>
          </div>
          {directory ? (
            <p className="text-sm text-white/40">
              {directory.total} approved{" "}
              {directory.total === 1 ? "business" : "businesses"}
            </p>
          ) : null}
        </div>

        <form
          action="/businesses"
          className="mt-10 rounded-3xl border border-white/10 bg-white/[0.035] p-5"
          method="get"
        >
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <label className="text-sm text-white/65">
              What are you looking for?
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
                defaultValue={filters.q}
                maxLength={100}
                name="q"
                placeholder="Footwear, solar, accounting..."
              />
            </label>
            <label className="text-sm text-white/65">
              Category
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 text-white outline-none focus:border-[var(--lime)]/55"
                defaultValue={filters.category ?? ""}
                name="category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-white/65">
              Province
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 text-white outline-none focus:border-[var(--lime)]/55"
                defaultValue={filters.province ?? ""}
                name="province"
              >
                <option value="">All provinces</option>
                {referenceData?.provinces.map((province) => (
                  <option key={province.id} value={province.slug}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-white/65">
              District
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 text-white outline-none focus:border-[var(--lime)]/55"
                defaultValue={filters.district ?? ""}
                name="district"
              >
                <option value="">All districts</option>
                {referenceData?.provinces.map((province) => (
                  <optgroup key={province.id} label={province.name}>
                    {province.districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="text-sm text-white/65 sm:w-64">
              How can they serve you?
              <select
                className="mt-2 w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 text-white outline-none focus:border-[var(--lime)]/55"
                defaultValue={filters.fulfillment ?? ""}
                name="fulfillment"
              >
                <option value="">Any method</option>
                {Object.entries(fulfillmentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-3">
              <Link className="button button-secondary" href="/businesses">
                Clear
              </Link>
              <button className="button button-primary" type="submit">
                Browse businesses →
              </button>
            </div>
          </div>
        </form>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage} Make sure the Zed360 API is running, then refresh.
          </div>
        ) : null}

        {directory?.businesses.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {directory.businesses.map((business) => (
              <div className="relative" key={business.id}>
                <Link
                  className="group flex min-h-72 flex-col rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-[var(--lime)]/35 hover:bg-white/[0.055]"
                  href={`/businesses/${business.slug}`}
                >
                  {business.coverUrl ? (
                    <div className="relative mb-5 aspect-[16/7] overflow-hidden rounded-2xl bg-white/5">
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        src={business.coverUrl}
                        unoptimized
                      />
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-4">
                    {business.logoUrl ? (
                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white/8">
                        <Image
                          alt={`${business.name} logo`}
                          className="object-cover"
                          fill
                          sizes="48px"
                          src={business.logoUrl}
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--lime)] text-lg font-bold text-[var(--ink)]">
                        {business.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                      {business.trust.contactVerified ? (
                        <span className="rounded-full border border-[var(--lime)]/25 bg-[var(--lime)]/8 px-3 py-1 text-xs text-[var(--lime)]">
                          Contact verified
                        </span>
                      ) : null}
                      {business.trust.registrationVerified ? (
                        <span className="rounded-full border border-[var(--sky)]/25 bg-[var(--sky)]/8 px-3 py-1 text-xs text-[var(--sky)]">
                          Registration verified
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] transition group-hover:text-[var(--lime)]">
                    {business.name}
                  </h2>
                  <p
                    className={`mt-2 text-xs ${business.availabilityFreshness === "current" && business.availability === "available" ? "text-[var(--lime)]" : "text-white/38"}`}
                  >
                    {business.availabilityFreshness === "current"
                      ? availabilityLabels[business.availability]
                      : "Availability not recently confirmed"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/48">
                    {business.description || business.serviceNames.join(" · ")}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {business.categories.slice(0, 3).map((category) => (
                      <span
                        className="rounded-full bg-white/7 px-3 py-1 text-xs text-white/55"
                        key={category.slug}
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-4 pb-12 pt-6 text-sm">
                    <span className="text-white/42">
                      {business.primaryLocation?.district?.name ??
                        "Service location available"}
                    </span>
                    <span className="font-semibold text-[var(--lime)]">
                      View profile →
                    </span>
                  </div>
                </Link>
                <CompareButton name={business.name} slug={business.slug} />
              </div>
            ))}
          </div>
        ) : null}

        <ComparisonTray />

        {directory && directory.businesses.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <h2 className="text-xl font-semibold">No exact matches yet.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/48">
              Try clearing a filter, or post a request so relevant businesses
              can respond directly.
            </p>
            <Link className="button button-primary mt-6" href="/request">
              Post what you need →
            </Link>
          </div>
        ) : null}

        {directory && directory.totalPages > 1 ? (
          <nav
            aria-label="Business directory pages"
            className="mt-10 flex items-center justify-center gap-4"
          >
            {directory.page > 1 ? (
              <Link
                className="button button-secondary"
                href={pageHref(filters, directory.page - 1)}
              >
                ← Previous
              </Link>
            ) : null}
            <span className="text-sm text-white/42">
              Page {directory.page} of {directory.totalPages}
            </span>
            {directory.page < directory.totalPages ? (
              <Link
                className="button button-secondary"
                href={pageHref(filters, directory.page + 1)}
              >
                Next →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
