import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchAdminAccess } from "@/lib/admin-access";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { AdminPasswordUpdateForm } from "./password-update-form";

export const metadata: Metadata = {
  title: "Choose administrator password",
  description: "Choose a password for your Zed360 administrator account.",
};
export const dynamic = "force-dynamic";

export default async function AdminUpdatePasswordPage() {
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?error=session_expired");

  try {
    await fetchAdminAccess(session.accessToken);
  } catch {
    redirect("/admin/sign-in?error=session_expired");
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-10 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-10 lg:pt-24">
      <div>
        <p className="eyebrow">
          <span /> Administrator security
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
          Choose a new password.
        </h1>
        <p className="mt-5 max-w-md leading-7 text-white/48">
          This password applies only to the administrator workspace. Business
          owners continue to use their separate sign-in flow.
        </p>
      </div>
      <AdminPasswordUpdateForm />
    </main>
  );
}
