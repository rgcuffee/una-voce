-- Cathaholic Music publishes both complete Hours and standalone chant/music.
-- Only titles naming a complete morning/evening office are auto-approved.
with cathaholic as (
  select id
  from public.partners
  where slug = 'cathaholic-music'
)
update public.youtube_videos video
set prayer_type = case
      when video.title ~* '\m(morning prayer|lauds)\M'
        then 'lauds'::public.liturgical_hour
      when video.title ~* '\m(evening prayer|vespers)\M'
        then 'vespers'::public.liturgical_hour
      else null
    end,
    display_status = case
      when video.title ~* '\m(morning prayer|lauds|evening prayer|vespers)\M'
        then 'approved'::public.youtube_video_display_status
      else 'hidden'::public.youtube_video_display_status
    end,
    updated_at = now()
from cathaholic
where video.partner_id = cathaholic.id;

-- Repair approved Sing the Hours rows that were classified from description
-- text before title matches took precedence.
with sing_the_hours as (
  select id
  from public.partners
  where slug = 'sing-the-hours'
)
update public.youtube_videos video
set prayer_type = case
      when video.title ~* '\m(evening prayer|vespers)\M'
        then 'vespers'::public.liturgical_hour
      when video.title ~* '\m(morning prayer|lauds)\M'
        then 'lauds'::public.liturgical_hour
      else video.prayer_type
    end,
    display_status = case
      when video.title ~* '\m(morning prayer|lauds|evening prayer|vespers)\M'
        then 'approved'::public.youtube_video_display_status
      else video.display_status
    end,
    updated_at = now()
from sing_the_hours
where video.partner_id = sing_the_hours.id
  and video.title ~* '\m(morning prayer|lauds|evening prayer|vespers)\M';

-- Divine Office occasionally republishes the same titled episode with a new
-- RSS GUID and Apple episode ID. Keep the newest copy visible.
with ranked_episodes as (
  select
    episode.id,
    row_number() over (
      partition by
        episode.partner_id,
        episode.prayer_date,
        episode.prayer_type,
        lower(regexp_replace(episode.title, '[^[:alnum:]]+', ' ', 'g'))
      order by episode.published_at desc, episode.created_at desc, episode.id desc
    ) as duplicate_rank
  from public.apple_podcast_episodes episode
  where episode.prayer_type is not null
)
update public.apple_podcast_episodes episode
set prayer_type = null,
    display_status = 'hidden',
    updated_at = now()
from ranked_episodes
where episode.id = ranked_episodes.id
  and ranked_episodes.duplicate_rank > 1;
