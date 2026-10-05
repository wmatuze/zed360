import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { AdminUsersApiError, fetchAdminUser } from "@/lib/admin-users";
import { manageUser } from "../actions";
import { UserActionButton } from "../user-action-button";

export const metadata: Metadata = { title: "User access" };
export const dynamic = "force-dynamic";

const results: Record<string, { tone: "success" | "error"; text: string }> = {
  role_granted: { tone: "success", text: "The platform role was granted." },
  role_revoked: { tone: "success", text: "The platform role was revoked." },
  suspended: { tone: "success", text: "The account was suspended." },
  reinstated: { tone: "success", text: "The account was reinstated." },
  authenticator_reset: {
    tone: "success",
    text: "The authenticator was reset and the user was signed out. They set up a new one at their next sign-in.",
  },
  invalid: {
    tone: "error",
    text: "Give a reason of at least 10 characters.",
  },
  "invalid-username": {
    tone: "error",
    text: "Usernames need 3–50 letters, numbers, dots, underscores, or hyphens.",
  },
  "username-required": {
    tone: "error",
    text: "Choose a sign-in username for this team member.",
  },
  "username-taken": {
    tone: "error",
    text: "That username already belongs to another team member.",
  },
  "self-action": {
    tone: "error",
    text: "Ask another administrator to change your own access.",
  },
  "last-admin": {
    tone: "error",
    text: "The final active administrator cannot be suspended or demoted.",
  },
  forbidden: { tone: "error", text: "Administrator access is required." },
  unavailable: { tone: "error", text: "The change could not be saved." },
};

const roles = [
  {
    key: "reviewer",
    label: "Reviewer",
    description:
      "Works the review queues: business applications, profile changes, images, customer reviews, and reports.",
  },
  {
    key: "admin",
    label: "Administrator",
    description:
      "Everything a reviewer can do, plus users and roles, categories, and provinces and districts.",
  },
] as const;

const historyLabels: Record<string, string> = {
  "user.role_granted": "role granted",
  "user.role_revoked": "role revoked",
  "user.suspended": "Account suspended",
  "user.reinstated": "Account reinstated",
  "user.authenticator_reset": "Authenticator reset",
};

const reviewLabels = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Corrections requested",
} as const;

const reasonField =
  "min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm";
const dangerButton =
  "rounded-xl border border-red-300/25 px-5 py-2.5 text-sm font-semibold text-red-100/85 transition hover:bg-red-300/8";

function Reason({ id, placeholder }: { id: string; placeholder: string }) {
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        Reason
      </label>
      <input
        className={reasonField}
        id={id}
        maxLength={1200}
        minLength={10}
        name="reason"
        placeholder={placeholder}
        required
      />
    </>
  );
}

export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { userId } = await params;
  const page = `/admin/users/${userId}`;
  const session = await getVerifiedSession();
  if (!session) redirect(`/admin/sign-in?next=${page}`);

  let detail;
  try {
    detail = await fetchAdminUser(session.accessToken, userId);
  } catch (error) {
    if (error instanceof AdminUsersApiError) {
      if (error.status === 401)
        redirect(`/admin/sign-in?next=${page}&error=session_expired`);
      if (error.status === 404 || error.status === 400) notFound();
    }
    const denied = error instanceof AdminUsersApiError && error.status === 403;
    return (
      <main className="mx-auto max-w-4xl px-5 pb-20 pt-14 sm:px-8 lg:px-10">
        <h1 className="text-4xl font-semibold">
          {denied ? "Administrator access required." : "User unavailable."}
        </h1>
      </main>
    );
  }

  const { user, businesses, history } = detail;
  const isSelf = user.id === detail.viewerId;
  const isTeam = user.roles.length > 0;
  const action = manageUser.bind(null, user.id);
  const result = results[(await searchParams).result ?? ""];
  const name =
    user.displayName ||
    user.username ||
    user.email ||
    user.phone ||
    "Unnamed user";

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-10 sm:px-8 lg:px-10">
      <Link
        className="text-sm text-white/55 transition hover:text-white"
        href="/admin/users"
      >
        ← All users
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 text-sm text-white/55">
            {[user.email, user.phone].filter(Boolean).join(" · ") ||
              "No contact on record"}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {user.username
              ? `Team sign-in username: ${user.username}`
              : "No team sign-in username"}{" "}
            · Joined{" "}
            {new Intl.DateTimeFormat("en-ZM", {
              dateStyle: "medium",
              timeZone: "Africa/Lusaka",
            }).format(new Date(user.createdAt))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSelf ? (
            <span className="rounded-full border border-white/12 px-3 py-1 text-xs text-white/60">
              This is you
            </span>
          ) : null}
          <span
            className={`rounded-full border px-3 py-1 text-xs capitalize ${user.accountStatus === "active" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8 text-[var(--lime)]" : "border-amber-200/30 bg-amber-200/10 text-amber-100"}`}
          >
            {user.accountStatus}
          </span>
        </div>
      </div>

      {result ? (
        <p
          className={`mt-6 rounded-xl border p-4 text-sm ${result.tone === "success" ? "border-[var(--lime)]/25 bg-[var(--lime)]/8 text-white/85" : "border-red-300/25 bg-red-300/8 text-red-100"}`}
          role={result.tone === "error" ? "alert" : "status"}
        >
          {result.text}
        </p>
      ) : null}

      <section aria-labelledby="roles-heading" className="mt-10">
        <h2 className="text-xl font-semibold" id="roles-heading">
          Platform roles
        </h2>
        <p className="mt-2 text-sm leading-6 text-white/50">
          Platform roles are separate from the role someone holds inside a
          business. Every change needs a reason and is kept in the history
          below.
        </p>
        <div className="mt-4 grid gap-3">
          {roles.map((role) => {
            const held = user.roles.includes(role.key);
            const protectedSelf = isSelf && held && role.key === "admin";
            return (
              <div
                className={`rounded-2xl border p-5 ${held ? "border-[var(--lime)]/25 bg-[var(--lime)]/[0.05]" : "border-white/10 bg-white/[0.035]"}`}
                key={role.key}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold">{role.label}</h3>
                  <span
                    className={`text-xs ${held ? "text-[var(--lime)]" : "text-white/50"}`}
                  >
                    {held ? "✓ Has this role" : "Does not have this role"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-white/55">
                  {role.description}
                </p>
                {protectedSelf ? (
                  <p className="mt-4 text-sm text-white/50">
                    You cannot remove your own administrator role. Ask another
                    administrator.
                  </p>
                ) : user.accountStatus === "suspended" && !held ? (
                  <p className="mt-4 text-sm text-white/50">
                    Reinstate this account before granting a role.
                  </p>
                ) : (
                  <form
                    action={action}
                    className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
                  >
                    <input name="role" type="hidden" value={role.key} />
                    {!held && !user.username ? (
                      <>
                        <label
                          className="sr-only"
                          htmlFor={`username-${role.key}`}
                        >
                          Sign-in username
                        </label>
                        <input
                          autoCapitalize="none"
                          autoComplete="off"
                          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm sm:w-48"
                          id={`username-${role.key}`}
                          maxLength={50}
                          minLength={3}
                          name="username"
                          pattern="[A-Za-z0-9._\-]{3,50}"
                          placeholder="Sign-in username"
                          required
                        />
                      </>
                    ) : null}
                    <Reason
                      id={`reason-${role.key}`}
                      placeholder={
                        held
                          ? "Why is this role being removed?"
                          : "Why does this person need this role?"
                      }
                    />
                    {held ? (
                      <UserActionButton
                        action="role_revoked"
                        className={dangerButton}
                        confirmation={`Remove the ${role.label.toLowerCase()} role from ${name}?`}
                      >
                        Remove role
                      </UserActionButton>
                    ) : (
                      <UserActionButton
                        action="role_granted"
                        className="button button-secondary"
                        confirmation={`Give ${name} the ${role.label.toLowerCase()} role?`}
                      >
                        Grant role
                      </UserActionButton>
                    )}
                  </form>
                )}
              </div>
            );
          })}
        </div>
        {isTeam ? null : (
          <p className="mt-4 text-sm leading-6 text-white/50">
            After the first role is granted, this person opens the
            administration sign-in page, chooses “Forgot password” with their
            username to set a password, and sets up an authenticator app.
          </p>
        )}
      </section>

      {isTeam ? (
        <section aria-labelledby="authenticator-heading" className="mt-10">
          <h2 className="text-xl font-semibold" id="authenticator-heading">
            Authenticator app
          </h2>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-sm leading-6 text-white/65">
              {user.hasAuthenticator === null
                ? "Authenticator status is not available from this database."
                : user.hasAuthenticator
                  ? "An authenticator app is set up. It is required at every administration sign-in."
                  : "No authenticator is set up yet. They will be asked to set one up at their next sign-in."}
            </p>
            {user.hasAuthenticator && isSelf ? (
              <p className="mt-3 text-sm text-white/50">
                You cannot reset your own authenticator. Ask another
                administrator.
              </p>
            ) : null}
            {user.hasAuthenticator && !isSelf ? (
              <>
                <p className="mt-3 text-sm leading-6 text-white/50">
                  Reset it only when the person has lost their device, and only
                  after confirming their identity another way, such as a phone
                  call. Resetting signs them out everywhere.
                </p>
                <form
                  action={action}
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                >
                  <Reason
                    id="reason-authenticator"
                    placeholder="How did you confirm it is really them?"
                  />
                  <UserActionButton
                    action="authenticator_reset"
                    className={dangerButton}
                    confirmation={`Reset the authenticator for ${name}? Confirm their identity first.`}
                  >
                    Reset authenticator
                  </UserActionButton>
                </form>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="businesses-heading" className="mt-10">
        <h2 className="text-xl font-semibold" id="businesses-heading">
          Businesses
        </h2>
        {businesses.length ? (
          <ul className="mt-4 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            {businesses.map((business) => {
              const live =
                business.status === "active" &&
                business.reviewStatus === "approved";
              return (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                  key={business.id}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{business.name}</p>
                    <p className="mt-1 text-xs capitalize text-white/50">
                      {business.role} · {reviewLabels[business.reviewStatus]}
                      {business.status === "active"
                        ? ""
                        : ` · ${business.status}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {live ? (
                      <Link
                        className="button button-quiet"
                        href={`/businesses/${business.slug}`}
                      >
                        Public profile ↗
                      </Link>
                    ) : null}
                    <Link
                      className="button button-quiet"
                      href={{
                        pathname: "/admin/reviews",
                        query: { q: business.name },
                      }}
                    >
                      Review record
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/55">
            This account is not linked to any business.
          </p>
        )}
        {businesses.length ? (
          <p className="mt-3 text-xs leading-5 text-white/50">
            Suspending this account does not hide these businesses. Suspend a
            business from its review record.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="status-heading" className="mt-10">
        <h2 className="text-xl font-semibold" id="status-heading">
          Account access
        </h2>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          {user.accountStatus === "suspended" ? (
            <p className="text-sm leading-6 text-amber-100/85">
              Suspended{user.statusReason ? `: ${user.statusReason}` : "."}
            </p>
          ) : (
            <p className="text-sm leading-6 text-white/60">
              Suspension blocks this person from every signed-in part of Zed360
              immediately. Their records and history are kept, and the account
              can be reinstated.
            </p>
          )}
          {isSelf ? (
            <p className="mt-3 text-sm text-white/50">
              You cannot suspend your own account.
            </p>
          ) : (
            <form
              action={action}
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <Reason
                id="reason-status"
                placeholder={
                  user.accountStatus === "active"
                    ? "Why is this account being suspended?"
                    : "Why is access being restored?"
                }
              />
              {user.accountStatus === "active" ? (
                <UserActionButton
                  action="suspended"
                  className={dangerButton}
                  confirmation={`Suspend ${name} across Zed360?`}
                >
                  Suspend account
                </UserActionButton>
              ) : (
                <UserActionButton
                  action="reinstated"
                  className="button button-primary"
                  confirmation={`Restore ${name}'s access to Zed360?`}
                >
                  Reinstate account
                </UserActionButton>
              )}
            </form>
          )}
        </div>
      </section>

      <section aria-labelledby="history-heading" className="mt-10">
        <h2 className="text-xl font-semibold" id="history-heading">
          Access history
        </h2>
        {history.length ? (
          <ol className="mt-4 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
            {history.map((event) => {
              const label =
                historyLabels[event.action] ??
                event.action.replaceAll(/[._]/g, " ");
              return (
                <li className="p-4" key={event.id}>
                  <p className="text-sm font-medium">
                    {event.role
                      ? `${event.role === "admin" ? "Administrator" : "Reviewer"} ${label}`
                      : label.charAt(0).toUpperCase() + label.slice(1)}
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {new Intl.DateTimeFormat("en-ZM", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Lusaka",
                    }).format(new Date(event.createdAt))}{" "}
                    · by {event.actor}
                  </p>
                  {event.reason ? (
                    <p className="mt-2 text-sm leading-6 text-white/60">
                      “{event.reason}”
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm text-white/55">
            No role or access changes have been recorded for this account.
          </p>
        )}
      </section>
    </main>
  );
}
