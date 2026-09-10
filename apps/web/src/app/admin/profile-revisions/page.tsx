import { redirect } from "next/navigation";
import { fetchProfileRevisions } from "@/lib/admin-profile-revisions";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import { decide } from "./actions";
const labels = {
  description: "Description",
  phone: "Phone",
  whatsapp: "WhatsApp",
  email: "Email",
  website: "Website",
} as const;
export default async function ProfileRevisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin/profile-revisions");
  const queue = await fetchProfileRevisions(session.accessToken);
  const result = (await searchParams).result;
  return (
    <main className="px-5 text-white sm:px-8 lg:px-10">
      <section className="mx-auto max-w-6xl pb-20 pt-14">
        <p className="eyebrow">
          <span /> Moderation
        </p>
        <h1 className="mt-5 text-4xl font-semibold">Profile updates.</h1>
        {result ? (
          <p className="mt-5 text-sm text-white/55">
            Decision result: {result}.
          </p>
        ) : null}
        <div className="mt-8 grid gap-5">
          {queue.revisions.length ? (
            queue.revisions.map((revision) => {
              const approve = decide.bind(null, revision.id, "approved");
              const reject = decide.bind(null, revision.id, "rejected");
              return (
                <article
                  className="rounded-2xl border border-white/10 bg-white/[.035] p-6"
                  key={revision.id}
                >
                  <h2 className="text-xl font-semibold">
                    {revision.businessName}
                  </h2>
                  <div className="mt-5 grid gap-3">
                    {Object.keys(labels).map((key) => {
                      const field = key as keyof typeof labels;
                      return (
                        <div
                          className="grid gap-2 border-t border-white/8 pt-3 sm:grid-cols-[10rem_1fr_1fr]"
                          key={field}
                        >
                          <span className="text-sm text-white/40">
                            {labels[field]}
                          </span>
                          <span className="text-sm text-white/45">
                            {revision.current[field] || "—"}
                          </span>
                          <span className="text-sm text-white/85">
                            {revision.proposed[field] || "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <form action={reject} className="mt-5">
                    <textarea
                      className="min-h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3"
                      name="note"
                      placeholder="Reason required for rejection"
                    />
                    <div className="mt-3 flex gap-3">
                      <button
                        className="button button-primary"
                        formAction={approve}
                      >
                        Approve
                      </button>
                      <button className="button button-quiet">Reject</button>
                    </div>
                  </form>
                </article>
              );
            })
          ) : (
            <p className="rounded-2xl border border-white/10 p-6 text-white/45">
              No profile exceptions awaiting review. Routine profile changes
              publish immediately with audit history.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
