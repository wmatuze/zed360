import { Controller, Get, Headers } from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessRequestsService } from './business-requests.service';

@Controller('business-requests')
export class BusinessRequestsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly requests: BusinessRequestsService,
  ) {}

  @Get()
  async getMatchedRequests(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.requests.getMatchedRequests(user);
  }
}
