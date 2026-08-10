import "server-only";

import {
  matchedBusinessRequestsSchema,
  submittedBusinessResponseSchema,
  type MatchedBusinessRequests,
  type SubmitBusinessResponse,
  type SubmittedBusinessResponse,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessRequestsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchMatchedBusinessRequests(
  accessToken: string,
): Promise<MatchedBusinessRequests> {
  const response = await fetch(`${apiUrl}/business-requests`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  if (!response.ok) {
    throw new BusinessRequestsApiError(
      typeof body?.message === "string"
        ? body.message
        : "The matched-request service is unavailable.",
      response.status,
    );
  }

  const parsed = matchedBusinessRequestsSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessRequestsApiError(
      "The matched-request service returned an invalid response.",
      502,
    );
  }
  return parsed.data;
}

export async function sendBusinessResponse(
  accessToken: string,
  matchId: string,
  responseData: SubmitBusinessResponse,
): Promise<SubmittedBusinessResponse> {
  const response = await fetch(
    `${apiUrl}/business-requests/${matchId}/responses`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(responseData),
      cache: "no-store",
    },
  );
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  if (!response.ok) {
    throw new BusinessRequestsApiError(
      typeof body?.message === "string"
        ? body.message
        : "Your response could not be saved.",
      response.status,
    );
  }

  const parsed = submittedBusinessResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessRequestsApiError(
      "The response service returned an invalid result.",
      502,
    );
  }
  return parsed.data;
}
