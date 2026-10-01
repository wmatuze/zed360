import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
} from '@nestjs/common';
import { saveBusinessReviewResponseSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessCustomerReviewsService } from './business-customer-reviews.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-account/:businessId/customer-reviews')
export class BusinessCustomerReviewsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly customerReviews: BusinessCustomerReviewsService,
  ) {}

  @Get()
  async get(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    this.requireId(businessId);
    return this.customerReviews.get(
      await this.authentication.verify(authorization),
      businessId,
    );
  }

  @Put(':reviewId/response')
  async respond(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('reviewId') reviewId: string,
    @Body() body: unknown,
  ) {
    this.requireId(businessId);
    this.requireId(reviewId);
    const parsed = saveBusinessReviewResponseSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Please correct the review response.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return this.customerReviews.respond(
      await this.authentication.verify(authorization),
      businessId,
      reviewId,
      parsed.data,
    );
  }

  private requireId(value: string) {
    if (!uuid.test(value)) {
      throw new BadRequestException('A valid business or review is required.');
    }
  }
}
