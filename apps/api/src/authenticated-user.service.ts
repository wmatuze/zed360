import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { eq, users } from '@zed360/database';
import { DatabaseService } from './database.service';
import { loadApiEnvironment } from './environment';

export type AuthenticatedUser = {
  id: string;
  email: string;
  emailVerifiedAt: Date;
};

@Injectable()
export class AuthenticatedUserService {
  private readonly verificationCache = new Map<
    string,
    { expiresAt: number; result: Promise<AuthenticatedUser> }
  >();

  constructor(private readonly database: DatabaseService) {}

  async verify(authorization?: string): Promise<AuthenticatedUser> {
    const token = this.bearerToken(authorization);
    if (this.verificationCache.size >= 500) {
      const now = Date.now();
      for (const [key, entry] of this.verificationCache) {
        if (entry.expiresAt <= now) this.verificationCache.delete(key);
      }
      const oldestKey = this.verificationCache.keys().next().value as
        string | undefined;
      if (this.verificationCache.size >= 500 && oldestKey) {
        this.verificationCache.delete(oldestKey);
      }
    }
    const cached = this.verificationCache.get(token);
    if (cached && cached.expiresAt > Date.now()) {
      return this.requireActiveAccount(await cached.result);
    }

    const result = this.verifyWithSupabase(token);
    this.verificationCache.set(token, {
      expiresAt: Date.now() + 30_000,
      result,
    });
    try {
      return await this.requireActiveAccount(await result);
    } catch (error) {
      if (this.verificationCache.get(token)?.result === result) {
        this.verificationCache.delete(token);
      }
      throw error;
    }
  }

  private async verifyWithSupabase(token: string): Promise<AuthenticatedUser> {
    loadApiEnvironment();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !publishableKey) {
      throw new ServiceUnavailableException(
        'Business authentication is not configured.',
      );
    }

    let claimsResult: Awaited<
      ReturnType<ReturnType<typeof createClient>['auth']['getClaims']>
    >;
    try {
      const supabase = createClient(url, publishableKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      });
      claimsResult = await supabase.auth.getClaims(token);
    } catch {
      throw new ServiceUnavailableException(
        'Business authentication could not be verified right now.',
      );
    }

    if (claimsResult.error) {
      throw new UnauthorizedException('Your sign-in session is invalid.');
    }

    const claims = claimsResult.data?.claims;
    if (
      typeof claims?.sub !== 'string' ||
      typeof claims.email !== 'string' ||
      typeof claims.iat !== 'number'
    ) {
      throw new UnauthorizedException('A verified email address is required.');
    }

    const authenticatedUser = {
      id: claims.sub,
      email: claims.email.trim().toLowerCase(),
      emailVerifiedAt: new Date(claims.iat * 1000),
    };
    return authenticatedUser;
  }

  private async requireActiveAccount(user: AuthenticatedUser) {
    const [localUser] = await this.database.db
      .select({ accountStatus: users.accountStatus })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (localUser?.accountStatus === 'suspended') {
      throw new ForbiddenException('This Zed360 account is suspended.');
    }
    return user;
  }

  private bearerToken(authorization?: string) {
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match?.[1]) {
      throw new UnauthorizedException('A valid sign-in session is required.');
    }
    return match[1];
  }
}
