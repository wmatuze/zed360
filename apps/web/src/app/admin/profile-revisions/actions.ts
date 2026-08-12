"use server";
import { businessProfileDecisionSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { decideProfileRevision } from "@/lib/admin-profile-revisions";
import { getVerifiedBusinessSession } from "@/lib/business-account";
export async function decide(revisionId: string, decision: "approved" | "rejected", formData: FormData) {
  const parsed = businessProfileDecisionSchema.safeParse({ decision, note: String(formData.get("note") ?? "") });
  if (!parsed.success) redirect("/admin/profile-revisions?result=invalid");
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin/profile-revisions");
  try { await decideProfileRevision(session.accessToken, revisionId, parsed.data); }
  catch { redirect("/admin/profile-revisions?result=error"); }
  revalidatePath("/admin/profile-revisions");
  redirect(`/admin/profile-revisions?result=${decision}`);
}
