import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { BusinessWorkspaceNav } from "@/components/business-workspace-nav";

export default async function BusinessWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  return (
    <div className="min-h-screen bg-[var(--ink)] text-white">
      <header className="border-b border-white/8 px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/">
            <BrandLogo />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="button button-quiet"
              href={`/business/dashboard?business=${businessId}`}
            >
              ← Dashboard
            </Link>
            <Link className="button button-quiet" href="/business/requests">
              Requests
            </Link>
            <Link
              className="button button-quiet"
              href="/business/notifications"
            >
              Notifications
            </Link>
          </div>
        </div>
        <div className="mt-4">
          <BusinessWorkspaceNav businessId={businessId} />
        </div>
      </header>
      {children}
    </div>
  );
}
