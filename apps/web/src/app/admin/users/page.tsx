import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { AdminUsersApiError, fetchAdminUsers } from "@/lib/admin-users";
import { manageUser } from "./actions";
import { UserActionButton } from "./user-action-button";

export const metadata: Metadata = { title: "User administration" };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  role_granted: "The platform role was granted.",
  role_revoked: "The platform role was revoked.",
  suspended: "The user account was suspended.",
  reinstated: "The user account was reinstated.",
  invalid:
    "Select a valid action and provide a reason of at least 10 characters.",
  forbidden: "Administrator access is required.",
  "not-found": "That user no longer exists.",
  "last-admin": "The final administrator cannot be suspended or demoted.",
  unavailable: "The user action could not be saved.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; result?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/users");

  let result;
  try {
    result = await fetchAdminUsers(session.accessToken, { q, page });
  } catch (error) {
    if (error instanceof AdminUsersApiError && error.status === 401) {
      redirect("/admin/sign-in?next=/admin/users&error=session_expired");
    }
    const denied = error instanceof AdminUsersApiError && error.status === 403;
    return (
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 lg:px-10">
        <h1 className="text-4xl font-semibold">
          {denied ? "Administrator access required." : "Users unavailable."}
        </h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 lg:px-10">
      <p className="eyebrow">
        <span /> Identity and access
      </p>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.05em]">
            Users and roles.
          </h1>
          <p className="mt-3 max-w-2xl text-white/48">
            Manage platform authority and suspend access without deleting
            attributable history.
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/55">
          {result.total} users
        </span>
      </div>

      <form className="mt-8 flex max-w-2xl gap-3">
        <input
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[var(--lime)]/45"
          defaultValue={q}
          name="q"
          placeholder="Search name, email, or phone"
        />
        <button className="button button-primary">Search</button>
      </form>

      {params.result && messages[params.result] ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          {messages[params.result]}
        </p>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
        {result.users.length ? (
          result.users.map((user) => {
            const action = manageUser.bind(null, user.id);
            return (
              <details
                className="group border-b border-white/8 last:border-b-0"
                key={user.id}
              >
                <summary className="grid cursor-pointer list-none gap-2 px-5 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {user.displayName ||
                        user.email ||
                        user.phone ||
                        "Unnamed user"}
                    </p>
                    <p className="mt-1 truncate text-sm text-white/40">
                      {user.email || user.phone || user.id}
                    </p>
                  </div>
                  <span className="text-sm text-white/45">
                    {user.businessCount} business
                    {user.businessCount === 1 ? "" : "es"}
                  </span>
                  <span
                    className={
                      user.accountStatus === "active"
                        ? "text-sm text-[var(--lime)]"
                        : "text-sm text-amber-200"
                    }
                  >
                    {user.accountStatus}
                  </span>
                </summary>
                <div className="border-t border-white/8 bg-black/15 px-5 py-5">
                  <div className="flex flex-wrap gap-2">
                    {user.roles.length ? (
                      user.roles.map((role) => (
                        <span
                          className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60"
                          key={role}
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-white/35">
                        No platform role
                      </span>
                    )}
                  </div>

                  <form
                    action={action}
                    className="mt-5 grid gap-3 lg:grid-cols-[minmax(12rem,.5fr)_minmax(16rem,1fr)_auto_auto]"
                  >
                    <select
                      className="rounded-xl border border-white/10 bg-[var(--panel)] px-3 py-2"
                      name="role"
                      required
                    >
                      <option value="reviewer">Reviewer</option>
                      <option value="admin">Administrator</option>
                    </select>
                    <input
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                      minLength={10}
                      name="reason"
                      placeholder="Reason for changing access"
                      required
                    />
                    <UserActionButton
                      action="role_granted"
                      className="button button-quiet"
                      confirmation="Grant this platform role to the selected user?"
                    >
                      Grant role
                    </UserActionButton>
                    <UserActionButton
                      action="role_revoked"
                      className="button button-quiet"
                      confirmation="Revoke this platform role from the selected user?"
                    >
                      Revoke role
                    </UserActionButton>
                  </form>

                  <form action={action} className="mt-3 flex flex-wrap gap-3">
                    <input
                      className="min-w-[16rem] flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                      minLength={10}
                      name="reason"
                      placeholder="Reason for account status change"
                      required
                    />
                    <UserActionButton
                      action={
                        user.accountStatus === "active"
                          ? "suspended"
                          : "reinstated"
                      }
                      className={
                        user.accountStatus === "active"
                          ? "rounded-xl border border-red-300/25 px-5 py-3 text-sm font-semibold text-red-100/80"
                          : "button button-primary"
                      }
                      confirmation={
                        user.accountStatus === "active"
                          ? "Suspend this user across Zed360?"
                          : "Reinstate this user's access to Zed360?"
                      }
                    >
                      {user.accountStatus === "active"
                        ? "Suspend account"
                        : "Reinstate account"}
                    </UserActionButton>
                  </form>
                  {user.statusReason ? (
                    <p className="mt-3 text-xs text-white/35">
                      Current status reason: {user.statusReason}
                    </p>
                  ) : null}
                </div>
              </details>
            );
          })
        ) : (
          <p className="p-6 text-white/45">No users match this search.</p>
        )}
      </div>

      {result.totalPages > 1 ? (
        <nav
          aria-label="User pages"
          className="mt-6 flex items-center justify-between"
        >
          {result.page > 1 ? (
            <Link
              className="button button-quiet"
              href={{
                pathname: "/admin/users",
                query: { q: q || undefined, page: result.page - 1 },
              }}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-white/40">
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link
              className="button button-quiet"
              href={{
                pathname: "/admin/users",
                query: { q: q || undefined, page: result.page + 1 },
              }}
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
