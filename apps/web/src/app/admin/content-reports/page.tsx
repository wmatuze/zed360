import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/business/account/actions";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  AdminContentReportApiError,
  fetchAdminContentReports,
} from "@/lib/admin-content-reports";
import { decideReport } from "./actions";
import { DecisionButton } from "./decision-button";

const reasonLabels = {
  misleading: "Misleading",
  scam_or_fraud: "Scam or fraud",
  impersonation: "Impersonation",
  prohibited_content: "Prohibited content",
  harassment: "Harassment",
  privacy: "Privacy",
  spam: "Spam",
  other: "Other",
} as const;

export default async function ContentReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin/content-reports");
  let queue = null;
  let accessDenied = false;
  let error = "";
  try {
    queue = await fetchAdminContentReports(session.accessToken);
  } catch (caught) {
    if (caught instanceof AdminContentReportApiError && caught.status === 401) {
      redirect(
        "/business/sign-in?next=/admin/content-reports&error=session_expired",
      );
    } else if (
      caught instanceof AdminContentReportApiError &&
      caught.status === 403
    ) {
      accessDenied = true;
    } else {
      error =
        caught instanceof AdminContentReportApiError
          ? caught.message
          : "The content report queue could not be loaded.";
    }
  }
  const result = (await searchParams).result;
  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/">
          <BrandLogo />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link className="button button-quiet" href="/admin/reviews">
            Business reviews
          </Link>
          <form action={signOut}>
            <button className="button button-quiet" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <section className="mx-auto max-w-6xl pb-20 pt-14">
        <p className="eyebrow">
          <span /> Trust operations
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em]">
          Open content reports.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/48">
          A report is an allegation, not proof. Examine the target and evidence
          before taking proportionate action.
        </p>
        {result ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
            Decision result: {result.replaceAll("_", " ")}.
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100">
            {error}
          </p>
        ) : null}
        {accessDenied ? (
          <div className="mt-8 rounded-2xl border border-amber-200/20 bg-amber-200/8 p-6">
            <h2 className="text-lg font-semibold">Reviewer access required</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              Your email is signed in, but this account has not been assigned
              an administrator or reviewer role.
            </p>
          </div>
        ) : null}
        <div className="mt-8 grid gap-5">
          {queue?.reports.length ? (
            queue.reports.map((report) => {
              const action = decideReport.bind(null, report.id);
              return (
                <article
                  className="rounded-2xl border border-white/10 bg-white/[.035] p-5 sm:p-6"
                  key={report.id}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {report.targetLabel}
                      </h2>
                      <p className="mt-1 text-xs text-white/38">
                        {report.targetType} · {reasonLabels[report.reason]} ·{" "}
                        {new Date(report.createdAt).toLocaleDateString(
                          "en-ZM",
                          { dateStyle: "medium" },
                        )}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-200/20 px-3 py-1 text-xs leading-5 text-amber-100/70">
                      Open
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-white/65">
                    {report.details}
                  </p>
                  <details className="group mt-4 border-t border-white/8 pt-4">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--lime)] marker:hidden">
                      Review report and decide
                      <span className="ml-2 inline-block transition group-open:rotate-90">
                        →
                      </span>
                    </summary>
                    <div className="mt-5 rounded-xl border border-white/8 bg-black/15 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-white/65">
                        {report.details}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/40">
                        {report.targetSlug ? (
                          <Link
                            className="font-semibold text-[var(--lime)] hover:underline"
                            href={`/businesses/${report.targetSlug}`}
                            target="_blank"
                          >
                            View reported public profile ↗
                          </Link>
                        ) : (
                          <span>The reported public profile is unavailable.</span>
                        )}
                        {report.reporterEmail ? (
                          <span>Reporter contact: {report.reporterEmail}</span>
                        ) : null}
                      </div>
                    </div>
                    <form action={action} className="mt-5 grid gap-3">
                      <label className="text-sm text-white/60">
                        Decision reason
                        <span className="mt-1 block text-xs font-normal leading-5 text-white/35">
                          Required for the audit record. Enter at least 10
                          characters explaining the evidence and decision.
                        </span>
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white"
                          maxLength={1200}
                          minLength={10}
                          name="note"
                          required
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <DecisionButton
                          decision="dismissed"
                          label="Dismiss report"
                        />
                        {report.targetType === "review" ? (
                          <DecisionButton
                            confirmation="Remove this customer review from the public business profile? The decision will be recorded."
                            danger
                            decision="content_removed"
                            label="Remove review"
                          />
                        ) : null}
                        {report.targetType === "business" &&
                        queue.viewerRole === "admin" ? (
                          <DecisionButton
                            confirmation={`Suspend ${report.targetLabel}? Its public profile will be hidden and it will lose access to customer requests until an administrator reinstates it.`}
                            danger
                            decision="business_suspended"
                            label="Suspend business"
                          />
                        ) : null}
                      </div>
                    </form>
                  </details>
                </article>
              );
            })
          ) : queue ? (
            <p className="rounded-2xl border border-white/10 p-6 text-white/45">
              No open content reports.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
