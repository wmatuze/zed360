import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { submitMediaReviewSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { MediaReviewsService } from './media-reviews.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('admin/media-reviews')
export class MediaReviewsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly reviews: MediaReviewsService,
  ) {}

  @Get()
  async list(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.reviews.list(user);
  }

  @Post(':mediaId/decisions')
  async decide(
    @Headers('authorization') authorization: string | undefined,
    @Param('mediaId') mediaId: string,
    @Body() body: unknown,
  ) {
    const decision = submitMediaReviewSchema.safeParse(body);
    if (!uuidPattern.test(mediaId) || !decision.success) {
      throw new BadRequestException({
        message: 'Provide a valid media decision and rejection reason.',
        issues: decision.success
          ? []
          : decision.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
      });
    }
    const user = await this.authentication.verify(authorization);
    return this.reviews.decide(user, mediaId, decision.data);
  }
}
