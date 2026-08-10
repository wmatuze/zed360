"use server";

import { submitBusinessReviewSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminReviewApiError,
  submitAdminBusinessReview,
} from "@/lib/admin-reviews";
import { getVerifiedBusinessSession } from "@/lib/business-account";

export async function reviewBusiness(businessId: string, formData: FormData) {
  const parsed = submitBusinessReviewSchema.safeParse({
    decision: formData.get("decision"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/admin/reviews?result=invalid");

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin/reviews");

  try {
    await submitAdminBusinessReview(
      session.accessToken,
      businessId,
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AdminReviewApiError) {
      if (error.status === 401) {
        redirect("/business/sign-in?next=/admin/reviews&error=session_expired");
      }
      if (error.status === 403) redirect("/admin/reviews?result=forbidden");
      if (error.status === 409) redirect("/admin/reviews?result=not-ready");
      if (error.status === 404) redirect("/admin/reviews?result=not-found");
    }
    redirect("/admin/reviews?result=unavailable");
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/business/account");
  redirect(`/admin/reviews?result=${parsed.data.decision}`);
}
