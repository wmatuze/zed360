import { Controller, Get, Headers } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

@Controller('admin/access')
export class AdminAccessController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  @Get()
  async getAccess(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    const role = await this.authorization.requireReviewer(user);
    return { role };
  }
}
