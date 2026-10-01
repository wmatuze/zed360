import { AdminAccessController } from './admin-access.controller';
import { AuthenticatedUserService } from './authenticated-user.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

describe('AdminAccessController', () => {
  const user = {
    id: 'b815e956-f004-4f52-9e1f-d02231119792',
    email: 'reviewer@example.com',
    emailVerifiedAt: new Date('2026-09-10T08:00:00.000Z'),
    assuranceLevel: 'aal2' as const,
  };
  const verify = jest.fn();
  const reviewerRole = jest.fn();
  const controller = new AdminAccessController(
    { verify } as unknown as AuthenticatedUserService,
    { reviewerRole } as unknown as PlatformAuthorizationService,
  );

  beforeEach(() => {
    verify.mockReset();
    reviewerRole.mockReset();
  });

  it('returns the database-backed platform role', async () => {
    verify.mockResolvedValue(user);
    reviewerRole.mockResolvedValue('reviewer');

    await expect(controller.getAccess('Bearer token')).resolves.toEqual({
      role: 'reviewer',
      mfaVerified: true,
    });
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(reviewerRole).toHaveBeenCalledWith(user);
  });

  it('reports a password-only session so sign-in can request MFA', async () => {
    verify.mockResolvedValue({ ...user, assuranceLevel: 'aal1' });
    reviewerRole.mockResolvedValue('admin');

    await expect(controller.getAccess('Bearer token')).resolves.toEqual({
      role: 'admin',
      mfaVerified: false,
    });
  });
});
