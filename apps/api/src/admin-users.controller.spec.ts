import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { SignInAttemptLimiter } from './sign-in-attempt-limiter.service';
import { AuthenticatedUserService } from './authenticated-user.service';

describe('AdminUsersController', () => {
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'admin@example.com',
    emailVerifiedAt: new Date('2026-09-10T08:00:00.000Z'),
    assuranceLevel: 'aal2' as const,
  };
  const verify = jest.fn();
  const getSignInIdentity = jest.fn();
  const list = jest.fn();
  const get = jest.fn();
  const act = jest.fn();
  const controller = new AdminUsersController(
    { verify } as unknown as AuthenticatedUserService,
    { getSignInIdentity, list, get, act } as unknown as AdminUsersService,
    new SignInAttemptLimiter(new ThrottlerStorageService()),
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
    get.mockReset();
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

  it('blocks repeated sign-in attempts for one username', async () => {
    const secret = 'a'.repeat(32);
    process.env.INTERNAL_API_SECRET = secret;
    const body = { username: 'locked.admin', clientIp: '203.0.113.7' };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await controller.signInIdentity(secret, body);
    }
    await expect(controller.signInIdentity(secret, body)).rejects.toMatchObject(
      { status: 429 },
    );
    await expect(
      controller.signInIdentity(secret, { username: 'other.admin' }),
    ).resolves.toEqual({ email: 'admin@example.com' });
  });

  it('limits authenticator code attempts per user', async () => {
    const secret = 'a'.repeat(32);
    process.env.INTERNAL_API_SECRET = secret;
    const body = { userId: user.id };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await controller.recordMfaAttempt(secret, body);
    }
    await expect(
      controller.recordMfaAttempt(secret, body),
    ).rejects.toMatchObject({ status: 429 });
    await expect(
      controller.recordMfaAttempt(undefined, body),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('loads a validated, paginated user query', async () => {
    await controller.list('Bearer token', { q: 'owner', page: '2' });

    expect(list).toHaveBeenCalledWith(user, {
      q: 'owner',
      page: 2,
      pageSize: 25,
      role: 'all',
      status: 'all',
    });
  });

  it('passes role and status filters through', async () => {
    await controller.list('Bearer token', {
      role: 'team',
      status: 'suspended',
    });

    expect(list).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ role: 'team', status: 'suspended' }),
    );
  });

  it('rejects an unknown role filter', async () => {
    await expect(
      controller.list('Bearer token', { role: 'owner' }),
    ).rejects.toThrow('Check the user search parameters.');
    expect(list).not.toHaveBeenCalled();
  });

  it('loads one user for an administrator', async () => {
    get.mockResolvedValue({ user: { id: user.id } });

    await expect(controller.get('Bearer token', user.id)).resolves.toEqual({
      user: { id: user.id },
    });
    expect(get).toHaveBeenCalledWith(user, user.id);
  });

  it('rejects a malformed user id before authenticating', async () => {
    await expect(controller.get('Bearer token', 'not-a-uuid')).rejects.toThrow(
      'A valid user is required.',
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('accepts an authenticator reset with a reason', async () => {
    const action = {
      action: 'authenticator_reset',
      reason: 'Confirmed identity by phone call',
    };
    await controller.act('Bearer token', user.id, action);

    expect(act).toHaveBeenCalledWith(user, user.id, action);
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
