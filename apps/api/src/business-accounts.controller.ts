import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { claimBusinessSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessAccountsService } from './business-accounts.service';

@Controller('business-account')
export class BusinessAccountsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly accounts: BusinessAccountsService,
  ) {}

  @Get()
  async getAccount(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.accounts.getAccount(user);
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
}
