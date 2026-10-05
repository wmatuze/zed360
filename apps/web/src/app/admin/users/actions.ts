"use server";

import { adminUserActionSchema } from "@zed360/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/authenticated-session";
import { AdminUsersApiError, submitAdminUserAction } from "@/lib/admin-users";

const refusals = new Set([
  "last-admin",
  "self-action",
  "username-required",
  "username-taken",
]);

export async function manageUser(userId: string, formData: FormData) {
  const page = `/admin/users/${userId}`;
  const parsed = adminUserActionSchema.safeParse({
    action: formData.get("action"),
    role: formData.get("role") || undefined,
    username: formData.get("username") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    const usernameIssue = parsed.error.issues.some(
      ({ path }) => path[0] === "username",
    );
    redirect(
      `${page}?result=${usernameIssue ? "invalid-username" : "invalid"}`,
    );
  }

  const session = await getVerifiedSession();
  if (!session) redirect(`/admin/sign-in?next=${page}`);
  try {
    await submitAdminUserAction(session.accessToken, userId, parsed.data);
  } catch (error) {
    if (error instanceof AdminUsersApiError) {
      if (error.status === 401) {
        redirect(`/admin/sign-in?next=${page}&error=session_expired`);
      }
      if (error.status === 403) redirect(`${page}?result=forbidden`);
      if (error.status === 404) redirect("/admin/users?result=not-found");
      if (error.code && refusals.has(error.code)) {
        redirect(`${page}?result=${error.code}`);
      }
    }
    redirect(`${page}?result=unavailable`);
  }
  revalidatePath("/admin/users");
  revalidatePath(page);
  redirect(`${page}?result=${parsed.data.action}`);
}
