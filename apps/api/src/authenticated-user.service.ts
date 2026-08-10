import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { loadApiEnvironment } from './environment';

export type AuthenticatedUser = {
  id: string;
  email: string;
  emailVerifiedAt: Date;
};

type SupabaseUserResponse = {
  id?: unknown;
  email?: unknown;
  email_confirmed_at?: unknown;
};

@Injectable()
export class AuthenticatedUserService {
  async verify(authorization?: string): Promise<AuthenticatedUser> {
    const token = this.bearerToken(authorization);
    loadApiEnvironment();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new ServiceUnavailableException(
        'Business authentication is not configured.',
      );
    }

    let response: Response;
    try {
      response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
        headers: {
          apikey: publishableKey,
          authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Business authentication could not be verified right now.',
      );
    }

    if (!response.ok) {
      throw new UnauthorizedException('Your sign-in session is invalid.');
    }

    const user = (await response.json()) as SupabaseUserResponse;
    if (
      typeof user.id !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.email_confirmed_at !== 'string'
    ) {
      throw new UnauthorizedException('A verified email address is required.');
    }

    return {
      id: user.id,
      email: user.email.trim().toLowerCase(),
      emailVerifiedAt: new Date(user.email_confirmed_at),
    };
  }

  private bearerToken(authorization?: string) {
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match?.[1]) {
      throw new UnauthorizedException('A valid sign-in session is required.');
    }
    return match[1];
  }
}
