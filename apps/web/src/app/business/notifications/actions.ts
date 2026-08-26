"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedBusinessSession } from "@/lib/business-account";
import {
  archiveAllReadBusinessNotifications,
  archiveBusinessNotification,
  markAllBusinessNotificationsRead,
  markBusinessNotificationRead,
  restoreBusinessNotification,
} from "@/lib/business-notifications";

function revalidateNotificationViews() {
  revalidatePath("/business/notifications");
  revalidatePath("/business/dashboard");
  revalidatePath("/business/account");
}

export async function markNotificationRead(notificationId: string) {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");
  await markBusinessNotificationRead(session.accessToken, notificationId);
  revalidateNotificationViews();
}

export async function markAllNotificationsRead() {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");
  await markAllBusinessNotificationsRead(session.accessToken);
  revalidateNotificationViews();
}

export async function archiveNotification(notificationId: string) {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");
  await archiveBusinessNotification(session.accessToken, notificationId);
  revalidateNotificationViews();
}

export async function restoreNotification(notificationId: string) {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");
  await restoreBusinessNotification(session.accessToken, notificationId);
  revalidateNotificationViews();
}

export async function archiveAllReadNotifications() {
  const session = await getVerifiedBusinessSession();
  if (!session) redirect("/business/sign-in?next=/business/notifications");
  await archiveAllReadBusinessNotifications(session.accessToken);
  revalidateNotificationViews();
  redirect("/business/notifications");
}
