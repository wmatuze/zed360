import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import {
  requestReviewCodeSchema,
  submitCustomerReviewSchema,
} from '@zed360/contracts';
import { CustomerReviewsService } from './customer-reviews.service';
import { PublicRateLimit } from './public-rate-limits';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('requests/shared')
export class CustomerReviewsController {
  constructor(private readonly reviews: CustomerReviewsService) {}

  @Post(':shareToken/review/code')
  @PublicRateLimit('reviewCode')
  requestCode(@Param('shareToken') shareToken: string, @Body() body: unknown) {
    const parsed = requestReviewCodeSchema.safeParse(body);
    if (!uuidPattern.test(shareToken) || !parsed.success) {
      throw new BadRequestException('Enter the WhatsApp number to confirm.');
    }
    return this.reviews.requestCode(shareToken, parsed.data);
  }

  @Post(':shareToken/review')
  @PublicRateLimit('customerReview')
  submit(@Param('shareToken') shareToken: string, @Body() body: unknown) {
    const parsed = submitCustomerReviewSchema.safeParse(body);
    if (!uuidPattern.test(shareToken) || !parsed.success) {
      throw new BadRequestException(
        'Provide a rating, an optional comment, and the WhatsApp code.',
      );
    }
    return this.reviews.submit(shareToken, parsed.data);
  }
}
