import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessNotificationsService } from './business-notifications.service';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('business-notifications')
export class BusinessNotificationsController {
  constructor(
    private readonly authentication: AuthenticatedUserService,
    private readonly notifications: BusinessNotificationsService,
  ) {}

  @Get()
  async list(
    @Headers('authorization') authorization?: string,
    @Query('view') view = 'inbox',
    @Query('page') page = '1',
  ) {
    if (!['inbox', 'archived'].includes(view)) {
      throw new BadRequestException('Choose a valid notification view.');
    }
    const pageNumber = Number(page);
    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > 10_000
    ) {
      throw new BadRequestException('Choose a valid notification page.');
    }
    const user = await this.authentication.verify(authorization);
    return this.notifications.list(user, {
      view: view as 'inbox' | 'archived',
      page: pageNumber,
    });
  }

  @Post('read-all')
  async markAllRead(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.notifications.markAllRead(user);
  }

  @Post('archive-read')
  async archiveAllRead(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.notifications.archiveAllRead(user);
  }

  @Post(':notificationId/archive')
  async archive(
    @Headers('authorization') authorization: string | undefined,
    @Param('notificationId') notificationId: string,
  ) {
    this.requireNotificationId(notificationId);
    const user = await this.authentication.verify(authorization);
    return this.notifications.archive(user, notificationId);
  }

  @Post(':notificationId/restore')
  async restore(
    @Headers('authorization') authorization: string | undefined,
    @Param('notificationId') notificationId: string,
  ) {
    this.requireNotificationId(notificationId);
    const user = await this.authentication.verify(authorization);
    return this.notifications.restore(user, notificationId);
  }

  @Post(':notificationId/read')
  async markRead(
    @Headers('authorization') authorization: string | undefined,
    @Param('notificationId') notificationId: string,
  ) {
    this.requireNotificationId(notificationId);
    const user = await this.authentication.verify(authorization);
    return this.notifications.markRead(user, notificationId);
  }

  private requireNotificationId(notificationId: string) {
    if (!uuidPattern.test(notificationId)) {
      throw new BadRequestException('A valid notification is required.');
    }
  }
}
