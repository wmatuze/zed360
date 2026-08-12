import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { redirect } from "next/navigation";
import {
  BusinessRequestsApiError,
  fetchMatchedBusinessRequests,
} from "@/lib/business-requests";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ResponseForm } from "./response-form";

export const metadata: Metadata = { title: "Matched requests" };
export const dynamic = "force-dynamic";

const timingLabels = {
  as_soon_as_possible: "As soon as possible",
  today: "Today",
  this_week: "This week",
  specific_date: "On a specific date",
  flexible: "Flexible",
} as const;

function moneyRange(minimum: number | null, maximum: number | null) {
  const format = new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency: "ZMW",
    maximumFractionDigits: 0,
  });
  if (minimum !== null && maximum !== null)
    return `${format.format(minimum)} – ${format.format(maximum)}`;
  if (minimum !== null) return `From ${format.format(minimum)}`;
  if (maximum !== null) return `Up to ${format.format(maximum)}`;
  return "Budget not specified";
}

export default async function BusinessRequestsPage() {
  if (!isSupabaseConfigured()) redirect("/business/sign-in?setup=required");

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");

  let data = null;
  let errorMessage = "";
  try {
    data = await fetchMatchedBusinessRequests(session.accessToken);
  } catch (error) {
    if (error instanceof BusinessRequestsApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof BusinessRequestsApiError
        ? error.message
        : "We could not load matched requests right now.";
  }

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-3">
          <Link className="button button-quiet" href="/business/dashboard">
            Dashboard
          </Link>
          <Link className="button button-quiet" href="/business/notifications">
            Notifications
          </Link>
          <Link className="button button-quiet" href="/business/account">
            Business account
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl pb-20 pt-16 lg:pt-24">
        <p className="eyebrow">
          <span /> Business opportunities
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Requests matched to your business.
        </h1>
        <p className="mt-5 max-w-2xl leading-7 text-white/48">
          Only active, Zed360-approved businesses can see these requests. Each
          result is limited to the information needed to assess the work.
        </p>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {data?.requests.length ? (
          <div className="mt-10 grid gap-5">
            {data.requests.map(({ matchId, business, request, response }) => (
              <article
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-7"
                key={matchId}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-[var(--lime)]/25 bg-[var(--lime)]/8 px-3 py-1 text-[var(--lime)]">
                    {request.categoryName}
                  </span>
                  <span className="text-white/38">For {business.name}</span>
                </div>
                <h2 className="mt-4 text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                  {request.summary}
                </h2>
                {request.details ? (
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-white/58">
                    {request.details}
                  </p>
                ) : null}
                <dl className="mt-6 grid gap-4 border-t border-white/8 pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-white/35">Location</dt>
                    <dd className="mt-1 text-white/78">
                      {request.districtName ?? "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">When needed</dt>
                    <dd className="mt-1 text-white/78">
                      {request.timing
                        ? timingLabels[request.timing]
                        : "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Budget</dt>
                    <dd className="mt-1 text-white/78">
                      {moneyRange(request.budgetMinimum, request.budgetMaximum)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/35">Posted</dt>
                    <dd className="mt-1 text-white/78">
                      {new Date(request.createdAt).toLocaleDateString("en-ZM", {
                        dateStyle: "medium",
                      })}
                    </dd>
                  </div>
                </dl>
                {response ? (
                  <p className="mt-5 rounded-xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 px-4 py-3 text-sm text-white/70">
                    Response sent. You can update it while this request remains
                    active.
                  </p>
                ) : null}
                {business.role === "owner" || business.role === "manager" ? (
                  <ResponseForm matchId={matchId} response={response} />
                ) : (
                  <p className="mt-5 text-sm text-white/45">
                    An owner or manager can respond to this request.
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : data ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-7">
            <p className="font-semibold">No active matches yet</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
              New requests will appear here when their service category and
              district match one of your approved business services.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
