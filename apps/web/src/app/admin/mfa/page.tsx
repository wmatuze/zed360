import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminAccessApiError, fetchAdminAccess } from "@/lib/admin-access";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { adminNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";
import { MfaEnrollForm, MfaVerifyForm } from "./mfa-forms";

export const metadata: Metadata = {
  title: "Confirm administrator sign in",
  description: "Two-step verification for Zed360 administration.",
};
export const dynamic = "force-dynamic";

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = adminNextPath(next);
  const session = await getVerifiedSession();
  if (!session) {
    redirect(`/admin/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  let mfaVerified = false;
  try {
    ({ mfaVerified } = await fetchAdminAccess(session.accessToken));
  } catch (error) {
    if (error instanceof AdminAccessApiError && error.status === 403) {
      return (
        <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-14 sm:px-8 lg:pt-24">
          <h1 className="text-4xl font-semibold tracking-[-0.055em]">
            Administration access required.
          </h1>
          <p className="mt-4 leading-7 text-white/52">
            The signed-in account does not have an administrator or reviewer
            role. Sign out before using a different account.
          </p>
        </main>
      );
    }
    redirect("/admin/sign-in?error=session_expired");
  }
  if (mfaVerified) redirect(nextPath);

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-10 lg:pt-24">
      <div>
        <p className="eyebrow">
          <span /> Two-step verification
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          {factor ? "Confirm it’s you." : "Protect this account."}
        </h1>
        <p className="mt-5 max-w-md leading-7 text-white/48">
          A password alone is not enough to open the administrator workspace.
          Codes change every 30 seconds and never leave your device.
        </p>
      </div>
      {factor ? (
        <MfaVerifyForm factorId={factor.id} nextPath={nextPath} />
      ) : (
        <MfaEnrollForm nextPath={nextPath} />
      )}
    </main>
  );
}
