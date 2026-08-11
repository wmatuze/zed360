import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { MediaReviewsController } from './media-reviews.controller';
import { MediaReviewsService } from './media-reviews.service';

describe('MediaReviewsController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'reviewer@example.com',
    emailVerifiedAt: new Date(),
  };
  const verify = jest.fn();
  const list = jest.fn();
  const decide = jest.fn();
  const controller = new MediaReviewsController(
    { verify } as unknown as AuthenticatedUserService,
    { list, decide } as unknown as MediaReviewsService,
  );
  const mediaId = 'e0ca3364-73a6-4268-8e30-6e358d4a6d2a';

  beforeEach(() => {
    jest.clearAllMocks();
    verify.mockResolvedValue(user);
  });

  it('authorizes a valid approval', async () => {
    await controller.decide('Bearer token', mediaId, {
      decision: 'approved',
      note: '',
    });
    expect(decide).toHaveBeenCalledWith(user, mediaId, {
      decision: 'approved',
      note: '',
    });
  });

  it('requires a reason for rejection before authentication', async () => {
    await expect(
      controller.decide('Bearer token', mediaId, {
        decision: 'rejected',
        note: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
