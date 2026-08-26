import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ShareComparisonButton } from "@/components/business-comparison-controls";
import {
  fetchPublicBusinessComparison,
  PublicBusinessApiError,
} from "@/lib/public-businesses";

export const metadata: Metadata = {
  title: "Compare businesses",
  description: "Compare approved Zambian businesses side by side.",
};
export const dynamic = "force-dynamic";

const availabilityLabels = {
  available: "Available",
  busy: "Busy — response may take longer",
  temporarily_unavailable: "Temporarily unavailable",
} as const;

const fulfillmentLabels = {
  at_business: "Visit business",
  customer_pickup: "Customer pickup",
  business_travel: "Travels to customers",
  delivery: "Delivery",
  remote: "Remote or online",
} as const;

const cleanSlugs = (value?: string) =>
  [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((slug) => slug.trim())
        .filter((slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)),
    ),
  ].slice(0, 3);

function servicePrice(minimum: number | null, maximum: number | null) {
  const money = (value: number) =>
    new Intl.NumberFormat("en-ZM", {
      style: "currency",
      currency: "ZMW",
      maximumFractionDigits: 2,
    }).format(value);
  if (minimum !== null && maximum !== null && minimum === maximum)
    return money(minimum);
  if (minimum !== null && maximum !== null)
    return `${money(minimum)} – ${money(maximum)}`;
  if (minimum !== null) return `From ${money(minimum)}`;
  if (maximum !== null) return `Up to ${money(maximum)}`;
  return "Contact for price";
}

export default async function CompareBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ slugs?: string }>;
}) {
  const slugs = cleanSlugs((await searchParams).slugs);
  let comparison = null;
  let errorMessage = "";
  if (slugs.length >= 2) {
    try {
      comparison = await fetchPublicBusinessComparison(slugs);
    } catch (error) {
      errorMessage =
        error instanceof PublicBusinessApiError
          ? error.message
          : "The selected businesses could not be compared.";
    }
  }
  const businesses = comparison?.businesses ?? [];
  const columns = {
    gridTemplateColumns: `repeat(${Math.max(businesses.length, 1)}, minmax(16rem, 1fr))`,
  };

  return (
    <main className="min-h-screen bg-[var(--ink)] text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link href="/">
          <BrandLogo />
        </Link>
        <Link className="button button-quiet" href="/businesses">
          ← Browse businesses
        </Link>
      </header>
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-12 sm:px-8 lg:px-10">
        <p className="eyebrow">
          <span /> Make an informed choice
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-.055em] sm:text-6xl">
              Compare businesses.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/50">
              Review owner-provided capabilities and specific Zed360 trust
              signals. The final decision remains yours.
            </p>
          </div>
          {businesses.length ? <ShareComparisonButton /> : null}
        </div>

        {slugs.length < 2 ? (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/[.035] p-8">
            <h2 className="text-xl font-semibold">
              Choose at least two businesses.
            </h2>
            <p className="mt-3 text-sm text-white/48">
              Return to Browse businesses and use the Compare buttons on up to
              three profiles.
            </p>
            <Link className="button button-primary mt-6" href="/businesses">
              Choose businesses →
            </Link>
          </div>
        ) : null}
        {errorMessage ? (
          <p className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : null}

        {businesses.length ? (
          <div className="mt-10 overflow-x-auto pb-4">
            <div className="grid min-w-max gap-4" style={columns}>
              {businesses.map((business) => (
                <article
                  className="w-full rounded-3xl border border-white/10 bg-white/[.035] p-6"
                  key={business.id}
                >
                  <div className="flex items-center gap-4">
                    {business.logoUrl ? (
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/8">
                        <Image
                          alt={`${business.name} logo`}
                          fill
                          sizes="56px"
                          src={business.logoUrl}
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--lime)] text-xl font-bold text-[var(--ink)]">
                        {business.name[0]?.toUpperCase()}
                      </span>
                    )}
                    <div>
                      <h2 className="text-xl font-semibold">{business.name}</h2>
                      <Link
                        className="text-xs text-[var(--lime)] hover:underline"
                        href={`/businesses/${business.slug}`}
                      >
                        View full profile →
                      </Link>
                    </div>
                  </div>
                  <p className="mt-5 line-clamp-4 text-sm leading-6 text-white/48">
                    {business.description ?? "No business description added."}
                  </p>
                </article>
              ))}
            </div>

            <ComparisonSection columns={columns} title="Availability">
              {businesses.map((business) => (
                <Cell key={business.id}>
                  <strong>
                    {business.availabilityFreshness === "current"
                      ? availabilityLabels[business.availability]
                      : "Not recently confirmed"}
                  </strong>
                  {business.availabilityNote ? (
                    <span>{business.availabilityNote}</span>
                  ) : null}
                </Cell>
              ))}
            </ComparisonSection>
            <ComparisonSection columns={columns} title="Trust and reviews">
              {businesses.map((business) => (
                <Cell key={business.id}>
                  <span>
                    {business.trust.contactVerified
                      ? "✓ Contact verified"
                      : "Contact not yet verified"}
                  </span>
                  <span>
                    {business.trust.registrationVerified
                      ? "✓ Registration verified"
                      : "Registration not yet verified"}
                  </span>
                  <span>
                    {business.reviewSummary.reviewCount
                      ? `★ ${business.reviewSummary.averageRating} from ${business.reviewSummary.reviewCount} verified review${business.reviewSummary.reviewCount === 1 ? "" : "s"}`
                      : "No verified reviews yet"}
                  </span>
                </Cell>
              ))}
            </ComparisonSection>
            <ComparisonSection columns={columns} title="Locations and hours">
              {businesses.map((business) => (
                <Cell key={business.id}>
                  {business.locations.length ? (
                    business.locations.map((location) => (
                      <span key={location.id}>
                        <strong>{location.name}</strong>
                        {location.district
                          ? ` — ${location.district.name}`
                          : ""}
                        <br />
                        {location.operatingHours.currentLabel} ·{" "}
                        {location.operatingHours.todayLabel}
                      </span>
                    ))
                  ) : (
                    <span>No public locations</span>
                  )}
                </Cell>
              ))}
            </ComparisonSection>
            <ComparisonSection columns={columns} title="Services">
              {businesses.map((business) => (
                <Cell key={business.id}>
                  {business.services.length ? (
                    business.services.map((service) => (
                      <span key={service.id}>
                        <strong>{service.name}</strong>
                        <br />
                        <small className="text-white/38">
                          {service.category.name} ·{" "}
                          {servicePrice(service.priceFrom, service.priceTo)}
                        </small>
                      </span>
                    ))
                  ) : (
                    <span>No services published</span>
                  )}
                </Cell>
              ))}
            </ComparisonSection>
            <ComparisonSection
              columns={columns}
              title="How they serve customers"
            >
              {businesses.map((business) => {
                const modes = [
                  ...new Set(
                    business.services.flatMap((service) =>
                      service.fulfillment.map(({ mode }) => mode),
                    ),
                  ),
                ];
                return (
                  <Cell key={business.id}>
                    {modes.length ? (
                      modes.map((mode) => (
                        <span key={mode}>✓ {fulfillmentLabels[mode]}</span>
                      ))
                    ) : (
                      <span>Not specified</span>
                    )}
                  </Cell>
                );
              })}
            </ComparisonSection>
            <ComparisonSection columns={columns} title="Products displayed">
              {businesses.map((business) => (
                <Cell key={business.id}>
                  {business.products.length ? (
                    business.products
                      .slice(0, 6)
                      .map((product) => (
                        <span key={product.id}>{product.name}</span>
                      ))
                  ) : (
                    <span>No products displayed</span>
                  )}
                </Cell>
              ))}
            </ComparisonSection>
            <ComparisonSection columns={columns} title="Contact">
              {businesses.map((business) => (
                <Cell key={business.id}>
                  {business.whatsapp ? (
                    <a
                      className="text-[var(--lime)] hover:underline"
                      href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`}
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  {business.phone ? (
                    <a
                      className="text-[var(--lime)] hover:underline"
                      href={`tel:${business.phone}`}
                    >
                      Call {business.phone}
                    </a>
                  ) : null}
                  {business.email ? (
                    <a
                      className="text-[var(--lime)] hover:underline"
                      href={`mailto:${business.email}`}
                    >
                      Email
                    </a>
                  ) : null}
                  {!business.whatsapp && !business.phone && !business.email ? (
                    <span>No public contact details</span>
                  ) : null}
                </Cell>
              ))}
            </ComparisonSection>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ComparisonSection({
  title,
  columns,
  children,
}: {
  title: string;
  columns: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 min-w-max">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[.14em] text-[var(--lime)]">
        {title}
      </h2>
      <div className="grid gap-4" style={columns}>
        {children}
      </div>
    </section>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-24 w-full flex-col gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-5 text-sm leading-6 text-white/58">
      {children}
    </div>
  );
}
