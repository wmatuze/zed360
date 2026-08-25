"use server";
import { contentReportDecisionSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  AdminContentReportApiError,
  submitContentReportDecision,
} from "@/lib/admin-content-reports";

export async function decideReport(reportId: string, formData: FormData) {
  const parsed = contentReportDecisionSchema.safeParse({
    decision: formData.get("decision"),
    note: formData.get("note"),
  });
  if (!parsed.success) redirect("/admin/content-reports?result=invalid");
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin/content-reports");
  try {
    await submitContentReportDecision(
      session.accessToken,
      reportId,
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AdminContentReportApiError && error.status === 401)
      redirect(
        "/business/sign-in?next=/admin/content-reports&error=session_expired",
      );
    if (error instanceof AdminContentReportApiError && error.status === 403)
      redirect("/admin/content-reports?result=forbidden");
    if (error instanceof AdminContentReportApiError && error.status === 409)
      redirect("/admin/content-reports?result=conflict");
    redirect("/admin/content-reports?result=error");
  }
  revalidatePath("/admin/content-reports");
  revalidatePath("/businesses/[slug]", "page");
  redirect(`/admin/content-reports?result=${parsed.data.decision}`);
}
