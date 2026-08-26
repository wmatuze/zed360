import type { OperatingHoursDay } from '@zed360/contracts';
import {
  defaultOperatingDays,
  describeOperatingHours,
  normaliseOperatingHours,
} from './operating-hours';

const schedule = (...updates: OperatingHoursDay[]) => ({
  days: defaultOperatingDays().map(
    (day) =>
      updates.find((update) => update.dayOfWeek === day.dayOfWeek) ?? day,
  ),
});

describe('operating hours', () => {
  it('does not present an unconfigured location as closed', () => {
    expect(normaliseOperatingHours({})).toEqual({
      configured: false,
      days: defaultOperatingDays(),
    });
    expect(describeOperatingHours({}, false).currentStatus).toBe('unknown');
  });

  it('calculates open now in Zambia time', () => {
    const hours = schedule({
      dayOfWeek: 3,
      status: 'hours',
      opensAt: '08:00',
      closesAt: '17:00',
    });
    const result = describeOperatingHours(
      hours,
      false,
      new Date('2026-08-26T08:00:00.000Z'),
    );
    expect(result.currentStatus).toBe('open');
    expect(result.todayLabel).toBe('8:00 am – 5:00 pm');
  });

  it('keeps an overnight schedule open after midnight', () => {
    const hours = schedule({
      dayOfWeek: 2,
      status: 'hours',
      opensAt: '18:00',
      closesAt: '02:00',
    });
    const result = describeOperatingHours(
      hours,
      false,
      new Date('2026-08-26T00:30:00.000Z'),
    );
    expect(result.currentStatus).toBe('closed');

    const afterMidnight = describeOperatingHours(
      hours,
      false,
      new Date('2026-08-25T23:00:00.000Z'),
    );
    expect(afterMidnight.currentStatus).toBe('open');
  });

  it('lets a current temporary closure override the normal schedule', () => {
    const hours = schedule({ dayOfWeek: 3, status: 'open_24_hours' });
    expect(
      describeOperatingHours(hours, true, new Date('2026-08-26T08:00:00.000Z'))
        .currentStatus,
    ).toBe('temporarily_unavailable');
  });
});
