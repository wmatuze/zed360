import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
} from '@nestjs/common';
import { updateLocationOperatingHoursSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessOperatingHoursService } from './business-operating-hours.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-account/:businessId/operating-hours')
export class BusinessOperatingHoursController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly operatingHours: BusinessOperatingHoursService,
  ) {}

  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    this.validateId(businessId);
    return this.operatingHours.get(
      await this.authentication.verify(authorization),
      businessId,
    );
  }

  @Put('locations/:locationId')
  async updateLocation(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateLocationOperatingHoursSchema.safeParse(body);
    if (!uuid.test(businessId) || !uuid.test(locationId) || !parsed.success) {
      throw new BadRequestException('Check the operating hours information.');
    }
    return this.operatingHours.updateLocation(
      await this.authentication.verify(authorization),
      businessId,
      locationId,
      parsed.data,
    );
  }

  private validateId(value: string) {
    if (!uuid.test(value)) {
      throw new BadRequestException('A valid business is required.');
    }
  }
}
