import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { submitBusinessResponseSchema } from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessRequestsService } from './business-requests.service';

@Controller('business-requests')
export class BusinessRequestsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly requests: BusinessRequestsService,
  ) {}

  @Get()
  async getMatchedRequests(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.requests.getMatchedRequests(user);
  }

  @Post(':matchId/responses')
  async submitResponse(
    @Headers('authorization') authorization: string | undefined,
    @Param('matchId') matchId: string,
    @Body() body: unknown,
  ) {
    const validId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        matchId,
      );
    const parsed = submitBusinessResponseSchema.safeParse(body);
    if (!validId || !parsed.success) {
      throw new BadRequestException({
        message: 'Please correct the response information.',
        issues: parsed.success
          ? []
          : parsed.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
      });
    }

    const user = await this.authentication.verify(authorization);
    return this.requests.submitResponse(user, matchId, parsed.data);
  }
}
