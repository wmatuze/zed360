import { requiresMediaReview } from './business-catalog.service';
import { reviewModeration } from './customer-reviews.service';

describe('risk-based moderation', () => {
  it.each(['logo', 'cover'] as const)(
    'keeps %s identity media in human review',
    (purpose) => expect(requiresMediaReview(purpose)).toBe(true),
  );

  it.each(['gallery', 'work_sample', 'product'] as const)(
    'publishes validated %s media without a human queue',
    (purpose) => expect(requiresMediaReview(purpose)).toBe(false),
  );

  it('publishes a normal verified-interaction review', () => {
    expect(
      reviewModeration('Helpful service and the work was completed on time.'),
    ).toEqual({ status: 'approved', note: null });
  });

  it('publishes a rating-only review', () => {
    expect(reviewModeration(undefined)).toEqual({
      status: 'approved',
      note: null,
    });
  });

  it.each([
    'Visit https://spam.example for details',
    'Write to spam@example.com',
    'Call +260 97 123 4567',
    'Baaaaaaaad',
  ])('flags high-confidence exception content: %s', (body) => {
    expect(reviewModeration(body).status).toBe('pending');
  });
});
