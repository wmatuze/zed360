"use server";

import { adminUserActionSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { AdminUsersApiError, submitAdminUserAction } from "@/lib/admin-users";

export async function manageUser(userId: string, formData: FormData) {
  const parsed = adminUserActionSchema.safeParse({
    action: formData.get("action"),
    role: formData.get("role") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) redirect("/admin/users?result=invalid");

  const session = await getVerifiedSession();
  if (!session) redirect("/admin/sign-in?next=/admin/users");
  try {
    await submitAdminUserAction(session.accessToken, userId, parsed.data);
  } catch (error) {
    if (error instanceof AdminUsersApiError) {
      if (error.status === 401) {
        redirect("/admin/sign-in?next=/admin/users&error=session_expired");
      }
      if (error.status === 403) redirect("/admin/users?result=forbidden");
      if (error.status === 404) redirect("/admin/users?result=not-found");
      if (error.status === 409) redirect("/admin/users?result=last-admin");
    }
    redirect("/admin/users?result=unavailable");
  }
  revalidatePath("/admin/users");
  redirect(`/admin/users?result=${parsed.data.action}`);
}
