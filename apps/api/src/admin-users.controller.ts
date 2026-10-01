import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  adminUserActionSchema,
  adminUserListQuerySchema,
} from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { AdminUsersService } from './admin-users.service';
import { loadApiEnvironment } from './environment';
import { timingSafeEqual } from 'node:crypto';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function parseUsername(body: unknown) {
  if (typeof body !== 'object' || body === null || !('username' in body)) {
    return null;
  }
  const value = (body as { username?: unknown }).username;
  if (typeof value !== 'string') return null;
  const username = value.trim();
  return username.length >= 3 && username.length <= 50 ? username : null;
}

@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly users: AdminUsersService,
  ) {}

  @Post('sign-in-identity')
  signInIdentity(
    @Headers('x-zed360-internal-secret') internalSecret: string | undefined,
    @Body() body: unknown,
  ) {
    assertInternalRequest(internalSecret);
    const username = parseUsername(body);
    if (!username)
      throw new BadRequestException('A valid username is required.');
    return this.users.getSignInIdentity(username);
  }

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ) {
    const parsed = adminUserListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException('Check the user search parameters.');
    }
    return this.users.list(
      await this.authentication.verify(authorization),
      parsed.data,
    );
  }

  @Post(':userId/actions')
  async act(
    @Headers('authorization') authorization: string | undefined,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    const parsed = adminUserActionSchema.safeParse(body);
    if (!uuidPattern.test(userId) || !parsed.success) {
      throw new BadRequestException(
        'Provide a valid user action and a clear reason.',
      );
    }
    return this.users.act(
      await this.authentication.verify(authorization),
      userId,
      parsed.data,
    );
  }
}
