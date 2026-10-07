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
 * One business as a small card, narrow enough for three or four across, so a
 * long directory can be scanned quickly and loads without cover images. The
 * card opens the profile; Save and Compare sit along the bottom, above that
 * link.
 */
export function BusinessRow({
  business,
  compare = true,
}: {
  business: Business;
  /** Hide Compare on pages that have no comparison tray. */
  compare?: boolean;
}) {
  const district = business.primaryLocation?.district;
  const place = district ? `${district.name}, ${district.provinceName}` : null;
  const verification = verificationLabel(business.trust);
  const availabilityCurrent = business.availabilityFreshness === "current";
  const { averageRating, reviewCount } = business.reviewSummary;
  const what = business.categories[0]?.name ?? business.serviceNames[0] ?? null;

  return (
    <li className="group relative flex flex-col rounded-2xl border border-white/10 bg-white/[0.035] transition hover:border-[var(--lime)]/35 hover:bg-white/[0.055]">
      <div className="flex flex-1 items-start gap-3 p-4">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--lime)] text-xs font-extrabold text-[var(--ink)]">
          {business.logoUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="44px"
              src={business.logoUrl}
              unoptimized
            />
          ) : (
            initials(business.name)
          )}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-semibold leading-snug tracking-[-0.01em]">
            <Link
              className="outline-none transition after:absolute after:inset-0 after:rounded-2xl group-hover:text-[var(--lime)] focus-visible:after:ring-2 focus-visible:after:ring-[var(--lime)]"
              href={`/businesses/${business.slug}`}
            >
              {business.name}
            </Link>
          </h2>
          <p className="mt-1 truncate text-sm text-white/55">
            {[what, district?.name ?? "Zambia"].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-white/55">
            {reviewCount > 0 && averageRating !== null ? (
              <span className="whitespace-nowrap">
                <span aria-hidden className="text-amber-200">
                  ★
                </span>{" "}
                <span className="font-semibold text-white/85">
                  {averageRating}
                </span>{" "}
                ({reviewCount}
                <span className="sr-only">
                  {reviewCount === 1 ? " verified review" : " verified reviews"}
                </span>
                )
              </span>
            ) : null}
            {business.openStatus === "open" ? (
              <span className="whitespace-nowrap font-semibold text-[var(--lime)]">
                Open now
              </span>
            ) : business.openStatus === "closed" ? (
              <span className="whitespace-nowrap">Closed now</span>
            ) : null}
            {availabilityCurrent ? (
              <span
                className={`whitespace-nowrap ${business.availability === "available" ? "text-white/75" : "text-amber-100/85"}`}
              >
                {availabilityLabels[business.availability]}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/8 px-4 py-2.5">
        {verification ? (
          <span className="min-w-0 truncate text-[.7rem] font-semibold text-[var(--lime)]">
            ✓ {verification}
          </span>
        ) : (
          <span />
        )}
        <div className="relative z-10 flex shrink-0 items-center gap-2">
          <SaveBusinessButton
            name={business.name}
            place={place}
            slug={business.slug}
            variant="row"
          />
          {compare ? (
            <CompareButton
              name={business.name}
              slug={business.slug}
              variant="row"
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}
