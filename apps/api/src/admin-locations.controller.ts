import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  adminLocationListQuerySchema,
  adminLocationStatusActionSchema,
  saveAdminDistrictSchema,
  saveAdminProvinceSchema,
} from '@zed360/contracts';
import { AdminLocationsService } from './admin-locations.service';
import { AuthenticatedUserService } from './authenticated-user.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('admin/locations')
export class AdminLocationsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly locations: AdminLocationsService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ) {
    const parsed = adminLocationListQuerySchema.safeParse(query);
    if (!parsed.success)
      throw new BadRequestException('Check the location search parameters.');
    return this.locations.list(
      await this.authentication.verify(authorization),
      parsed.data,
    );
  }

  @Post('provinces')
  async createProvince(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = saveAdminProvinceSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException('Provide valid province details.');
    return this.locations.createProvince(
      await this.authentication.verify(authorization),
      parsed.data,
    );
  }

  @Put('provinces/:id')
  async updateProvince(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = saveAdminProvinceSchema.safeParse(body);
    if (!uuid.test(id) || !parsed.success)
      throw new BadRequestException('Provide valid province details.');
    return this.locations.updateProvince(
      await this.authentication.verify(authorization),
      id,
      parsed.data,
    );
  }

  @Post('provinces/:id/actions')
  async provinceStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = adminLocationStatusActionSchema.safeParse(body);
    if (!uuid.test(id) || !parsed.success)
      throw new BadRequestException('Provide a valid status and clear reason.');
    return this.locations.changeProvinceStatus(
      await this.authentication.verify(authorization),
      id,
      parsed.data,
    );
  }

  @Post('districts')
  async createDistrict(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = saveAdminDistrictSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException('Provide valid district details.');
    return this.locations.createDistrict(
      await this.authentication.verify(authorization),
      parsed.data,
    );
  }

  @Put('districts/:id')
  async updateDistrict(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = saveAdminDistrictSchema.safeParse(body);
    if (!uuid.test(id) || !parsed.success)
      throw new BadRequestException('Provide valid district details.');
    return this.locations.updateDistrict(
      await this.authentication.verify(authorization),
      id,
      parsed.data,
    );
  }

  @Post('districts/:id/actions')
  async districtStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const parsed = adminLocationStatusActionSchema.safeParse(body);
    if (!uuid.test(id) || !parsed.success)
      throw new BadRequestException('Provide a valid status and clear reason.');
    return this.locations.changeDistrictStatus(
      await this.authentication.verify(authorization),
      id,
      parsed.data,
    );
  }
}
