import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessApiError, fetchAdminAccess } from "@/lib/admin-access";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { safeNextPath } from "@/lib/safe-next-path";
import { AdminSignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Administrator sign in",
  description: "Restricted access for Zed360 platform operations.",
};
export const dynamic = "force-dynamic";

export default async function AdminSignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    password?: string;
  }>;
}) {
  const parameters = await searchParams;
  const requestedNext = safeNextPath(parameters.next, "/admin");
  const nextPath =
    requestedNext === "/admin" || requestedNext.startsWith("/admin/")
      ? requestedNext
      : "/admin";
  const session = await getVerifiedSession();
  let hasAdminAccess = false;
  let wrongAccount = false;
  if (session) {
    try {
      await fetchAdminAccess(session.accessToken);
      hasAdminAccess = true;
    } catch (error) {
      if (error instanceof AdminAccessApiError && error.status === 403) {
        wrongAccount = true;
      }
    }
  }
  if (hasAdminAccess) redirect(nextPath);

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-10 lg:pt-24">
      <div>
        <p className="eyebrow">
          <span /> Restricted platform access
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Administrator sign in.
        </h1>
        <p className="mt-5 max-w-md leading-7 text-white/48">
          This workspace is separate from business-owner tools. Access is
          determined by a Zed360 platform role after identity verification.
        </p>
      </div>
      <div>
        {parameters.password === "updated" ? (
          <p
            className="mb-4 rounded-xl border border-[var(--lime)]/20 bg-[var(--lime)]/8 px-4 py-3 text-sm text-white/75"
            role="status"
          >
            Your password is ready. Sign in with your administrator username.
          </p>
        ) : null}
        {parameters.error === "session_expired" ||
        parameters.error === "invalid_or_expired" ? (
          <p
            className="mb-4 rounded-xl border border-amber-200/20 bg-amber-200/8 px-4 py-3 text-sm text-amber-100/80"
            role="alert"
          >
            Your administrator session has expired. Sign in again to continue.
          </p>
        ) : null}
        {wrongAccount ? (
          <p
            className="mb-4 rounded-xl border border-amber-200/20 bg-amber-200/8 px-4 py-3 text-sm text-amber-100/80"
            role="alert"
          >
            The currently signed-in account does not have a platform role. Sign
            out before using a different administrator account.
          </p>
        ) : null}
        <AdminSignInForm nextPath={nextPath} />
      </div>
    </main>
  );
}
