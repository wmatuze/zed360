import { BadRequestException } from '@nestjs/common';
import { CustomerReviewsController } from './customer-reviews.controller';
import { CustomerReviewsService } from './customer-reviews.service';

describe('CustomerReviewsController', () => {
  const submit = jest.fn();
  const requestCode = jest.fn();
  const controller = new CustomerReviewsController({
    submit,
    requestCode,
  } as unknown as CustomerReviewsService);
  const shareToken = '84854378-4d60-43a4-b53c-f7ee9c2f291e';
  const verificationId = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';

  beforeEach(() => {
    submit.mockReset().mockResolvedValue({});
    requestCode.mockReset().mockResolvedValue({});
  });

  it('submits a review with its WhatsApp code', async () => {
    await controller.submit(shareToken, {
      rating: 5,
      body: 'Helpful service',
      verificationId,
      code: '042913',
    });
    expect(submit).toHaveBeenCalledWith(shareToken, {
      rating: 5,
      body: 'Helpful service',
      verificationId,
      code: '042913',
    });
  });

  it('rejects a review without a confirmation code', () => {
    expect(() =>
      controller.submit(shareToken, { rating: 5, body: 'Helpful service' }),
    ).toThrow(BadRequestException);
    expect(submit).not.toHaveBeenCalled();
  });

  it('rejects a review outside the rating range', () => {
    expect(() =>
      controller.submit(shareToken, {
        rating: 6,
        verificationId,
        code: '042913',
      }),
    ).toThrow(BadRequestException);
    expect(submit).not.toHaveBeenCalled();
  });

  it('requests a code for a valid private request token', async () => {
    await controller.requestCode(shareToken, { phone: '0977 123 456' });
    expect(requestCode).toHaveBeenCalledWith(shareToken, {
      phone: '0977 123 456',
    });
  });

  it('rejects a code request with an invalid token', () => {
    expect(() =>
      controller.requestCode('not-a-token', { phone: '0977123456' }),
    ).toThrow(BadRequestException);
    expect(requestCode).not.toHaveBeenCalled();
  });
});
