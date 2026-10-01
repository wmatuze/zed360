import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  minutes,
  hours,
  Throttle,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
} from '@nestjs/throttler';

// Limits are per client IP. Zambian mobile carriers place many customers
// behind shared addresses, so these stop floods rather than individuals.
// The counters live in memory, so each API instance enforces them separately.
export const publicRateLimits = {
  customerRequest: { burst: 5, hourly: 20 },
  businessApplication: { burst: 5, hourly: 10 },
  requestOutcome: { burst: 15, hourly: 60 },
  customerReview: { burst: 5, hourly: 20 },
  contentReport: { burst: 5, hourly: 5 },
} as const;

export const throttlerOptions: ThrottlerModuleOptions = {
  throttlers: [
    { name: 'burst', ttl: minutes(1), limit: 5 },
    { name: 'hourly', ttl: hours(1), limit: 20 },
  ],
  errorMessage:
    'Too many attempts from this connection. Please wait a few minutes and try again.',
};

/**
 * Applies the throttler to a single public route. The guard is not global
 * because the web server fetches public pages from one address.
 */
export function PublicRateLimit(name: keyof typeof publicRateLimits) {
  const { burst, hourly } = publicRateLimits[name];
  return applyDecorators(
    UseGuards(ThrottlerGuard),
    Throttle({
      burst: { limit: burst, ttl: minutes(1) },
      hourly: { limit: hourly, ttl: hours(1) },
    }),
  );
}

/**
 * Express "trust proxy" setting from TRUST_PROXY_HOPS, so req.ip is the real
 * client behind a load balancer. Unset means the API is reached directly.
 */
export function trustProxySetting() {
  const hops = Number(process.env.TRUST_PROXY_HOPS ?? 0);
  return Number.isInteger(hops) && hops > 0 ? hops : false;
}
