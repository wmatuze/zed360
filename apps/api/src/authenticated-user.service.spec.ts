import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';

describe('AuthenticatedUserService', () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const fetchMock = jest.fn();
  const service = new AuthenticatedUserService();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  it('verifies the access token with Supabase and normalizes the email', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
          email: 'Owner@Example.com',
          email_confirmed_at: '2026-08-10T08:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    await expect(service.verify('Bearer access-token')).resolves.toEqual({
      id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
      email: 'owner@example.com',
      emailVerifiedAt: new Date('2026-08-10T08:00:00.000Z'),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/auth/v1/user',
      expect.objectContaining({
        headers: {
          apikey: 'publishable-key',
          authorization: 'Bearer access-token',
        },
      }),
    );
  });

  it('rejects requests without a bearer token', async () => {
    await expect(service.verify()).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an unverified Supabase user', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'f8d18ef2-7f91-4a63-a40c-2017d7a02f07',
          email: 'owner@example.com',
          email_confirmed_at: null,
        }),
        { status: 200 },
      ),
    );

    await expect(service.verify('Bearer access-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns a temporary error when Supabase cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('network unavailable'));

    await expect(service.verify('Bearer access-token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
