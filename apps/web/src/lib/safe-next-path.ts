export function safeNextPath(
  value: string | null | undefined,
  fallback = "/business/account",
) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
