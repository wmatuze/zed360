"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  markAllBusinessNotificationsRead,
  markBusinessNotificationRead,
} from "@/lib/business-notifications";

export async function markNotificationRead(notificationId: string) {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");
  await markBusinessNotificationRead(session.accessToken, notificationId);
  revalidatePath("/business/notifications");
}

export async function markAllNotificationsRead() {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");
  await markAllBusinessNotificationsRead(session.accessToken);
  revalidatePath("/business/notifications");
}
