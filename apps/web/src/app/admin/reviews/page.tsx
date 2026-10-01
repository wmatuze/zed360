import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AdminReviewApiError,
  fetchAdminReviewQueue,
} from "@/lib/admin-reviews";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { reviewBusiness } from "./actions";
import { ReviewButtons } from "./review-buttons";

export const metadata: Metadata = { title: "Business reviews" };
export const dynamic = "force-dynamic";

const resultMessages: Record<string, string> = {
  approved: "Business approved and activated.",
  rejected: "Business rejected and kept unpublished.",
  changes_requested: "Corrections requested from the business owner.",
  suspended: "Business suspended and made unavailable.",
  approval_revoked: "Business approval revoked and the profile unpublished.",
  reopened: "The rejected submission has been reopened for review.",
  reinstated: "Business reinstated and active again.",
  invalid: "Add a clear reason for this review action.",
  forbidden: "Your account does not have reviewer access.",
  "not-ready":
    "That action is not allowed from the current state, or its required checks are incomplete.",
  "not-found": "The selected business no longer exists.",
  unavailable: "The review could not be saved. Please try again.",
};

const reviewLabels = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Corrections requested",
} as const;

const decisionLabels = {
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Corrections requested",
  suspended: "Suspended",
  approval_revoked: "Approval revoked",
  reopened: "Review reopened",
  reinstated: "Reinstated",
} as const;

function display(value: string | null) {
  return value || "Not provided";
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; q?: string; status?: string }>;
}) {
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/reviews");

  let queue = null;
  let accessDenied = false;
  let loadError = "";
  try {
    queue = await fetchAdminReviewQueue(session.accessToken);
  } catch (error) {
    if (error instanceof AdminReviewApiError && error.status === 401) {
      redirect("/admin/sign-in?next=/admin/reviews&error=session_expired");
    } else if (error instanceof AdminReviewApiError && error.status === 403) {
      accessDenied = true;
    } else {
      loadError =
        error instanceof AdminReviewApiError
          ? error.message
          : "The review queue could not be loaded.";
    }
  }

  const { result, q = "", status = "all" } = await searchParams;
  const resultMessage = result ? resultMessages[result] : undefined;
  const pendingCount =
    queue?.businesses.filter(({ reviewStatus }) => reviewStatus === "pending")
      .length ?? 0;
  const normalizedQuery = q.trim().toLowerCase();
  const filteredBusinesses =
    queue?.businesses.filter((business) => {
      const matchesStatus =
        status === "all" ||
        business.status === status ||
        business.reviewStatus === status;
      const searchable = [
        business.name,
        business.ownerEmail,
        business.contact.email,
        business.contact.phone,
        ...business.services.flatMap((service) => [
          service.name,
          service.categoryName,
        ]),
        ...business.locations.flatMap((location) => [
          location.name,
          location.districtName,
          location.provinceName,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && searchable.includes(normalizedQuery);
    }) ?? [];

  return (
    <main className="px-5 text-white sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-6xl pb-20 pt-14 lg:pt-20">
        <p className="eyebrow">
          <span /> Trust operations
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Business review queue.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/48">
              Review submitted evidence carefully. Approval activates a
              business; PACRA registration remains a separate trust signal.
            </p>
          </div>
          {queue ? (
            <p className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/55">
              {pendingCount} pending · {queue.viewerRole}
            </p>
          ) : null}
        </div>

        {queue ? (
          <form className="mt-8 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:grid-cols-[minmax(0,1fr)_13rem_auto]">
            <input
              className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-[var(--lime)]/45"
              defaultValue={q}
              name="q"
              placeholder="Search business, owner, service, or location"
            />
            <select
              className="rounded-xl border border-white/10 bg-[var(--panel)] px-4 py-3"
              defaultValue={status}
              name="status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="changes_requested">Corrections requested</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
            <button className="button button-primary">Filter</button>
          </form>
        ) : null}

        {resultMessage ? (
          <div
            className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70"
            role="status"
          >
            {resultMessage}
          </div>
        ) : null}

        {accessDenied ? (
          <div className="mt-10 rounded-2xl border border-amber-200/20 bg-amber-200/8 p-6">
            <h2 className="text-lg font-semibold">Reviewer access required</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Your email is authenticated, but your Zed360 account has not been
              assigned an admin or reviewer role. Use the documented first-admin
              setup command from the project terminal.
            </p>
          </div>
        ) : null}

        {loadError ? (
          <div
            className="mt-10 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {loadError}
          </div>
        ) : null}

        {queue && filteredBusinesses.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-white/55">
            No businesses match the current search and status filters.
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          {filteredBusinesses.map((business) => {
            const reviewWithId = reviewBusiness.bind(null, business.id);
            return (
              <details
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
                key={business.id}
              >
                <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 transition hover:bg-white/[0.04] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{business.name}</p>
                    <p className="mt-1 truncate text-sm text-white/40">
                      {display(business.ownerEmail || business.contact.email)}
                    </p>
                  </div>
                  <span className="text-sm text-white/45">
                    {business.status === "suspended"
                      ? "Suspended"
                      : reviewLabels[business.reviewStatus]}{" "}
                    · {new Date(business.createdAt).toLocaleDateString("en-ZM")}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs ${business.contactVerified ? "border-[var(--lime)]/25 text-[var(--lime)]" : "border-amber-200/25 text-amber-100/75"}`}
                  >
                    {business.contactVerified
                      ? "Contact verified"
                      : "Contact not verified"}
                  </span>
                </summary>
                <article className="border-t border-white/8 bg-black/15 p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-2xl font-semibold tracking-[-0.035em]">
                        {business.name}
                      </p>
                      <p className="mt-2 text-sm text-white/45">
                        {business.status === "suspended"
                          ? "Suspended"
                          : reviewLabels[business.reviewStatus]}{" "}
                        · submitted{" "}
                        {new Date(business.createdAt).toLocaleDateString(
                          "en-ZM",
                        )}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${business.contactVerified ? "border-[var(--lime)]/25 text-[var(--lime)]" : "border-amber-200/25 text-amber-100/75"}`}
                    >
                      {business.contactVerified
                        ? "Contact verified"
                        : "Contact not verified"}
                    </span>
                  </div>

                  {business.status === "draft" &&
                  (business.reviewStatus === "pending" ||
                    business.reviewStatus === "changes_requested") ? (
                    <div
                      className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                        business.approvalReadiness.ready
                          ? "border-[var(--lime)]/20 bg-[var(--lime)]/8 text-white/75"
                          : "border-amber-200/20 bg-amber-200/8 text-amber-50/75"
                      }`}
                    >
                      {business.approvalReadiness.ready
                        ? "Ready for Zed360 review."
                        : business.approvalReadiness.missing.includes(
                              "linked_owner",
                            ) ||
                            business.approvalReadiness.missing.includes(
                              "verified_contact",
                            )
                          ? "Waiting for the business owner to verify their email and link this application."
                          : "This application is missing required ownership information."}
                    </div>
                  ) : null}

                  <p className="mt-5 max-w-3xl text-sm leading-6 text-white/58">
                    {display(business.description)}
                  </p>

                  <div className="mt-6 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="font-semibold text-white/80">
                        Owner and contact
                      </p>
                      <p className="mt-2 leading-6 text-white/48">
                        Owner: {display(business.ownerEmail)}
                      </p>
                      <p className="leading-6 text-white/48">
                        Email: {display(business.contact.email)}
                      </p>
                      <p className="leading-6 text-white/48">
                        Phone: {display(business.contact.phone)}
                      </p>
                      <p className="leading-6 text-white/48">
                        WhatsApp: {display(business.contact.whatsapp)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-white/80">
                        Services and location
                      </p>
                      {business.services.map((service) => (
                        <p
                          className="mt-2 leading-6 text-white/48"
                          key={`${service.categoryName}-${service.name}`}
                        >
                          {service.name} · {service.categoryName}
                        </p>
                      ))}
                      {business.locations.map((location) => (
                        <p
                          className="mt-2 leading-6 text-white/48"
                          key={`${location.name}-${location.districtName}`}
                        >
                          {display(location.address)} ·{" "}
                          {display(location.districtName)},{" "}
                          {display(location.provinceName)}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="font-semibold text-white/80">
                        Registration declaration
                      </p>
                      <p className="mt-2 leading-6 text-white/48">
                        {business.registration
                          ? `${business.registration.status.replaceAll("_", " ")} · ${display(business.registration.registeredLegalName)} · ${display(business.registration.registrationNumber)}`
                          : "No declaration found"}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-white/32">
                        This is owner-provided information, not a PACRA
                        verification result.
                      </p>
                    </div>
                  </div>

                  {business.latestReview ? (
                    <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 p-4 text-sm text-white/50">
                      Latest decision:{" "}
                      {decisionLabels[business.latestReview.decision]}
                      {business.latestReview.reason
                        ? ` — ${business.latestReview.reason}`
                        : ""}
                    </div>
                  ) : null}

                  <form
                    action={reviewWithId}
                    className="mt-6 border-t border-white/8 pt-6"
                  >
                    <label className="block max-w-3xl">
                      <span className="mb-2 block text-sm font-medium text-white/70">
                        Review reason or audit note
                      </span>
                      <textarea
                        className="min-h-24 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-[var(--lime)]/55"
                        maxLength={1200}
                        name="reason"
                        placeholder="Required for rejection, correction, suspension, or revocation; optional for approval, reopening, or reinstatement."
                      />
                    </label>
                    <div className="mt-4">
                      <ReviewButtons
                        approvalReady={business.approvalReadiness.ready}
                        reviewStatus={business.reviewStatus}
                        status={business.status}
                      />
                    </div>
                  </form>
                </article>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}
