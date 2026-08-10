import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { createBusinessApplicationSchema } from '@zed360/contracts';
import { BusinessApplicationsService } from './business-applications.service';

@Controller('business-applications')
export class BusinessApplicationsController {
  constructor(private readonly applications: BusinessApplicationsService) {}

  @Post()
  create(@Body() body: unknown) {
    const parsed = createBusinessApplicationSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Please correct the highlighted business information.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return this.applications.create(parsed.data);
  }
}
