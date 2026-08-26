import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import { fetchBusinessProfile } from "@/lib/business-profile-management";
import { saveProfile } from "./actions";

export default async function BusinessProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { businessId } = await params;
  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/profile`);
  const profile = await fetchBusinessProfile(session.accessToken, businessId);
  const values = profile.pending?.proposed ?? profile.current;
  const isCorrection = profile.business.reviewStatus === "changes_requested";
  const save = saveProfile.bind(null, businessId);
  const result = (await searchParams).result;
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
          <span /> Business profile
        </p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em]">
          {isCorrection ? "Correct" : "Edit"} {profile.business.name}.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-white/50">
          {isCorrection
            ? "Update the information identified by Zed360. Saving these corrections returns the application to review; it does not publish the business."
            : "Routine profile changes publish immediately. Zed360 keeps the previous values and who changed them for accountability."}
        </p>
        {result === "saved" ? (
          <p className="mt-6 rounded-xl border border-[var(--lime)]/25 bg-[var(--lime)]/8 p-4 text-sm">
            Changes saved successfully. An application requiring corrections has
            been returned to Zed360 review.
          </p>
        ) : null}
        {result === "invalid" || result === "error" ? (
          <p className="mt-6 rounded-xl border border-red-300/20 bg-red-300/8 p-4 text-sm text-red-100">
            Check the information and try again.
          </p>
        ) : null}
        {profile.latestDecision?.status === "rejected" ? (
          <p className="mt-6 rounded-xl border border-amber-200/20 bg-amber-200/8 p-4 text-sm">
            Latest update rejected: {profile.latestDecision.note}
          </p>
        ) : null}
        <form
          action={save}
          className="mt-8 grid gap-5 rounded-2xl border border-white/10 bg-white/[.035] p-6"
        >
          <label>
            <span className="mb-2 block text-sm text-white/65">
              Business description
            </span>
            <textarea
              className="min-h-32 w-full rounded-xl border border-white/10 bg-black/20 p-4"
              defaultValue={values.description ?? ""}
              maxLength={2000}
              name="description"
            />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm text-white/65">Phone</span>
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
                defaultValue={values.phone ?? ""}
                name="phone"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-white/65">WhatsApp</span>
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
                defaultValue={values.whatsapp ?? ""}
                name="whatsapp"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-white/65">
                Public email
              </span>
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
                defaultValue={values.email ?? ""}
                name="email"
                type="email"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-white/65">Website</span>
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4"
                defaultValue={values.website ?? ""}
                name="website"
                placeholder="https://"
                type="url"
              />
            </label>
          </div>
          <div>
            <button className="button button-primary">
              {isCorrection ? "Save corrections for review" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
