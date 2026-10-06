import type { BusinessActivity } from "@zed360/contracts";

const dayLabel = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-ZM", { ...options, timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00.000Z`),
  );

const count = (value: number, one: string, many: string) =>
  `${value} ${value === 1 ? one : many}`;

/** Daily profile views as one bar per day, with the figures also as a table. */
export function ActivityChart({ daily }: { daily: BusinessActivity["daily"] }) {
  const peak = Math.max(...daily.map(({ profileViews }) => profileViews), 0);
  if (!daily.length || peak === 0)
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-6 text-white/55">
        No profile views have been recorded in the last 30 days. Counting starts
        from the day this feature was switched on.
      </p>
    );

  return (
    <figure className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-white/55">
        <span>Profile views per day</span>
        <span>Busiest day: {count(peak, "view", "views")}</span>
      </figcaption>
      <div
        aria-hidden
        className="mt-4 flex h-28 items-stretch gap-[2px] border-b border-white/15"
      >
        {daily.map((day, index) => (
          <div
            className="group relative flex min-w-0 flex-1 items-end"
            key={day.day}
          >
            <div
              className="w-full rounded-t-[4px] bg-[var(--lime)]/70 transition-colors group-hover:bg-[var(--lime)]"
              style={{
                height: day.profileViews
                  ? `max(2px, ${(day.profileViews / peak) * 100}%)`
                  : 0,
              }}
            />
            <div
              className={`pointer-events-none absolute bottom-full z-10 mb-2 hidden whitespace-nowrap rounded-lg border border-white/15 bg-[var(--panel)] px-3 py-2 text-xs text-white shadow-xl group-hover:block ${index < daily.length / 2 ? "left-0" : "right-0"}`}
            >
              <span className="block font-semibold">
                {dayLabel(day.day, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <span className="mt-1 block text-white/70">
                {count(day.profileViews, "view", "views")} ·{" "}
                {count(day.contacts, "contact tap", "contact taps")}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div
        aria-hidden
        className="mt-2 flex justify-between text-[.68rem] text-white/50"
      >
        <span>
          {dayLabel(daily[0].day, { day: "numeric", month: "short" })}
        </span>
        <span>Today</span>
      </div>
      <details className="mt-3 text-xs text-white/55">
        <summary className="cursor-pointer text-white/65 hover:text-white">
          View as a table
        </summary>
        <table className="mt-3 w-full max-w-sm text-left">
          <thead>
            <tr className="text-white/50">
              <th className="pb-2 font-medium" scope="col">
                Day
              </th>
              <th className="pb-2 text-right font-medium" scope="col">
                Views
              </th>
              <th className="pb-2 text-right font-medium" scope="col">
                Contact taps
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {[...daily].reverse().map((day) => (
              <tr key={day.day}>
                <th className="py-1.5 font-normal" scope="row">
                  {dayLabel(day.day, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </th>
                <td className="py-1.5 text-right tabular-nums">
                  {day.profileViews}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {day.contacts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
