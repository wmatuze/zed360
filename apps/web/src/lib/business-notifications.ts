import {
  businessNotificationListSchema,
  type BusinessNotificationList,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessNotificationsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request(
  accessToken: string,
  path = "",
  method: "GET" | "POST" = "GET",
): Promise<BusinessNotificationList> {
  const response = await fetch(`${apiUrl}/business-notifications${path}`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${accessToken}` },
    method,
  });
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new BusinessNotificationsApiError(
      typeof body?.message === "string"
        ? body.message
        : "Notifications are temporarily unavailable.",
      response.status,
    );
  }
  const parsed = businessNotificationListSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessNotificationsApiError(
      "The notification service returned incomplete information.",
      502,
    );
  }
  return parsed.data;
}

export const fetchBusinessNotifications = (accessToken: string) =>
  request(accessToken);

export const markBusinessNotificationRead = (
  accessToken: string,
  notificationId: string,
) => request(accessToken, `/${notificationId}/read`, "POST");

export const markAllBusinessNotificationsRead = (accessToken: string) =>
  request(accessToken, "/read-all", "POST");
