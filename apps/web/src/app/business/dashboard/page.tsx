import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessDashboardApiError,
  fetchBusinessDashboard,
} from "@/lib/business-dashboard";
import { signOut } from "../account/actions";

export const metadata: Metadata = { title: "Business dashboard" };
export const dynamic = "force-dynamic";

const reviewLabels = {
  pending: "Awaiting Zed360 review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Corrections requested",
} as const;

const setupLabels = {
  approved: "Business approved",
  hasAvailableService: "Service available",
  hasCoverage: "Coverage confirmed",
  hasPublishedProduct: "Product published",
  hasApprovedMedia: "Image approved",
} as const;

const availabilityLabels = {
  available: "Available",
  busy: "Busy",
  temporarily_unavailable: "Temporarily unavailable",
} as const;

export default async function BusinessDashboardPage() {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/dashboard");

  let dashboard = null;
  let errorMessage = "";
  try {
    dashboard = await fetchBusinessDashboard(session.accessToken);
  } catch (error) {
    if (error instanceof BusinessDashboardApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof BusinessDashboardApiError
        ? error.message
        : "We could not load your dashboard right now.";
  }

  const totals = dashboard?.totals;
  if (
    dashboard &&
    !dashboard.businesses.some(
      (business) =>
        business.status === "active" && business.reviewStatus === "approved",
    )
  ) {
    redirect("/business/account");
  }
  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
        <Link href="/">
          <BrandLogo />
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-2"
          aria-label="Business navigation"
        >
          <Link className="button button-primary" href="/business/dashboard">
            Overview
          </Link>
          <Link className="button button-quiet" href="/business/requests">
            Requests
          </Link>
          <Link className="button button-quiet" href="/business/notifications">
            Notifications
            {totals?.unreadNotifications
              ? ` (${totals.unreadNotifications})`
              : ""}
          </Link>
          <Link className="button button-quiet" href="/business/account">
            Account
          </Link>
          <form action={signOut}>
            <button className="button button-quiet" type="submit">
              Sign out
            </button>
          </form>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-6xl pb-20 pt-12 lg:pt-16">
        <p className="eyebrow">
          <span /> Business workspace
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Your dashboard.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/48">
              Opportunities, customer decisions, and storefront work across the
              businesses you manage.
            </p>
          </div>
          <p className="text-sm text-white/40">Signed in as {session.email}</p>
        </div>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {totals ? (
          <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Open matches", totals.openMatches],
              ["Responses sent", totals.responsesSent],
              ["Customer selections", totals.customerSelections],
              ["Unread alerts", totals.unreadNotifications],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                key={label}
              >
                <dt className="text-xs uppercase tracking-[0.14em] text-white/35">
                  {label}
                </dt>
                <dd className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {dashboard?.businesses.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/7 p-6">
            <h2 className="text-lg font-semibold">Connect your business</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Link a submitted business before opportunities and storefront
              tools can appear here.
            </p>
            <Link
              className="button button-primary mt-5"
              href="/business/account"
            >
              Open business account →
            </Link>
          </div>
        ) : null}

        {dashboard?.businesses.length ? (
          <section className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-[-0.03em]">
                Your businesses
              </h2>
              <Link
                className="text-sm text-[var(--lime)] hover:underline"
                href="/business/account"
              >
                Account details
              </Link>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {dashboard.businesses.map((business) => {
                const setupEntries = Object.entries(business.setup) as Array<
                  [keyof typeof business.setup, boolean]
                >;
                const completed = setupEntries.filter(
                  ([, done]) => done,
                ).length;
                const canManage =
                  business.role !== "staff" && business.status !== "closed";
                return (
                  <article
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
                    key={business.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {business.name}
                        </h3>
                        <p className="mt-1 text-sm text-white/42">
                          {reviewLabels[business.reviewStatus]} ·{" "}
                          {business.role}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${business.presence.availabilityFreshness === "current" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8 text-[var(--lime)]" : "border-amber-200/20 bg-amber-200/8 text-amber-100/70"}`}
                        >
                          {business.presence.availabilityFreshness === "current"
                            ? availabilityLabels[business.presence.availability]
                            : "Availability needs update"}
                        </span>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/55">
                          Setup {completed}/{setupEntries.length}
                        </span>
                      </div>
                    </div>
                    <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-white/8 py-4 text-sm">
                      <div>
                        <dt className="text-white/35">Matches</dt>
                        <dd className="mt-1 text-lg font-semibold">
                          {business.metrics.openMatches}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/35">Products</dt>
                        <dd className="mt-1 text-lg font-semibold">
                          {business.metrics.publishedProducts}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/35">Reviews</dt>
                        <dd className="mt-1 text-lg font-semibold">
                          {business.metrics.publishedReviews}
                        </dd>
                      </div>
                    </dl>
                    <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                      {setupEntries.map(([key, done]) => (
                        <li
                          className={done ? "text-white/65" : "text-white/30"}
                          key={key}
                        >
                          <span
                            className={
                              done ? "text-[var(--lime)]" : "text-white/25"
                            }
                          >
                            {done ? "●" : "○"}
                          </span>{" "}
                          {setupLabels[key]}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {business.status === "active" &&
                      business.reviewStatus === "approved" ? (
                        <Link
                          className="button button-primary"
                          href="/business/requests"
                        >
                          View requests
                        </Link>
                      ) : null}
                      {business.status === "active" &&
                      business.reviewStatus === "approved" ? (
                        <Link
                          className="button button-quiet"
                          href={`/businesses/${business.slug}`}
                        >
                          Public profile
                        </Link>
                      ) : null}
                      {canManage ? (
                        <>
                          <Link
                            className="button button-quiet"
                            href={`/business/${business.id}/catalog`}
                          >
                            Storefront
                          </Link>
                          <Link
                            className="button button-quiet"
                            href={`/business/${business.id}/services`}
                          >
                            Services
                          </Link>
                          <Link
                            className="button button-quiet"
                            href={`/business/${business.id}/coverage`}
                          >
                            Coverage
                          </Link>
                          <Link
                            className="button button-quiet"
                            href={`/business/${business.id}/profile`}
                          >
                            Edit profile
                          </Link>
                          <Link
                            className="button button-quiet"
                            href={`/business/${business.id}/presence`}
                          >
                            Availability
                          </Link>
                          <Link
                            className="button button-quiet"
                            href={`/business/${business.id}/hours`}
                          >
                            Operating hours
                          </Link>
                          <Link
                            className="button button-quiet"
                            href={`/business/${business.id}/locations`}
                          >
                            Locations
                          </Link>
                        </>
                      ) : null}
                    </div>
                    {business.presence.profileFreshness !== "current" ? (
                      <p className="mt-4 text-xs text-amber-100/65">
                        Profile information needs confirmation.
                      </p>
                    ) : null}
                    {business.metrics.pendingMedia ? (
                      <p className="mt-4 text-xs text-amber-100/65">
                        {business.metrics.pendingMedia} image
                        {business.metrics.pendingMedia === 1 ? "" : "s"}{" "}
                        awaiting Zed360 review.
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-[-0.03em]">
                Recent matched requests
              </h2>
              <Link
                className="text-sm text-[var(--lime)] hover:underline"
                href="/business/requests"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
              {dashboard?.recentRequests.length ? (
                dashboard.recentRequests.map((request) => (
                  <Link
                    className="block p-4 transition hover:bg-white/[0.035]"
                    href="/business/requests"
                    key={request.matchId}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-white/35">
                      <span>
                        {request.businessName} · {request.categoryName}
                      </span>
                      <span>
                        {request.hasResponse ? "Responded" : "Needs response"}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{request.summary}</p>
                    <p className="mt-1 text-xs text-white/38">
                      {request.districtName ?? "Location not specified"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="p-5 text-sm text-white/45">
                  No active matched requests.
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-[-0.03em]">
                Recent notifications
              </h2>
              <Link
                className="text-sm text-[var(--lime)] hover:underline"
                href="/business/notifications"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
              {dashboard?.recentNotifications.length ? (
                dashboard.recentNotifications.map((notification) => (
                  <Link
                    className={`block p-4 transition hover:bg-white/[0.035] ${notification.readAt ? "" : "bg-[var(--lime)]/6"}`}
                    href={notification.actionUrl ?? "/business/notifications"}
                    key={notification.id}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-white/35">
                      <span>{notification.businessName}</span>
                      {!notification.readAt ? (
                        <span className="text-[var(--lime)]">New</span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-medium">{notification.title}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-white/45">
                      {notification.body}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="p-5 text-sm text-white/45">
                  No notifications yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
