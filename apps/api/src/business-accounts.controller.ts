import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  businessApplicationClaimSchema,
  claimBusinessSchema,
  updateEmailAlertsSchema,
} from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessAccountsService } from './business-accounts.service';
import {
  parseClientIp,
  SignInAttemptLimiter,
} from './sign-in-attempt-limiter.service';
import { loadApiEnvironment } from './environment';
import { timingSafeEqual } from 'node:crypto';

function assertInternalRequest(providedSecret?: string) {
  loadApiEnvironment();
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  if (!expectedSecret || expectedSecret.length < 32 || !providedSecret) {
    throw new UnauthorizedException('This operation is unavailable.');
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);
  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    throw new UnauthorizedException('This operation is unavailable.');
  }
}

function parseEmail(body: unknown) {
  if (typeof body !== 'object' || body === null || !('email' in body)) {
    return null;
  }
  const value = (body as { email?: unknown }).email;
  if (typeof value !== 'string') return null;
  const email = value.trim();
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }
  return email;
}

@Controller('business-account')
export class BusinessAccountsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly accounts: BusinessAccountsService,
    private readonly attempts: SignInAttemptLimiter,
  ) {}

  @Post('sign-in-eligibility')
  async signInEligibility(
    @Headers('x-zed360-internal-secret') internalSecret: string | undefined,
    @Body() body: unknown,
  ) {
    assertInternalRequest(internalSecret);
    const email = parseEmail(body);
    if (!email) {
      throw new BadRequestException('A valid email address is required.');
    }
    await this.attempts.consume('business', email, parseClientIp(body));
    return this.accounts.getSignInEligibility(email);
  }

  @Get()
  async getAccount(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.accounts.getAccount(user);
  }

  @Put('email-alerts')
  async setEmailAlerts(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = updateEmailAlertsSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        'Choose whether email alerts are on or off.',
      );
    }
    const user = await this.authentication.verify(authorization);
    return this.accounts.setEmailAlerts(user, parsed.data.enabled);
  }

  @Post('claims')
  async claim(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = claimBusinessSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('A valid business is required.');
    }

    const user = await this.authentication.verify(authorization);
    return this.accounts.claimBusiness(user, parsed.data.businessId);
  }

  @Get('application-claims')
  async previewApplicationClaim(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ) {
    const parsed = businessApplicationClaimSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException('A valid application link is required.');
    }
    const user = await this.authentication.verify(authorization);
    return this.accounts.previewApplicationClaim(user, parsed.data.token);
  }

  @Post('application-claims')
  async confirmApplicationClaim(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = businessApplicationClaimSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('A valid application link is required.');
    }
    const user = await this.authentication.verify(authorization);
    return this.accounts.confirmApplicationClaim(user, parsed.data.token);
  }
}
