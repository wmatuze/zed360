import { BadRequestException } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AuthenticatedUserService } from './authenticated-user.service';

describe('AdminUsersController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'admin@example.com',
    emailVerifiedAt: new Date('2026-09-10T08:00:00.000Z'),
  };
  const verify = jest.fn();
  const getSignInIdentity = jest.fn();
  const list = jest.fn();
  const act = jest.fn();
  const controller = new AdminUsersController(
    { verify } as unknown as AuthenticatedUserService,
    { getSignInIdentity, list, act } as unknown as AdminUsersService,
  );
  const originalInternalSecret = process.env.INTERNAL_API_SECRET;

  afterAll(() => {
    if (originalInternalSecret === undefined) {
      delete process.env.INTERNAL_API_SECRET;
    } else {
      process.env.INTERNAL_API_SECRET = originalInternalSecret;
    }
  });

  beforeEach(() => {
    verify.mockReset().mockResolvedValue(user);
    getSignInIdentity.mockReset().mockResolvedValue({
      email: 'admin@example.com',
    });
    list.mockReset().mockResolvedValue({ users: [] });
    act.mockReset().mockResolvedValue({ userId: user.id });
  });

  it('resolves an administrator username only for an internal request', async () => {
    const secret = 'a'.repeat(32);
    process.env.INTERNAL_API_SECRET = secret;

    await expect(
      controller.signInIdentity(secret, { username: 'Platform.Admin' }),
    ).resolves.toEqual({ email: 'admin@example.com' });
    expect(getSignInIdentity).toHaveBeenCalledWith('Platform.Admin');
  });

  it('loads a validated, paginated user query', async () => {
    await controller.list('Bearer token', { q: 'owner', page: '2' });

    expect(list).toHaveBeenCalledWith(user, {
      q: 'owner',
      page: 2,
      pageSize: 25,
    });
  });

  it('passes a valid role decision to the service', async () => {
    await controller.act('Bearer token', user.id, {
      action: 'role_granted',
      role: 'reviewer',
      reason: 'Assigned to the moderation operations team.',
    });

    expect(act).toHaveBeenCalledWith(user, user.id, {
      action: 'role_granted',
      role: 'reviewer',
      reason: 'Assigned to the moderation operations team.',
    });
  });

  it('rejects invalid actions before authentication', async () => {
    await expect(
      controller.act('Bearer token', user.id, {
        action: 'suspended',
        reason: 'short',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(verify).not.toHaveBeenCalled();
  });
});
