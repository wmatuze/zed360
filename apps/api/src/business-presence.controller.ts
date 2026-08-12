import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Body,
} from '@nestjs/common';
import { updateBusinessPresenceSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessPresenceService } from './business-presence.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-account/:businessId/presence')
export class BusinessPresenceController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly presence: BusinessPresenceService,
  ) {}

  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    this.validateId(businessId);
    return this.presence.get(
      await this.authentication.verify(authorization),
      businessId,
    );
  }

  @Put('availability')
  async updateAvailability(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateBusinessPresenceSchema.safeParse(body);
    if (!uuid.test(businessId) || !parsed.success) {
      throw new BadRequestException('Check the availability information.');
    }
    return this.presence.updateAvailability(
      await this.authentication.verify(authorization),
      businessId,
      parsed.data,
    );
  }

  @Post('profile-confirmation')
  async confirmProfile(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    this.validateId(businessId);
    return this.presence.confirmProfile(
      await this.authentication.verify(authorization),
      businessId,
    );
  }

  private validateId(businessId: string) {
    if (!uuid.test(businessId)) {
      throw new BadRequestException('A valid business is required.');
    }
  }
}
