import { adminOverviewSchema, type AdminOverview } from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminOverviewApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchAdminOverview(
  token: string,
): Promise<AdminOverview> {
  const response = await fetch(`${apiUrl}/admin/overview`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AdminOverviewApiError(
      typeof body?.message === "string"
        ? body.message
        : "The administration service is unavailable.",
      response.status,
    );
  }

  return adminOverviewSchema.parse(body);
}
