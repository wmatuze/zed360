import {
  adminBusinessReviewQueueSchema,
  submittedBusinessReviewSchema,
  type AdminBusinessReviewQueue,
  type SubmitBusinessReview,
  type SubmittedBusinessReview,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminReviewApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchAdminReviewQueue(
  accessToken: string,
  query: { q?: string; status?: string; page?: number } = {},
): Promise<AdminBusinessReviewQueue> {
  const search = new URLSearchParams();
  if (query.q) search.set("q", query.q);
  if (query.status) search.set("status", query.status);
  if (query.page) search.set("page", String(query.page));
  const response = await fetch(`${apiUrl}/admin/business-reviews?${search}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return parseResponse(response, adminBusinessReviewQueueSchema);
}

export async function submitAdminBusinessReview(
  accessToken: string,
  businessId: string,
  review: SubmitBusinessReview,
): Promise<SubmittedBusinessReview> {
  const response = await fetch(
    `${apiUrl}/admin/business-reviews/${businessId}/decisions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(review),
      cache: "no-store",
    },
  );
  return parseResponse(response, submittedBusinessReviewSchema);
}

async function parseResponse<T>(
  response: Response,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): Promise<T> {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new AdminReviewApiError(
      typeof body?.message === "string"
        ? body.message
        : "The review service is unavailable.",
      response.status,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data) {
    throw new AdminReviewApiError(
      "The review service returned an invalid response.",
      502,
    );
  }
  return parsed.data;
}
