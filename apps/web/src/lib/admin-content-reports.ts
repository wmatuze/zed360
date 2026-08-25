import {
  adminContentReportQueueSchema,
  type AdminContentReportQueue,
  type ContentReportDecision,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminContentReportApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response): Promise<AdminContentReportQueue> {
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new AdminContentReportApiError(
      typeof body?.message === "string"
        ? body.message
        : "The report service is unavailable.",
      response.status,
    );
  return adminContentReportQueueSchema.parse(body);
}

export const fetchAdminContentReports = (token: string) =>
  fetch(`${apiUrl}/content-reports/admin`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  }).then(parse);

export const submitContentReportDecision = (
  token: string,
  reportId: string,
  decision: ContentReportDecision,
) =>
  fetch(`${apiUrl}/content-reports/admin/${reportId}/decisions`, {
    method: "POST",
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(decision),
  }).then(parse);
