import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AdminOverviewApiError,
  fetchAdminOverview,
} from "@/lib/admin-overview";
import { activityLabel, trend, waiting } from "@/lib/admin-overview-format";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { percentage, responseTimeLabel } from "@/lib/dashboard-attention";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

const queues = [
  {
    key: "businessReviews",
    href: "/admin/reviews",
    title: "Business applications",
    one: "business is",
    many: "businesses are",
    consequence: "They stay hidden from customers until decided.",
  },
  {
    key: "contentReports",
    href: "/admin/content-reports",
    title: "Content reports",
    one: "report is",
    many: "reports are",
    consequence: "Reported content stays public until a decision is made.",
  },
  {
    key: "customerReviews",
    href: "/admin/customer-reviews",
    title: "Customer reviews",
    one: "review is",
    many: "reviews are",
    consequence: "Flagged reviews are unpublished until moderated.",
  },
  {
    key: "profileRevisions",
    href: "/admin/profile-revisions",
    title: "Profile revisions",
    one: "change is",
    many: "changes are",
    consequence: "The public profile keeps its old details meanwhile.",
  },
  {
    key: "mediaReviews",
    href: "/admin/media-reviews",
    title: "Logos and cover images",
    one: "image is",
    many: "images are",
    consequence: "Images appear on profiles only once approved.",
  },
] as const;

const referenceTools = [
  {
    href: "/admin/users",
    label: "Users and roles",
    hint: "Platform roles, suspension, and reinstatement",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    hint: "What customers can ask for",
  },
  {
    href: "/admin/locations",
    label: "Provinces and districts",
    hint: "Where businesses and requests can be placed",
  },
] as const;

const trendStyles = {
  up: "text-[var(--lime)]",
  down: "text-amber-100/85",
  same: "text-white/50",
} as const;

function Bar({ share }: { share: number }) {
  return (
    <div
      aria-hidden
      className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8"
    >
      <div
        className="h-full rounded-full bg-[var(--lime)]"
        style={{ width: `${share}%` }}
      />
    </div>
  );
}

export default async function AdminPage() {
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin");

  let overview;
  try {
    overview = await fetchAdminOverview(session.accessToken);
  } catch (error) {
    if (error instanceof AdminOverviewApiError && error.status === 401) {
      redirect("/admin/sign-in?next=/admin&error=session_expired");
    }
    const denied =
      error instanceof AdminOverviewApiError && error.status === 403;
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 lg:px-10">
        <p className="eyebrow">
          <span /> Platform operations
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em]">
          {denied
            ? "Administration access required."
            : "Administration is unavailable."}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/52">
          {denied
            ? "Your account is authenticated but has not been assigned an administrator or reviewer role."
            : "The administration service could not be reached. Please try again shortly."}
        </p>
      </main>
    );
  }

  const now = new Date();
  const waitingQueues = queues
    .map((queue) => ({
      ...queue,
      ...overview.queues[queue.key],
      wait: waiting(overview.queues[queue.key].oldestAt, now),
    }))
    .filter(({ count }) => count > 0)
    .sort(
      (a, b) =>
        (a.oldestAt?.getTime() ?? Infinity) -
        (b.oldestAt?.getTime() ?? Infinity),
    );
  const clearQueues = queues.filter(
    (queue) => overview.queues[queue.key].count === 0,
  );
  const totalWaiting = waitingQueues.reduce(
    (total, { count }) => total + count,
    0,
  );

  const { last30Days, previous30Days } = overview.requests;
  const answeredRate = percentage(last30Days.answered, last30Days.posted);
  const previousAnsweredRate = percentage(
    previous30Days.answered,
    previous30Days.posted,
  );
  const responseTime = responseTimeLabel(
    overview.requests.medianResponseMinutes,
  );
  const postedTrend = trend(last30Days.posted, previous30Days.posted);
  const joinedTrend = trend(
    overview.businesses.joinedLast30Days,
    overview.businesses.joinedPrevious30Days,
  );
  const staleShare = percentage(
    overview.businesses.staleAvailability,
    overview.businesses.live,
  );
  const unserved = overview.provinces.filter(
    ({ businesses, requests }) => requests > 0 && businesses === 0,
  );
  const mostBusinesses = Math.max(
    1,
    ...overview.provinces.map(({ businesses }) => businesses),
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 lg:px-10">
      <p className="eyebrow">
        <span /> Platform operations
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            {totalWaiting
              ? `${totalWaiting} ${totalWaiting === 1 ? "decision is" : "decisions are"} waiting.`
              : "Nothing is waiting."}
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/50">
            {totalWaiting
              ? "Oldest first. Businesses and customers are waiting on each of these."
              : "Every review queue is clear. Platform figures are below."}
          </p>
        </div>
        <span className="rounded-full border border-[var(--lime)]/20 bg-[var(--lime)]/8 px-4 py-2 text-sm capitalize text-[var(--lime)]">
          {overview.role}
        </span>
      </div>

      <section aria-labelledby="queues-heading" className="mt-10">
        <h2 className="sr-only" id="queues-heading">
          Review queues
        </h2>
        {waitingQueues.length ? (
          <ul className="grid gap-3">
            {waitingQueues.map((queue) => (
              <li
                className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between ${queue.wait?.overdue ? "border-amber-200/25 bg-amber-200/[0.06]" : "border-white/10 bg-white/[0.035]"}`}
                key={queue.key}
              >
                <div className="min-w-0">
                  <p
                    className={`text-[.68rem] font-semibold uppercase tracking-[0.14em] ${queue.wait?.overdue ? "text-amber-100/85" : "text-white/50"}`}
                  >
                    {queue.title}
                    {queue.wait ? ` · oldest waiting ${queue.wait.label}` : ""}
                  </p>
                  <p className="mt-1 font-semibold">
                    {queue.count} {queue.count === 1 ? queue.one : queue.many}{" "}
                    waiting for a decision
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    {queue.consequence}
                  </p>
                </div>
                <Link
                  className={`button shrink-0 ${queue.wait?.overdue ? "button-primary" : "button-secondary"}`}
                  href={queue.href}
                >
                  Review →
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {clearQueues.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/50">
              {waitingQueues.length ? "Clear:" : "✓ All clear:"}
            </span>
            {clearQueues.map((queue) => (
              <Link
                className="rounded-full border border-white/10 px-3 py-1.5 text-white/65 transition hover:border-white/25 hover:text-white"
                href={queue.href}
                key={queue.key}
              >
                {queue.title}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="requests-heading" className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2
            className="text-xl font-semibold tracking-[-0.03em]"
            id="requests-heading"
          >
            Customer requests, last 30 days
          </h2>
          <p className="text-xs text-white/50">
            Counted from real records. Nothing is estimated.
          </p>
        </div>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/50">
              Requests posted
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              {last30Days.posted}
            </p>
            <Bar share={last30Days.posted ? 100 : 0} />
            <p className={`mt-3 text-xs ${trendStyles[postedTrend.direction]}`}>
              {postedTrend.label}
            </p>
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/50">
              Got a business response
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              {last30Days.answered}
            </p>
            <Bar share={answeredRate ?? 0} />
            <p className="mt-3 text-xs text-white/50">
              {answeredRate === null
                ? "No requests to answer yet"
                : `${answeredRate}% of requests`}
              {previousAnsweredRate === null
                ? ""
                : ` · ${previousAnsweredRate}% in the 30 days before`}
            </p>
          </li>
          <li className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/50">
              Customer chose a business
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              {last30Days.chosen}
            </p>
            <Bar
              share={percentage(last30Days.chosen, last30Days.posted) ?? 0}
            />
            <p className="mt-3 text-xs text-white/50">
              Confirmed by the customer · {previous30Days.chosen} in the 30 days
              before
            </p>
          </li>
        </ol>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/55">
          {(
            [
              ["Open requests now", String(overview.requests.openNow)],
              [
                "Open over a day with no response",
                String(overview.requests.unansweredOverADay),
              ],
              [
                "Typical business response time",
                responseTime ?? "No responses",
              ],
            ] as const
          ).map(([label, value]) => (
            <div
              className="flex flex-row-reverse items-baseline gap-2"
              key={label}
            >
              <dt>{label}</dt>
              <dd className="text-lg font-semibold text-white">{value}</dd>
            </div>
          ))}
        </dl>
        {overview.requests.unansweredOverADay > 0 ? (
          <p className="mt-4 rounded-2xl border border-amber-200/25 bg-amber-200/[0.06] p-4 text-sm leading-6 text-amber-100/85">
            {overview.requests.unansweredOverADay}{" "}
            {overview.requests.unansweredOverADay === 1
              ? "customer has"
              : "customers have"}{" "}
            waited more than a day without any business responding. This is the
            clearest sign of missing or inactive businesses.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="businesses-heading" className="mt-14">
        <h2
          className="text-xl font-semibold tracking-[-0.03em]"
          id="businesses-heading"
        >
          Businesses
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/50">
              Live on Zed360
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              {overview.businesses.live}
            </p>
            <p className="mt-3 text-xs text-white/50">
              Approved and visible to customers
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/50">
              Joined, last 30 days
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              {overview.businesses.joinedLast30Days}
            </p>
            <p className={`mt-3 text-xs ${trendStyles[joinedTrend.direction]}`}>
              {joinedTrend.label}
            </p>
          </div>
          <div
            className={`rounded-2xl border p-5 ${staleShare !== null && staleShare >= 50 ? "border-amber-200/25 bg-amber-200/[0.06]" : "border-white/10 bg-white/[0.035]"}`}
          >
            <p className="text-xs uppercase tracking-[0.14em] text-white/50">
              Availability out of date
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              {overview.businesses.staleAvailability}
            </p>
            <p className="mt-3 text-xs text-white/50">
              {staleShare === null
                ? "No live businesses yet"
                : `${staleShare}% of live businesses, not confirmed in 7 days`}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-white/50">
              Verified reviews
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              {overview.reviews.published}
            </p>
            <p className="mt-3 text-xs text-white/50">
              {overview.reviews.averageRating === null
                ? "No published reviews yet"
                : `Average ★ ${overview.reviews.averageRating} · ${overview.reviews.publishedLast30Days} in the last 30 days`}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/55">
          {overview.businesses.changesRequested} awaiting corrections from the
          owner · {overview.businesses.suspended} suspended ·{" "}
          <Link
            className="text-[var(--lime)] hover:underline"
            href="/admin/reviews"
          >
            Open all businesses
          </Link>
        </p>
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="provinces-heading">
          <h2
            className="text-xl font-semibold tracking-[-0.03em]"
            id="provinces-heading"
          >
            Where Zed360 is active
          </h2>
          <p className="mt-2 text-sm text-white/50">
            Live businesses by province, with customer requests from the last 30
            days.
          </p>
          {unserved.length ? (
            <p className="mt-4 rounded-2xl border border-amber-200/25 bg-amber-200/[0.06] p-4 text-sm leading-6 text-amber-100/85">
              Customers asked in {unserved.map(({ name }) => name).join(", ")}{" "}
              but no live business is based there. Recruit businesses here
              first.
            </p>
          ) : null}
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-white/50">
                <th className="pb-2 font-semibold" scope="col">
                  Province
                </th>
                <th className="pb-2 font-semibold" scope="col">
                  Businesses
                </th>
                <th className="pb-2 text-right font-semibold" scope="col">
                  Requests
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {overview.provinces.map((province) => (
                <tr key={province.name}>
                  <th
                    className={`py-2.5 pr-3 text-left font-normal ${province.businesses || province.requests ? "text-white" : "text-white/50"}`}
                    scope="row"
                  >
                    {province.name}
                  </th>
                  <td className="w-1/2 py-2.5 pr-3">
                    <span className="flex items-center gap-3">
                      <span className="w-5 tabular-nums">
                        {province.businesses}
                      </span>
                      <span
                        aria-hidden
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8"
                      >
                        <span
                          className="block h-full rounded-full bg-[var(--lime)]"
                          style={{
                            width: `${(province.businesses / mostBusinesses) * 100}%`,
                          }}
                        />
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {province.requests}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-5 text-white/50">
            A business with branches in two provinces is counted in both.
          </p>
        </section>

        <div className="grid content-start gap-10">
          <section aria-labelledby="categories-heading">
            <h2
              className="text-xl font-semibold tracking-[-0.03em]"
              id="categories-heading"
            >
              What customers asked for
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Most requested categories in the last 30 days.
            </p>
            {overview.categories.length ? (
              <ul className="mt-4 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                {overview.categories.map((category) => {
                  const unanswered = category.requests - category.answered;
                  return (
                    <li
                      className="flex items-center justify-between gap-4 p-4"
                      key={category.name}
                    >
                      <span className="font-medium">{category.name}</span>
                      <span className="text-right text-sm text-white/55">
                        {category.requests}{" "}
                        {category.requests === 1 ? "request" : "requests"}
                        {unanswered ? (
                          <span className="block text-xs text-amber-100/85">
                            {unanswered} with no response
                          </span>
                        ) : (
                          <span className="block text-xs text-white/50">
                            All answered
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/55">
                No customer requests were posted in the last 30 days.
              </p>
            )}
          </section>

          <section aria-labelledby="activity-heading">
            <h2
              className="text-xl font-semibold tracking-[-0.03em]"
              id="activity-heading"
            >
              Recent administrator actions
            </h2>
            {overview.recentActivity.length ? (
              <ul className="mt-4 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                {overview.recentActivity.map((event) => (
                  <li className="p-4" key={event.id}>
                    <p className="text-sm">
                      <span className="font-medium">{event.actor}</span>{" "}
                      {activityLabel(event.action, event.subjectType)}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {new Intl.DateTimeFormat("en-ZM", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Africa/Lusaka",
                      }).format(event.createdAt)}
                      {event.reason ? ` · ${event.reason}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/55">
                No user, category, or location changes have been recorded yet.
              </p>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="reference-heading" className="mt-14">
        <h2
          className="text-xl font-semibold tracking-[-0.03em]"
          id="reference-heading"
        >
          Platform settings
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {referenceTools.map((tool) => (
            <Link
              className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-[var(--lime)]/35 hover:bg-white/[0.055]"
              href={tool.href}
              key={tool.href}
            >
              <span className="flex items-center justify-between gap-3 font-semibold">
                {tool.label}
                <span
                  aria-hidden
                  className="text-white/50 transition group-hover:text-[var(--lime)]"
                >
                  →
                </span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-white/50">
                {tool.hint}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
