import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
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
  async list(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.notifications.list(user);
  }

  @Post('read-all')
  async markAllRead(@Headers('authorization') authorization?: string) {
    const user = await this.authentication.verify(authorization);
    return this.notifications.markAllRead(user);
  }

  @Post(':notificationId/read')
  async markRead(
    @Headers('authorization') authorization: string | undefined,
    @Param('notificationId') notificationId: string,
  ) {
    if (!uuidPattern.test(notificationId)) {
      throw new BadRequestException('A valid notification is required.');
    }
    const user = await this.authentication.verify(authorization);
    return this.notifications.markRead(user, notificationId);
  }
}
