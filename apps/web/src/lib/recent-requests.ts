export type RecentRequest = {
  id: string;
  shareToken: string;
  summary: string;
  createdAt: string;
};

const storageKey = "zed360.recent-requests.v1";
const changeEventName = "zed360:recent-requests-changed";
const emptySnapshot = "[]";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validRecentRequest(value: unknown): value is RecentRequest {
  if (typeof value !== "object" || value === null) return false;
  const request = value as Partial<RecentRequest>;
  return (
    typeof request.id === "string" &&
    uuidPattern.test(request.id) &&
    typeof request.shareToken === "string" &&
    uuidPattern.test(request.shareToken) &&
    typeof request.summary === "string" &&
    request.summary.length > 0 &&
    typeof request.createdAt === "string" &&
    !Number.isNaN(Date.parse(request.createdAt))
  );
}

export function parseRecentRequests(snapshot: string): RecentRequest[] {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed)
      ? parsed.filter(validRecentRequest).slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

export function recentRequestsSnapshot() {
  try {
    return window.localStorage.getItem(storageKey) ?? emptySnapshot;
  } catch {
    return emptySnapshot;
  }
}

export function emptyRecentRequestsSnapshot() {
  return emptySnapshot;
}

export function subscribeRecentRequests(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) onStoreChange();
  };
  window.addEventListener(changeEventName, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEventName, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function readRecentRequests(): RecentRequest[] {
  return parseRecentRequests(recentRequestsSnapshot());
}

function announceChange() {
  window.dispatchEvent(new Event(changeEventName));
}

export function rememberRecentRequest(request: RecentRequest) {
  try {
    const recent = [
      request,
      ...readRecentRequests().filter(
        ({ shareToken }) => shareToken !== request.shareToken,
      ),
    ].slice(0, 5);
    window.localStorage.setItem(storageKey, JSON.stringify(recent));
    announceChange();
    return recent;
  } catch {
    return [];
  }
}

export function forgetRecentRequest(shareToken: string) {
  const recent = readRecentRequests().filter(
    (request) => request.shareToken !== shareToken,
  );
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(recent));
    announceChange();
  } catch {
    // Storage can be unavailable in private or restricted browser modes.
  }
  return recent;
}
