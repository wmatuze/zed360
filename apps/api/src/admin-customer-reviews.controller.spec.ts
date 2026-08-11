import { BadRequestException } from '@nestjs/common';
import { AdminCustomerReviewsController } from './admin-customer-reviews.controller';
import { AuthenticatedUserService } from './authenticated-user.service';
import { CustomerReviewsService } from './customer-reviews.service';

describe('AdminCustomerReviewsController', () => {
  const user = { id: 'user-id', email: 'reviewer@example.com' };
  const verify = jest.fn();
  const list = jest.fn();
  const decide = jest.fn();
  const controller = new AdminCustomerReviewsController(
    { verify } as unknown as AuthenticatedUserService,
    { list, decide } as unknown as CustomerReviewsService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    list.mockReset().mockResolvedValue({});
    decide.mockReset().mockResolvedValue({});
  });

  it('requires authentication before listing pending reviews', async () => {
    await controller.list('Bearer token');
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(list).toHaveBeenCalledWith(user);
  });

  it('passes a valid approval to the moderation service', async () => {
    const reviewId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
    await controller.decide('Bearer token', reviewId, {
      decision: 'approved',
      note: '',
    });
    expect(decide).toHaveBeenCalledWith(user, reviewId, {
      decision: 'approved',
      note: '',
    });
  });

  it('requires an explanation when rejecting a review', async () => {
    await expect(
      controller.decide(
        'Bearer token',
        'b69a05f3-c203-41b0-94ce-e3ab8af41771',
        { decision: 'rejected' },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
