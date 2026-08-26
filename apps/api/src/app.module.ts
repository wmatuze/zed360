import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthenticatedUserService } from './authenticated-user.service';
import { BusinessApplicationsController } from './business-applications.controller';
import { BusinessApplicationsService } from './business-applications.service';
import { BusinessCatalogController } from './business-catalog.controller';
import { BusinessCatalogService } from './business-catalog.service';
import { BusinessAccountsController } from './business-accounts.controller';
import { BusinessAccountsService } from './business-accounts.service';
import { BusinessReviewsController } from './business-reviews.controller';
import { BusinessReviewsService } from './business-reviews.service';
import { BusinessRequestsController } from './business-requests.controller';
import { BusinessRequestsService } from './business-requests.service';
import { BusinessServiceCoverageController } from './business-service-coverage.controller';
import { BusinessServiceCoverageService } from './business-service-coverage.service';
import { DatabaseService } from './database.service';
import { ReferenceDataController } from './reference-data.controller';
import { ReferenceDataService } from './reference-data.service';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { PlatformAuthorizationService } from './platform-authorization.service';
import { PublicBusinessesController } from './public-businesses.controller';
import { PublicBusinessesService } from './public-businesses.service';
import { MediaReviewsController } from './media-reviews.controller';
import { MediaReviewsService } from './media-reviews.service';
import { AdminCustomerReviewsController } from './admin-customer-reviews.controller';
import { CustomerReviewsController } from './customer-reviews.controller';
import { CustomerReviewsService } from './customer-reviews.service';
import { BusinessNotificationsController } from './business-notifications.controller';
import { BusinessNotificationsService } from './business-notifications.service';
import { BusinessDashboardController } from './business-dashboard.controller';
import { BusinessDashboardService } from './business-dashboard.service';
import { BusinessProfileManagementController } from './business-profile-management.controller';
import { BusinessProfileManagementService } from './business-profile-management.service';
import { BusinessPresenceController } from './business-presence.controller';
import { BusinessPresenceService } from './business-presence.service';
import { ContentReportsController } from './content-reports.controller';
import { ContentReportsService } from './content-reports.service';
import { BusinessOperatingHoursController } from './business-operating-hours.controller';
import { BusinessOperatingHoursService } from './business-operating-hours.service';
import { BusinessLocationsController } from './business-locations.controller';
import { BusinessLocationsService } from './business-locations.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    AdminCustomerReviewsController,
    BusinessAccountsController,
    BusinessDashboardController,
    BusinessProfileManagementController,
    BusinessPresenceController,
    BusinessOperatingHoursController,
    BusinessLocationsController,
    BusinessNotificationsController,
    BusinessReviewsController,
    BusinessRequestsController,
    BusinessServiceCoverageController,
    CustomerReviewsController,
    ContentReportsController,
    BusinessApplicationsController,
    BusinessCatalogController,
    MediaReviewsController,
    PublicBusinessesController,
    ReferenceDataController,
    RequestsController,
  ],
  providers: [
    AppService,
    AuthenticatedUserService,
    BusinessApplicationsService,
    BusinessDashboardService,
    BusinessProfileManagementService,
    BusinessPresenceService,
    BusinessOperatingHoursService,
    BusinessLocationsService,
    BusinessNotificationsService,
    BusinessCatalogService,
    MediaReviewsService,
    BusinessAccountsService,
    BusinessReviewsService,
    BusinessRequestsService,
    BusinessServiceCoverageService,
    CustomerReviewsService,
    ContentReportsService,
    DatabaseService,
    ReferenceDataService,
    RequestsService,
    PlatformAuthorizationService,
    PublicBusinessesService,
  ],
})
export class AppModule {}
