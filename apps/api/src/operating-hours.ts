import {
  updateLocationOperatingHoursSchema,
  type OperatingHoursDay,
} from '@zed360/contracts';

export const BUSINESS_TIMEZONE = 'Africa/Lusaka' as const;

export const defaultOperatingDays = (): OperatingHoursDay[] =>
  Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    status: 'closed' as const,
  }));

export function normaliseOperatingHours(value: unknown) {
  const parsed = updateLocationOperatingHoursSchema.safeParse(value);
  return {
    configured: parsed.success,
    days: parsed.success
      ? [...parsed.data.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      : defaultOperatingDays(),
  };
}

const minutes = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

function zonedDayAndMinute(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    dayOfWeek: weekdays.indexOf(part('weekday')),
    minute: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

const formatTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

export function describeOperatingHours(
  value: unknown,
  temporarilyUnavailable: boolean,
  now = new Date(),
) {
  const schedule = normaliseOperatingHours(value);
  if (!schedule.configured) {
    return {
      ...schedule,
      currentStatus: 'unknown' as const,
      currentLabel: 'Hours not added',
      todayLabel: 'Hours not added',
    };
  }

  const { dayOfWeek, minute } = zonedDayAndMinute(now);
  const today = schedule.days[dayOfWeek];
  const yesterday = schedule.days[(dayOfWeek + 6) % 7];
  const openFromYesterday =
    yesterday?.status === 'hours' &&
    minutes(yesterday.closesAt) < minutes(yesterday.opensAt) &&
    minute < minutes(yesterday.closesAt);
  const openToday =
    today?.status === 'open_24_hours' ||
    (today?.status === 'hours' &&
      (minutes(today.opensAt) < minutes(today.closesAt)
        ? minute >= minutes(today.opensAt) && minute < minutes(today.closesAt)
        : minute >= minutes(today.opensAt)));
  const isOpen = openFromYesterday || openToday;
  const todayLabel =
    today?.status === 'open_24_hours'
      ? 'Open 24 hours'
      : today?.status === 'hours'
        ? `${formatTime(today.opensAt)} – ${formatTime(today.closesAt)}`
        : 'Closed today';

  if (temporarilyUnavailable) {
    return {
      ...schedule,
      currentStatus: 'temporarily_unavailable' as const,
      currentLabel: 'Temporarily unavailable',
      todayLabel,
    };
  }
  return {
    ...schedule,
    currentStatus: isOpen ? ('open' as const) : ('closed' as const),
    currentLabel: isOpen ? 'Open now' : 'Closed now',
    todayLabel,
  };
}
