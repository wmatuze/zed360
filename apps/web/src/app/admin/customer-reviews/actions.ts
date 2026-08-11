"use server";

import { submitCustomerReviewDecisionSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AdminCustomerReviewApiError,
  submitAdminCustomerReview,
} from "@/lib/admin-customer-reviews";
import { getVerifiedBusinessSession } from "@/lib/business-account";

export async function reviewCustomerReview(
  reviewId: string,
  formData: FormData,
) {
  const parsed = submitCustomerReviewDecisionSchema.safeParse({
    decision: formData.get("decision"),
    note: formData.get("note"),
  });
  if (!parsed.success) redirect("/admin/customer-reviews?result=invalid");
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/admin/customer-reviews");
  try {
    await submitAdminCustomerReview(
      session.accessToken,
      reviewId,
      parsed.data,
    );
  } catch (error) {
    if (error instanceof AdminCustomerReviewApiError) {
      if (error.status === 401)
        redirect(
          "/business/sign-in?next=/admin/customer-reviews&error=session_expired",
        );
      if (error.status === 403)
        redirect("/admin/customer-reviews?result=forbidden");
      if (error.status === 404)
        redirect("/admin/customer-reviews?result=not-found");
      if (error.status === 409)
        redirect("/admin/customer-reviews?result=already-reviewed");
    }
    redirect("/admin/customer-reviews?result=unavailable");
  }
  revalidatePath("/admin/customer-reviews");
  revalidatePath("/businesses/[slug]", "page");
  redirect(`/admin/customer-reviews?result=${parsed.data.decision}`);
}
