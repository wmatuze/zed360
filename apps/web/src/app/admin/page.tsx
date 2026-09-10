import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminAccessApiError, fetchAdminAccess } from "@/lib/admin-access";
import { getVerifiedBusinessSession } from "@/lib/business-account";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

const workspaces = [
  {
    href: "/admin/users",
    title: "Users and roles",
    description: "Manage platform roles and suspend or reinstate user access.",
  },
  {
    href: "/admin/reviews",
    title: "Business reviews",
    description: "Approve applications and manage business lifecycle actions.",
  },
  {
    href: "/admin/profile-revisions",
    title: "Profile revisions",
    description: "Review identity-sensitive changes to public profiles.",
  },
  {
    href: "/admin/customer-reviews",
    title: "Customer reviews",
    description: "Resolve customer reviews flagged for human moderation.",
  },
  {
    href: "/admin/media-reviews",
    title: "Identity media",
    description: "Review business logos and cover images before publication.",
  },
  {
    href: "/admin/content-reports",
    title: "Content reports",
    description: "Investigate reported businesses and customer reviews.",
  },
] as const;

const planned = [
  "Business directory",
  "Verification",
  "Categories",
  "Geography",
  "Analytics",
  "Promotions",
] as const;

export default async function AdminPage() {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin");

  let access;
  try {
    access = await fetchAdminAccess(session.accessToken);
  } catch (error) {
    if (error instanceof AdminAccessApiError && error.status === 401) {
      redirect("/business/sign-in?next=/admin&error=session_expired");
    }
    const denied = error instanceof AdminAccessApiError && error.status === 403;
    return (
      <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 lg:px-10">
        <p className="eyebrow">
          <span /> Platform operations
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em]">
          {denied
            ? "Administration access required."
            : "Administration is unavailable."}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/52">
          {denied
            ? "Your account is authenticated but has not been assigned an administrator or reviewer role."
            : "The administration service could not be reached. Please try again shortly."}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-12 sm:px-8 lg:px-10">
      <p className="eyebrow">
        <span /> Platform operations
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
            Administration workspace.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-white/48">
            Review consequential changes, protect trust signals, and keep an
            attributable record of platform decisions.
          </p>
        </div>
        <span className="rounded-full border border-[var(--lime)]/20 bg-[var(--lime)]/8 px-4 py-2 text-sm text-[var(--lime)]">
          {access.role}
        </span>
      </div>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        {workspaces.map((workspace) => (
          <Link
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-0.5 hover:border-[var(--lime)]/25 hover:bg-white/[0.055]"
            href={workspace.href}
            key={workspace.href}
          >
            <h2 className="text-xl font-semibold">{workspace.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/48">
              {workspace.description}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-12 border-t border-white/8 pt-8">
        <h2 className="text-lg font-semibold">Next administration modules</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {planned.map((item) => (
            <span
              className="rounded-full border border-white/8 px-3 py-2 text-sm text-white/35"
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
