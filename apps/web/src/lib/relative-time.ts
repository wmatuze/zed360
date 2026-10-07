const minute = 60 * 1000;
const hour = 60 * minute;
const day = 24 * hour;

/** "5 minutes ago" for recent times, then a plain date. Times are Zambian. */
export function relativeTime(value: string | Date, now = new Date()) {
  const then = new Date(value);
  const elapsed = now.getTime() - then.getTime();
  if (elapsed < minute) return "Just now";
  if (elapsed < hour) {
    const minutes = Math.floor(elapsed / minute);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  if (elapsed < day) {
    const hours = Math.floor(elapsed / hour);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (elapsed < 2 * day) return "Yesterday";
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)} days ago`;
  return new Intl.DateTimeFormat("en-ZM", {
    day: "numeric",
    month: "short",
    year: then.getFullYear() === now.getFullYear() ? undefined : "numeric",
    timeZone: "Africa/Lusaka",
  }).format(then);
}
