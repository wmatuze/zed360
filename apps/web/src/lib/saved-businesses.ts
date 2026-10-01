export const savedBusinessesLimit = 50;

export type SavedBusiness = {
  slug: string;
  name: string;
  place: string | null;
  savedAt: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isSavedBusiness(value: unknown): value is SavedBusiness {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.slug === "string" &&
    slugPattern.test(item.slug) &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    (item.place === null || typeof item.place === "string") &&
    typeof item.savedAt === "string"
  );
}

export function parseSavedBusinesses(raw: string | null): SavedBusiness[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value
      .filter(isSavedBusiness)
      .filter((item) => !seen.has(item.slug) && seen.add(item.slug))
      .slice(0, savedBusinessesLimit);
  } catch {
    return [];
  }
}

export function toggleSavedBusiness(
  saved: SavedBusiness[],
  business: Omit<SavedBusiness, "savedAt">,
  now = new Date(),
): SavedBusiness[] {
  if (saved.some((item) => item.slug === business.slug))
    return saved.filter((item) => item.slug !== business.slug);
  return [{ ...business, savedAt: now.toISOString() }, ...saved].slice(
    0,
    savedBusinessesLimit,
  );
}
