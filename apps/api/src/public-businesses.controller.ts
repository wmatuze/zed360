import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { publicBusinessDirectoryQuerySchema } from '@zed360/contracts';
import { PublicBusinessesService } from './public-businesses.service';

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

  @Get(':slug')
  getProfile(@Param('slug') slug: string) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new BadRequestException('A valid business address is required.');
    }
    return this.businesses.getProfile(slug);
  }
}
