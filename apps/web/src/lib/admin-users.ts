import {
  adminUserDetailSchema,
  adminUserListSchema,
  type AdminUserAction,
  type AdminUserDetail,
  type AdminUserList,
  type AdminUserListQuery,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminUsersApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Machine-readable reason for a refused action, when the API gives one. */
    readonly code: string | null = null,
  ) {
    super(message);
  }
}

async function failure(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    code?: unknown;
  } | null;
  return new AdminUsersApiError(
    typeof body?.message === "string" ? body.message : fallback,
    response.status,
    typeof body?.code === "string" ? body.code : null,
  );
}

export async function fetchAdminUsers(
  token: string,
  query: {
    q?: string;
    page?: number;
    role?: AdminUserListQuery["role"];
    status?: AdminUserListQuery["status"];
  },
): Promise<AdminUserList> {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.page) search.set("page", String(query.page));
  if (query.role) search.set("role", query.role);
  if (query.status) search.set("status", query.status);
  search.set("pageSize", "25");
  const response = await fetch(`${apiUrl}/admin/users?${search}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok)
    throw await failure(
      response,
      "The user administration service is unavailable.",
    );
  return adminUserListSchema.parse(await response.json());
}

export async function fetchAdminUser(
  token: string,
  userId: string,
): Promise<AdminUserDetail> {
  const response = await fetch(`${apiUrl}/admin/users/${userId}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok)
    throw await failure(
      response,
      "The user administration service is unavailable.",
    );
  return adminUserDetailSchema.parse(await response.json());
}

export async function submitAdminUserAction(
  token: string,
  userId: string,
  action: AdminUserAction,
) {
  const response = await fetch(`${apiUrl}/admin/users/${userId}/actions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(action),
    cache: "no-store",
  });
  if (!response.ok) throw await failure(response, "Action failed.");
  return response.json().catch(() => null);
}
