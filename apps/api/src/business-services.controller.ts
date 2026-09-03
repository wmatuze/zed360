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
import { saveBusinessServiceSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessServicesService } from './business-services.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-account/:businessId/services')
export class BusinessServicesController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly services: BusinessServicesService,
  ) {}

  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    this.requireId(businessId);
    return this.services.get(
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
    this.requireId(businessId);
    const input = this.parse(body);
    return this.services.create(
      await this.authentication.verify(authorization),
      businessId,
      input,
    );
  }

  @Put(':serviceId')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() body: unknown,
  ) {
    this.requireId(businessId);
    this.requireId(serviceId);
    const input = this.parse(body);
    return this.services.update(
      await this.authentication.verify(authorization),
      businessId,
      serviceId,
      input,
    );
  }

  private requireId(value: string) {
    if (!uuid.test(value)) {
      throw new BadRequestException('A valid business or service is required.');
    }
  }

  private parse(body: unknown) {
    const parsed = saveBusinessServiceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Please correct the service information.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}
