import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessNotificationsApiError,
  fetchBusinessNotifications,
} from "@/lib/business-notifications";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "./actions";

export const metadata: Metadata = { title: "Business notifications" };
export const dynamic = "force-dynamic";

export default async function BusinessNotificationsPage() {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");

  let data = null;
  let errorMessage = "";
  try {
    data = await fetchBusinessNotifications(session.accessToken);
  } catch (error) {
    if (error instanceof BusinessNotificationsApiError && error.status === 401)
      redirect("/business/sign-in?error=session_expired");
    errorMessage =
      error instanceof BusinessNotificationsApiError
        ? error.message
        : "Notifications could not be loaded.";
  }

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <Link href="/">
          <BrandLogo />
        </Link>
        <Link className="button button-quiet" href="/business/account">
          Business account
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl pb-20 pt-12 lg:pt-16">
        <p className="eyebrow">
          <span /> Business activity
        </p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Notifications.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/48">
              New opportunities and important customer decisions for businesses
              you own or manage.
            </p>
          </div>
          {data?.unreadCount ? (
            <form action={markAllNotificationsRead}>
              <button className="button button-quiet">Mark all as read</button>
            </form>
          ) : null}
        </div>

        {errorMessage ? (
          <div className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/8 p-5 text-sm text-red-100/80">
            {errorMessage}
          </div>
        ) : null}

        {data?.notifications.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-6 text-white/55">
            You have no notifications yet.
          </div>
        ) : null}

        <div className="mt-8 divide-y divide-white/8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
          {data?.notifications.map((notification) => {
            const markRead = markNotificationRead.bind(null, notification.id);
            return (
              <article
                className={`grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-5 ${notification.readAt ? "bg-transparent" : "bg-[var(--lime)]/7"}`}
                key={notification.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-xs text-white/38">
                      {notification.business.name} ·{" "}
                      {new Date(notification.createdAt).toLocaleString("en-ZM", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {!notification.readAt ? (
                      <span className="rounded-full bg-[var(--lime)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink)]">
                        New
                      </span>
                    ) : null}
                  </div>
                    <h2 className="mt-1 text-base font-semibold">
                      {notification.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-white/55">
                      {notification.body}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {notification.actionUrl ? (
                    <Link
                      className="button button-primary px-4 py-2 text-sm"
                      href={notification.actionUrl}
                    >
                      View
                    </Link>
                  ) : null}
                  {!notification.readAt ? (
                    <form action={markRead}>
                      <button className="button button-quiet px-4 py-2 text-sm">
                        Mark as read
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
