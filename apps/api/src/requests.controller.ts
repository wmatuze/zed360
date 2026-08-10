import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { createCustomerRequestSchema } from '@zed360/contracts';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Get('shared/:shareToken')
  getSharedRequest(@Param('shareToken') shareToken: string) {
    const validToken =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        shareToken,
      );
    if (!validToken) {
      throw new BadRequestException(
        'A valid private request link is required.',
      );
    }
    return this.requests.getSharedRequest(shareToken);
  }

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
