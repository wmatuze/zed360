import "server-only";

import {
  sharedCustomerRequestSchema,
  type SharedCustomerRequest,
} from "@zed360/contracts";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class CustomerRequestApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchSharedCustomerRequest(
  shareToken: string,
): Promise<SharedCustomerRequest> {
  const response = await fetch(`${apiUrl}/requests/shared/${shareToken}`, {
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  if (!response.ok) {
    throw new CustomerRequestApiError(
      typeof body?.message === "string"
        ? body.message
        : "This private request link is unavailable.",
      response.status,
    );
  }

  const parsed = sharedCustomerRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new CustomerRequestApiError(
      "The request service returned an invalid response.",
      502,
    );
  }
  return parsed.data;
}
