import { adminAccessSchema, type AdminAccess } from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminAccessApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchAdminAccess(token: string): Promise<AdminAccess> {
  const response = await fetch(`${apiUrl}/admin/access`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AdminAccessApiError(
      typeof body?.message === "string"
        ? body.message
        : "The administration service is unavailable.",
      response.status,
    );
  }

  return adminAccessSchema.parse(body);
}
