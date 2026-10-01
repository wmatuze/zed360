"use server";

import { submitMediaReviewSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/authenticated-session";
import {
  AdminMediaReviewApiError,
  submitAdminMediaReview,
} from "@/lib/admin-media-reviews";

export async function reviewMedia(mediaId: string, formData: FormData) {
  const parsed = submitMediaReviewSchema.safeParse({
    decision: formData.get("decision"),
    note: formData.get("note"),
  });
  if (!parsed.success) redirect("/admin/media-reviews?result=invalid");
  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/media-reviews");
  try {
    await submitAdminMediaReview(session.accessToken, mediaId, parsed.data);
  } catch (error) {
    if (error instanceof AdminMediaReviewApiError) {
      if (error.status === 401)
        redirect(
          "/admin/sign-in?next=/admin/media-reviews&error=session_expired",
        );
      if (error.status === 403)
        redirect("/admin/media-reviews?result=forbidden");
      if (error.status === 404)
        redirect("/admin/media-reviews?result=not-found");
      if (error.status === 409)
        redirect("/admin/media-reviews?result=already-reviewed");
    }
    redirect("/admin/media-reviews?result=unavailable");
  }
  revalidatePath("/admin/media-reviews");
  revalidatePath("/businesses");
  revalidatePath("/businesses/[slug]", "page");
  redirect(`/admin/media-reviews?result=${parsed.data.decision}`);
}
