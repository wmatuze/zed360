import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  adminUserActionSchema,
  adminUserListQuerySchema,
} from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { AdminUsersService } from './admin-users.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly users: AdminUsersService,
  ) {}

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
