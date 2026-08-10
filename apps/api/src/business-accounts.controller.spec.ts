import { BadRequestException } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessAccountsController } from './business-accounts.controller';
import { BusinessAccountsService } from './business-accounts.service';

describe('BusinessAccountsController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'owner@example.com',
    emailVerifiedAt: new Date('2026-08-10T08:00:00.000Z'),
  };
  const verify = jest.fn();
  const getAccount = jest.fn();
  const claimBusiness = jest.fn();
  const controller = new BusinessAccountsController(
    { verify } as unknown as AuthenticatedUserService,
    { getAccount, claimBusiness } as unknown as BusinessAccountsService,
  );

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    getAccount.mockReset().mockResolvedValue({
      businesses: [],
      claimableBusinesses: [],
    });
    claimBusiness.mockReset().mockResolvedValue({
      businesses: [],
      claimableBusinesses: [],
    });
  });

  it('verifies the bearer token before returning an account', async () => {
    await controller.getAccount('Bearer access-token');

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(getAccount).toHaveBeenCalledWith(user);
  });

  it('links a valid business only after verifying the caller', async () => {
    const businessId = '4747cc34-0ec0-40df-8dc2-605612106077';

    await controller.claim('Bearer access-token', { businessId });

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(claimBusiness).toHaveBeenCalledWith(user, businessId);
  });

  it('rejects an invalid business id before querying the account service', async () => {
    await expect(
      controller.claim('Bearer access-token', { businessId: 'not-a-uuid' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
    expect(claimBusiness).not.toHaveBeenCalled();
  });
});
