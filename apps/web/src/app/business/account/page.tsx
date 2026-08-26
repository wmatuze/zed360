import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { redirect } from "next/navigation";
import {
  BusinessAccountApiError,
  fetchBusinessAccount,
  getVerifiedBusinessSession,
} from "@/lib/business-account";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { fetchBusinessNotifications } from "@/lib/business-notifications";
import { claimBusiness, signOut } from "./actions";
import { ClaimButton } from "./claim-button";

export const metadata: Metadata = { title: "Business account" };
export const dynamic = "force-dynamic";

const linkMessages: Record<string, string> = {
  success:
    "Business linked successfully. It is still awaiting Zed360 review and approval.",
  claimed: "That business has already been linked to another owner.",
  "not-eligible":
    "That submission could not be linked to this verified email address.",
  invalid: "The selected business was invalid. Please refresh and try again.",
  unavailable: "We could not link the business right now. Please try again.",
};

const reviewStatusLabels = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Corrections requested",
} as const;

export default async function BusinessAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/business/sign-in?setup=required");

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");

  let account = null;
  let accountError = "";
  let unreadNotifications = 0;
  const [accountResult, notificationsResult] = await Promise.allSettled([
    fetchBusinessAccount(session.accessToken),
    fetchBusinessNotifications(session.accessToken),
  ]);
  if (accountResult.status === "fulfilled") {
    account = accountResult.value;
  } else {
    const error = accountResult.reason;
    if (error instanceof BusinessAccountApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    accountError =
      error instanceof BusinessAccountApiError
        ? error.message
        : "We could not load your business account right now.";
  }
  if (notificationsResult.status === "fulfilled") {
    unreadNotifications = notificationsResult.value.unreadCount;
  }

  const { link } = await searchParams;
  const linkMessage = link ? linkMessages[link] : undefined;
  const hasOperationalBusiness =
    account?.businesses.some(
      (business) =>
        business.status === "active" && business.reviewStatus === "approved",
    ) ?? false;

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-3">
          {hasOperationalBusiness ? (
            <Link className="button button-quiet" href="/business/dashboard">
              Dashboard
            </Link>
          ) : null}
          <Link className="button button-quiet" href="/business/notifications">
            Notifications
            {unreadNotifications ? ` (${unreadNotifications})` : ""}
          </Link>
          <form action={signOut}>
            <button className="button button-quiet" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl pb-20 pt-16 lg:pt-24">
        <p className="eyebrow">
          <span /> Business account
        </p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Your business account.
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-white/48">
          Signed in as {session.email}. Track applications and manage businesses
          connected to this account.
        </p>

        {linkMessage ? (
          <div
            className={`mt-8 rounded-2xl border p-5 text-sm leading-6 ${
              link === "success"
                ? "border-[var(--lime)]/25 bg-[var(--lime)]/8 text-white/75"
                : "border-red-300/20 bg-red-300/8 text-red-100/80"
            }`}
            role="status"
          >
            {linkMessage}
          </div>
        ) : null}

        {accountError ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {accountError}
          </div>
        ) : null}

        {account?.businesses.length ? (
          <div className="mt-10">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Linked businesses
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {account.businesses.map((business) => (
                <article
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
                  key={business.id}
                >
                  <p className="text-lg font-semibold">{business.name}</p>
                  <p className="mt-2 text-sm text-white/48">
                    {business.status === "suspended"
                      ? "Suspended"
                      : business.status === "closed"
                        ? "Closed"
                        : reviewStatusLabels[business.reviewStatus]}{" "}
                    · {business.role}
                  </p>
                  {business.reviewStatus === "pending" &&
                  business.status === "draft" ? (
                    <p className="mt-4 text-sm leading-6 text-white/58">
                      Your email is verified and this application is connected.
                      Zed360 will review it before anything becomes public.
                    </p>
                  ) : null}
                  {business.reviewStatus === "changes_requested" ? (
                    <div className="mt-4 rounded-xl border border-amber-200/20 bg-amber-200/8 p-4 text-sm leading-6 text-amber-50/75">
                      <p className="font-semibold">Corrections are required</p>
                      <p className="mt-1">
                        Update the requested information so Zed360 can continue
                        the review.
                      </p>
                      <Link
                        className="button button-secondary mt-4"
                        href={`/business/${business.id}/profile`}
                      >
                        Correct application →
                      </Link>
                    </div>
                  ) : null}
                  {business.reviewStatus === "rejected" ? (
                    <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm leading-6 text-red-100/80">
                      <p className="font-semibold">Application not approved</p>
                      <p className="mt-1">
                        This business will remain private. Do not submit a
                        duplicate application; Zed360 can reopen this review if
                        the decision needs reconsideration.
                      </p>
                    </div>
                  ) : null}
                  {business.status === "active" &&
                  business.reviewStatus === "approved" ? (
                    <Link
                      className="button button-primary mt-5"
                      href="/business/requests"
                    >
                      View matched requests →
                    </Link>
                  ) : null}
                  {business.role !== "staff" &&
                  business.status === "active" &&
                  business.reviewStatus === "approved" ? (
                    <div className="mt-3 flex flex-col gap-3">
                      <Link
                        className="button button-secondary"
                        href={`/business/${business.id}/coverage`}
                      >
                        Manage service coverage →
                      </Link>
                      <Link
                        className="button button-secondary"
                        href={`/business/${business.id}/catalog`}
                      >
                        Manage digital storefront →
                      </Link>
                    </div>
                  ) : null}
                  {business.latestReviewReason ? (
                    <p className="mt-4 rounded-xl border border-white/8 bg-black/15 p-3 text-sm leading-6 text-white/58">
                      Review note: {business.latestReviewReason}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {account?.claimableBusinesses.length ? (
          <div className="mt-10">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Confirm your submission
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
              We found a draft submitted with your verified email. Linking it
              gives this account owner access; it does not approve the business.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {account.claimableBusinesses.map((business) => {
                const claimBusinessWithId = claimBusiness.bind(
                  null,
                  business.id,
                );
                return (
                  <article
                    className="rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-6"
                    key={business.id}
                  >
                    <p className="text-lg font-semibold">{business.name}</p>
                    <p className="mt-2 text-sm text-white/48">
                      Submitted{" "}
                      {new Date(business.createdAt).toLocaleDateString("en-ZM")}
                    </p>
                    <form action={claimBusinessWithId} className="mt-5">
                      <ClaimButton />
                    </form>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}

        {account &&
        account.businesses.length === 0 &&
        account.claimableBusinesses.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-semibold text-white/85">
              No matching submission yet
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
              Submit your business using the same email address you verified.
              Older submissions can still be connected manually from this page.
            </p>
            <Link className="button button-primary mt-5" href="/for-business">
              Submit a business →
            </Link>
          </div>
        ) : null}

        <div className="mt-10 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-6">
          <p className="text-sm font-semibold text-white/85">
            Access boundary active
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/48">
            A verified email proves control of that address only. Business
            approval and access to customer requests remain separate steps.
          </p>
        </div>
      </section>
    </main>
  );
}
