import { BadRequestException } from '@nestjs/common';
import { CustomerReviewsController } from './customer-reviews.controller';
import { CustomerReviewsService } from './customer-reviews.service';

describe('CustomerReviewsController', () => {
  const submit = jest.fn();
  const controller = new CustomerReviewsController({
    submit,
  } as unknown as CustomerReviewsService);

  beforeEach(() => submit.mockReset().mockResolvedValue({}));

  it('submits a review using a valid private request token', async () => {
    const shareToken = '84854378-4d60-43a4-b53c-f7ee9c2f291e';
    await controller.submit(shareToken, { rating: 5, body: 'Helpful service' });
    expect(submit).toHaveBeenCalledWith(shareToken, {
      rating: 5,
      body: 'Helpful service',
    });
  });

  it('rejects a review outside the rating range', () => {
    expect(() =>
      controller.submit('84854378-4d60-43a4-b53c-f7ee9c2f291e', {
        rating: 6,
      }),
    ).toThrow(BadRequestException);
    expect(submit).not.toHaveBeenCalled();
  });
});
