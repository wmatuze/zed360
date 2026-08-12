import { Controller, Get, Headers } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessDashboardService } from './business-dashboard.service';

@Controller('business-dashboard')
export class BusinessDashboardController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly dashboard: BusinessDashboardService,
  ) {}

  @Get()
  async getDashboard(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.dashboard.getDashboard(user);
  }
}
