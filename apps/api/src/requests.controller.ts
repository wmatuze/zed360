import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { createCustomerRequestSchema } from '@zed360/contracts';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  create(@Body() body: unknown) {
    const parsed = createCustomerRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Please correct the highlighted request information.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    return this.requests.create(parsed.data);
  }
}
