import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedUserService } from './authenticated-user.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

describe('AuthenticatedUserService', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const getClaims = jest.fn();
  const createClientMock = jest.mocked(createClient);
  let service: AuthenticatedUserService;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    getClaims.mockReset();
    createClientMock.mockReset().mockReturnValue({
      auth: { getClaims },
    } as never);
    service = new AuthenticatedUserService();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  it('verifies the access token with Supabase and normalizes the email', async () => {
    getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
          email: 'Owner@Example.com',
          iat: 1786348800,
        },
      },
      error: null,
    });

    await expect(service.verify('Bearer access-token')).resolves.toEqual({
      id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
      email: 'owner@example.com',
      emailVerifiedAt: new Date(1786348800 * 1000),
    });
    expect(getClaims).toHaveBeenCalledWith('access-token');
  });

  it('rejects requests without a bearer token', async () => {
    await expect(service.verify()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('reuses a recent successful verification', async () => {
    getClaims.mockResolvedValue({
      data: {
        claims: {
          sub: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
          email: 'owner@example.com',
          iat: 1786348800,
        },
      },
      error: null,
    });

    await service.verify('Bearer access-token');
    await service.verify('Bearer access-token');

    expect(getClaims).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid Supabase token', async () => {
    getClaims.mockResolvedValue({
      data: null,
      error: new Error('invalid token'),
    });

    await expect(service.verify('Bearer access-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns a temporary error when Supabase cannot be reached', async () => {
    getClaims.mockRejectedValue(new Error('network unavailable'));

    await expect(service.verify('Bearer access-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
