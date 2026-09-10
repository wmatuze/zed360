import { AdminAccessController } from './admin-access.controller';
import { AuthenticatedUserService } from './authenticated-user.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

describe('AdminAccessController', () => {
  const user = {
    id: 'b815e956-f004-4f52-9e1f-d02231119792',
    email: 'reviewer@example.com',
    emailVerifiedAt: new Date('2026-09-10T08:00:00.000Z'),
  };
  const verify = jest.fn();
  const requireReviewer = jest.fn();
  const controller = new AdminAccessController(
    { verify } as unknown as AuthenticatedUserService,
    { requireReviewer } as unknown as PlatformAuthorizationService,
  );

  beforeEach(() => {
    verify.mockReset();
    requireReviewer.mockReset();
  });

  it('returns the database-backed platform role', async () => {
    verify.mockResolvedValue(user);
    requireReviewer.mockResolvedValue('reviewer');

    await expect(controller.getAccess('Bearer token')).resolves.toEqual({
      role: 'reviewer',
    });
    expect(verify).toHaveBeenCalledWith('Bearer token');
    expect(requireReviewer).toHaveBeenCalledWith(user);
  });
});
