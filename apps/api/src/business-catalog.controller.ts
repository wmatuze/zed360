import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  completeBusinessMediaUploadSchema,
  createBusinessMediaUploadIntentSchema,
  saveBusinessProductSchema,
} from '@zed360/contracts';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessCatalogService } from './business-catalog.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-account/:businessId/catalog')
export class BusinessCatalogController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly catalog: BusinessCatalogService,
  ) {}

  @Get()
  async getCatalog(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
  ) {
    this.requireUuid(businessId);
    const user = await this.authentication.verify(authorization);
    return this.catalog.getCatalog(user, businessId);
  }

  @Post('products')
  async createProduct(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Body() body: unknown,
  ) {
    this.requireUuid(businessId);
    const product = this.parse(saveBusinessProductSchema, body);
    const user = await this.authentication.verify(authorization);
    return this.catalog.createProduct(user, businessId, product);
  }

  @Put('products/:productId')
  async updateProduct(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @Body() body: unknown,
  ) {
    this.requireUuid(businessId);
    this.requireUuid(productId);
    const product = this.parse(saveBusinessProductSchema, body);
    const user = await this.authentication.verify(authorization);
    return this.catalog.updateProduct(user, businessId, productId, product);
  }

  @Post('media/upload-intents')
  async createUploadIntent(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Body() body: unknown,
  ) {
    this.requireUuid(businessId);
    const upload = this.parse(createBusinessMediaUploadIntentSchema, body);
    const user = await this.authentication.verify(authorization);
    return this.catalog.createUploadIntent(user, businessId, upload);
  }

  @Post('media')
  async completeUpload(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Body() body: unknown,
  ) {
    this.requireUuid(businessId);
    const media = this.parse(completeBusinessMediaUploadSchema, body);
    const user = await this.authentication.verify(authorization);
    return this.catalog.completeUpload(user, businessId, media);
  }

  @Delete('media/:mediaId')
  async removeMedia(
    @Headers('authorization') authorization: string | undefined,
    @Param('businessId') businessId: string,
    @Param('mediaId') mediaId: string,
  ) {
    this.requireUuid(businessId);
    this.requireUuid(mediaId);
    const user = await this.authentication.verify(authorization);
    return this.catalog.removeMedia(user, businessId, mediaId, authorization);
  }

  private requireUuid(value: string) {
    if (!uuidPattern.test(value)) {
      throw new BadRequestException('A valid business or product is required.');
    }
  }

  private parse<T>(
    schema: {
      safeParse(value: unknown):
        | { success: true; data: T }
        | {
            success: false;
            error: { issues: Array<{ path: PropertyKey[]; message: string }> };
          };
    },
    body: unknown,
  ) {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Please correct the catalog information.',
        issues: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return parsed.data;
  }
}
