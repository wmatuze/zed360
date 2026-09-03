import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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
  const getSignInEligibility = jest.fn();
  const claimBusiness = jest.fn();
  const previewApplicationClaim = jest.fn();
  const confirmApplicationClaim = jest.fn();
  const controller = new BusinessAccountsController(
    { verify } as unknown as AuthenticatedUserService,
    {
      getAccount,
      getSignInEligibility,
      claimBusiness,
      previewApplicationClaim,
      confirmApplicationClaim,
    } as unknown as BusinessAccountsService,
  );

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET =
      'test-internal-secret-that-is-long-enough';
    verify.mockReset().mockResolvedValue(user);
    getSignInEligibility.mockReset().mockResolvedValue({
      eligible: true,
      mayCreateUser: true,
    });
    getAccount.mockReset().mockResolvedValue({
      businesses: [],
      claimableBusinesses: [],
    });
    claimBusiness.mockReset().mockResolvedValue({
      businesses: [],
      claimableBusinesses: [],
    });
    previewApplicationClaim.mockReset().mockResolvedValue({
      businessId: '4747cc34-0ec0-40df-8dc2-605612106077',
      businessName: 'Copperbelt Solar Care',
      submittedEmail: user.email,
      status: 'ready',
    });
    confirmApplicationClaim.mockReset().mockResolvedValue({
      businessId: '4747cc34-0ec0-40df-8dc2-605612106077',
      businessName: 'Copperbelt Solar Care',
      submittedEmail: user.email,
      status: 'already_connected',
    });
  });

  it('checks sign-in eligibility only for an authenticated internal request', async () => {
    await expect(
      controller.signInEligibility('test-internal-secret-that-is-long-enough', {
        email: ' Owner@Example.com ',
      }),
    ).resolves.toEqual({ eligible: true, mayCreateUser: true });
    expect(getSignInEligibility).toHaveBeenCalledWith('Owner@Example.com');
  });

  it('rejects public sign-in eligibility probes', async () => {
    expect(() =>
      controller.signInEligibility(undefined, { email: user.email }),
    ).toThrow(UnauthorizedException);
    expect(getSignInEligibility).not.toHaveBeenCalled();
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

  it('previews only a valid application-scoped claim token', async () => {
    const token = 'a'.repeat(43);

    await controller.previewApplicationClaim('Bearer access-token', { token });

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(previewApplicationClaim).toHaveBeenCalledWith(user, token);
  });

  it('confirms an application claim only after verifying the caller', async () => {
    const token = 'b'.repeat(43);

    await controller.confirmApplicationClaim('Bearer access-token', { token });

    expect(verify).toHaveBeenCalledWith('Bearer access-token');
    expect(confirmApplicationClaim).toHaveBeenCalledWith(user, token);
  });

  it('rejects a malformed application token before authentication', async () => {
    await expect(
      controller.confirmApplicationClaim('Bearer access-token', {
        token: 'not-valid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
    expect(confirmApplicationClaim).not.toHaveBeenCalled();
  });
});
