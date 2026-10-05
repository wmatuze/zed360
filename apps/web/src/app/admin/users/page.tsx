import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { AdminUsersApiError, fetchAdminUsers } from "@/lib/admin-users";

export const metadata: Metadata = { title: "User administration" };
export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  "not-found": "That user no longer exists.",
};

const roleLabels = { admin: "Administrator", reviewer: "Reviewer" } as const;

const views = [
  { key: "everyone", label: "Everyone", role: "all", status: "all" },
  { key: "team", label: "Zed360 team", role: "team", status: "all" },
  { key: "admin", label: "Administrators", role: "admin", status: "all" },
  { key: "reviewer", label: "Reviewers", role: "reviewer", status: "all" },
  { key: "none", label: "Business users", role: "none", status: "all" },
  { key: "suspended", label: "Suspended", role: "all", status: "suspended" },
] as const;

type View = (typeof views)[number];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    view?: string;
    result?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const view: View = views.find(({ key }) => key === params.view) ?? views[0];
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/users");

  let result;
  try {
    result = await fetchAdminUsers(session.accessToken, {
      q,
      page,
      role: view.role,
      status: view.status,
    });
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

  const query = (overrides: { view?: string; page?: number }) => ({
    q: q || undefined,
    view:
      (overrides.view ?? view.key) === "everyone"
        ? undefined
        : (overrides.view ?? view.key),
    page: overrides.page && overrides.page > 1 ? overrides.page : undefined,
  });
  const viewCounts: Partial<Record<View["key"], number>> = {
    everyone: result.counts.everyone,
    team: result.counts.team,
    suspended: result.counts.suspended,
  };

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 lg:px-10">
      <p className="eyebrow">
        <span /> Identity and access
      </p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em]">
        Users and roles.
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-white/50">
        Everyone with a Zed360 account: your team and the people who run
        businesses. Customers have no accounts. Open a user to change their
        access.
      </p>

      <nav aria-label="Filter users" className="mt-8 flex flex-wrap gap-2">
        {views.map((item) => (
          <Link
            aria-current={item.key === view.key ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm transition ${item.key === view.key ? "border-[var(--lime)] bg-[var(--lime)] font-semibold text-[var(--ink)]" : "border-white/12 text-white/65 hover:border-[var(--lime)]/40 hover:text-white"}`}
            href={{
              pathname: "/admin/users",
              query: query({ view: item.key }),
            }}
            key={item.key}
          >
            {item.label}
            {viewCounts[item.key] === undefined || q
              ? ""
              : ` · ${viewCounts[item.key]}`}
          </Link>
        ))}
      </nav>

      <form className="mt-5 flex max-w-2xl gap-3">
        {view.key === "everyone" ? null : (
          <input name="view" type="hidden" value={view.key} />
        )}
        <label className="sr-only" htmlFor="user-search">
          Search users
        </label>
        <input
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[var(--lime)]/45"
          defaultValue={q}
          id="user-search"
          name="q"
          placeholder="Search name, username, email, or phone"
        />
        <button className="button button-primary">Search</button>
        {q ? (
          <Link
            className="button button-quiet"
            href={{
              pathname: "/admin/users",
              query: { view: query({}).view },
            }}
          >
            Clear
          </Link>
        ) : null}
      </form>

      {params.result && messages[params.result] ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          {messages[params.result]}
        </p>
      ) : null}

      <p className="mt-8 text-sm text-white/50">
        {result.total} {result.total === 1 ? "user" : "users"}
        {q ? ` matching “${q}”` : ""}
      </p>
      <ul className="mt-3 overflow-hidden rounded-2xl border border-white/10">
        {result.users.length ? (
          result.users.map((user) => (
            <li
              className="border-b border-white/8 last:border-b-0"
              key={user.id}
            >
              <Link
                className="grid gap-2 px-5 py-4 transition hover:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-5"
                href={`/admin/users/${user.id}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {user.displayName ||
                      user.username ||
                      user.email ||
                      user.phone ||
                      "Unnamed user"}
                    {user.id === result.viewerId ? (
                      <span className="ml-2 text-xs font-normal text-white/50">
                        (you)
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-sm text-white/50">
                    {user.email || user.phone || "No contact on record"}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <span
                      className="rounded-full border border-[var(--lime)]/25 bg-[var(--lime)]/8 px-3 py-1 text-xs text-[var(--lime)]"
                      key={role}
                    >
                      {roleLabels[role]}
                    </span>
                  ))}
                  {user.roles.length && user.hasAuthenticator === false ? (
                    <span className="rounded-full border border-amber-200/25 bg-amber-200/8 px-3 py-1 text-xs text-amber-100/85">
                      No authenticator yet
                    </span>
                  ) : null}
                </span>
                <span className="text-sm text-white/50">
                  {user.businessCount}{" "}
                  {user.businessCount === 1 ? "business" : "businesses"}
                </span>
                <span
                  className={`text-sm capitalize ${user.accountStatus === "active" ? "text-white/60" : "font-semibold text-amber-200"}`}
                >
                  {user.accountStatus}
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li className="p-6 text-white/50">
            No users match this {q ? "search" : "filter"}.
          </li>
        )}
      </ul>

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
                query: query({ page: result.page - 1 }),
              }}
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-white/50">
            Page {result.page} of {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link
              className="button button-quiet"
              href={{
                pathname: "/admin/users",
                query: query({ page: result.page + 1 }),
              }}
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}

      <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.035] p-6">
        <h2 className="font-semibold">Adding someone to the Zed360 team</h2>
        <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm leading-6 text-white/60">
          <li>
            The person needs a Zed360 account first. Find them here and open
            their page.
          </li>
          <li>
            Grant the reviewer or administrator role and choose their sign-in
            username.
          </li>
          <li>
            They open the administration sign-in page, choose “Forgot password”
            to set a password, and set up an authenticator app on their first
            sign-in.
          </li>
        </ol>
      </section>
    </main>
  );
}
