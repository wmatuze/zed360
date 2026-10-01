import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessCustomerReviewsController } from './business-customer-reviews.controller';
import { BusinessCustomerReviewsService } from './business-customer-reviews.service';

describe('BusinessCustomerReviewsController', () => {
  const user = { id: 'user-id', email: 'owner@example.com' };
  const businessId = 'b69a05f3-c203-41b0-94ce-e3ab8af41771';
  const reviewId = '601fc37f-2445-4ad5-b792-2285ace4f297';
  const verify = jest.fn().mockResolvedValue(user);
  const get = jest.fn().mockResolvedValue({});
  const respond = jest.fn().mockResolvedValue({});
  const controller = new BusinessCustomerReviewsController(
    { verify } as unknown as AuthenticatedUserService,
    { get, respond } as unknown as BusinessCustomerReviewsService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('loads published reviews for an authenticated manager', async () => {
    await controller.get('Bearer token', businessId);
    expect(get).toHaveBeenCalledWith(user, businessId);
  });

  it('creates or updates an official response', async () => {
    await controller.respond('Bearer token', businessId, reviewId, {
      body: 'Thank you for your feedback.',
    });
    expect(respond).toHaveBeenCalledWith(user, businessId, reviewId, {
      body: 'Thank you for your feedback.',
    });
  });

  it('rejects an empty response before authentication', async () => {
    await expect(
      controller.respond('Bearer token', businessId, reviewId, { body: ' ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
