import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { submitCustomerReviewDecisionSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { CustomerReviewsService } from './customer-reviews.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('admin/customer-reviews')
export class AdminCustomerReviewsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly reviews: CustomerReviewsService,
  ) {}

  @Get()
  async list(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.reviews.list(user);
  }

  @Post(':reviewId/decisions')
  async decide(
    @Headers('authorization') authorization: string | undefined,
    @Param('reviewId') reviewId: string,
    @Body() body: unknown,
  ) {
    const parsed = submitCustomerReviewDecisionSchema.safeParse(body);
    if (!uuidPattern.test(reviewId) || !parsed.success) {
      throw new BadRequestException(
        'Provide a valid customer review decision and rejection reason.',
      );
    }
    const user = await this.authentication.verify(authorization);
    return this.reviews.decide(user, reviewId, parsed.data);
  }
}
