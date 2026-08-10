import "server-only";

import {
  publicBusinessDirectorySchema,
  publicBusinessProfileSchema,
  referenceDataSchema,
  type PublicBusinessDirectory,
  type PublicBusinessProfile,
  type ReferenceData,
} from "@zed360/contracts";
import { cache } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";

export class PublicBusinessApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function parseResponse<T>(
  response: Response,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
  fallbackMessage: string,
) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
  } | null;
  if (!response.ok) {
    throw new PublicBusinessApiError(
      typeof body?.message === "string" ? body.message : fallbackMessage,
      response.status,
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data) {
    throw new PublicBusinessApiError(
      "Zed360 returned incomplete public business information.",
      502,
    );
  }
  return parsed.data;
}

export async function fetchPublicBusinessDirectory(
  filters: Record<string, string | undefined>,
): Promise<PublicBusinessDirectory> {
  const parameters = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) {
    if (value) parameters.set(name, value);
  }
  const response = await fetch(`${apiUrl}/businesses?${parameters}`, {
    next: { revalidate: 300, tags: ["public-businesses"] },
  });
  return parseResponse(
    response,
    publicBusinessDirectorySchema,
    "Business profiles are temporarily unavailable.",
  );
}

export const fetchPublicBusinessProfile = cache(
  async (slug: string): Promise<PublicBusinessProfile> => {
    const response = await fetch(
      `${apiUrl}/businesses/${encodeURIComponent(slug)}`,
      {
        next: {
          revalidate: 300,
          tags: ["public-businesses", `business-${slug}`],
        },
      },
    );
    return parseResponse(
      response,
      publicBusinessProfileSchema,
      "This business profile is temporarily unavailable.",
    );
  },
);

export async function fetchPublicReferenceData(): Promise<ReferenceData> {
  const response = await fetch(`${apiUrl}/reference-data`, {
    next: { revalidate: 3600, tags: ["reference-data"] },
  });
  return parseResponse(
    response,
    referenceDataSchema,
    "Search filters are temporarily unavailable.",
  );
}
