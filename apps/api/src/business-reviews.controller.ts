import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import {
  claimBusinessSchema,
  submitBusinessReviewSchema,
} from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessReviewsService } from './business-reviews.service';

@Controller('admin/business-reviews')
export class BusinessReviewsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly reviews: BusinessReviewsService,
  ) {}

  @Get()
  async list(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.reviews.list(user);
  }

  @Post(':businessId/decisions')
  async decide(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Body() body: unknown,
  ) {
    const parsedId = claimBusinessSchema.shape.businessId.safeParse(businessId);
    const parsedBody = submitBusinessReviewSchema.safeParse(body);
    if (!parsedId.success || !parsedBody.success) {
      throw new BadRequestException({
        message: 'Please provide a valid review decision and reason.',
        issues: parsedBody.success
          ? []
          : parsedBody.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
      });
    }

    const user = await this.authentication.verify(authorization);
    return this.reviews.decide(user, parsedId.data, parsedBody.data);
  }
}
