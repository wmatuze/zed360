import type { BusinessNotificationList } from "@zed360/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessNotificationsApiError,
  fetchBusinessNotifications,
} from "@/lib/business-notifications";
import { relativeTime } from "@/lib/relative-time";
import {
  archiveAllReadNotifications,
  archiveNotification,
  markAllNotificationsRead,
  markNotificationRead,
  restoreNotification,
} from "./actions";

export const metadata: Metadata = { title: "Business notifications" };
export const dynamic = "force-dynamic";

type Notification = BusinessNotificationList["notifications"][number];

const kinds = {
  request_matched: { glyph: "→", label: "New request", open: "Open request" },
  customer_selected: { glyph: "★", label: "You were chosen", open: "See it" },
  business_review_decision: {
    glyph: "✓",
    label: "Zed360 review",
    open: "Open",
  },
} as const;

const textButton =
  "text-xs font-semibold text-white/60 underline-offset-4 transition hover:text-white hover:underline";

function NotificationRow({
  notification,
  archived,
}: {
  notification: Notification;
  archived: boolean;
}) {
  const kind = kinds[notification.type];
  const unread = !notification.readAt;
  // A plain link, not next/link: opening marks the notification as read, so it
  // must only happen on a real click and never from a prefetch.
  const href = `/business/notifications/${notification.id}/open`;
  return (
    <li
      className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${unread ? "bg-[var(--lime)]/[0.06]" : ""}`}
    >
      <a className="group flex min-w-0 flex-1 items-start gap-4" href={href}>
        <span
          aria-hidden
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-base font-bold ${unread ? "bg-[var(--lime)] text-[var(--ink)]" : "bg-white/8 text-white/55"}`}
        >
          {kind.glyph}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/55">
            {unread ? (
              <span className="rounded-full bg-[var(--lime)] px-2 py-0.5 text-[.65rem] font-bold uppercase tracking-wide text-[var(--ink)]">
                New
              </span>
            ) : null}
            <span>{kind.label}</span>
            <span aria-hidden>·</span>
            <span>{notification.business.name}</span>
            <span aria-hidden>·</span>
            <time dateTime={notification.createdAt}>
              {relativeTime(notification.createdAt)}
            </time>
          </span>
          <span
            className={`mt-1 block transition group-hover:text-[var(--lime)] ${unread ? "font-semibold text-white" : "font-medium text-white/80"}`}
          >
            {notification.title}
          </span>
          <span className="mt-1 line-clamp-2 block text-sm leading-6 text-white/55">
            {notification.body}
          </span>
        </span>
      </a>
      <div className="flex shrink-0 items-center gap-4 pl-14 sm:pl-0">
        {archived ? (
          <form action={restoreNotification.bind(null, notification.id)}>
            <button className="button button-quiet" type="submit">
              Move to inbox
            </button>
          </form>
        ) : (
          <>
            {unread ? (
              <form action={markNotificationRead.bind(null, notification.id)}>
                <button className={textButton} type="submit">
                  Mark read
                </button>
              </form>
            ) : null}
            <form action={archiveNotification.bind(null, notification.id)}>
              <button className={textButton} type="submit">
                Archive
              </button>
            </form>
            <a
              className={`button ${unread ? "button-primary" : "button-quiet"}`}
              href={href}
            >
              {kind.open}
            </a>
          </>
        )}
      </div>
    </li>
  );
}

function NotificationGroup({
  title,
  notifications,
  archived,
}: {
  title: string | null;
  notifications: Notification[];
  archived: boolean;
}) {
  if (!notifications.length) return null;
  return (
    <section className="mt-6">
      {title ? (
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
          {title}
        </h2>
      ) : null}
      <ul className="divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
        {notifications.map((notification) => (
          <NotificationRow
            archived={archived}
            key={notification.id}
            notification={notification}
          />
        ))}
      </ul>
    </section>
  );
}

export default async function BusinessNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const parameters = await searchParams;
  const view = parameters.view === "archived" ? "archived" : "inbox";
  const parsedPage = Number(parameters.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");

  let data = null;
  let errorMessage = "";
  try {
    data = await fetchBusinessNotifications(session.accessToken, view, page);
  } catch (error) {
    if (error instanceof BusinessNotificationsApiError && error.status === 401)
      redirect("/business/sign-in?error=session_expired");
    errorMessage =
      error instanceof BusinessNotificationsApiError
        ? error.message
        : "Notifications could not be loaded.";
  }

  const archived = view === "archived";
  const notifications = data?.notifications ?? [];
  const unread = notifications.filter(({ readAt }) => !readAt);
  const read = notifications.filter(({ readAt }) => readAt);
  const unreadCount = data?.unreadCount ?? 0;
  const tab = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm transition ${active ? "border-[var(--lime)] bg-[var(--lime)] font-semibold text-[var(--ink)]" : "border-white/12 text-white/65 hover:border-white/30 hover:text-white"}`;

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <AutoRefresh />
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link href="/">
          <BrandLogo />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="button button-quiet" href="/business/dashboard">
            Dashboard
          </Link>
          <Link className="button button-quiet" href="/business/requests">
            Requests
          </Link>
          <Link className="button button-quiet" href="/business/account">
            Account
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl pb-20 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">
              <span /> Business workspace
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Notifications
            </h1>
            <p className="mt-3 text-white/55" role="status">
              {archived
                ? "Notifications you have put away."
                : unreadCount
                  ? `${unreadCount} new ${unreadCount === 1 ? "notification" : "notifications"}.`
                  : "You are up to date."}
            </p>
          </div>
          {!archived && data ? (
            <div className="flex flex-wrap gap-2">
              {unreadCount ? (
                <form action={markAllNotificationsRead}>
                  <button className="button button-secondary" type="submit">
                    Mark all read
                  </button>
                </form>
              ) : null}
              {read.length ? (
                <form action={archiveAllReadNotifications}>
                  <button className="button button-quiet" type="submit">
                    Archive all read
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
        </div>

        <nav aria-label="Notification views" className="mt-8 flex gap-2">
          <Link
            aria-current={archived ? undefined : "page"}
            className={tab(!archived)}
            href="/business/notifications"
          >
            Inbox{unreadCount ? ` · ${unreadCount} new` : ""}
          </Link>
          <Link
            aria-current={archived ? "page" : undefined}
            className={tab(archived)}
            href="/business/notifications?view=archived"
          >
            Archived
          </Link>
        </nav>

        {errorMessage ? (
          <div
            className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        {archived ? (
          <NotificationGroup
            archived
            notifications={notifications}
            title={null}
          />
        ) : (
          <>
            <NotificationGroup
              archived={false}
              notifications={unread}
              title={read.length ? "New" : null}
            />
            <NotificationGroup
              archived={false}
              notifications={read}
              title={unread.length ? "Earlier" : null}
            />
          </>
        )}

        {data && !notifications.length ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] p-7">
            <p className="font-semibold">
              {archived ? "Nothing archived." : "No notifications yet."}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              {archived
                ? "Notifications you archive are kept here."
                : "You will be told here, and by email, when a customer request is matched to your business or a customer chooses you."}
            </p>
          </div>
        ) : null}

        {data && data.totalPages > 1 ? (
          <nav
            aria-label="Notification pages"
            className="mt-8 flex items-center justify-between text-sm"
          >
            {data.page > 1 ? (
              <Link
                className="button button-quiet"
                href={`/business/notifications?view=${view}&page=${data.page - 1}`}
              >
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-white/50">
              Page {data.page} of {data.totalPages}
            </span>
            {data.page < data.totalPages ? (
              <Link
                className="button button-quiet"
                href={`/business/notifications?view=${view}&page=${data.page + 1}`}
              >
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        {!archived ? (
          <p className="mt-8 text-xs leading-5 text-white/50">
            New requests and customer choices are also emailed to you. Change
            that under{" "}
            <Link
              className="underline underline-offset-4 hover:text-white"
              href="/business/account"
            >
              Email alerts
            </Link>
            .
          </p>
        ) : null}
      </section>
    </main>
  );
}
