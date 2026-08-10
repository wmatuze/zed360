import { toMatchedBusinessRequest } from './business-requests.service';

describe('toMatchedBusinessRequest', () => {
  it('returns the minimum request information needed by the business', () => {
    const result = toMatchedBusinessRequest({
      matchId: '369ef480-1b89-48a4-a0db-9b99ecfc3ee4',
      matchStatus: 'queued',
      businessId: 'e872475b-72a2-4f99-a065-f87aa19c00ee',
      businessName: 'Kartu Limited',
      memberRole: 'owner',
      requestId: '601fc37f-2445-4ad5-b792-2285ace4f297',
      summary: 'I need a haircut before Saturday afternoon',
      details: 'A simple low cut is required.',
      answers: {
        timing: 'this_week',
        categoryAnswers: { privateCustomerNote: 'not returned separately' },
      },
      categoryName: 'Barbers',
      districtName: 'Kitwe',
      neededAt: null,
      budgetMinimum: '100.00',
      budgetMaximum: '250.00',
      createdAt: new Date('2026-08-10T08:00:00.000Z'),
      expiresAt: new Date('2026-09-09T08:00:00.000Z'),
      responseId: null,
      responseStatus: null,
      responseMessage: null,
      responsePriceMinimum: null,
      responsePriceMaximum: null,
      responseCreatedAt: null,
      responseUpdatedAt: null,
    });

    expect(result.request).toEqual(
      expect.objectContaining({
        timing: 'this_week',
        budgetMinimum: 100,
        budgetMaximum: 250,
      }),
    );
    expect(result.request).not.toHaveProperty('answers');
    expect(result.request).not.toHaveProperty('shareToken');
    expect(result.response).toBeNull();
  });
});
