import { businessAccountSchema, type BusinessAccount } from "@zed360/contracts";
import { createClient } from "@/lib/supabase/server";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class BusinessAccountApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function getVerifiedBusinessSession() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id || !user.email || !user.email_confirmed_at) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  return {
    accessToken: session.access_token,
    email: user.email,
  };
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
