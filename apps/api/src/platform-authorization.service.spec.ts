import { ForbiddenException } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

describe('PlatformAuthorizationService', () => {
  const where = jest.fn();
  const from = jest.fn(() => ({ where }));
  const select = jest.fn(() => ({ from }));
  const service = new PlatformAuthorizationService({
    db: { select },
  } as unknown as DatabaseService);
  const user = {
    id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
    email: 'reviewer@example.com',
    emailVerifiedAt: new Date('2026-08-10T08:00:00.000Z'),
  };

  beforeEach(() => {
    select.mockClear();
    from.mockClear();
    where.mockReset();
  });

  it('accepts an assigned reviewer role', async () => {
    where.mockResolvedValue([{ role: 'reviewer' }]);

    await expect(service.requireReviewer(user)).resolves.toBe('reviewer');
  });

  it('prefers admin when both roles are present', async () => {
    where.mockResolvedValue([{ role: 'reviewer' }, { role: 'admin' }]);

    await expect(service.requireReviewer(user)).resolves.toBe('admin');
  });

  it('denies authenticated users without a platform role', async () => {
    where.mockResolvedValue([]);

    await expect(service.requireReviewer(user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('accepts an administrator for administrator-only operations', async () => {
    where.mockResolvedValue([{ role: 'admin' }]);

    await expect(service.requireAdmin(user)).resolves.toBe('admin');
  });

  it('does not grant administrator access to a reviewer', async () => {
    where.mockResolvedValue([{ role: 'reviewer' }]);

    await expect(service.requireAdmin(user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
