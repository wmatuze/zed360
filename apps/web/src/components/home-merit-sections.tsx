import type { PublicBusinessDirectory } from "@zed360/contracts";
import Image from "next/image";
import Link from "next/link";
import {
  meritSections,
  sectionBusinesses,
  type MeritSection,
} from "@/lib/merit-sections";

type Business = PublicBusinessDirectory["businesses"][number];

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * Homepage sections whose order is earned or factual. Each states its rule,
 * each card states why that business is there, and a section with nothing to
 * show is left out rather than padded.
 */
export function HomeMeritSections({
  results,
}: {
  results: Partial<Record<MeritSection["sort"], Business[]>>;
}) {
  const sections = meritSections
    .map((section) => ({
      section,
      entries: sectionBusinesses(section, results[section.sort] ?? []),
    }))
    .filter(({ entries }) => entries.length > 0);
  if (!sections.length) return null;

  return (
    <section className="border-b border-white/8">
      <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
        <p className="eyebrow">
          <span /> Earned, not bought
        </p>
        <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Businesses that earned their place.
        </h2>
        <p className="mt-4 max-w-2xl leading-7 text-white/50">
          No business pays to appear here. Each list says exactly how it is
          ordered.
        </p>

        <div className="mt-12 grid gap-12">
          {sections.map(({ section, entries }) => (
            <div key={section.sort}>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-2xl font-semibold tracking-[-0.03em]">
                    {section.title}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                    {section.rule}
                  </p>
                </div>
                <Link
                  className="shrink-0 text-sm font-semibold text-[var(--lime)] hover:underline"
                  href={`/businesses?sort=${section.sort}`}
                >
                  View all →
                </Link>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {entries.map(({ business, reason }) => {
                  const location = business.primaryLocation?.district;
                  return (
                    <li key={business.id}>
                      <Link
                        className="group flex h-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[var(--lime)]/35 hover:bg-white/[0.055]"
                        href={`/businesses/${business.slug}`}
                      >
                        <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--lime)] text-xs font-extrabold text-[var(--ink)]">
                          {business.logoUrl ? (
                            <Image
                              alt=""
                              className="object-cover"
                              fill
                              sizes="48px"
                              src={business.logoUrl}
                              unoptimized
                            />
                          ) : (
                            initials(business.name)
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold transition group-hover:text-[var(--lime)]">
                            {business.name}
                          </span>
                          <span className="mt-1 block truncate text-xs text-white/50">
                            {location
                              ? `${location.name}, ${location.provinceName}`
                              : "Serving customers in Zambia"}
                          </span>
                          <span className="mt-2 block text-xs font-medium text-white/75">
                            {reason}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
