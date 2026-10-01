import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import {
  AuthenticatedUserService,
  tokenAssuranceLevel,
} from './authenticated-user.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('AuthenticatedUserService', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const getUser = jest.fn();
  const createClientMock = jest.mocked(createClient);
  let service: AuthenticatedUserService;
  const limit = jest.fn();
  const where = jest.fn(() => ({ limit }));
  const from = jest.fn(() => ({ where }));
  const select = jest.fn(() => ({ from }));

  const confirmedUser = (email = 'owner@example.com') => ({
    data: {
      user: {
        id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
        email,
        email_confirmed_at: '2026-08-10T09:00:00.000Z',
      },
    },
    error: null,
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    getUser.mockReset();
    createClientMock.mockReset().mockReturnValue({
      auth: { getUser },
    } as never);
    limit.mockReset().mockResolvedValue([]);
    service = new AuthenticatedUserService({ db: { select } } as never);
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  it('verifies the access token with Supabase and normalizes the email', async () => {
    getUser.mockResolvedValue(confirmedUser('Owner@Example.com'));

    await expect(service.verify('Bearer access-token')).resolves.toEqual({
      id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
      email: 'owner@example.com',
      emailVerifiedAt: new Date('2026-08-10T09:00:00.000Z'),
      assuranceLevel: 'aal1',
    });
    expect(getUser).toHaveBeenCalledWith('access-token');
  });

  it('reads the second-factor level from the verified token', async () => {
    getUser.mockResolvedValue(confirmedUser());
    const token = 'e30.eyJzdWIiOiJ1c2VyIiwiYWFsIjoiYWFsMiJ9.sig';

    await expect(service.verify(`Bearer ${token}`)).resolves.toMatchObject({
      assuranceLevel: 'aal2',
    });
    expect(tokenAssuranceLevel('e30.eyJhYWwiOiJhYWwxIn0.sig')).toBe('aal1');
    expect(tokenAssuranceLevel('not-a-jwt')).toBe('aal1');
  });

  it('rejects requests without a bearer token', async () => {
    await expect(service.verify()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(getUser).not.toHaveBeenCalled();
  });

  it('reuses a recent successful verification', async () => {
    getUser.mockResolvedValue(confirmedUser());

    await service.verify('Bearer access-token');
    await service.verify('Bearer access-token');

    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid Supabase token', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('invalid token'), { status: 403 }),
    });

    await expect(service.verify('Bearer access-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an account whose email has not been confirmed', async () => {
    const unconfirmed = confirmedUser();
    unconfirmed.data.user.email_confirmed_at = undefined as never;
    getUser.mockResolvedValue(unconfirmed);

    await expect(
      service.verify('Bearer unconfirmed-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a valid session for a suspended local account', async () => {
    getUser.mockResolvedValue(confirmedUser());
    limit.mockResolvedValue([{ accountStatus: 'suspended' }]);

    await expect(
      service.verify('Bearer suspended-token'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a temporary error when Supabase cannot be reached', async () => {
    getUser.mockRejectedValue(new Error('network unavailable'));

    await expect(service.verify('Bearer access-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns a temporary error when Supabase reports a retryable failure', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: Object.assign(new Error('fetch failed'), { status: 0 }),
    });

    await expect(service.verify('Bearer access-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
