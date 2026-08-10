import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessApplicationsController } from './business-applications.controller';
import { BusinessApplicationsService } from './business-applications.service';
import { BusinessAccountsController } from './business-accounts.controller';
import { BusinessAccountsService } from './business-accounts.service';
import { BusinessReviewsController } from './business-reviews.controller';
import { BusinessReviewsService } from './business-reviews.service';
import { BusinessRequestsController } from './business-requests.controller';
import { BusinessRequestsService } from './business-requests.service';
import { DatabaseService } from './database.service';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    BusinessAccountsController,
    BusinessReviewsController,
    BusinessRequestsController,
    BusinessApplicationsController,
    ReferenceDataController,
    RequestsController,
  ],
  providers: [
    AppService,
    AuthenticatedUserService,
    BusinessApplicationsService,
    BusinessAccountsService,
    BusinessReviewsService,
    BusinessRequestsService,
    DatabaseService,
    ReferenceDataService,
    RequestsService,
    PlatformAuthorizationService,
  ],
})
export class AppModule {}
