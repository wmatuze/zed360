import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  publicBusinessComparisonQuerySchema,
  publicBusinessDirectoryQuerySchema,
  recordBusinessActivitySchema,
} from '@zed360/contracts';
import { PublicBusinessesService } from './public-businesses.service';
import { PublicRateLimit } from './public-rate-limits';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Controller('businesses')
export class PublicBusinessesController {
  constructor(private readonly businesses: PublicBusinessesService) {}

  @Get()
  getDirectory(@Query() query: Record<string, unknown>) {
    const parsed = publicBusinessDirectoryQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Please correct the business search filters.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return this.businesses.getDirectory(parsed.data);
  }

  @Get('compare')
  compare(@Query() query: Record<string, unknown>) {
    const parsed = publicBusinessComparisonQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(
        'Choose two or three valid businesses to compare.',
      );
    }
    return this.businesses.compare(parsed.data.slugs);
  }

  /** Counts a profile view or a tap on a contact, directions, or share link. */
  @Post(':slug/activity')
  @HttpCode(204)
  @PublicRateLimit('profileActivity')
  async recordActivity(@Param('slug') slug: string, @Body() body: unknown) {
    const parsed = recordBusinessActivitySchema.safeParse(body);
    if (!slugPattern.test(slug) || !parsed.success) {
      throw new BadRequestException('A valid activity is required.');
    }
    await this.businesses.recordActivity(slug, parsed.data.event);
  }

  @Get(':slug')
  getProfile(@Param('slug') slug: string) {
    if (!slugPattern.test(slug)) {
      throw new BadRequestException('A valid business address is required.');
    }
    return this.businesses.getProfile(slug);
  }
}
