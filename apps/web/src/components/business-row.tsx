import type { PublicBusinessDirectory } from "@zed360/contracts";
import Image from "next/image";
import Link from "next/link";
import { CompareButton } from "@/components/business-comparison-controls";
import { SaveBusinessButton } from "@/components/saved-businesses";
import { verificationLabel } from "@/lib/merit-sections";

type Business = PublicBusinessDirectory["businesses"][number];

const availabilityLabels = {
  available: "Available",
  busy: "Busy",
  temporarily_unavailable: "Temporarily unavailable",
} as const;

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * One business as a compact row, so a long directory can be scanned quickly
 * and loads without cover images. The whole row opens the profile; Save and
 * Compare sit above that link.
 */
export function BusinessRow({ business }: { business: Business }) {
  const district = business.primaryLocation?.district;
  const place = district ? `${district.name}, ${district.provinceName}` : null;
  const verification = verificationLabel(business.trust);
  const availabilityCurrent = business.availabilityFreshness === "current";
  const { averageRating, reviewCount } = business.reviewSummary;
  const what =
    business.categories
      .slice(0, 2)
      .map(({ name }) => name)
      .join(", ") || business.serviceNames[0];

  return (
    <li className="group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[var(--lime)]/35 hover:bg-white/[0.055]">
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

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="min-w-0 truncate font-semibold tracking-[-0.01em]">
            <Link
              className="outline-none transition after:absolute after:inset-0 after:rounded-2xl group-hover:text-[var(--lime)] focus-visible:after:ring-2 focus-visible:after:ring-[var(--lime)]"
              href={`/businesses/${business.slug}`}
            >
              {business.name}
            </Link>
          </h2>
          {verification ? (
            <span className="hidden shrink-0 rounded-full border border-[var(--lime)]/25 bg-[var(--lime)]/8 px-2 py-0.5 text-[.66rem] font-semibold text-[var(--lime)] sm:inline">
              {verification}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-white/55">
          {[what, place ?? "Serving customers in Zambia"]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55">
          {reviewCount > 0 && averageRating !== null ? (
            <span>
              <span aria-hidden className="text-amber-200">
                ★
              </span>{" "}
              <span className="font-semibold text-white/85">
                {averageRating}
              </span>{" "}
              <span>
                ({reviewCount}
                <span className="sr-only">
                  {reviewCount === 1 ? " verified review" : " verified reviews"}
                </span>
                )
              </span>
            </span>
          ) : null}
          {business.openStatus === "open" ? (
            <span className="font-semibold text-[var(--lime)]">Open now</span>
          ) : business.openStatus === "closed" ? (
            <span>Closed now</span>
          ) : null}
          {availabilityCurrent ? (
            <span
              className={
                business.availability === "available"
                  ? "text-white/75"
                  : "text-amber-100/85"
              }
            >
              {availabilityLabels[business.availability]}
            </span>
          ) : null}
          {verification ? (
            <span className="text-[var(--lime)] sm:hidden">{verification}</span>
          ) : null}
        </p>
      </div>

      <div className="relative z-10 flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
        <SaveBusinessButton
          name={business.name}
          place={place}
          slug={business.slug}
          variant="row"
        />
        <CompareButton
          name={business.name}
          slug={business.slug}
          variant="row"
        />
      </div>
    </li>
  );
}
