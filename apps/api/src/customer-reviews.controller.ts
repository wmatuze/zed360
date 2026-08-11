import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { submitCustomerReviewSchema } from '@zed360/contracts';
import { CustomerReviewsService } from './customer-reviews.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('requests/shared')
export class CustomerReviewsController {
  constructor(private readonly reviews: CustomerReviewsService) {}

  @Post(':shareToken/review')
  submit(@Param('shareToken') shareToken: string, @Body() body: unknown) {
    const parsed = submitCustomerReviewSchema.safeParse(body);
    if (!uuidPattern.test(shareToken) || !parsed.success) {
      throw new BadRequestException(
        'Provide a rating from one to five and an optional review comment.',
      );
    }
    return this.reviews.submit(shareToken, parsed.data);
  }
}
