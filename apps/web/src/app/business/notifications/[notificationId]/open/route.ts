import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  BusinessNotificationsApiError,
  openBusinessNotification,
} from "@/lib/business-notifications";

/**
 * Opens a notification: marks it as read, then goes to what it is about.
 * Emailed alerts link here too, so a signed-out owner is sent to sign in and
 * then brought back.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ notificationId: string }> },
) {
  const { notificationId } = await params;
  const here = `/business/notifications/${notificationId}/open`;
  const session = await getVerifiedBusinessSession();
  if (!session) redirect(`/business/sign-in?next=${encodeURIComponent(here)}`);

  let destination = "/business/notifications";
  try {
    destination = await openBusinessNotification(
      session.accessToken,
      notificationId,
    );
  } catch (error) {
    if (error instanceof BusinessNotificationsApiError && error.status === 401)
      redirect("/business/sign-in?error=session_expired");
    // An unknown or removed notification falls back to the inbox.
  }
  revalidatePath("/business/notifications");
  revalidatePath("/business/dashboard");
  redirect(destination);
}
