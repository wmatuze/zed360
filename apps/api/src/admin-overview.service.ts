import { Injectable } from '@nestjs/common';
import { adminOverviewSchema, type AdminOverview } from '@zed360/contracts';
import type { AuthenticatedUser } from './authenticated-user.service';
import { DatabaseService } from './database.service';
import { PlatformAuthorizationService } from './platform-authorization.service';

@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly database: DatabaseService,
    private readonly authorization: PlatformAuthorizationService,
  ) {}

  async getOverview(user: AuthenticatedUser): Promise<AdminOverview> {
    const role = await this.authorization.requireReviewer(user);
    // Queue filters mirror the queue screens so a count always matches the
    // list it links to. Drafts are never counted as customer requests.
    const rows = (await this.database.client`
      with posted_requests as (
        select request.id, request.created_at, request.status,
               request.district_id, request.category_id, request.expires_at,
          exists (
            select 1 from business_responses response
            inner join request_matches matched on matched.id = response.match_id
            where matched.request_id = request.id
          ) as answered,
          exists (
            select 1 from interactions interaction
            where interaction.request_id = request.id
              and interaction.outcome_confirmed = true
          ) as chosen
        from customer_requests request
        where request.status <> 'draft'
      ),
      request_periods as (
        select
          count(*) filter (where created_at >= now() - interval '30 days')::int as posted,
          count(*) filter (where created_at >= now() - interval '30 days' and answered)::int as answered,
          count(*) filter (where created_at >= now() - interval '30 days' and chosen)::int as chosen,
          count(*) filter (where created_at < now() - interval '30 days'
            and created_at >= now() - interval '60 days')::int as previous_posted,
          count(*) filter (where created_at < now() - interval '30 days'
            and created_at >= now() - interval '60 days' and answered)::int as previous_answered,
          count(*) filter (where created_at < now() - interval '30 days'
            and created_at >= now() - interval '60 days' and chosen)::int as previous_chosen,
          count(*) filter (where status in ('open', 'matched')
            and (expires_at is null or expires_at > now()))::int as open_now,
          count(*) filter (where status in ('open', 'matched')
            and (expires_at is null or expires_at > now())
            and not answered
            and created_at < now() - interval '24 hours')::int as unanswered_over_a_day
        from posted_requests
      ),
      response_time as (
        select round((percentile_cont(0.5) within group (order by extract(epoch from
          response.created_at - coalesce(matched.sent_at, matched.created_at)
        )) / 60)::numeric, 1)::float as median_minutes
        from business_responses response
        inner join request_matches matched on matched.id = response.match_id
        where matched.created_at >= now() - interval '30 days'
          and response.created_at >= coalesce(matched.sent_at, matched.created_at)
      ),
      business_counts as (
        select
          count(*) filter (where status = 'active' and review_status = 'approved')::int as live,
          count(*) filter (where review_status = 'pending')::int as pending,
          count(*) filter (where review_status = 'changes_requested')::int as changes_requested,
          count(*) filter (where status = 'suspended')::int as suspended,
          count(*) filter (where created_at >= now() - interval '30 days')::int as joined,
          count(*) filter (where created_at < now() - interval '30 days'
            and created_at >= now() - interval '60 days')::int as previous_joined,
          count(*) filter (where status = 'active' and review_status = 'approved'
            and (availability_updated_at is null
              or availability_updated_at < now() - interval '7 days'))::int as stale_availability
        from businesses
      ),
      review_counts as (
        select
          count(*) filter (where is_published)::int as published,
          count(*) filter (where is_published
            and created_at >= now() - interval '30 days')::int as published_recently,
          round(avg(rating) filter (where is_published), 1)::float as average_rating
        from reviews
      ),
      live_business_provinces as (
        select distinct business.id as business_id, district.province_id
        from businesses business
        inner join business_locations location
          on location.business_id = business.id and location.is_active = true
        inner join districts district on district.id = location.district_id
        where business.status = 'active' and business.review_status = 'approved'
      ),
      province_rows as (
        select province.name,
          (select count(*)::int from live_business_provinces placed
            where placed.province_id = province.id) as businesses,
          (select count(*)::int from posted_requests request
            inner join districts district on district.id = request.district_id
            where district.province_id = province.id
              and request.created_at >= now() - interval '30 days') as requests
        from provinces province
        where province.is_active = true
      ),
      category_rows as (
        select category.name,
          count(*)::int as requests,
          count(*) filter (where request.answered)::int as answered
        from posted_requests request
        inner join categories category on category.id = request.category_id
        where request.created_at >= now() - interval '30 days'
        group by category.name
        order by count(*) desc, category.name
        limit 6
      ),
      recent_activity as (
        select event.id, event.action, event.subject_type, event.reason,
               event.created_at,
               coalesce(actor.display_name, actor.email, 'Unknown') as actor
        from admin_audit_events event
        left join users actor on actor.id = event.actor_user_id
        order by event.created_at desc
        limit 6
      )
      select jsonb_build_object(
        'queues', jsonb_build_object(
          'businessReviews', (select jsonb_build_object('count', count(*)::int, 'oldestAt', min(created_at))
            from businesses where review_status = 'pending'),
          'profileRevisions', (select jsonb_build_object('count', count(*)::int, 'oldestAt', min(created_at))
            from business_profile_revisions where status = 'pending'),
          'customerReviews', (select jsonb_build_object('count', count(*)::int, 'oldestAt', min(created_at))
            from reviews where moderation_status = 'pending'),
          'mediaReviews', (select jsonb_build_object('count', count(*)::int, 'oldestAt', min(created_at))
            from business_media_assets where moderation_status = 'pending'),
          'contentReports', (select jsonb_build_object('count', count(*)::int, 'oldestAt', min(created_at))
            from content_reports where status = 'open')
        ),
        'requests', (select jsonb_build_object(
          'last30Days', jsonb_build_object(
            'posted', posted, 'answered', answered, 'chosen', chosen),
          'previous30Days', jsonb_build_object(
            'posted', previous_posted, 'answered', previous_answered, 'chosen', previous_chosen),
          'openNow', open_now,
          'unansweredOverADay', unanswered_over_a_day,
          'medianResponseMinutes', (select median_minutes from response_time)
        ) from request_periods),
        'businesses', (select jsonb_build_object(
          'live', live,
          'pending', pending,
          'changesRequested', changes_requested,
          'suspended', suspended,
          'joinedLast30Days', joined,
          'joinedPrevious30Days', previous_joined,
          'staleAvailability', stale_availability
        ) from business_counts),
        'reviews', (select jsonb_build_object(
          'published', published,
          'publishedLast30Days', published_recently,
          'averageRating', average_rating
        ) from review_counts),
        'provinces', coalesce((select jsonb_agg(jsonb_build_object(
          'name', name, 'businesses', businesses, 'requests', requests
        ) order by requests desc, businesses desc, name) from province_rows), '[]'::jsonb),
        'categories', coalesce((select jsonb_agg(jsonb_build_object(
          'name', name, 'requests', requests, 'answered', answered
        ) order by requests desc, name) from category_rows), '[]'::jsonb),
        'recentActivity', coalesce((select jsonb_agg(jsonb_build_object(
          'id', id,
          'action', action,
          'subjectType', subject_type,
          'reason', reason,
          'actor', actor,
          'createdAt', created_at
        ) order by created_at desc) from recent_activity), '[]'::jsonb)
      ) as overview
    `) as Array<{ overview: Record<string, unknown> }>;

    const parsed = adminOverviewSchema.safeParse({
      role,
      ...rows[0]?.overview,
    });
    if (!parsed.success) {
      throw new Error(
        'The administration overview query returned invalid data.',
      );
    }
    return parsed.data;
  }
}
