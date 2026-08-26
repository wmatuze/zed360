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
  businessLocationStatusSchema,
  saveBusinessLocationSchema,
} from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessLocationsService } from './business-locations.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-account/:businessId/locations')
export class BusinessLocationsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly locations: BusinessLocationsService,
  ) {}

  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    this.ids(businessId);
    return this.locations.get(
      await this.authentication.verify(authorization),
      businessId,
    );
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Body() body: unknown,
  ) {
    const parsed = saveBusinessLocationSchema.safeParse(body);
    if (!uuid.test(businessId) || !parsed.success)
      throw new BadRequestException('Check the location information.');
    return this.locations.create(
      await this.authentication.verify(authorization),
      businessId,
      parsed.data,
    );
  }

  @Put(':locationId')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() body: unknown,
  ) {
    const parsed = saveBusinessLocationSchema.safeParse(body);
    if (!uuid.test(businessId) || !uuid.test(locationId) || !parsed.success)
      throw new BadRequestException('Check the location information.');
    return this.locations.update(
      await this.authentication.verify(authorization),
      businessId,
      locationId,
      parsed.data,
    );
  }

  @Post(':locationId/primary')
  async makePrimary(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
  ) {
    this.ids(businessId, locationId);
    return this.locations.makePrimary(
      await this.authentication.verify(authorization),
      businessId,
      locationId,
    );
  }

  @Put(':locationId/status')
  async setStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @Body() body: unknown,
  ) {
    const parsed = businessLocationStatusSchema.safeParse(body);
    if (!uuid.test(businessId) || !uuid.test(locationId) || !parsed.success)
      throw new BadRequestException('Check the location status.');
    return this.locations.setStatus(
      await this.authentication.verify(authorization),
      businessId,
      locationId,
      parsed.data.isActive,
    );
  }

  private ids(...values: string[]) {
    if (values.some((value) => !uuid.test(value)))
      throw new BadRequestException(
        'A valid business and location are required.',
      );
  }
}
