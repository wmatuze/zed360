import {
  businessCustomerReviewsSchema,
  type BusinessCustomerReviews,
  type SaveBusinessReviewResponse,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessCustomerReviewsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parse(response: Response): Promise<BusinessCustomerReviews> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new BusinessCustomerReviewsApiError(
      typeof body?.message === "string"
        ? body.message
        : "Customer reviews are unavailable.",
      response.status,
    );
  }
  return businessCustomerReviewsSchema.parse(body);
}

export const fetchBusinessCustomerReviews = (
  token: string,
  businessId: string,
) =>
  fetch(`${apiUrl}/business-account/${businessId}/customer-reviews`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  }).then(parse);

export const saveBusinessReviewResponse = (
  token: string,
  businessId: string,
  reviewId: string,
  response: SaveBusinessReviewResponse,
) =>
  fetch(
    `${apiUrl}/business-account/${businessId}/customer-reviews/${reviewId}/response`,
    {
      method: "PUT",
      cache: "no-store",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(response),
    },
  ).then(parse);
