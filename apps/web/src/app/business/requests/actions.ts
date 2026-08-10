"use server";

import { submitBusinessResponseSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessRequestsApiError,
  sendBusinessResponse,
} from "@/lib/business-requests";

export type ResponseFormState = {
  status: "idle" | "error" | "success";
  message: string;
  issues?: Record<string, string>;
};

export async function submitResponse(
  matchId: string,
  _previousState: ResponseFormState,
  formData: FormData,
): Promise<ResponseFormState> {
  const parsed = submitBusinessResponseSchema.safeParse({
    status: formData.get("status"),
    message: formData.get("message"),
    priceMinimum: formData.get("priceMinimum") || undefined,
    priceMaximum: formData.get("priceMaximum") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted response information.",
      issues: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ]),
      ),
    };
  }

  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in");

  try {
    await sendBusinessResponse(session.accessToken, matchId, parsed.data);
  } catch (error) {
    if (error instanceof BusinessRequestsApiError && error.status === 401) {
      redirect("/business/sign-in?error=session_expired");
    }
    return {
      status: "error",
      message:
        error instanceof BusinessRequestsApiError
          ? error.message
          : "Your response could not be saved. Please try again.",
    };
  }

  revalidatePath("/business/requests");
  return { status: "success", message: "Response saved successfully." };
}
