import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchPublicBusinessProfile,
  PublicBusinessApiError,
} from "@/lib/public-businesses";

const fulfillmentLabels = {
  at_business: "Customers visit this business",
  customer_pickup: "Customer pickup",
  business_travel: "Business travels to customers",
  delivery: "Delivery",
  remote: "Remote or online",
} as const;

const scopeLabels = {
  business_location: "At the business location",
  selected_districts: "Selected districts",
  selected_provinces: "Selected provinces",
  nationwide: "Available nationwide",
  remote: "Available remotely",
} as const;

type ProfilePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const business = await fetchPublicBusinessProfile(slug);
    return {
      title: business.name,
      description:
        business.description ??
        `View ${business.name}'s services and coverage on Zed360.`,
    };
  } catch {
    return { title: "Business profile" };
  }
}

function moneyRange(minimum: number | null, maximum: number | null) {
  const money = (value: number) =>
    new Intl.NumberFormat("en-ZM", {
      style: "currency",
      currency: "ZMW",
      maximumFractionDigits: 0,
    }).format(value);
  if (minimum !== null && maximum !== null)
    return `${money(minimum)} – ${money(maximum)}`;
  if (minimum !== null) return `From ${money(minimum)}`;
  if (maximum !== null) return `Up to ${money(maximum)}`;
  return null;
}

function whatsappHref(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function websiteHref(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function BusinessProfilePage({
  params,
}: ProfilePageProps) {
  const { slug } = await params;
  let business;
  try {
    business = await fetchPublicBusinessProfile(slug);
  } catch (error) {
    if (error instanceof PublicBusinessApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const primaryLocation =
    business.locations.find((location) => location.isPrimary) ??
    business.locations[0];
  const whatsapp = business.whatsapp ? whatsappHref(business.whatsapp) : null;
  const website = business.website ? websiteHref(business.website) : null;

  return (
    <main className="min-h-screen bg-[var(--ink)] text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <span className="brand-mark" aria-hidden="true">
            Z
          </span>
          <span className="text-xl font-semibold tracking-[-0.04em]">
            Zed360
          </span>
        </Link>
        <Link
          className="text-sm text-white/55 transition hover:text-white"
          href="/businesses"
        >
          ← Browse businesses
        </Link>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-10 sm:px-8 lg:px-10 lg:pt-16">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 sm:p-10">
          {business.coverUrl ? (
            <Image
              alt=""
              className="object-cover opacity-20"
              fill
              priority
              sizes="100vw"
              src={business.coverUrl}
              unoptimized
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/85 to-transparent" />
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--lime)]/8 blur-3xl" />
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start">
            {business.logoUrl ? (
              <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-white/8 shadow-[0_18px_50px_rgba(184,242,56,.15)]">
                <Image
                  alt={`${business.name} logo`}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={business.logoUrl}
                  unoptimized
                />
              </span>
            ) : (
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-[var(--lime)] text-3xl font-bold text-[var(--ink)] shadow-[0_18px_50px_rgba(184,242,56,.15)]">
                {business.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--lime)]/25 bg-[var(--lime)]/8 px-3 py-1 text-xs text-[var(--lime)]">
                  Zed360 approved
                </span>
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
              <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">
                {business.name}
              </h1>
              <p className="mt-4 max-w-3xl leading-7 text-white/55">
                {business.description ||
                  "Explore this business's services and current service coverage."}
              </p>
              {primaryLocation?.district ? (
                <p className="mt-4 text-sm text-white/38">
                  Based in {primaryLocation.district.name},{" "}
                  {primaryLocation.district.provinceName}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">
                  <span /> What they provide
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  Services and coverage
                </h2>
              </div>
              <span className="text-sm text-white/35">
                {business.services.length}{" "}
                {business.services.length === 1 ? "service" : "services"}
              </span>
            </div>

            {business.services.length ? (
              <div className="mt-6 space-y-4">
                {business.services.map((service) => {
                  const price = moneyRange(service.priceFrom, service.priceTo);
                  return (
                    <article
                      className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"
                      key={service.id}
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lime)]">
                            {service.category.name}
                          </span>
                          <h3 className="mt-2 text-xl font-semibold">
                            {service.name}
                          </h3>
                        </div>
                        {price ? (
                          <span className="text-sm font-semibold text-white/70">
                            {price}
                          </span>
                        ) : null}
                      </div>
                      {service.description ? (
                        <p className="mt-3 text-sm leading-6 text-white/48">
                          {service.description}
                        </p>
                      ) : null}

                      {service.fulfillment.length ? (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {service.fulfillment.map((option) => {
                            const areaNames = [
                              ...option.districts.map((area) => area.name),
                              ...option.provinces.map((area) => area.name),
                            ];
                            const fee = moneyRange(
                              option.feeMinimum,
                              option.feeMaximum,
                            );
                            const leadTime =
                              option.leadTimeMinimumDays !== null ||
                              option.leadTimeMaximumDays !== null
                                ? `${option.leadTimeMinimumDays ?? 0}–${option.leadTimeMaximumDays ?? option.leadTimeMinimumDays} days`
                                : null;
                            return (
                              <div
                                className="rounded-2xl border border-white/8 bg-black/15 p-4"
                                key={`${service.id}-${option.mode}`}
                              >
                                <p className="text-sm font-semibold text-white/82">
                                  {fulfillmentLabels[option.mode]}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-white/42">
                                  {scopeLabels[option.coverageScope]}
                                  {areaNames.length
                                    ? `: ${areaNames.join(", ")}`
                                    : ""}
                                </p>
                                {fee || leadTime ? (
                                  <p className="mt-2 text-xs text-white/55">
                                    {[fee ? `Fee ${fee}` : null, leadTime]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                ) : null}
                                {option.notes ? (
                                  <p className="mt-2 text-xs leading-5 text-white/42">
                                    {option.notes}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-white/35">
                          Service method has not been confirmed yet.
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-sm text-white/48">
                This business has not published its services yet.
              </div>
            )}

            {business.products.length ? (
              <section className="mt-12">
                <h2 className="text-3xl font-semibold tracking-[-0.04em]">
                  Products
                </h2>
                <p className="mt-2 text-sm text-white/42">
                  Display only—contact the business directly to buy or order.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {business.products.map((product) => {
                    const image = product.media[0];
                    const price = moneyRange(
                      product.priceFrom,
                      product.priceTo,
                    );
                    return (
                      <article
                        className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"
                        key={product.id}
                      >
                        {image ? (
                          <div className="relative aspect-[4/3] bg-white/5">
                            <Image
                              alt={image.altText}
                              className="object-cover"
                              fill
                              sizes="(max-width: 640px) 100vw, 40vw"
                              src={image.url}
                              unoptimized
                            />
                          </div>
                        ) : null}
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <h3 className="font-semibold">{product.name}</h3>
                            {price ? (
                              <span className="text-sm text-[var(--lime)]">
                                {price}
                              </span>
                            ) : null}
                          </div>
                          {product.description ? (
                            <p className="mt-2 text-sm leading-6 text-white/45">
                              {product.description}
                            </p>
                          ) : null}
                          <p className="mt-4 text-xs capitalize text-white/35">
                            {product.availability.replaceAll("_", " ")}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {business.gallery.length ? (
              <section className="mt-12">
                <p className="eyebrow">
                  <span /> Business gallery
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
                  Work and photos
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {business.gallery.map((media) => (
                    <figure
                      className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"
                      key={media.id}
                    >
                      <div className="relative aspect-[4/3] bg-white/5">
                        <Image
                          alt={media.altText}
                          className="object-cover"
                          fill
                          sizes="(max-width: 640px) 100vw, 40vw"
                          src={media.url}
                          unoptimized
                        />
                      </div>
                      {media.title || media.caption ? (
                        <figcaption className="p-4">
                          {media.title ? (
                            <p className="text-sm font-semibold">
                              {media.title}
                            </p>
                          ) : null}
                          {media.caption ? (
                            <p className="mt-1 text-xs leading-5 text-white/42">
                              {media.caption}
                            </p>
                          ) : null}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
              <h2 className="text-lg font-semibold">Contact this business</h2>
              <p className="mt-2 text-sm leading-6 text-white/42">
                Contact the business directly. Zed360 does not handle payment.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {whatsapp ? (
                  <a
                    className="button button-primary"
                    href={whatsapp}
                    rel="noreferrer"
                    target="_blank"
                  >
                    WhatsApp →
                  </a>
                ) : null}
                {business.phone ? (
                  <a
                    className="button button-secondary"
                    href={`tel:${business.phone}`}
                  >
                    Call {business.phone}
                  </a>
                ) : null}
                {business.email ? (
                  <a
                    className="button button-secondary"
                    href={`mailto:${business.email}`}
                  >
                    Send email
                  </a>
                ) : null}
                {website ? (
                  <a
                    className="button button-secondary"
                    href={website}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Visit website ↗
                  </a>
                ) : null}
              </div>
              {!business.phone && !business.email && !whatsapp && !website ? (
                <p className="mt-5 text-sm text-white/42">
                  Public contact details have not been added yet.
                </p>
              ) : null}
            </div>

            {business.locations.length ? (
              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <h2 className="text-lg font-semibold">Locations</h2>
                <div className="mt-4 space-y-4">
                  {business.locations.map((location) => (
                    <div key={location.id}>
                      <p className="text-sm font-semibold text-white/78">
                        {location.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/42">
                        {[
                          location.district?.name,
                          location.district?.provinceName,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-6">
              <p className="text-sm font-semibold text-white/82">
                About this information
              </p>
              <p className="mt-2 text-xs leading-5 text-white/48">
                Services, prices, coverage, and contact details are supplied by
                the business. Verification labels only describe the specific
                checks Zed360 has completed.
              </p>
            </div>

            <Link className="button button-primary w-full" href="/request">
              Post a request instead →
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}
