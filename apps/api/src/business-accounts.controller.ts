import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
} from '@nestjs/common';
import {
  businessApplicationClaimSchema,
  claimBusinessSchema,
} from '@zed360/contracts';
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
