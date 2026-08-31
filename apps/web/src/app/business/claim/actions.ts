"use server";

import { businessApplicationClaimTokenSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BusinessAccountApiError,
  confirmApplicationClaim,
  getVerifiedBusinessSession,
} from "@/lib/business-account";

export async function connectApplication(token: string) {
  const parsed = businessApplicationClaimTokenSchema.safeParse(token);
  if (!parsed.success) redirect("/business/claim?result=invalid");

  const claimPath = `/business/claim?token=${encodeURIComponent(parsed.data)}`;
  const session = await getVerifiedBusinessSession();
  if (!session) {
    redirect(`/business/sign-in?next=${encodeURIComponent(claimPath)}`);
  }

  let failure: string | null = null;
  try {
    await confirmApplicationClaim(session.accessToken, parsed.data);
  } catch (error) {
    if (error instanceof BusinessAccountApiError) {
      failure =
        error.status === 401
          ? "session_expired"
          : error.status === 409
            ? "conflict"
            : error.status === 404
              ? "invalid"
              : "unavailable";
    } else {
      failure = "unavailable";
    }
  }

  if (failure === "session_expired") {
    redirect(
      `/business/sign-in?next=${encodeURIComponent(claimPath)}&error=session_expired`,
    );
  }
  if (failure) redirect(`${claimPath}&result=${failure}`);

  revalidatePath("/business/account");
  revalidatePath("/business/dashboard");
  redirect("/business/account?link=success");
}
