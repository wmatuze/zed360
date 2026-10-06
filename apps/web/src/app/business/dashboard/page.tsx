import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActivityChart } from "@/components/activity-chart";
import { BrandLogo } from "@/components/brand-logo";
import { trend } from "@/lib/admin-overview-format";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessDashboardApiError,
  fetchBusinessDashboard,
} from "@/lib/business-dashboard";
import {
  attentionItems,
  percentage,
  responseTimeLabel,
} from "@/lib/dashboard-attention";
import { signOut } from "../account/actions";

export const metadata: Metadata = { title: "Business dashboard" };
export const dynamic = "force-dynamic";

const reviewLabels = {
  pending: "Awaiting Zed360 review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Corrections requested",
} as const;

const availabilityLabels = {
  available: "Available",
  busy: "Busy",
  temporarily_unavailable: "Temporarily unavailable",
} as const;

const toneStyles = {
  urgent: "border-amber-200/25 bg-amber-200/[0.06]",
  setup: "border-white/10 bg-white/[0.035]",
  info: "border-white/8 bg-transparent",
} as const;

const toneLabels = {
  urgent: "Do this first",
  setup: "Improve your profile",
  info: "For your information",
} as const;

function Tile({
  href,
  label,
  hint,
}: {
  href: string;
  label: string;
  hint: string;
}) {
  return (
    <Link
      className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[var(--lime)]/35 hover:bg-white/[0.055]"
      href={href}
    >
      <span className="flex items-center justify-between gap-3 font-semibold">
        {label}
        <span
          aria-hidden
          className="text-white/50 transition group-hover:text-[var(--lime)]"
        >
          →
        </span>
      </span>
      <span className="mt-1 block text-xs leading-5 text-white/50">{hint}</span>
    </Link>
  );
}

export default async function BusinessDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string }>;
}) {
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
  const isLive = (item: { status: string; reviewStatus: string }) =>
    item.status === "active" && item.reviewStatus === "approved";
  if (dashboard && !dashboard.businesses.some(isLive)) {
    redirect("/business/account");
  }

  const businesses = dashboard?.businesses ?? [];
  const requested = (await searchParams).business;
  const business =
    businesses.find(({ id }) => id === requested) ??
    businesses.find(isLive) ??
    businesses[0];
  const attention = business ? attentionItems(business) : [];
  const live = business ? isLive(business) : false;
  const canManage = business
    ? business.role !== "staff" && business.status !== "closed"
    : false;
  const base = business ? `/business/${business.id}` : "";
  const recent = business?.last30Days;
  const responseRate = recent
    ? percentage(recent.responses, recent.matches)
    : null;
  const responseTime = responseTimeLabel(recent?.medianResponseMinutes ?? null);
  const activity = business?.activity;
  const contactTaps = activity
    ? activity.last30Days.whatsapp +
      activity.last30Days.calls +
      activity.last30Days.emails +
      activity.last30Days.websiteVisits
    : 0;
  const setupSteps = business
    ? [
        {
          done: business.setup.approved,
          label: "Approved by Zed360",
          href: "/business/account",
        },
        {
          done: business.setup.hasAvailableService,
          label: "A service customers can ask for",
          href: `${base}/services`,
        },
        {
          done: business.setup.hasCoverage,
          label: "Where and how you serve",
          href: `${base}/coverage`,
        },
        {
          done: business.metrics.locationsWithoutHours === 0,
          label: "Opening hours",
          href: `${base}/hours`,
        },
        {
          done: business.setup.hasApprovedMedia,
          label: "Logo or photos",
          href: `${base}/catalog`,
        },
      ]
    : [];
  const setupDone = setupSteps.filter(({ done }) => done).length;

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
        {errorMessage ? (
          <div
            className="mb-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {dashboard && !business ? (
          <div className="rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/7 p-6">
            <h1 className="text-lg font-semibold">Connect your business</h1>
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

        {business ? (
          <>
            {businesses.length > 1 ? (
              <nav
                aria-label="Your businesses"
                className="mb-6 flex flex-wrap gap-2"
              >
                {businesses.map((item) => (
                  <Link
                    aria-current={item.id === business.id ? "page" : undefined}
                    className={`rounded-full border px-4 py-2 text-sm transition ${item.id === business.id ? "border-[var(--lime)] bg-[var(--lime)] font-semibold text-[var(--ink)]" : "border-white/12 text-white/65 hover:border-[var(--lime)]/40 hover:text-white"}`}
                    href={`/business/dashboard?business=${item.id}`}
                    key={item.id}
                  >
                    {item.name}
                    {item.metrics.awaitingResponse
                      ? ` · ${item.metrics.awaitingResponse} waiting`
                      : ""}
                  </Link>
                ))}
              </nav>
            ) : null}

            <p className="eyebrow">
              <span /> Business workspace
            </p>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
              <div className="min-w-0">
                <h1 className="text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                  {business.name}
                </h1>
                <p className="mt-3 text-sm text-white/50">
                  {reviewLabels[business.reviewStatus]} · Your role:{" "}
                  {business.role} · {session.email}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {live && canManage ? (
                  <Link
                    className={`rounded-full border px-4 py-2 text-sm transition hover:border-[var(--lime)]/50 ${business.presence.availabilityFreshness === "current" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8 text-[var(--lime)]" : "border-amber-200/25 bg-amber-200/8 text-amber-100/85"}`}
                    href={`${base}/presence`}
                  >
                    {business.presence.availabilityFreshness === "current"
                      ? availabilityLabels[business.presence.availability]
                      : "Availability needs update"}{" "}
                    · Change
                  </Link>
                ) : null}
                {live ? (
                  <Link
                    className="button button-secondary"
                    href={`/businesses/${business.slug}`}
                  >
                    View public profile ↗
                  </Link>
                ) : null}
              </div>
            </div>

            <section aria-labelledby="attention-heading" className="mt-10">
              <h2
                className="text-xl font-semibold tracking-[-0.03em]"
                id="attention-heading"
              >
                Needs your attention
              </h2>
              {attention.length ? (
                <ul className="mt-4 grid gap-3">
                  {attention.map((item) => (
                    <li
                      className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${toneStyles[item.tone]}`}
                      key={item.key}
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-[.68rem] font-semibold uppercase tracking-[0.14em] ${item.tone === "urgent" ? "text-amber-100/85" : "text-white/50"}`}
                        >
                          {toneLabels[item.tone]}
                        </p>
                        <p className="mt-1 font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-white/55">
                          {item.detail}
                        </p>
                      </div>
                      {item.href && item.action ? (
                        <Link
                          className={`button shrink-0 ${item.tone === "urgent" ? "button-primary" : "button-secondary"}`}
                          href={item.href}
                        >
                          {item.action} →
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/7 p-5 text-sm text-white/70">
                  ✓ You are up to date. Nothing needs your attention right now.
                </p>
              )}
            </section>

            {live && recent ? (
              <section aria-labelledby="recent-heading" className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2
                    className="text-xl font-semibold tracking-[-0.03em]"
                    id="recent-heading"
                  >
                    Last 30 days
                  </h2>
                  <p className="text-xs text-white/50">
                    Counted from real requests. Nothing is estimated.
                  </p>
                </div>
                {recent.matches ? (
                  <>
                    <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        {
                          label: "Requests matched to you",
                          value: recent.matches,
                          share: 100,
                          note: "Customers who needed what you offer",
                        },
                        {
                          label: "You responded",
                          value: recent.responses,
                          share: responseRate ?? 0,
                          note: `${responseRate ?? 0}% of matched requests`,
                        },
                        {
                          label: "Customers chose you",
                          value: recent.selections,
                          share:
                            percentage(recent.selections, recent.matches) ?? 0,
                          note: "Confirmed by the customer",
                        },
                      ].map((step) => (
                        <li
                          className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                          key={step.label}
                        >
                          <p className="text-xs uppercase tracking-[0.14em] text-white/50">
                            {step.label}
                          </p>
                          <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
                            {step.value}
                          </p>
                          <div
                            aria-hidden
                            className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8"
                          >
                            <div
                              className="h-full rounded-full bg-[var(--lime)]"
                              style={{ width: `${step.share}%` }}
                            />
                          </div>
                          <p className="mt-3 text-xs text-white/50">
                            {step.note}
                          </p>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-sm text-white/60">
                      {responseTime
                        ? `Your typical response time: ${responseTime.toLowerCase()}.`
                        : "Respond to a request to see your typical response time."}
                    </p>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
                    <p className="font-semibold">
                      No requests were matched to you in the last 30 days.
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                      Requests reach you through your services and coverage. The
                      more precisely they describe what you do and where, the
                      more requests you can receive.
                    </p>
                    {canManage ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          className="button button-secondary"
                          href={`${base}/services`}
                        >
                          Review services
                        </Link>
                        <Link
                          className="button button-secondary"
                          href={`${base}/coverage`}
                        >
                          Review coverage
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}
                <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/55">
                  {(
                    [
                      ["Open requests now", business.metrics.openMatches],
                      ["Responses, all time", business.metrics.responsesSent],
                      ["Chosen, all time", business.metrics.customerSelections],
                      ["Verified reviews", business.metrics.publishedReviews],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      className="flex flex-row-reverse items-baseline gap-2"
                      key={label}
                    >
                      <dt>{label}</dt>
                      <dd className="text-lg font-semibold text-white">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {live && activity ? (
              <section aria-labelledby="activity-heading" className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2
                    className="text-xl font-semibold tracking-[-0.03em]"
                    id="activity-heading"
                  >
                    Your public profile, last 30 days
                  </h2>
                  <p className="text-xs text-white/50">
                    Counts only. Zed360 does not record who visited.
                  </p>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    {
                      label: "Profile views",
                      value: activity.last30Days.profileViews,
                      note: trend(
                        activity.last30Days.profileViews,
                        activity.previous30Days.profileViews,
                      ).label,
                    },
                    {
                      label: "Contact taps",
                      value: contactTaps,
                      note: `WhatsApp ${activity.last30Days.whatsapp} · Call ${activity.last30Days.calls} · Email ${activity.last30Days.emails} · Website ${activity.last30Days.websiteVisits}`,
                    },
                    {
                      label: "Directions opened",
                      value: activity.last30Days.directions,
                      note: "Customers finding their way to you",
                    },
                    {
                      label: "Shares",
                      value: activity.last30Days.shares,
                      note: "Customers passing your profile on",
                    },
                  ].map((item) => (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                      key={item.label}
                    >
                      <dt className="text-xs uppercase tracking-[0.14em] text-white/50">
                        {item.label}
                      </dt>
                      <dd className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                        {item.value}
                      </dd>
                      <dd className="mt-2 text-xs leading-5 text-white/50">
                        {item.note}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-3">
                  <ActivityChart daily={activity.daily} />
                </div>
                <p className="mt-3 text-xs leading-5 text-white/50">
                  A tap means a customer pressed the button; Zed360 cannot see
                  whether the call or message went through. These figures never
                  affect where you appear in search.
                </p>
              </section>
            ) : null}

            <section aria-labelledby="manage-heading" className="mt-12">
              <h2
                className="text-xl font-semibold tracking-[-0.03em]"
                id="manage-heading"
              >
                Manage your business
              </h2>
              <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
                <div className="grid gap-6">
                  {canManage ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                        What customers see
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Tile
                          hint="Name, description, and contact details"
                          href={`${base}/profile`}
                          label="Profile"
                        />
                        <Tile
                          hint="What you do, with prices if you wish"
                          href={`${base}/services`}
                          label="Services"
                        />
                        <Tile
                          hint={`Products and photos · ${business.metrics.publishedProducts} published`}
                          href={`${base}/catalog`}
                          label="Storefront"
                        />
                        <Tile
                          hint="Branches, addresses, and map pins"
                          href={`${base}/locations`}
                          label="Locations"
                        />
                        <Tile
                          hint="When each location is open"
                          href={`${base}/hours`}
                          label="Opening hours"
                        />
                      </div>
                    </div>
                  ) : null}
                  {live || canManage ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                        How you operate
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {live ? (
                          <Tile
                            hint={`${business.metrics.openMatches} open · ${business.metrics.awaitingResponse} waiting for you`}
                            href="/business/requests"
                            label="Requests"
                          />
                        ) : null}
                        {canManage ? (
                          <>
                            <Tile
                              hint="Whether you can take work right now"
                              href={`${base}/presence`}
                              label="Availability"
                            />
                            <Tile
                              hint="Where you deliver, travel, or work remotely"
                              href={`${base}/coverage`}
                              label="Coverage"
                            />
                          </>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">Profile setup</h3>
                    <span className="text-sm text-white/55">
                      {setupDone} of {setupSteps.length}
                    </span>
                  </div>
                  <div
                    aria-hidden
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--lime)]"
                      style={{
                        width: `${(setupDone / setupSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                  <ul className="mt-4 grid gap-2 text-sm">
                    {setupSteps.map((step) => (
                      <li className="flex items-start gap-2" key={step.label}>
                        <span
                          aria-hidden
                          className={
                            step.done ? "text-[var(--lime)]" : "text-white/50"
                          }
                        >
                          {step.done ? "✓" : "○"}
                        </span>
                        {step.done || !canManage ? (
                          <span
                            className={
                              step.done ? "text-white/65" : "text-white/50"
                            }
                          >
                            {step.label}
                            <span className="sr-only">
                              {step.done ? " (done)" : " (not done)"}
                            </span>
                          </span>
                        ) : (
                          <Link
                            className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-[var(--lime)]"
                            href={step.href}
                          >
                            {step.label}
                            <span className="sr-only"> (not done)</span>
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </aside>
              </div>
            </section>
          </>
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
                    <div className="flex items-center justify-between gap-3 text-xs text-white/50">
                      <span>
                        {request.businessName} · {request.categoryName}
                      </span>
                      <span>
                        {request.hasResponse ? "Responded" : "Needs response"}
                      </span>
                    </div>
                    <p className="mt-2 font-medium">{request.summary}</p>
                    <p className="mt-1 text-xs text-white/50">
                      {request.districtName ?? "Location not specified"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="p-5 text-sm text-white/50">
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
                    <div className="flex items-center justify-between gap-3 text-xs text-white/50">
                      <span>{notification.businessName}</span>
                      {!notification.readAt ? (
                        <span className="text-[var(--lime)]">New</span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-medium">{notification.title}</p>
                    <p className="mt-1 line-clamp-1 text-sm text-white/50">
                      {notification.body}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="p-5 text-sm text-white/50">
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
