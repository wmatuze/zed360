import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessOperatingHoursApiError,
  fetchBusinessOperatingHours,
} from "@/lib/business-operating-hours";
import { HoursForm } from "./hours-form";

export const metadata: Metadata = { title: "Operating hours" };
export const dynamic = "force-dynamic";

export default async function OperatingHoursPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/hours`);

  let hours = null;
  let errorMessage = "";
  try {
    hours = await fetchBusinessOperatingHours(session.accessToken, businessId);
  } catch (error) {
    if (
      error instanceof BusinessOperatingHoursApiError &&
      error.status === 401
    ) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof BusinessOperatingHoursApiError
        ? error.message
        : "Operating hours could not be loaded.";
  }

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/">
          <BrandLogo />
        </Link>
        <Link className="button button-quiet" href="/business/dashboard">
          Dashboard
        </Link>
      </header>
      <section className="mx-auto w-full max-w-6xl pb-20 pt-14 lg:pt-20">
        <p className="eyebrow">
          <span /> Customer information
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Set your operating hours.
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-white/48">
          Hours are set separately for each location and publish immediately.
          “Open now” is calculated using Zambia time (
          {hours?.timezone ?? "Africa/Lusaka"}).
        </p>
        <div className="mt-8 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 p-5 text-sm leading-6 text-white/65">
          Operating hours describe your normal schedule. Use Availability on the
          dashboard for temporary closures, delays, or unusually high demand.
        </div>
        {errorMessage ? (
          <p
            className="mt-6 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
        {hours ? (
          <div className="mt-8 grid gap-6">
            {hours.locations.map((location) => (
              <HoursForm
                businessId={businessId}
                key={location.id}
                location={location}
              />
            ))}
            {!hours.locations.length ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-sm text-white/50">
                This business does not have an active location yet.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
