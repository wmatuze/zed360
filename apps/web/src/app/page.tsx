import type { PublicBusinessDirectory, ReferenceData } from "@zed360/contracts";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CategoryIcon } from "@/components/category-icon";
import { HomeDiscover, type DiscoverTab } from "@/components/home-discover";
import { HomeFeaturedCard } from "@/components/home-featured-card";
import { meritSections, sectionBusinesses } from "@/lib/merit-sections";
import {
  fetchPublicBusinessDirectory,
  fetchPublicReferenceData,
} from "@/lib/public-businesses";

const steps = [
  {
    title: "Search or tell us what you need",
    body: "Browse directly, or post one request with the details that matter.",
  },
  {
    title: "Find businesses that fit",
    body: "Narrow your options by service, location, and how they can serve you.",
  },
  {
    title: "Choose with confidence",
    body: "Compare current information, trust signals, and availability.",
  },
];

const footerColumns = [
  {
    title: "Explore",
    links: [
      ["Browse businesses", "/businesses"],
      ["Post a request", "/request"],
      ["Categories", "#categories"],
    ],
  },
  {
    title: "For business",
    links: [
      ["List your business", "/for-business"],
      ["Business sign in", "/business/sign-in"],
      ["Manage your account", "/business/account"],
    ],
  },
];

async function homepageData(): Promise<{
  directory: PublicBusinessDirectory | null;
  referenceData: ReferenceData | null;
  discover: DiscoverTab[];
}> {
  const [directoryResult, referenceResult, ...meritResults] =
    await Promise.allSettled([
      fetchPublicBusinessDirectory({}),
      fetchPublicReferenceData(),
      ...meritSections.map(({ sort }) =>
        fetchPublicBusinessDirectory({ sort }),
      ),
    ]);
  return {
    directory:
      directoryResult.status === "fulfilled" ? directoryResult.value : null,
    referenceData:
      referenceResult.status === "fulfilled" ? referenceResult.value : null,
    // A list that fails to load, or has nothing to show, gets no tab.
    discover: meritSections
      .map((section, index) => {
        const result = meritResults[index];
        const businesses =
          result?.status === "fulfilled" ? result.value.businesses : [];
        return {
          sort: section.sort,
          title: section.title,
          rule: section.rule,
          businesses: sectionBusinesses(section, businesses).map(
            ({ business, reason }) => {
              const district = business.primaryLocation?.district;
              return {
                slug: business.slug,
                name: business.name,
                logoUrl: business.logoUrl,
                place: district
                  ? `${district.name}, ${district.provinceName}`
                  : "Serving customers in Zambia",
                reason,
              };
            },
          ),
        };
      })
      .filter(({ businesses }) => businesses.length > 0),
  };
}

export default async function Home() {
  const { directory, referenceData, discover } = await homepageData();
  const categories = referenceData?.categories.slice(0, 8) ?? [];
  const featured = directory?.businesses.slice(0, 4) ?? [];

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ink)] text-white">
      <div className="hero-grid">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link
            aria-label="Zed360 home"
            className="flex items-center gap-3"
            href="/"
          >
            <BrandLogo />
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-8 text-sm text-white/65 md:flex"
          >
            <Link className="transition hover:text-white" href="/businesses">
              Browse businesses
            </Link>
            <a className="transition hover:text-white" href="#categories">
              Categories
            </a>
            <a className="transition hover:text-white" href="#how-it-works">
              How it works
            </a>
            <Link className="transition hover:text-white" href="/for-business">
              For business
            </Link>
          </nav>
          <Link className="button button-quiet" href="/request">
            Post a request
          </Link>
        </header>

        <section className="mx-auto w-full max-w-7xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:px-10 lg:pb-24 lg:pt-24">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow justify-center">
              <span /> Built for Zambia
            </p>
            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl lg:text-[5.8rem]">
              Find the right business.
              <span className="mt-2 block text-[var(--lime)]">Faster.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl">
              Search trusted Zambian businesses by what you need and where you
              need it—or send one request to businesses ready to help.
            </p>
          </div>

          <form
            action="/businesses"
            className="home-search mx-auto mt-10 max-w-5xl"
            method="get"
          >
            <label className="home-search-field home-search-query">
              <span>What are you looking for?</span>
              <input
                maxLength={100}
                name="q"
                placeholder="Solar installation, catering, accounting..."
              />
            </label>
            <label className="home-search-field">
              <span>Where?</span>
              <select defaultValue="" name="province">
                <option value="">All Zambia</option>
                {referenceData?.provinces.map((province) => (
                  <option key={province.id} value={province.slug}>
                    {province.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button button-primary home-search-button"
              type="submit"
            >
              Search businesses <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm text-white/50 sm:flex-row">
            <span>Not sure who to search for?</span>
            <Link
              className="font-semibold text-[var(--lime)] hover:underline"
              href="/request"
            >
              Tell us what you need instead →
            </Link>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-3 text-sm text-white/50 sm:grid-cols-3">
            <div className="home-trust-point">
              <b>✓</b> Approved public profiles
            </div>
            <div className="home-trust-point">
              <b>✓</b> Direct business contact
            </div>
            <div className="home-trust-point">
              <b>✓</b> Zambia-wide discovery
            </div>
          </div>
        </section>
      </div>

      <section
        className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
        id="categories"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">
              <span /> Explore by category
            </p>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              A useful place to start.
            </h2>
          </div>
          <Link
            className="text-sm font-semibold text-[var(--lime)] hover:underline"
            href="/businesses"
          >
            Browse the full directory →
          </Link>
        </div>
        {categories.length ? (
          <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  className="group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--lime)]/40 hover:bg-white/[0.06] sm:flex-row sm:items-center"
                  href={`/businesses?category=${encodeURIComponent(category.slug)}`}
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--lime)]/10 text-[var(--lime)] transition group-hover:bg-[var(--lime)] group-hover:text-[var(--ink)]">
                    <CategoryIcon className="h-6 w-6" slug={category.slug} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug">
                      {category.name}
                    </span>
                    <span className="mt-1 block text-sm text-white/50">
                      {category.children.length
                        ? `${category.children.length} ${category.children.length === 1 ? "area" : "areas"} to explore`
                        : "Explore businesses"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="home-empty-state mt-10">
            <p>Categories could not be loaded right now.</p>
            <Link href="/businesses">Browse all businesses →</Link>
          </div>
        )}
      </section>

      <section className="border-y border-white/8 bg-white/[0.025]">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">
                <span /> Fresh and trusted
              </p>
              <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
                Businesses worth discovering.
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-white/55">
                Approved businesses that keep their details current.
              </p>
            </div>
            <Link
              className="text-sm font-semibold text-[var(--lime)] hover:underline"
              href="/businesses"
            >
              View all businesses →
            </Link>
          </div>
          {featured.length ? (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featured.map((business) => (
                <HomeFeaturedCard business={business} key={business.id} />
              ))}
            </ul>
          ) : (
            <div className="home-empty-state mt-10">
              <p>Business profiles could not be loaded right now.</p>
              <Link href="/businesses">Open the business directory →</Link>
            </div>
          )}
        </div>
      </section>

      <HomeDiscover tabs={discover} />

      <section
        className="border-y border-white/8 bg-white/[0.025]"
        id="how-it-works"
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <p className="eyebrow">
            <span /> How it works
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Three steps to the right business.
          </h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                className="rounded-3xl border border-white/10 bg-[var(--ink)] p-7"
                key={step.title}
              >
                <span
                  aria-hidden
                  className="grid h-12 w-12 place-items-center rounded-full bg-[var(--lime)] text-lg font-bold text-[var(--ink)]"
                >
                  {index + 1}
                </span>
                <h3 className="mt-6 text-xl font-semibold tracking-[-0.02em]">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-white/55">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24"
        id="for-business"
      >
        <div className="business-banner">
          <div>
            <p className="eyebrow eyebrow-dark">
              <span /> For business owners
            </p>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Be found for what you do best.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-[var(--ink)]/65">
              Publish a trustworthy profile, keep customers informed, and
              receive relevant enquiries when you are ready to help.
            </p>
          </div>
          <Link className="button button-dark" href="/for-business">
            List your business <span>→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/8 px-5 py-12 text-sm sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandLogo />
            <p className="mt-5 max-w-sm leading-6 text-white/50">
              Helping people across Zambia discover, compare, and connect with
              businesses they can trust.
            </p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="font-semibold text-white/80">{column.title}</h2>
              <ul className="mt-4 space-y-3 text-white/50">
                {column.links.map(([label, href]) => (
                  <li key={label}>
                    <Link className="transition hover:text-white" href={href}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col justify-between gap-3 border-t border-white/8 pt-6 text-xs text-white/50 sm:flex-row">
          <span>© 2026 Zed360. Built for Zambia.</span>
          <span>Discovery · Connection · Trust</span>
        </div>
      </footer>
    </main>
  );
}
