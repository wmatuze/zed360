import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessCustomerReviewsApiError,
  fetchBusinessCustomerReviews,
} from "@/lib/business-customer-reviews";
import { ReplyForm } from "./reply-form";

export const metadata: Metadata = { title: "Customer reviews" };
export const dynamic = "force-dynamic";

const date = (value: string) =>
  new Intl.DateTimeFormat("en-ZM", {
    dateStyle: "medium",
    timeZone: "Africa/Lusaka",
  }).format(new Date(value));

export default async function BusinessReviewsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/reviews`);

  let data = null;
  let errorMessage = "";
  try {
    data = await fetchBusinessCustomerReviews(session.accessToken, businessId);
  } catch (error) {
    if (
      error instanceof BusinessCustomerReviewsApiError &&
      error.status === 401
    ) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof BusinessCustomerReviewsApiError
        ? error.message
        : "Customer reviews could not be loaded.";
  }

  const reviews = data?.reviews ?? [];
  const unanswered = reviews.filter(({ response }) => !response).length;
  const average = reviews.length
    ? Math.round(
        (reviews.reduce((total, { rating }) => total + rating, 0) /
          reviews.length) *
          10,
      ) / 10
    : null;
  // Reviews still waiting for a reply come first.
  const ordered = [...reviews].sort(
    (a, b) => Number(Boolean(a.response)) - Number(Boolean(b.response)),
  );

  return (
    <main className="px-5 py-6 sm:px-8 lg:px-10">
      <section className="mx-auto max-w-5xl pb-20 pt-14">
        <p className="eyebrow">
          <span /> Customer reviews
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
          {data
            ? `What customers say about ${data.business.name}.`
            : "Customer reviews."}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/50">
          Reviews come only from customers who chose you through a Zed360
          request. You cannot edit or remove a review, but you can reply
          publicly.
        </p>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {data && reviews.length ? (
          <>
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3 text-sm text-white/55">
              <div className="flex flex-row-reverse items-baseline gap-2">
                <dt>average rating</dt>
                <dd className="text-2xl font-semibold text-white">
                  <span aria-hidden className="text-amber-200">
                    ★
                  </span>{" "}
                  {average}
                </dd>
              </div>
              <div className="flex flex-row-reverse items-baseline gap-2">
                <dt>{reviews.length === 1 ? "review" : "reviews"}</dt>
                <dd className="text-2xl font-semibold text-white">
                  {reviews.length}
                </dd>
              </div>
              <div className="flex flex-row-reverse items-baseline gap-2">
                <dt>waiting for your reply</dt>
                <dd
                  className={`text-2xl font-semibold ${unanswered ? "text-amber-100" : "text-white"}`}
                >
                  {unanswered}
                </dd>
              </div>
            </dl>
            <ul className="mt-8 grid gap-4">
              {ordered.map((review) => (
                <li
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
                  key={review.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                      aria-label={`${review.rating} out of 5 stars`}
                      className="text-lg text-amber-200"
                    >
                      {"★".repeat(review.rating)}
                      <span className="text-white/15">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </span>
                    <span className="text-xs text-white/50">
                      Verified customer · {date(review.createdAt)}
                    </span>
                  </div>
                  {review.body ? (
                    <p className="mt-4 whitespace-pre-wrap leading-7 text-white/80">
                      {review.body}
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-white/50">
                      The customer left a rating without a comment.
                    </p>
                  )}
                  <ReplyForm
                    businessId={businessId}
                    existing={review.response?.body ?? null}
                    reviewId={review.id}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {data && !reviews.length ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-7">
            <p className="font-semibold">No reviews yet.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              A customer can review you after they choose your business from the
              responses to their request. Answering requests quickly is the way
              to earn your first review.
            </p>
            <Link
              className="button button-secondary mt-5"
              href="/business/requests"
            >
              See requests →
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
