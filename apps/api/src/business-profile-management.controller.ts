import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  businessProfileDecisionSchema,
  saveBusinessProfileSchema,
} from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessProfileManagementService } from './business-profile-management.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Controller()
export class BusinessProfileManagementController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly profiles: BusinessProfileManagementService,
  ) {}
  @Get('business-account/:businessId/profile')
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    if (!uuid.test(businessId))
      throw new BadRequestException('A valid business is required.');
    return this.profiles.get(
      await this.authentication.verify(authorization),
      businessId,
    );
  }
  @Put('business-account/:businessId/profile')
  async submit(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Body() body: unknown,
  ) {
    const parsed = saveBusinessProfileSchema.safeParse(body);
    if (!uuid.test(businessId) || !parsed.success)
      throw new BadRequestException('Check the business profile information.');
    return this.profiles.submit(
      await this.authentication.verify(authorization),
      businessId,
      parsed.data,
    );
  }
  @Get('admin/profile-revisions')
  async list(@Headers('authorization') authorization?: string) {
    return this.profiles.list(await this.authentication.verify(authorization));
  }
  @Post('admin/profile-revisions/:revisionId/decisions')
  async decide(
    @Headers('authorization') authorization: string | undefined,
    @Param('revisionId') revisionId: string,
    @Body() body: unknown,
  ) {
    const parsed = businessProfileDecisionSchema.safeParse(body);
    if (!uuid.test(revisionId) || !parsed.success)
      throw new BadRequestException('Provide a valid profile decision.');
    return this.profiles.decide(
      await this.authentication.verify(authorization),
      revisionId,
      parsed.data,
    );
  }
}
