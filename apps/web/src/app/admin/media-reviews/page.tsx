import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { redirect } from "next/navigation";
import { signOut } from "@/app/business/account/actions";
import {
  AdminMediaReviewApiError,
  fetchAdminMediaReviews,
} from "@/lib/admin-media-reviews";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import { reviewMedia } from "./actions";

export const metadata: Metadata = { title: "Media reviews" };
export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  approved: "Image approved and now eligible for the public profile.",
  rejected: "Image rejected and kept off the public profile.",
  invalid: "A rejection reason is required.",
  forbidden: "Your account does not have reviewer access.",
  "not-found": "That image no longer exists.",
  "already-reviewed": "That image was already reviewed.",
  unavailable: "The review could not be saved.",
};

export default async function MediaReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin/media-reviews");
  let queue = null;
  let accessDenied = false;
  let loadError = "";
  try {
    queue = await fetchAdminMediaReviews(session.accessToken);
  } catch (error) {
    if (error instanceof AdminMediaReviewApiError && error.status === 401) {
      redirect(
        "/business/sign-in?next=/admin/media-reviews&error=session_expired",
      );
    } else if (
      error instanceof AdminMediaReviewApiError &&
      error.status === 403
    ) {
      accessDenied = true;
    } else {
      loadError =
        error instanceof AdminMediaReviewApiError
          ? error.message
          : "The media review queue could not be loaded.";
    }
  }
  const { result } = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-3">
          <Link className="button button-quiet" href="/admin/customer-reviews">
            Customer reviews
          </Link>
          <Link className="button button-quiet" href="/admin/reviews">
            Business reviews
          </Link>
          <form action={signOut}>
            <button className="button button-quiet">Sign out</button>
          </form>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl pb-20 pt-14 lg:pt-20">
        <p className="eyebrow">
          <span /> Trust operations
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Media review queue.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/48">
              Check that each image is relevant, safe, and accurately described
              before publishing it.
            </p>
          </div>
          {queue ? (
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/55">
              {queue.media.length} pending · {queue.viewerRole}
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
        {queue?.media.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-white/55">
            There are no images awaiting review.
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {queue?.media.map((media) => {
            const action = reviewMedia.bind(null, media.id);
            return (
              <article
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]"
                key={media.id}
              >
                <div className="relative aspect-[4/3] bg-white/5">
                  <Image
                    alt={media.altText}
                    className="object-contain"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    src={media.url}
                    unoptimized
                  />
                </div>
                <div className="p-6">
                  <p className="text-lg font-semibold">{media.business.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[var(--lime)]">
                    {media.purpose.replaceAll("_", " ")}
                    {media.productName ? ` · ${media.productName}` : ""}
                  </p>
                  <p className="mt-3 text-sm text-white/60">
                    {media.title || media.altText}
                  </p>
                  {media.caption ? (
                    <p className="mt-2 text-sm leading-6 text-white/42">
                      {media.caption}
                    </p>
                  ) : null}
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
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
