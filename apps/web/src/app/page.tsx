import type { PublicBusinessDirectory, ReferenceData } from "@zed360/contracts";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { BusinessRow } from "@/components/business-row";
import { HomeMeritSections } from "@/components/home-merit-sections";
import { meritSections } from "@/lib/merit-sections";
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

function initials(value: string) {
  return value.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

async function homepageData(): Promise<{
  directory: PublicBusinessDirectory | null;
  referenceData: ReferenceData | null;
  merit: Record<string, PublicBusinessDirectory["businesses"]>;
}> {
  const [directoryResult, referenceResult, ...meritResults] = await Promise.allSettled([
    fetchPublicBusinessDirectory({}),
    fetchPublicReferenceData(),
    ...meritSections.map(({ sort }) => fetchPublicBusinessDirectory({ sort })),
  ]);
  return {
    directory: directoryResult.status === "fulfilled" ? directoryResult.value : null,
    referenceData: referenceResult.status === "fulfilled" ? referenceResult.value : null,
    // A section that fails to load is simply left out of the page.
    merit: Object.fromEntries(
      meritSections.map(({ sort }, index) => {
        const result = meritResults[index];
        return [sort, result?.status === "fulfilled" ? result.value.businesses : []];
      }),
    ),
  };
}

export default async function Home() {
  const { directory, referenceData, merit } = await homepageData();
  const categories = referenceData?.categories.slice(0, 8) ?? [];
  const businesses = directory?.businesses.slice(0, 8) ?? [];

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

          <div className="mt-6 flex flex-col items-center justify-center gap-3 text-sm text-white/50 sm:flex-row">
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
          <div className="home-category-grid mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="mt-4 max-w-2xl leading-7 text-white/50">Approved profiles with recently confirmed information appear first, so you can start with businesses keeping their details current.</p>
            </div>
            <Link className="text-sm font-semibold text-[var(--lime)] hover:underline" href="/businesses">View all businesses →</Link>
          </div>
          {businesses.length ? (
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {businesses.map((business) => <BusinessRow business={business} compare={false} key={business.id} />)}
            </ul>
          ) : (
            <div className="home-empty-state mt-10"><p>Business profiles could not be loaded right now.</p><Link href="/businesses">Open the business directory →</Link></div>
          )}
        </div>
      </section>

      <HomeMeritSections results={merit} />

      <section className="border-b border-white/8" id="how-it-works">
        <div className="mx-auto grid max-w-7xl gap-px px-5 py-2 sm:px-8 md:grid-cols-3 lg:px-10">
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
          <div><BrandLogo /><p className="mt-5 max-w-sm leading-6 text-white/50">Helping people across Zambia discover, compare, and connect with businesses they can trust.</p></div>
          {footerColumns.map((column) => (
            <div key={column.title}><h2 className="font-semibold text-white/80">{column.title}</h2><ul className="mt-4 space-y-3 text-white/50">
              {column.links.map(([label, href]) => <li key={label}><Link className="transition hover:text-white" href={href}>{label}</Link></li>)}
            </ul></div>
          ))}
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col justify-between gap-3 border-t border-white/8 pt-6 text-xs text-white/50 sm:flex-row">
          <span>© 2026 Zed360. Built for Zambia.</span><span>Discovery · Connection · Trust</span>
        </div>
      </footer>
    </main>
  );
}
