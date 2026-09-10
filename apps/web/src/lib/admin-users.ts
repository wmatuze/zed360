import {
  adminUserListSchema,
  type AdminUserAction,
  type AdminUserList,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminUsersApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function responseBody(response: Response) {
  return (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
}

export async function fetchAdminUsers(
  token: string,
  query: { q?: string; page?: number },
): Promise<AdminUserList> {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.page) search.set("page", String(query.page));
  search.set("pageSize", "25");
  const response = await fetch(`${apiUrl}/admin/users?${search}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await responseBody(response);
  if (!response.ok) {
    throw new AdminUsersApiError(
      typeof body?.message === "string"
        ? body.message
        : "The user administration service is unavailable.",
      response.status,
    );
  }
  return adminUserListSchema.parse(body);
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
  const body = await responseBody(response);
  if (!response.ok) {
    throw new AdminUsersApiError(
      typeof body?.message === "string" ? body.message : "Action failed.",
      response.status,
    );
  }
  return body;
}
