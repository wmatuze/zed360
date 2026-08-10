import Link from "next/link";

const categories = [
  ["Automotive", "Parts, mechanics & repairs", "AU"],
  ["Home services", "Plumbers, builders & electricians", "HS"],
  ["Accommodation", "Lodges, hotels & rentals", "AC"],
  ["Professional", "Legal, finance & consulting", "PR"],
  ["Health & beauty", "Clinics, salons & wellness", "HB"],
  ["Shopping", "Products, suppliers & electronics", "SH"],
];

const steps = [
  {
    number: "01",
    title: "Describe what you need",
    body: "Give us the details once—what, where, and when.",
  },
  {
    number: "02",
    title: "Reach relevant businesses",
    body: "Your request goes to businesses equipped to help.",
  },
  {
    number: "03",
    title: "Choose with confidence",
    body: "Compare current responses, trust signals, and availability.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--ink)] text-white">
      <div className="hero-grid">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
          <Link
            className="flex items-center gap-3"
            href="/"
            aria-label="Zed360 home"
          >
            <span className="brand-mark" aria-hidden="true">
              Z
            </span>
            <span className="text-xl font-semibold tracking-[-0.04em]">
              Zed360
            </span>
          </Link>

          <nav
            className="hidden items-center gap-8 text-sm text-white/65 md:flex"
            aria-label="Main navigation"
          >
            <a className="transition hover:text-white" href="#how-it-works">
              How it works
            </a>
            <a className="transition hover:text-white" href="#categories">
              Categories
            </a>
            <a className="transition hover:text-white" href="#for-business">
              For business
            </a>
          </nav>

          <Link className="button button-quiet" href="/request">
            Post a request
          </Link>
        </header>

        <section className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:pb-32 lg:pt-28">
          <div className="relative z-10 max-w-3xl">
            <p className="eyebrow">
              <span /> Built for Zambia
            </p>
            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] sm:text-7xl lg:text-[5.6rem]">
              Stop searching.
              <span className="mt-2 block text-[var(--lime)]">
                Start finding.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/58 sm:text-xl">
              Tell us what you need. Zed360 helps you reach relevant businesses,
              confirm who can help now, and choose with confidence.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link className="button button-primary" href="/request">
                Tell us what you need
                <span aria-hidden="true">→</span>
              </Link>
              <a className="button button-secondary" href="#how-it-works">
                See how it works
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 text-sm text-white/42">
              <span>✓ No payment through Zed360</span>
              <span>✓ Direct business contact</span>
              <span>✓ Zambia-wide</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div className="request-preview">
              <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
                    New request
                  </p>
                  <p className="mt-1 font-medium">What do you need?</p>
                </div>
                <span className="live-pill">
                  <i /> Live matching
                </span>
              </div>
              <div className="space-y-4 p-6">
                <div className="preview-field">
                  <span className="preview-label">I am looking for</span>
                  <span className="text-white/90">
                    A reliable solar installer
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="preview-field">
                    <span className="preview-label">Location</span>
                    <span className="text-white/90">Kitwe</span>
                  </div>
                  <div className="preview-field">
                    <span className="preview-label">When</span>
                    <span className="text-white/90">This week</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[var(--lime)] px-5 py-4 text-sm font-semibold text-[var(--ink)]">
                  Find businesses that can help
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </div>
            <div className="response-card response-card-one">
              <span className="avatar avatar-blue">LS</span>
              <span>
                <strong>Luma Solar</strong>
                <small>Available this week</small>
              </span>
              <b>12m</b>
            </div>
            <div className="response-card response-card-two">
              <span className="avatar avatar-lime">NS</span>
              <span>
                <strong>Northern Sun</strong>
                <small>Quote received</small>
              </span>
              <b>✓</b>
            </div>
          </div>
        </section>
      </div>

      <section
        id="how-it-works"
        className="border-y border-white/8 bg-white/[0.025]"
      >
        <div className="mx-auto grid max-w-7xl gap-px px-5 py-2 sm:px-8 lg:grid-cols-3 lg:px-10">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span>{step.number}</span>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="categories"
        className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-10 lg:py-32"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">
              <span /> One platform, every need
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Whatever you need, start here.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-white/48">
            Zed360 is designed around what you need—not around a static list of
            companies.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(([title, description, initials]) => (
            <Link
              className="category-card"
              href={`/request?category=${encodeURIComponent(title)}`}
              key={title}
            >
              <span>{initials}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <b aria-hidden="true">↗</b>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="for-business"
        className="mx-auto w-full max-w-7xl px-5 pb-24 sm:px-8 lg:px-10 lg:pb-32"
      >
        <div className="business-banner">
          <div>
            <p className="eyebrow eyebrow-dark">
              <span /> For business owners
            </p>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Be discovered for what you do best.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-[var(--ink)]/65">
              Build trust, receive relevant enquiries, and respond when you are
              ready to help.
            </p>
          </div>
          <Link className="button button-dark" href="/for-business">
            Join business early access <span>→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/8 px-5 py-8 text-sm text-white/35 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row">
          <span>© 2026 Zed360. Built for Zambia.</span>
          <span>Discovery · Connection · Trust</span>
        </div>
      </footer>
    </main>
  );
}
