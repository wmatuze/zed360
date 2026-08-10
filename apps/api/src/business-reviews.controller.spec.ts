import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessReviewsController } from './business-reviews.controller';
import { BusinessReviewsService } from './business-reviews.service';

describe('BusinessReviewsController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'reviewer@example.com',
    emailVerifiedAt: new Date('2026-08-10T08:00:00.000Z'),
  };
  const verify = jest.fn();
  const list = jest.fn();
  const decide = jest.fn();
  const controller = new BusinessReviewsController(
    { verify } as unknown as AuthenticatedUserService,
    { list, decide } as unknown as BusinessReviewsService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    list
      .mockReset()
      .mockResolvedValue({ viewerRole: 'reviewer', businesses: [] });
    decide.mockReset().mockResolvedValue({
      businessId: '4747cc34-0ec0-40df-8dc2-605612106077',
      businessStatus: 'draft',
      reviewStatus: 'changes_requested',
      reviewedAt: '2026-08-10T08:00:00.000Z',
    });
  });

  it('verifies identity before loading the private review queue', async () => {
    await controller.list('Bearer access-token');

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(list).toHaveBeenCalledWith(user);
  });

  it('passes a valid review decision to the service', async () => {
    const businessId = '4747cc34-0ec0-40df-8dc2-605612106077';
    const review = {
      decision: 'changes_requested',
      reason: 'Please correct the registered business name.',
    };

    await controller.decide('Bearer access-token', businessId, review);

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(decide).toHaveBeenCalledWith(user, businessId, review);
  });

  it('rejects a rejection without a clear reason before authenticating', async () => {
    await expect(
      controller.decide(
        'Bearer access-token',
        '4747cc34-0ec0-40df-8dc2-605612106077',
        { decision: 'rejected', reason: 'No' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
    expect(decide).not.toHaveBeenCalled();
  });
});
