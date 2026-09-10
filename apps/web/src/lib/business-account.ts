import {
  businessAccountSchema,
  businessApplicationClaimPreviewSchema,
  type BusinessAccount,
  type BusinessApplicationClaimPreview,
} from "@zed360/contracts";
export { getVerifiedSession as getVerifiedBusinessSession } from "@/lib/authenticated-session";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessAccountApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fetchBusinessAccount(
  accessToken: string,
): Promise<BusinessAccount> {
  const response = await fetch(`${apiUrl}/business-account`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  return parseAccountResponse(response);
}

export async function linkBusiness(
  accessToken: string,
  businessId: string,
): Promise<BusinessAccount> {
  const response = await fetch(`${apiUrl}/business-account/claims`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ businessId }),
    cache: "no-store",
  });

  return parseAccountResponse(response);
}

export async function fetchApplicationClaim(
  accessToken: string,
  token: string,
): Promise<BusinessApplicationClaimPreview> {
  const query = new URLSearchParams({ token });
  const response = await fetch(
    `${apiUrl}/business-account/application-claims?${query.toString()}`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  return parseApplicationClaimResponse(response);
}

export async function confirmApplicationClaim(
  accessToken: string,
  token: string,
): Promise<BusinessApplicationClaimPreview> {
  const response = await fetch(
    `${apiUrl}/business-account/application-claims`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    },
  );
  return parseApplicationClaimResponse(response);
}

async function parseApplicationClaimResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new BusinessAccountApiError(
      typeof body?.message === "string"
        ? body.message
        : "The application could not be connected.",
      response.status,
    );
  }
  const parsed = businessApplicationClaimPreviewSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessAccountApiError(
      "The business account service returned an invalid response.",
      502,
    );
  }
  return parsed.data;
}

async function parseAccountResponse(response: Response) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : "The business account service is unavailable.";
    throw new BusinessAccountApiError(message, response.status);
  }

  const parsed = businessAccountSchema.safeParse(body);
  if (!parsed.success) {
    throw new BusinessAccountApiError(
      "The business account service returned an invalid response.",
      502,
    );
  }
  return parsed.data;
}
