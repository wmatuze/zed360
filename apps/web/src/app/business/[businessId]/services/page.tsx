import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessServicesApiError,
  fetchBusinessServices,
} from "@/lib/business-services";
import { fetchPublicReferenceData } from "@/lib/public-businesses";
import { ServiceManager } from "./service-manager";

export const metadata: Metadata = { title: "Business services" };
export const dynamic = "force-dynamic";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/services`);

  let management = null;
  let referenceData = null;
  let errorMessage = "";
  try {
    [management, referenceData] = await Promise.all([
      fetchBusinessServices(session.accessToken, businessId),
      fetchPublicReferenceData(),
    ]);
  } catch (error) {
    if (error instanceof BusinessServicesApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof Error
        ? error.message
        : "Business services could not be loaded.";
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
          <span /> Services
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
          Manage what {management?.business.name ?? "your business"} offers.
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/50">
          Add services, maintain price guidance, pause availability, and archive
          services you no longer offer. Configure coverage separately for each
          active service.
        </p>
        {errorMessage ? (
          <p className="mt-6 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : null}
        {management && referenceData ? (
          <ServiceManager
            businessId={businessId}
            referenceData={referenceData}
            services={management.services}
          />
        ) : null}
      </section>
    </main>
  );
}
