import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AdminCustomerReviewApiError,
  fetchAdminCustomerReviews,
} from "@/lib/admin-customer-reviews";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { reviewCustomerReview } from "./actions";

export const metadata: Metadata = { title: "Customer review moderation" };
export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  approved: "Review approved and published on the business profile.",
  rejected: "Review rejected and returned to the customer with your note.",
  invalid: "A rejection reason is required.",
  forbidden: "Your account does not have reviewer access.",
  "not-found": "That review no longer exists.",
  "already-reviewed": "That review was already moderated.",
  unavailable: "The review decision could not be saved.",
};

export default async function CustomerReviewModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/customer-reviews");
  let queue = null;
  let accessDenied = false;
  let loadError = "";
  try {
    queue = await fetchAdminCustomerReviews(session.accessToken);
  } catch (error) {
    if (error instanceof AdminCustomerReviewApiError && error.status === 401) {
      redirect(
        "/admin/sign-in?next=/admin/customer-reviews&error=session_expired",
      );
    } else if (
      error instanceof AdminCustomerReviewApiError &&
      error.status === 403
    ) {
      accessDenied = true;
    } else {
      loadError =
        error instanceof AdminCustomerReviewApiError
          ? error.message
          : "The customer review queue could not be loaded.";
    }
  }
  const { result } = await searchParams;

  return (
    <main className="px-5 text-white sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-6xl pb-20 pt-14 lg:pt-20">
        <p className="eyebrow">
          <span /> Trust operations
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Flagged customer reviews.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/48">
              Review exceptions from customers with confirmed Zed360
              interactions. Approval confirms policy compliance, not the truth
              of every claim.
            </p>
          </div>
          {queue ? (
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/55">
              {queue.reviews.length} pending · {queue.viewerRole}
            </span>
          ) : null}
        </div>

        {result && resultMessages[result] ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70">
            {resultMessages[result]}
          </div>
        ) : null}
        {accessDenied ? (
          <div className="mt-8 rounded-2xl border border-amber-200/20 bg-amber-200/8 p-5 text-sm text-amber-100/80">
            Reviewer access is required.
          </div>
        ) : null}
        {loadError ? (
          <div className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80">
            {loadError}
          </div>
        ) : null}
        {queue?.reviews.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-white/55">
            There are no customer reviews awaiting moderation.
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {queue?.reviews.map((review) => {
            const action = reviewCustomerReview.bind(null, review.id);
            return (
              <article
                className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"
                key={review.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">
                      {review.business.name}
                    </p>
                    <p className="mt-1 text-xs text-white/38">
                      Verified interaction ·{" "}
                      {new Date(review.createdAt).toLocaleDateString("en-ZM", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>
                  <span className="text-lg text-[var(--lime)]">
                    {"★".repeat(review.rating)}
                    <span className="text-white/20">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </span>
                </div>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/65">
                  {review.body || "Rating only—no written comment."}
                </p>
                <form action={action} className="mt-5">
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-[var(--lime)]/55"
                    maxLength={500}
                    name="note"
                    placeholder="Required when rejecting"
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      className="button button-primary"
                      name="decision"
                      type="submit"
                      value="approved"
                    >
                      Approve
                    </button>
                    <button
                      className="button border border-red-300/25 text-red-100/80"
                      name="decision"
                      type="submit"
                      value="rejected"
                    >
                      Reject
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
