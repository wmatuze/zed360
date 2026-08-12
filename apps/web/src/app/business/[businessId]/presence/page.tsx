import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import { fetchBusinessPresence } from "@/lib/business-presence";
import { confirmProfile, saveAvailability } from "./actions";

export const metadata: Metadata = { title: "Availability and freshness" };
export const dynamic = "force-dynamic";

const availabilityLabels = {
  available: "Available",
  busy: "Busy — response may take longer",
  temporarily_unavailable: "Temporarily unavailable",
} as const;

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-ZM", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Never";

export default async function BusinessPresencePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { businessId } = await params;
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/presence`);
  const presence = await fetchBusinessPresence(session.accessToken, businessId);
  const result = (await searchParams).result;
  const save = saveAvailability.bind(null, businessId, presence.business.slug);
  const confirm = confirmProfile.bind(null, businessId, presence.business.slug);

  return (
    <main className="min-h-screen bg-[var(--ink)] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/">
          <BrandLogo />
        </Link>
        <Link className="button button-quiet" href="/business/dashboard">
          Dashboard
        </Link>
      </header>
      <section className="mx-auto max-w-5xl pb-20 pt-14">
        <p className="eyebrow">
          <span /> Live business signals
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] sm:text-5xl">
          Keep {presence.business.name} current.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/50">
          Tell customers whether you can help now, and periodically confirm that
          your approved profile remains accurate.
        </p>

        {result === "availability-saved" ? (
          <p className="mt-6 rounded-xl border border-[var(--lime)]/25 bg-[var(--lime)]/8 p-4 text-sm">
            Availability updated immediately.
          </p>
        ) : null}
        {result === "profile-confirmed" ? (
          <p className="mt-6 rounded-xl border border-[var(--lime)]/25 bg-[var(--lime)]/8 p-4 text-sm">
            Profile information confirmed as current.
          </p>
        ) : null}
        {result === "invalid" || result === "error" ? (
          <p className="mt-6 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100">
            We could not save that update. Check it and try again.
          </p>
        ) : null}

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <form
            action={save}
            className="rounded-2xl border border-white/10 bg-white/[.035] p-6"
          >
            <h2 className="text-xl font-semibold">Current availability</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Last updated: {date(presence.availability.updatedAt)}. This signal
              is treated as current for 7 days.
            </p>
            <label className="mt-5 block text-sm text-white/65">
              Operating signal
              <select
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#10141c] px-4"
                defaultValue={presence.availability.status}
                name="availability"
              >
                {Object.entries(availabilityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-5 block text-sm text-white/65">
              Short customer note (optional)
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/20 p-4"
                defaultValue={presence.availability.note ?? ""}
                maxLength={240}
                name="note"
                placeholder="For example: Orders dispatch within two working days."
              />
            </label>
            <button className="button button-primary mt-5" type="submit">
              Update availability
            </button>
          </form>

          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
            <h2 className="text-xl font-semibold">Profile freshness</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">
              Last confirmed: {date(presence.profile.lastConfirmedAt)}. Zed360
              considers a profile current for 90 days.
            </p>
            <div className="mt-5 rounded-xl border border-white/8 bg-black/15 p-4 text-sm leading-6 text-white/55">
              Confirm only if your description, contacts, services, products,
              and coverage remain correct. If something changed, update that
              section instead.
            </div>
            <form action={confirm}>
              <button className="button button-secondary mt-5" type="submit">
                Everything is still correct
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                className="text-sm text-[var(--lime)] hover:underline"
                href={`/business/${businessId}/profile`}
              >
                Edit profile details
              </Link>
              <span className="text-white/20">·</span>
              <Link
                className="text-sm text-[var(--lime)] hover:underline"
                href={`/business/${businessId}/coverage`}
              >
                Update coverage
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
