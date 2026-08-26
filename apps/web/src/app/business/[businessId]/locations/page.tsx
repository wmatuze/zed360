import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessLocationsApiError,
  fetchBusinessLocations,
} from "@/lib/business-locations";
import { fetchPublicReferenceData } from "@/lib/public-businesses";
import { LocationManager } from "./location-manager";

export const metadata: Metadata = { title: "Business locations" };
export const dynamic = "force-dynamic";

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/locations`);
  let locations = null;
  let referenceData = null;
  let errorMessage = "";
  try {
    [locations, referenceData] = await Promise.all([
      fetchBusinessLocations(session.accessToken, businessId),
      fetchPublicReferenceData(),
    ]);
  } catch (error) {
    if (error instanceof BusinessLocationsApiError && error.status === 401)
      redirect("/business/sign-in?error=session_expired");
    errorMessage =
      error instanceof Error
        ? error.message
        : "Business locations could not be loaded.";
  }
  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/">
          <BrandLogo />
        </Link>
        <Link className="button button-quiet" href="/business/dashboard">
          Dashboard
        </Link>
      </header>
      <section className="mx-auto max-w-6xl pb-20 pt-14">
        <p className="eyebrow">
          <span /> Branch network
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
          Manage where {locations?.business.name ?? "your business"} operates.
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/50">
          Add branches, keep addresses current, and select the primary location
          customers see first. Deactivated locations disappear publicly but
          their information is retained.
        </p>
        {errorMessage ? (
          <p className="mt-6 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : null}
        {locations && referenceData ? (
          <LocationManager
            businessId={businessId}
            locations={locations.locations}
            referenceData={referenceData}
          />
        ) : null}
      </section>
    </main>
  );
}
