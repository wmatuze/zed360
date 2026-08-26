import { Injectable } from '@nestjs/common';
import {
  businessDashboardSchema,
  type BusinessDashboard,
} from '@zed360/contracts';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';

@Injectable()
export class BusinessDashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(user: AuthenticatedUser): Promise<BusinessDashboard> {
    const rows = (await this.database.client`
      with member_businesses as (
        select business.id, business.name, business.slug, business.status,
               business.review_status, membership.role,
               business.availability_status, business.availability_note,
               business.availability_updated_at, business.last_confirmed_at
        from business_members membership
        inner join businesses business on business.id = membership.business_id
        where membership.user_id = ${user.id}
      ),
      business_stats as (
        select member_business.*,
          case when member_business.status = 'active' and member_business.review_status = 'approved'
            then (
              select count(*)::int from request_matches dashboard_match
              inner join customer_requests dashboard_request
                on dashboard_request.id = dashboard_match.request_id
              where dashboard_match.business_id = member_business.id
                and dashboard_match.status in ('queued', 'sent', 'viewed', 'responded')
                and dashboard_request.status in ('open', 'matched')
                and (dashboard_request.expires_at is null or dashboard_request.expires_at > now())
            ) else 0 end as open_matches,
          case when member_business.status = 'active' and member_business.review_status = 'approved'
            then (
              select count(*)::int from business_responses dashboard_response
              inner join request_matches response_match
                on response_match.id = dashboard_response.match_id
              where response_match.business_id = member_business.id
            ) else 0 end as responses_sent,
          case when member_business.status = 'active' and member_business.review_status = 'approved'
            then (
              select count(*)::int from interactions dashboard_interaction
              where dashboard_interaction.business_id = member_business.id
                and dashboard_interaction.outcome_confirmed = true
            ) else 0 end as customer_selections,
          (select count(*)::int from business_products dashboard_product
            where dashboard_product.business_id = member_business.id
              and dashboard_product.status = 'active'
              and dashboard_product.is_published = true) as published_products,
          (select count(*)::int from business_media_assets dashboard_media
            where dashboard_media.business_id = member_business.id
              and dashboard_media.moderation_status = 'pending') as pending_media,
          (select count(*)::int from reviews dashboard_review
            where dashboard_review.business_id = member_business.id
              and dashboard_review.is_published = true) as published_reviews,
          exists (select 1 from business_services dashboard_service
            where dashboard_service.business_id = member_business.id
              and dashboard_service.is_available = true) as has_available_service,
          exists (
            select 1 from business_service_fulfillment_options dashboard_coverage
            inner join business_services coverage_service
              on coverage_service.id = dashboard_coverage.business_service_id
            where coverage_service.business_id = member_business.id
              and dashboard_coverage.is_active = true
          ) as has_coverage,
          exists (select 1 from business_media_assets approved_media
            where approved_media.business_id = member_business.id
              and approved_media.moderation_status = 'approved') as has_approved_media,
          (select count(*)::int
            from business_notifications unread_notification
            inner join business_notification_events unread_event
              on unread_event.id = unread_notification.event_id
            where unread_event.business_id = member_business.id
              and unread_notification.recipient_user_id = ${user.id}
              and unread_notification.archived_at is null
              and unread_notification.read_at is null) as unread_notifications
        from member_businesses member_business
      ),
      recent_requests as (
        select jsonb_build_object(
          'matchId', matched.id,
          'businessName', member_business.name,
          'summary', customer_request.summary,
          'categoryName', category.name,
          'districtName', district.name,
          'hasResponse', response.id is not null,
          'createdAt', to_char(customer_request.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        ) as item, customer_request.created_at
        from request_matches matched
        inner join member_businesses member_business on member_business.id = matched.business_id
        inner join customer_requests customer_request on customer_request.id = matched.request_id
        inner join categories category on category.id = customer_request.category_id
        left join districts district on district.id = customer_request.district_id
        left join business_responses response on response.match_id = matched.id
        where member_business.status = 'active'
          and member_business.review_status = 'approved'
          and matched.status in ('queued', 'sent', 'viewed', 'responded')
          and customer_request.status in ('open', 'matched')
          and (customer_request.expires_at is null or customer_request.expires_at > now())
        order by customer_request.created_at desc
        limit 5
      ),
      recent_notifications as (
        select jsonb_build_object(
          'id', notification.id,
          'businessName', business.name,
          'title', event.title,
          'body', event.body,
          'actionUrl', event.action_url,
          'readAt', case when notification.read_at is null then null
            else to_char(notification.read_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
          'createdAt', to_char(notification.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        ) as item, notification.created_at
        from business_notifications notification
        inner join business_notification_events event on event.id = notification.event_id
        inner join member_businesses business on business.id = event.business_id
        where notification.recipient_user_id = ${user.id}
          and notification.archived_at is null
        order by notification.created_at desc
        limit 5
      )
      select jsonb_build_object(
        'totals', jsonb_build_object(
          'openMatches', coalesce((select sum(open_matches)::int from business_stats), 0),
          'responsesSent', coalesce((select sum(responses_sent)::int from business_stats), 0),
          'customerSelections', coalesce((select sum(customer_selections)::int from business_stats), 0),
          'unreadNotifications', coalesce((select sum(unread_notifications)::int from business_stats), 0)
        ),
        'businesses', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', stats.id,
            'name', stats.name,
            'slug', stats.slug,
            'status', stats.status,
            'reviewStatus', stats.review_status,
            'role', stats.role,
            'presence', jsonb_build_object(
              'availability', stats.availability_status,
              'availabilityNote', stats.availability_note,
              'availabilityUpdatedAt', case when stats.availability_updated_at is null then null
                else to_char(stats.availability_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
              'availabilityFreshness', case
                when stats.availability_updated_at is null then 'unconfirmed'
                when stats.availability_updated_at >= now() - interval '7 days' then 'current'
                else 'stale' end,
              'profileLastConfirmedAt', case when stats.last_confirmed_at is null then null
                else to_char(stats.last_confirmed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
              'profileFreshness', case
                when stats.last_confirmed_at is null then 'unconfirmed'
                when stats.last_confirmed_at >= now() - interval '90 days' then 'current'
                else 'stale' end
            ),
            'metrics', jsonb_build_object(
              'openMatches', stats.open_matches,
              'responsesSent', stats.responses_sent,
              'customerSelections', stats.customer_selections,
              'publishedProducts', stats.published_products,
              'pendingMedia', stats.pending_media,
              'publishedReviews', stats.published_reviews
            ),
            'setup', jsonb_build_object(
              'approved', stats.status = 'active' and stats.review_status = 'approved',
              'hasAvailableService', stats.has_available_service,
              'hasCoverage', stats.has_coverage,
              'hasPublishedProduct', stats.published_products > 0,
              'hasApprovedMedia', stats.has_approved_media
            )
          ) order by stats.name) from business_stats stats
        ), '[]'::jsonb),
        'recentRequests', coalesce((
          select jsonb_agg(request.item order by request.created_at desc)
          from recent_requests request
        ), '[]'::jsonb),
        'recentNotifications', coalesce((
          select jsonb_agg(notification.item order by notification.created_at desc)
          from recent_notifications notification
        ), '[]'::jsonb)
      ) as dashboard
    `) as Array<{ dashboard: unknown }>;

    const parsed = businessDashboardSchema.safeParse(rows[0]?.dashboard);
    if (!parsed.success) {
      throw new Error('The business dashboard query returned invalid data.');
    }
    return parsed.data;
  }
}
