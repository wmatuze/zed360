import type { PublicBusinessDirectory, ReferenceData } from "@zed360/contracts";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import {
  fetchPublicBusinessDirectory,
  fetchPublicReferenceData,
} from "@/lib/public-businesses";

const steps = [
  ["01", "Search or tell us what you need", "Browse directly, or post one request with the details that matter."],
  ["02", "Find businesses that fit", "Narrow your options by service, location, and how they can serve you."],
  ["03", "Choose with confidence", "Compare current information, trust signals, and availability."],
];

const footerColumns = [
  { title: "Explore", links: [["Browse businesses", "/businesses"], ["Post a request", "/request"], ["Categories", "#categories"]] },
  { title: "For business", links: [["List your business", "/for-business"], ["Business sign in", "/business/sign-in"], ["Manage your account", "/business/account"]] },
];

const availabilityLabels = {
  available: "Available now",
  busy: "Currently busy",
  temporarily_unavailable: "Temporarily unavailable",
} as const;

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

async function homepageData(): Promise<{
  directory: PublicBusinessDirectory | null;
  referenceData: ReferenceData | null;
}> {
  const [directoryResult, referenceResult] = await Promise.allSettled([
    fetchPublicBusinessDirectory({}),
    fetchPublicReferenceData(),
  ]);
  return {
    directory: directoryResult.status === "fulfilled" ? directoryResult.value : null,
    referenceData: referenceResult.status === "fulfilled" ? referenceResult.value : null,
  };
}

export default async function Home() {
  const { directory, referenceData } = await homepageData();
  const categories = referenceData?.categories.slice(0, 8) ?? [];
  const businesses = directory?.businesses.slice(0, 6) ?? [];

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ink)] text-white">
      <div className="hero-grid">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link aria-label="Zed360 home" className="flex items-center gap-3" href="/"><BrandLogo /></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <Link className="transition hover:text-white" href="/businesses">Browse businesses</Link>
            <a className="transition hover:text-white" href="#categories">Categories</a>
            <a className="transition hover:text-white" href="#how-it-works">How it works</a>
            <Link className="transition hover:text-white" href="/for-business">For business</Link>
          </nav>
          <Link className="button button-quiet" href="/request">Post a request</Link>
        </header>

        <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pb-28 lg:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow justify-center"><span /> Built for Zambia</p>
            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl lg:text-[5.8rem]">
              Find the right business.<span className="mt-2 block text-[var(--lime)]">Faster.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl">
              Search trusted Zambian businesses by what you need and where you need it—or send one request to businesses ready to help.
            </p>
          </div>

          <form action="/businesses" className="home-search mx-auto mt-10 max-w-5xl" method="get">
            <label className="home-search-field home-search-query">
              <span>What are you looking for?</span>
              <input maxLength={100} name="q" placeholder="Solar installation, catering, accounting..." />
            </label>
            <label className="home-search-field">
              <span>Where?</span>
              <select defaultValue="" name="province">
                <option value="">All Zambia</option>
                {referenceData?.provinces.map((province) => (
                  <option key={province.id} value={province.slug}>{province.name}</option>
                ))}
              </select>
            </label>
            <button className="button button-primary home-search-button" type="submit">Search businesses <span aria-hidden="true">→</span></button>
          </form>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm text-white/45 sm:flex-row">
            <span>Not sure who to search for?</span>
            <Link className="font-semibold text-[var(--lime)] hover:underline" href="/request">Tell us what you need instead →</Link>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-3 text-sm text-white/50 sm:grid-cols-3">
            <div className="home-trust-point"><b>✓</b> Approved public profiles</div>
            <div className="home-trust-point"><b>✓</b> Direct business contact</div>
            <div className="home-trust-point"><b>✓</b> Zambia-wide discovery</div>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28" id="categories">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow"><span /> Explore by category</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">A useful place to start.</h2>
          </div>
          <Link className="text-sm font-semibold text-[var(--lime)] hover:underline" href="/businesses">Browse the full directory →</Link>
        </div>
        {categories.length ? (
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link className="category-card" href={`/businesses?category=${encodeURIComponent(category.slug)}`} key={category.id}>
                <span>{initials(category.name)}</span>
                <div><h3>{category.name}</h3><p>{category.children.length ? `${category.children.length} areas to explore` : "Explore businesses"}</p></div>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home-empty-state mt-10"><p>Categories could not be loaded right now.</p><Link href="/businesses">Browse all businesses →</Link></div>
        )}
      </section>

      <section className="border-y border-white/8 bg-white/[0.025]">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow"><span /> Fresh and trusted</p>
              <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Businesses worth discovering.</h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/45">Approved profiles with recently confirmed information appear first, so you can start with businesses keeping their details current.</p>
            </div>
            <Link className="text-sm font-semibold text-[var(--lime)] hover:underline" href="/businesses">View all businesses →</Link>
          </div>
          {businesses.length ? (
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((business) => {
                const location = business.primaryLocation?.district;
                const verified = business.trust.contactVerified || business.trust.registrationVerified;
                return (
                  <Link className="home-business-card group" href={`/businesses/${business.slug}`} key={business.id}>
                    <div className="relative aspect-[16/8] overflow-hidden bg-white/5">
                      {business.coverUrl ? (
                        <Image alt="" className="object-cover transition duration-300 group-hover:scale-[1.03]" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" src={business.coverUrl} unoptimized />
                      ) : <div className="home-card-pattern" />}
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#11151d] to-transparent" />
                      <span className="home-business-logo">
                        {business.logoUrl ? <Image alt={`${business.name} logo`} className="object-cover" fill sizes="52px" src={business.logoUrl} unoptimized /> : initials(business.name)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5 pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xl font-semibold tracking-[-0.03em] group-hover:text-[var(--lime)]">{business.name}</h3>
                        {verified ? <span className="verified-pill">Verified</span> : null}
                      </div>
                      <p className="mt-2 text-sm text-white/42">{location ? `${location.name}, ${location.provinceName}` : "Serving customers in Zambia"}</p>
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/55">{business.description || business.serviceNames.slice(0, 3).join(" · ") || "View this business profile and its available services."}</p>
                      <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs">
                        <span className={business.availabilityFreshness === "current" && business.availability === "available" ? "text-[var(--lime)]" : "text-white/35"}>
                          {business.availabilityFreshness === "current" ? availabilityLabels[business.availability] : "View current details"}
                        </span>
                        <b className="text-white/28 group-hover:text-[var(--lime)]">View profile →</b>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="home-empty-state mt-10"><p>Business profiles could not be loaded right now.</p><Link href="/businesses">Open the business directory →</Link></div>
          )}
        </div>
      </section>

      <section className="border-b border-white/8" id="how-it-works">
        <div className="mx-auto grid max-w-7xl gap-px px-5 py-2 sm:px-8 lg:grid-cols-3 lg:px-10">
          {steps.map(([number, title, body]) => <article className="step-card" key={number}><span>{number}</span><h2>{title}</h2><p>{body}</p></article>)}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28" id="for-business">
        <div className="business-banner">
          <div>
            <p className="eyebrow eyebrow-dark"><span /> For business owners</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Be found for what you do best.</h2>
            <p className="mt-5 max-w-xl leading-7 text-[var(--ink)]/65">Publish a trustworthy profile, keep customers informed, and receive relevant enquiries when you are ready to help.</p>
          </div>
          <Link className="button button-dark" href="/for-business">List your business <span>→</span></Link>
        </div>
      </section>

      <footer className="border-t border-white/8 px-5 py-12 text-sm sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div><BrandLogo /><p className="mt-5 max-w-sm leading-6 text-white/40">Helping people across Zambia discover, compare, and connect with businesses they can trust.</p></div>
          {footerColumns.map((column) => (
            <div key={column.title}><h2 className="font-semibold text-white/80">{column.title}</h2><ul className="mt-4 space-y-3 text-white/40">
              {column.links.map(([label, href]) => <li key={label}><Link className="transition hover:text-white" href={href}>{label}</Link></li>)}
            </ul></div>
          ))}
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col justify-between gap-3 border-t border-white/8 pt-6 text-xs text-white/28 sm:flex-row">
          <span>© 2026 Zed360. Built for Zambia.</span><span>Discovery · Connection · Trust</span>
        </div>
      </footer>
    </main>
  );
}
