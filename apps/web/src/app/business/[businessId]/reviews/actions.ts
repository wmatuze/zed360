"use server";

import { saveBusinessReviewResponseSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessCustomerReviewsApiError,
  saveBusinessReviewResponse,
} from "@/lib/business-customer-reviews";

export type ReviewReplyState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function saveReply(
  businessId: string,
  reviewId: string,
  _state: ReviewReplyState,
  formData: FormData,
): Promise<ReviewReplyState> {
  const parsed = saveBusinessReviewResponseSchema.safeParse({
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Write a reply of at least 2 characters.",
    };
  }

  const session = await getVerifiedBusinessSession();
  if (!session)
    redirect(`/business/sign-in?next=/business/${businessId}/reviews`);
  try {
    const result = await saveBusinessReviewResponse(
      session.accessToken,
      businessId,
      reviewId,
      parsed.data,
    );
    revalidatePath(`/business/${businessId}/reviews`);
    revalidatePath(`/businesses/${result.business.slug}`);
    return {
      status: "success",
      message: "Your reply is now public on your profile.",
    };
  } catch (error) {
    if (
      error instanceof BusinessCustomerReviewsApiError &&
      error.status === 401
    ) {
      redirect("/business/sign-in?error=session_expired");
    }
    return {
      status: "error",
      message:
        error instanceof BusinessCustomerReviewsApiError
          ? error.message
          : "The reply could not be saved.",
    };
  }
}
