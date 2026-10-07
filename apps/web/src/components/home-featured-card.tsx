import type { PublicBusinessDirectory } from "@zed360/contracts";
import Image from "next/image";
import Link from "next/link";
import { verificationLabel } from "@/lib/merit-sections";

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
 * The homepage showcase card. Unlike the compact directory card it leads with
 * the business's own cover photo, because the homepage is the shop window and
 * shows only a handful of businesses.
 */
export function HomeFeaturedCard({ business }: { business: Business }) {
  const district = business.primaryLocation?.district;
  const verification = verificationLabel(business.trust);
  const { averageRating, reviewCount } = business.reviewSummary;
  const what = business.categories[0]?.name ?? business.serviceNames[0] ?? null;

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#11151d] transition duration-200 hover:-translate-y-1 hover:border-[var(--lime)]/35">
      <div className="relative aspect-[16/9] overflow-hidden bg-white/5">
        {business.coverUrl ? (
          <Image
            alt=""
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            src={business.coverUrl}
            unoptimized
          />
        ) : (
          <div className="home-card-pattern grid place-items-center">
            <span className="text-5xl font-semibold tracking-[-0.05em] text-white/15">
              {initials(business.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#11151d] to-transparent" />
        {verification ? (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--ink)]/85 px-2.5 py-1 text-[.7rem] font-semibold text-[var(--lime)] backdrop-blur">
            ✓ {verification}
          </span>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col px-5 pb-5">
        <span className="relative -mt-7 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border-4 border-[#11151d] bg-[var(--lime)] text-sm font-extrabold text-[var(--ink)]">
          {business.logoUrl ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="56px"
              src={business.logoUrl}
              unoptimized
            />
          ) : (
            initials(business.name)
          )}
        </span>
        <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.02em]">
          <Link
            className="outline-none transition after:absolute after:inset-0 after:rounded-3xl group-hover:text-[var(--lime)] focus-visible:after:ring-2 focus-visible:after:ring-[var(--lime)]"
            href={`/businesses/${business.slug}`}
          >
            {business.name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-sm text-white/55">
          {[what, district?.name ?? "Zambia"].filter(Boolean).join(" · ")}
        </p>
        {business.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/55">
            {business.description}
          </p>
        ) : null}
        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-sm text-white/60">
          {reviewCount > 0 && averageRating !== null ? (
            <span className="whitespace-nowrap">
              <span aria-hidden className="text-amber-200">
                ★
              </span>{" "}
              <span className="font-semibold text-white">{averageRating}</span>{" "}
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
          {business.availabilityFreshness === "current" &&
          business.availability === "available" ? (
            <span className="whitespace-nowrap text-white/75">Available</span>
          ) : null}
          <span
            aria-hidden
            className="ml-auto font-semibold text-white/50 transition group-hover:text-[var(--lime)]"
          >
            →
          </span>
        </p>
      </div>
    </li>
  );
}
