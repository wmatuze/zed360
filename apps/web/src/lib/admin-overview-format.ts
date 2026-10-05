const hour = 60 * 60 * 1000;
const day = 24 * hour;

// Decisions older than this are shown as overdue so they are handled first.
export const overdueAfterDays = 2;

export function waiting(oldestAt: Date | null, now = new Date()) {
  if (!oldestAt) return null;
  const elapsed = Math.max(0, now.getTime() - oldestAt.getTime());
  const days = Math.floor(elapsed / day);
  const hours = Math.floor(elapsed / hour);
  const label =
    days >= 1
      ? `${days} ${days === 1 ? "day" : "days"}`
      : hours >= 1
        ? `${hours} ${hours === 1 ? "hour" : "hours"}`
        : "under an hour";
  return { label, overdue: days >= overdueAfterDays };
}

export function trend(current: number, previous: number) {
  if (current === previous)
    return { direction: "same" as const, label: "Same as the 30 days before" };
  return {
    direction: current > previous ? ("up" as const) : ("down" as const),
    label: `${current > previous ? "Up" : "Down"} from ${previous} in the 30 days before`,
  };
}

const subjects: Record<string, string> = {
  category: "a category",
  district: "a district",
  province: "a province",
  user: "a user",
  customer_request: "a customer request",
};

const verbs: Record<string, string> = {
  created: "created",
  updated: "updated",
  activated: "reactivated",
  deactivated: "deactivated",
  suspended: "suspended",
  reinstated: "reinstated",
};

// Audit actions are stored as "subject.verb" (for example "category.created").
// Unknown actions are shown as recorded so nothing is hidden or misdescribed.
export function activityLabel(action: string, subjectType: string) {
  const verb = action.split(".").at(-1) ?? "";
  const subject = subjects[subjectType];
  return verbs[verb] && subject
    ? `${verbs[verb]} ${subject}`
    : action.replaceAll(/[._]/g, " ");
}
