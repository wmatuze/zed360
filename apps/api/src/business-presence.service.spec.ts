import { freshness } from './business-presence.service';

describe('business presence freshness', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  it('treats a missing confirmation as unconfirmed', () => {
    expect(freshness(null, 7, now)).toBe('unconfirmed');
  });

  it('keeps availability current through its seven-day boundary', () => {
    expect(freshness(new Date('2026-08-06T12:00:00.000Z'), 7, now)).toBe(
      'current',
    );
  });

  it('marks an older signal as stale', () => {
    expect(freshness(new Date('2026-08-06T11:59:59.999Z'), 7, now)).toBe(
      'stale',
    );
  });
});
