import {
  adminCustomerReviewQueueSchema,
  type AdminCustomerReviewQueue,
  type SubmitCustomerReviewDecision,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminCustomerReviewApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parseResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new AdminCustomerReviewApiError(
      typeof body?.message === "string"
        ? body.message
        : "The customer review service is unavailable.",
      response.status,
    );
  }
  const parsed = adminCustomerReviewQueueSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminCustomerReviewApiError(
      "The customer review service returned incomplete information.",
      502,
    );
  }
  return parsed.data;
}

export async function fetchAdminCustomerReviews(
  accessToken: string,
): Promise<AdminCustomerReviewQueue> {
  const response = await fetch(`${apiUrl}/admin/customer-reviews`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  return parseResponse(response);
}

export async function submitAdminCustomerReview(
  accessToken: string,
  reviewId: string,
  decision: SubmitCustomerReviewDecision,
): Promise<AdminCustomerReviewQueue> {
  const response = await fetch(
    `${apiUrl}/admin/customer-reviews/${reviewId}/decisions`,
    {
      body: JSON.stringify(decision),
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      method: "POST",
    },
  );
  return parseResponse(response);
}
