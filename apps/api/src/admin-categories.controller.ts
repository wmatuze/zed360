import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  adminCategoryListQuerySchema,
  adminCategoryStatusActionSchema,
  saveAdminCategorySchema,
} from '@zed360/contracts';
import { AdminCategoriesService } from './admin-categories.service';
import { AuthenticatedUserService } from './authenticated-user.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly categories: AdminCategoriesService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization: string | undefined,
    @Query() query: unknown,
  ) {
    const parsed = adminCategoryListQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException('Check the category search parameters.');
    }
    return this.categories.list(
      await this.authentication.verify(authorization),
      parsed.data,
    );
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const parsed = saveAdminCategorySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Provide valid category details.');
    }
    return this.categories.create(
      await this.authentication.verify(authorization),
      parsed.data,
    );
  }

  @Put(':categoryId')
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    const parsed = saveAdminCategorySchema.safeParse(body);
    if (!uuidPattern.test(categoryId) || !parsed.success) {
      throw new BadRequestException('Provide valid category details.');
    }
    return this.categories.update(
      await this.authentication.verify(authorization),
      categoryId,
      parsed.data,
    );
  }

  @Post(':categoryId/actions')
  async changeStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('categoryId') categoryId: string,
    @Body() body: unknown,
  ) {
    const parsed = adminCategoryStatusActionSchema.safeParse(body);
    if (!uuidPattern.test(categoryId) || !parsed.success) {
      throw new BadRequestException(
        'Provide a valid category status and a clear reason.',
      );
    }
    return this.categories.changeStatus(
      await this.authentication.verify(authorization),
      categoryId,
      parsed.data,
    );
  }
}
