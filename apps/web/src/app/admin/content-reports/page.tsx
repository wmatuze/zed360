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
                  className="rounded-2xl border border-white/10 bg-white/[.035] p-6"
                  key={report.id}
                >
                  <div className="flex flex-wrap justify-between gap-3">
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
                    <span className="rounded-full border border-amber-200/20 px-3 py-1 text-xs text-amber-100/70">
                      Open
                    </span>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-white/65">
                    {report.details}
                  </p>
                  {report.reporterEmail ? (
                    <p className="mt-2 text-xs text-white/35">
                      Reporter contact: {report.reporterEmail}
                    </p>
                  ) : null}
                  <form
                    action={action}
                    className="mt-6 grid gap-3 border-t border-white/8 pt-5"
                  >
                    <label className="text-sm text-white/60">
                      Decision reason
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-white"
                        minLength={10}
                        name="note"
                        required
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="button button-secondary"
                        name="decision"
                        value="dismissed"
                      >
                        Dismiss report
                      </button>
                      {report.targetType === "review" ? (
                        <button
                          className="button button-secondary"
                          name="decision"
                          value="content_removed"
                        >
                          Remove review
                        </button>
                      ) : null}
                      {report.targetType === "business" &&
                      queue.viewerRole === "admin" ? (
                        <button
                          className="button button-secondary"
                          name="decision"
                          value="business_suspended"
                        >
                          Suspend business
                        </button>
                      ) : null}
                    </div>
                  </form>
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
