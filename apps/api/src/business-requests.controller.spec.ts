import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessRequestsController } from './business-requests.controller';
import { BusinessRequestsService } from './business-requests.service';

describe('BusinessRequestsController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'owner@example.com',
    emailVerifiedAt: new Date('2026-08-10T08:00:00.000Z'),
  };
  const verify = jest.fn();
  const getMatchedRequests = jest.fn();
  const submitResponse = jest.fn();
  const controller = new BusinessRequestsController(
    { verify } as unknown as AuthenticatedUserService,
    {
      getMatchedRequests,
      submitResponse,
    } as unknown as BusinessRequestsService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    getMatchedRequests.mockReset().mockResolvedValue({ requests: [] });
    submitResponse.mockReset().mockResolvedValue({});
  });

  it('verifies the caller before loading matched requests', async () => {
    await controller.getMatchedRequests('Bearer access-token');

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(getMatchedRequests).toHaveBeenCalledWith(user);
  });

  it('validates and authorizes a response submission', async () => {
    const matchId = '369ef480-1b89-48a4-a0db-9b99ecfc3ee4';
    const response = {
      status: 'available',
      message: 'We can complete this work during the requested week.',
      priceMinimum: 500,
      priceMaximum: 800,
    };

    await controller.submitResponse('Bearer access-token', matchId, response);

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(submitResponse).toHaveBeenCalledWith(user, matchId, response);
  });

  it('rejects invalid response data before authentication', async () => {
    await expect(
      controller.submitResponse('Bearer access-token', 'not-a-match', {
        status: 'available',
        message: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
    expect(submitResponse).not.toHaveBeenCalled();
  });
});
