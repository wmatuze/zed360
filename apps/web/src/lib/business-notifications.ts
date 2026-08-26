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
  view: "inbox" | "archived" = "inbox",
  page = 1,
): Promise<BusinessNotificationList> {
  const query = new URLSearchParams({ view, page: String(page) });
  const response = await fetch(`${apiUrl}/business-notifications?${query}`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${accessToken}` },
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

async function mutate(accessToken: string, path: string) {
  const response = await fetch(`${apiUrl}/business-notifications${path}`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${accessToken}` },
    method: "POST",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: unknown;
    } | null;
    throw new BusinessNotificationsApiError(
      typeof body?.message === "string"
        ? body.message
        : "The notification could not be updated.",
      response.status,
    );
  }
}

export const fetchBusinessNotifications = (
  accessToken: string,
  view: "inbox" | "archived" = "inbox",
  page = 1,
) => request(accessToken, view, page);

export const markBusinessNotificationRead = (
  accessToken: string,
  notificationId: string,
) => mutate(accessToken, `/${notificationId}/read`);

export const markAllBusinessNotificationsRead = (accessToken: string) =>
  mutate(accessToken, "/read-all");

export const archiveBusinessNotification = (
  accessToken: string,
  notificationId: string,
) => mutate(accessToken, `/${notificationId}/archive`);

export const restoreBusinessNotification = (
  accessToken: string,
  notificationId: string,
) => mutate(accessToken, `/${notificationId}/restore`);

export const archiveAllReadBusinessNotifications = (accessToken: string) =>
  mutate(accessToken, "/archive-read");
