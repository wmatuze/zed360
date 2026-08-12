import {
  businessDashboardSchema,
  type BusinessDashboard,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessDashboardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchBusinessDashboard(
  accessToken: string,
): Promise<BusinessDashboard> {
  const response = await fetch(`${apiUrl}/business-dashboard`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new BusinessDashboardApiError(
      typeof body?.message === "string"
        ? body.message
        : "The business dashboard is temporarily unavailable.",
      response.status,
    );
  }
  const parsed = businessDashboardSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessDashboardApiError(
      "The dashboard service returned incomplete information.",
      502,
    );
  }
  return parsed.data;
}
