export function safeNextPath(
  value: string | null | undefined,
  fallback = "/business/dashboard",
) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
