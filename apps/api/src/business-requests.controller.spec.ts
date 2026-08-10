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
  const controller = new BusinessRequestsController(
    { verify } as unknown as AuthenticatedUserService,
    { getMatchedRequests } as unknown as BusinessRequestsService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    getMatchedRequests.mockReset().mockResolvedValue({ requests: [] });
  });

  it('verifies the caller before loading matched requests', async () => {
    await controller.getMatchedRequests('Bearer access-token');

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(getMatchedRequests).toHaveBeenCalledWith(user);
  });
});
