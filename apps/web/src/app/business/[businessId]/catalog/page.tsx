import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessCatalogApiError,
  fetchBusinessCatalog,
} from "@/lib/business-catalog";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { CatalogManager } from "./catalog-manager";

export const metadata: Metadata = { title: "Business storefront" };
export const dynamic = "force-dynamic";

export default async function BusinessCatalogPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/business/sign-in?setup=required");
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");
  const { businessId } = await params;

  let catalog = null;
  let errorMessage = "";
  try {
    catalog = await fetchBusinessCatalog(session.accessToken, businessId);
  } catch (error) {
    if (error instanceof BusinessCatalogApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    errorMessage =
      error instanceof BusinessCatalogApiError
        ? error.message
        : "The business storefront could not be loaded.";
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
        <p className="eyebrow">
          <span /> Digital storefront
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Show customers what your business can do.
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-white/48">
          Add display-only products, work samples, and profile images. Zed360
          helps customers discover and contact you; transactions remain direct.
        </p>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {catalog ? <CatalogManager catalog={catalog} /> : null}
      </section>
    </main>
  );
}
