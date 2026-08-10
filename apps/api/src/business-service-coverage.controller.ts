import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
} from '@nestjs/common';
import { updateBusinessServiceCoverageSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessServiceCoverageService } from './business-service-coverage.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-account/:businessId/service-coverage')
export class BusinessServiceCoverageController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly coverage: BusinessServiceCoverageService,
  ) {}

  @Get()
  async getCoverage(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    if (!uuidPattern.test(businessId)) {
      throw new BadRequestException('A valid business is required.');
    }
    const user = await this.authentication.verify(authorization);
    return this.coverage.getCoverage(user, businessId);
  }

  @Put('services/:serviceId')
  async replaceServiceCoverage(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateBusinessServiceCoverageSchema.safeParse(body);
    if (
      !uuidPattern.test(businessId) ||
      !uuidPattern.test(serviceId) ||
      !parsed.success
    ) {
      throw new BadRequestException({
        message: 'Please correct the service coverage information.',
        issues: parsed.success
          ? []
          : parsed.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
      });
    }
    const user = await this.authentication.verify(authorization);
    return this.coverage.replaceServiceCoverage(
      user,
      businessId,
      serviceId,
      parsed.data,
    );
  }
}
