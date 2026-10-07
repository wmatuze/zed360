export type DayHours = {
  status: "closed" | "hours" | "open_24_hours";
  opensAt: string;
  closesAt: string;
};

const open = (opensAt: string, closesAt: string): DayHours => ({
  status: "hours",
  opensAt,
  closesAt,
});

// Days are indexed Sunday (0) to Saturday (6), as they are stored.
const closed = (previous: DayHours): DayHours => ({
  ...previous,
  status: "closed",
});

export const hoursPresets = [
  {
    key: "weekdays",
    label: "Mon–Fri, 8:00–17:00",
    apply: (days: DayHours[]) =>
      days.map((day, index) =>
        index >= 1 && index <= 5 ? open("08:00", "17:00") : closed(day),
      ),
  },
  {
    key: "six-days",
    label: "Mon–Fri 8:00–17:00, Sat 8:00–13:00",
    apply: (days: DayHours[]) =>
      days.map((day, index) =>
        index >= 1 && index <= 5
          ? open("08:00", "17:00")
          : index === 6
            ? open("08:00", "13:00")
            : closed(day),
      ),
  },
  {
    key: "every-day",
    label: "Every day, 8:00–17:00",
    apply: (days: DayHours[]) => days.map(() => open("08:00", "17:00")),
  },
  {
    key: "always",
    label: "Open 24 hours",
    apply: (days: DayHours[]) =>
      days.map((day) => ({ ...day, status: "open_24_hours" as const })),
  },
] as const;

/** Gives every day the same hours as the chosen day. */
export function copyToAllDays(days: DayHours[], source: number) {
  return days.map(() => ({ ...days[source] }));
}

/** Gives Monday to Friday the same hours as the chosen day. */
export function copyToWeekdays(days: DayHours[], source: number) {
  return days.map((day, index) =>
    index >= 1 && index <= 5 ? { ...days[source] } : day,
  );
}
