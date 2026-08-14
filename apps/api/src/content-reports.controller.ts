import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  contentReportDecisionSchema,
  submitContentReportSchema,
} from '@zed360/contracts';
import type { Request } from 'express';
import { AuthenticatedUserService } from './authenticated-user.service';
import { ContentReportsService } from './content-reports.service';

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('content-reports')
export class ContentReportsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly reports: ContentReportsService,
  ) {}

  @Post()
  submit(@Req() request: Request, @Body() body: unknown) {
    const parsed = submitContentReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Check the report information.');
    }
    return this.reports.submit(
      parsed.data,
      request.ip || request.socket.remoteAddress || 'unknown',
    );
  }

  @Get('admin')
  async list(@Headers('authorization') authorization?: string) {
    return this.reports.list(await this.authentication.verify(authorization));
  }

  @Post('admin/:reportId/decisions')
  async decide(
    @Headers('authorization') authorization: string | undefined,
    @Param('reportId') reportId: string,
    @Body() body: unknown,
  ) {
    const parsed = contentReportDecisionSchema.safeParse(body);
    if (!uuid.test(reportId) || !parsed.success) {
      throw new BadRequestException('Provide a valid decision and reason.');
    }
    return this.reports.decide(
      await this.authentication.verify(authorization),
      reportId,
      parsed.data,
    );
  }
}
