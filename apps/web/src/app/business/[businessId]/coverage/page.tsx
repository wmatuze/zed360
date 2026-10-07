import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessServiceCoverageApiError,
  fetchBusinessServiceCoverage,
  fetchCoverageReferenceData,
} from "@/lib/business-service-coverage";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CoverageForm } from "./coverage-form";

export const metadata: Metadata = { title: "Service coverage" };
export const dynamic = "force-dynamic";

export default async function ServiceCoveragePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ added?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/business/sign-in?setup=required");
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");
  const { businessId } = await params;

  let coverage = null;
  let referenceData = null;
  let errorMessage = "";
  try {
    [coverage, referenceData] = await Promise.all([
      fetchBusinessServiceCoverage(session.accessToken, businessId),
      fetchCoverageReferenceData(),
    ]);
  } catch (error) {
    if (
      error instanceof BusinessServiceCoverageApiError &&
      error.status === 401
    ) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof BusinessServiceCoverageApiError
        ? error.message
        : "Service coverage could not be loaded.";
  }

  const justAdded = (await searchParams).added === "1";
  // Services that requests cannot reach yet come first.
  const services = [...(coverage?.services ?? [])].sort(
    (a, b) => Number(a.options.length > 0) - Number(b.options.length > 0),
  );

  return (
    <main className="px-5 py-6 sm:px-8 lg:px-10">
      <section className="mx-auto w-full max-w-6xl pb-20 pt-14 lg:pt-20">
        <p className="eyebrow">
          <span /> Service coverage
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Where and how can customers receive your services?
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-white/48">
          Configure each service accurately. Zed360 shows this as owner-provided
          information and uses it for location-aware matching.
        </p>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {coverage && referenceData ? (
          <div className="mt-10 grid gap-6">
            <div className="rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-5 text-sm leading-6 text-white/65">
              Editing coverage does not claim that Zed360 has independently
              verified delivery or travel. Keep it current so customers are not
              misled.
            </div>
            {justAdded ? (
              <div
                className="rounded-2xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 p-5 text-sm leading-6"
                role="status"
              >
                <span className="font-semibold">Service added.</span> One more
                step: choose how customers receive it below. Until then,
                requests cannot be matched to it.
              </div>
            ) : null}
            {services.map((service) => (
              <article
                className={`scroll-mt-40 rounded-3xl border p-6 sm:p-8 ${service.options.length ? "border-white/10 bg-white/[0.035]" : "border-amber-200/25 bg-amber-200/[0.04]"}`}
                id={`service-${service.id}`}
                key={service.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lime)]">
                    {service.categoryName}
                  </p>
                  {service.options.length ? null : (
                    <span className="rounded-full border border-amber-200/30 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      Needs coverage
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
                  {service.name}
                </h2>
                <CoverageForm
                  businessId={businessId}
                  referenceData={referenceData}
                  service={service}
                />
              </article>
            ))}
            {!services.length ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 text-sm text-white/55">
                Add a service before configuring coverage.
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
