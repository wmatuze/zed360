import { Controller, Get, Headers } from '@nestjs/common';
import { AdminOverviewService } from './admin-overview.service';
import { AuthenticatedUserService } from './authenticated-user.service';

@Controller('admin/overview')
export class AdminOverviewController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly overview: AdminOverviewService,
  ) {}

  @Get()
  async getOverview(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.overview.getOverview(user);
  }
}
