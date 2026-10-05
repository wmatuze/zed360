import { ConflictException } from '@nestjs/common';
import { AdminUsersService, changedRole } from './admin-users.service';
import type { DatabaseService } from './database.service';
import type { PlatformAuthorizationService } from './platform-authorization.service';

describe('AdminUsersService self-protection', () => {
  const viewer = {
    id: 'b815e956-f004-4f52-9e1f-d02231119792',
    email: 'admin@example.com',
    emailVerifiedAt: new Date('2026-09-10T08:00:00.000Z'),
    assuranceLevel: 'aal2' as const,
  };
  const transaction = jest.fn();
  const requireAdmin = jest.fn();
  const service = new AdminUsersService(
    { db: { transaction } } as unknown as DatabaseService,
    { requireAdmin } as unknown as PlatformAuthorizationService,
  );
  const reason = 'Testing the protection rule';

  beforeEach(() => {
    transaction.mockReset();
    requireAdmin.mockReset().mockResolvedValue('admin');
  });

  it.each([
    [{ action: 'suspended', reason }],
    [{ action: 'authenticator_reset', reason }],
    [{ action: 'role_revoked', role: 'admin', reason }],
  ] as const)(
    'refuses %j on the administrator’s own account',
    async (action) => {
      const attempt = service.act(viewer, viewer.id, action);
      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toMatchObject({
        response: { code: 'self-action' },
      });
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('lets an administrator drop their own reviewer role', async () => {
    transaction.mockResolvedValue({ userId: viewer.id });
    await expect(
      service.act(viewer, viewer.id, {
        action: 'role_revoked',
        role: 'reviewer',
        reason,
      }),
    ).resolves.toEqual({ userId: viewer.id });
  });

  it('checks administrator access before anything else', async () => {
    requireAdmin.mockRejectedValue(new Error('denied'));
    await expect(
      service.act(viewer, viewer.id, { action: 'suspended', reason }),
    ).rejects.toThrow('denied');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('reports a duplicate username clearly', async () => {
    transaction.mockRejectedValue(
      Object.assign(new Error('query failed'), { cause: { code: '23505' } }),
    );
    await expect(
      service.act(viewer, '2f0c6a0e-5a57-4b5e-9c53-0d7f4a1c2b11', {
        action: 'role_granted',
        role: 'reviewer',
        username: 'taken',
        reason,
      }),
    ).rejects.toMatchObject({ response: { code: 'username-taken' } });
  });
});

describe('changedRole', () => {
  it('names the role a grant or revocation changed', () => {
    expect(changedRole([], ['reviewer'])).toBe('reviewer');
    expect(changedRole(['admin', 'reviewer'], ['reviewer'])).toBe('admin');
  });

  it('is empty when no single role changed', () => {
    expect(changedRole(['admin'], ['admin'])).toBeNull();
    expect(changedRole(null, undefined)).toBeNull();
    expect(changedRole([], ['admin', 'reviewer'])).toBeNull();
  });
});
