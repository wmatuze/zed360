import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessRequestsApiError,
  fetchBusinessRequestHistory,
} from "@/lib/business-requests";
import { percentage } from "@/lib/dashboard-attention";

export const metadata: Metadata = { title: "Past requests" };
export const dynamic = "force-dynamic";

const outcomes = {
  chosen: {
    label: "The customer chose you",
    style: "border-[var(--lime)]/30 bg-[var(--lime)]/10 text-[var(--lime)]",
  },
  another_chosen: {
    label: "The customer chose another business",
    style: "border-white/12 text-white/65",
  },
  expired: {
    label: "Expired without a choice",
    style: "border-white/12 text-white/65",
  },
  closed: {
    label: "Closed by the customer",
    style: "border-white/12 text-white/65",
  },
} as const;

const responseLabels = {
  available: "You said you were available",
  unavailable: "You said you were unavailable",
  needs_more_information: "You asked for more information",
} as const;

const date = (value: string) =>
  new Intl.DateTimeFormat("en-ZM", {
    dateStyle: "medium",
    timeZone: "Africa/Lusaka",
  }).format(new Date(value));

function price(minimum: number | null, maximum: number | null) {
  const format = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
    maximumFractionDigits: 0,
  });
  if (minimum !== null && maximum !== null && minimum !== maximum)
    return `${format.format(minimum)} – ${format.format(maximum)}`;
  if (minimum !== null) return format.format(minimum);
  if (maximum !== null) return `Up to ${format.format(maximum)}`;
  return null;
}

export default async function BusinessRequestHistoryPage() {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/requests/history");

  let data = null;
  let errorMessage = "";
  try {
    data = await fetchBusinessRequestHistory(session.accessToken);
  } catch (error) {
    if (error instanceof BusinessRequestsApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof BusinessRequestsApiError
        ? error.message
        : "We could not load past requests right now.";
  }

  const totals = data?.totals;
  const answeredRate = totals
    ? percentage(totals.answered, totals.received)
    : null;

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="button button-quiet" href="/business/dashboard">
            Dashboard
          </Link>
          <Link className="button button-quiet" href="/business/notifications">
            Notifications
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl pb-20 pt-14">
        <p className="eyebrow">
          <span /> Business opportunities
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Past requests.
        </h1>
        <nav aria-label="Requests" className="mt-6 flex gap-2">
          <Link
            className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/65 transition hover:border-white/30 hover:text-white"
            href="/business/requests"
          >
            Active
          </Link>
          <span
            aria-current="page"
            className="rounded-full border border-[var(--lime)] bg-[var(--lime)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
          >
            Past
          </span>
        </nav>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {data && totals && data.requests.length ? (
          <>
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm text-white/55">
              {(
                [
                  ["requests ended", totals.received],
                  [
                    answeredRate === null
                      ? "answered"
                      : `answered (${answeredRate}%)`,
                    totals.answered,
                  ],
                  ["chose you", totals.chosen],
                ] as const
              ).map(([label, value]) => (
                <div
                  className="flex flex-row-reverse items-baseline gap-2"
                  key={label}
                >
                  <dt>{label}</dt>
                  <dd className="text-2xl font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-8 grid gap-3">
              {data.requests.map((request) => {
                const outcome = outcomes[request.outcome];
                const quoted = request.response
                  ? price(
                      request.response.priceMinimum,
                      request.response.priceMaximum,
                    )
                  : null;
                return (
                  <li
                    className="scroll-mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 target:border-[var(--lime)] target:bg-[var(--lime)]/[0.05]"
                    id={`request-${request.requestId}`}
                    key={request.matchId}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-white/50">
                        {request.categoryName} ·{" "}
                        {request.districtName ?? "Location not specified"} ·{" "}
                        {date(request.createdAt)} · For {request.businessName}
                      </p>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${outcome.style}`}
                      >
                        {outcome.label}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
                      {request.summary}
                    </h2>
                    <p className="mt-2 text-sm text-white/60">
                      {request.response
                        ? `${responseLabels[request.response.status]}${quoted ? ` and quoted ${quoted}` : ""}.`
                        : "You did not respond to this request."}
                    </p>
                  </li>
                );
              })}
            </ul>
            {data.requests.length >= 100 ? (
              <p className="mt-4 text-xs text-white/50">
                Showing your 100 most recent past requests.
              </p>
            ) : null}
          </>
        ) : null}

        {data && !data.requests.length ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-7">
            <p className="font-semibold">No past requests yet.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Requests appear here once they end, with what you answered and
              whether the customer chose you.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
