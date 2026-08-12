import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
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
}: {
  params: Promise<{ businessId: string }>;
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

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link className="flex items-center gap-3" href="/">
          <BrandLogo />
        </Link>
        <div className="flex items-center gap-2">
          <Link className="button button-quiet" href="/business/dashboard">Dashboard</Link>
          <Link className="button button-quiet" href="/business/account">Account</Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl pb-20 pt-14 lg:pt-20">
        <p className="eyebrow"><span /> Service coverage</p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Where and how can customers receive your services?
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-white/48">
          Configure each service accurately. Zed360 shows this as owner-provided information and uses it for location-aware matching.
        </p>

        {errorMessage ? (
          <div className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {coverage && referenceData ? (
          <div className="mt-10 grid gap-6">
            <div className="rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-5 text-sm leading-6 text-white/65">
              Editing coverage does not claim that Zed360 has independently verified delivery or travel. Keep it current so customers are not misled.
            </div>
            {coverage.services.map((service) => (
              <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8" key={service.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lime)]">{service.categoryName}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">{service.name}</h2>
                <CoverageForm businessId={businessId} referenceData={referenceData} service={service} />
              </article>
            ))}
            {!coverage.services.length ? (
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
