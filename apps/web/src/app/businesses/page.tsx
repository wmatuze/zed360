import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ComparisonTray } from "@/components/business-comparison-controls";
import { BusinessRow } from "@/components/business-row";
import { SavedBusinessesLink } from "@/components/saved-businesses";
import {
  directoryHref,
  filterChips,
  pageNumbers,
  type DirectoryFilters,
} from "@/lib/directory-filters";
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

// Orders are by merit or fact only; see docs/merit-ordering.md.
const sortLabels = {
  recently_confirmed: "Recently confirmed",
  top_rated: "Top rated",
  most_viewed: "Most viewed this week",
  recently_verified: "Recently verified",
  newest: "Newly added",
} as const;

const field =
  "w-full rounded-xl border border-white/10 bg-[#10141c] px-4 py-3 text-white outline-none transition placeholder:text-white/50 focus:border-[var(--lime)]/55";

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<DirectoryFilters>;
}) {
  const requested = await searchParams;
  const filters: DirectoryFilters = {
    q: requested.q?.trim() || undefined,
    province: requested.province || undefined,
    district: requested.district || undefined,
    category: requested.category || undefined,
    fulfillment:
      requested.fulfillment && requested.fulfillment in fulfillmentLabels
        ? requested.fulfillment
        : undefined,
    sort:
      requested.sort &&
      requested.sort in sortLabels &&
      requested.sort !== "recently_confirmed"
        ? requested.sort
        : undefined,
    open: requested.open === "1" ? "1" : undefined,
    available: requested.available === "1" ? "1" : undefined,
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
  const provinces = referenceData?.provinces ?? [];
  const province = provinces.find(({ slug }) => slug === filters.province);
  const district = provinces
    .flatMap(({ districts }) => districts)
    .find(({ id }) => id === filters.district);
  const place = district?.name ?? province?.name;

  const chips = filterChips(filters, {
    q: filters.q ? `“${filters.q}”` : undefined,
    province: province?.name,
    district: district?.name,
    category: categories.find(({ slug }) => slug === filters.category)?.name,
    fulfillment: filters.fulfillment
      ? fulfillmentLabels[filters.fulfillment as keyof typeof fulfillmentLabels]
      : undefined,
    open: "Open now",
    available: "Available now",
    sort: filters.sort
      ? `Order: ${sortLabels[filters.sort as keyof typeof sortLabels]}`
      : undefined,
  });
  // Filters tucked behind the "More filters" control.
  const tuckedCount = chips.filter(
    ({ name }) => name !== "q" && name !== "province",
  ).length;

  return (
    <main className="min-h-screen bg-[var(--ink)] text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-3">
          <SavedBusinessesLink />
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

      <div className="mx-auto w-full max-w-7xl px-5 pt-6 sm:px-8 lg:px-10">
        <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
          Browse businesses
        </h1>
      </div>

      <form
        action="/businesses"
        className="sticky top-0 z-30 mt-5 border-y border-white/8 bg-[var(--ink)]/95 backdrop-blur"
        method="get"
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-3 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="directory-search">
              What are you looking for?
            </label>
            <input
              className={`${field} sm:flex-1`}
              defaultValue={filters.q}
              id="directory-search"
              maxLength={100}
              name="q"
              placeholder="Search for a business, service, or product"
              type="search"
            />
            <label className="sr-only" htmlFor="directory-province">
              Province
            </label>
            <select
              className={`${field} sm:w-52`}
              defaultValue={filters.province ?? ""}
              id="directory-province"
              name="province"
            >
              <option value="">All of Zambia</option>
              {provinces.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="button button-primary" type="submit">
              Search
            </button>
          </div>

          <details className="group mt-2">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm text-white/70 transition hover:border-white/25 hover:text-white">
              More filters
              {tuckedCount ? (
                <span className="rounded-full bg-[var(--lime)] px-2 text-xs font-bold text-[var(--ink)]">
                  {tuckedCount}
                </span>
              ) : null}
              <span
                aria-hidden
                className="text-white/50 transition group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <div className="mt-3 grid gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs text-white/60">
                Category
                <select
                  className={`${field} mt-1.5`}
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
              <label className="text-xs text-white/60">
                District
                <select
                  className={`${field} mt-1.5`}
                  defaultValue={filters.district ?? ""}
                  name="district"
                >
                  <option value="">All districts</option>
                  {provinces.map((item) => (
                    <optgroup key={item.id} label={item.name}>
                      {item.districts.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="text-xs text-white/60">
                How can they serve you?
                <select
                  className={`${field} mt-1.5`}
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
              <label className="text-xs text-white/60">
                Order by
                <select
                  className={`${field} mt-1.5`}
                  defaultValue={filters.sort ?? ""}
                  name="sort"
                >
                  {Object.entries(sortLabels).map(([value, label]) => (
                    <option
                      key={value}
                      value={value === "recently_confirmed" ? "" : value}
                    >
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2 lg:col-span-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
                  <input
                    className="h-4 w-4 accent-[var(--lime)]"
                    defaultChecked={filters.open === "1"}
                    name="open"
                    type="checkbox"
                    value="1"
                  />
                  Open now
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-white/75">
                  <input
                    className="h-4 w-4 accent-[var(--lime)]"
                    defaultChecked={filters.available === "1"}
                    name="available"
                    type="checkbox"
                    value="1"
                  />
                  Available now
                </label>
                <button
                  className="button button-secondary sm:ml-auto"
                  type="submit"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </details>
        </div>
      </form>

      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-5 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          {directory ? (
            <p className="text-sm text-white/65" role="status">
              <span className="font-semibold text-white">
                {directory.total.toLocaleString("en-ZM")}
              </span>{" "}
              {directory.total === 1 ? "business" : "businesses"}
              {place ? ` in ${place}` : ""}
            </p>
          ) : null}
          {chips.length ? (
            <ul aria-label="Active filters" className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.name}>
                  <Link
                    aria-label={`Remove filter: ${chip.label}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:border-white/30 hover:text-white"
                    href={chip.href}
                  >
                    {chip.label}
                    <span aria-hidden className="text-white/50">
                      ✕
                    </span>
                  </Link>
                </li>
              ))}
              {chips.length > 1 ? (
                <li>
                  <Link
                    className="inline-flex px-2 py-1.5 text-xs text-[var(--lime)] hover:underline"
                    href="/businesses"
                  >
                    Clear all
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>

        {errorMessage ? (
          <div
            className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage} Make sure the Zed360 API is running, then refresh.
          </div>
        ) : null}

        {directory?.businesses.length ? (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {directory.businesses.map((business) => (
              <BusinessRow business={business} key={business.id} />
            ))}
          </ul>
        ) : null}

        <ComparisonTray />

        {directory && directory.businesses.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <h2 className="text-xl font-semibold">No exact matches yet.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/50">
              Try removing a filter, or post a request so relevant businesses
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
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
          >
            {directory.page > 1 ? (
              <Link
                className="button button-quiet"
                href={directoryHref(filters, directory.page - 1)}
                rel="prev"
              >
                ← Previous
              </Link>
            ) : null}
            {pageNumbers(directory.page, directory.totalPages).map(
              (page, index) =>
                page === "gap" ? (
                  <span
                    aria-hidden
                    className="px-1 text-white/50"
                    key={`gap-${index}`}
                  >
                    …
                  </span>
                ) : (
                  <Link
                    aria-current={page === directory.page ? "page" : undefined}
                    aria-label={`Page ${page}`}
                    className={`grid h-10 min-w-10 place-items-center rounded-full border px-3 text-sm transition ${page === directory.page ? "border-[var(--lime)] bg-[var(--lime)] font-semibold text-[var(--ink)]" : "border-white/12 text-white/70 hover:border-white/30 hover:text-white"}`}
                    href={directoryHref(filters, page)}
                    key={page}
                  >
                    {page}
                  </Link>
                ),
            )}
            {directory.page < directory.totalPages ? (
              <Link
                className="button button-quiet"
                href={directoryHref(filters, directory.page + 1)}
                rel="next"
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
