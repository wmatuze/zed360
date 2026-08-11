import {
  adminMediaReviewQueueSchema,
  type AdminMediaReviewQueue,
  type SubmitMediaReview,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class AdminMediaReviewApiError extends Error {
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
    throw new AdminMediaReviewApiError(
      typeof body?.message === "string"
        ? body.message
        : "The media review service is unavailable.",
      response.status,
    );
  }
  const parsed = adminMediaReviewQueueSchema.safeParse(body);
  if (!parsed.success) {
    throw new AdminMediaReviewApiError(
      "The media review service returned incomplete information.",
      502,
    );
  }
  return parsed.data;
}

export async function fetchAdminMediaReviews(
  accessToken: string,
): Promise<AdminMediaReviewQueue> {
  const response = await fetch(`${apiUrl}/admin/media-reviews`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function submitAdminMediaReview(
  accessToken: string,
  mediaId: string,
  review: SubmitMediaReview,
): Promise<AdminMediaReviewQueue> {
  const response = await fetch(
    `${apiUrl}/admin/media-reviews/${mediaId}/decisions`,
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
  return parseResponse(response);
}
