import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  hours,
  InjectThrottlerStorage,
  minutes,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import { isIP } from 'node:net';

type SignInScope =
  'admin' | 'business' | 'mfa' | 'reviewCodePhone' | 'reviewCodeRequest';

// Sign-in runs inside Next.js server actions, so Supabase sees every attempt
// from the web server's address and its own per-IP limits never apply to an
// individual attacker. These limits restore that protection. Attempts are
// counted before the password is checked, so they cover the reset-email
// flow too and never reveal whether an account exists.
export const signInAttemptLimits = {
  admin: {
    identifier: { limit: 5, window: minutes(15) },
    clientIp: { limit: 20, window: minutes(15) },
  },
  business: {
    identifier: { limit: 5, window: hours(1) },
    clientIp: { limit: 30, window: hours(1) },
  },
  // Authenticator codes are six digits, so guesses per account stay low.
  mfa: {
    identifier: { limit: 5, window: minutes(15) },
    clientIp: { limit: 20, window: minutes(15) },
  },
  // Each review code is a paid WhatsApp message, so sends are capped per
  // number and per request on top of the per-IP route limit.
  reviewCodePhone: {
    identifier: { limit: 3, window: hours(1) },
    clientIp: { limit: 10, window: hours(1) },
  },
  reviewCodeRequest: {
    identifier: { limit: 5, window: hours(1) },
    clientIp: { limit: 10, window: hours(1) },
  },
} as const;

export function parseClientIp(body: unknown) {
  if (typeof body !== 'object' || body === null) return null;
  const value = (body as { clientIp?: unknown }).clientIp;
  return typeof value === 'string' && isIP(value.trim()) ? value.trim() : null;
}

@Injectable()
export class SignInAttemptLimiter {
  constructor(
    @InjectThrottlerStorage() private readonly storage: ThrottlerStorage,
  ) {}

  async consume(
    scope: SignInScope,
    identifier: string,
    clientIp: string | null,
  ) {
    const limits = signInAttemptLimits[scope];
    const checks = [
      this.hit(
        `${scope}:id:${identifier.trim().toLowerCase()}`,
        limits.identifier,
      ),
    ];
    if (clientIp) {
      checks.push(this.hit(`${scope}:ip:${clientIp}`, limits.clientIp));
    }

    const retryAfterSeconds = Math.max(0, ...(await Promise.all(checks)));
    if (retryAfterSeconds > 0) {
      throw new HttpException(
        {
          message:
            'Too many sign-in attempts. Please wait before trying again.',
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Returns seconds until retry when blocked, otherwise 0. */
  private async hit(key: string, rule: { limit: number; window: number }) {
    const record = await this.storage.increment(
      key,
      rule.window,
      rule.limit,
      rule.window,
      'sign-in',
    );
    return record.isBlocked ? Math.max(1, record.timeToBlockExpire) : 0;
  }
}
