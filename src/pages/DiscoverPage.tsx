import { type ReactNode } from 'react';
import {
  getPartnerCommunity,
  listPartnerCommunities,
  type PartnerBadgeStatus,
  type PartnerCommunity,
  type PartnerCommunityStatusOverrides,
  type PartnerCommunitySlug,
} from '../data/partnerCommunities';
import type { ViewNavigator } from '../navigation';
import { PartnerBadge } from '../components/PartnerBadge';
import { trackAnalyticsEvent } from '../lib/prayerAnalytics';

type MediaCard = {
  meta: string;
  title: string;
  description: string;
  image: string;
  href?: string;
  communitySlug?: PartnerCommunitySlug;
  source: 'mock' | 'partner';
  language?: string;
  actionLabel?: string;
};

type StreamCard = MediaCard & { time: string };

type PartnerPrayerVideoType =
  | 'office_of_readings'
  | 'lauds'
  | 'midday_prayer'
  | 'vespers'
  | 'compline';

export type DiscoverPartnerPrayerVideo = {
  partnerName: string;
  partnerSlug: string;
  prayerType: PartnerPrayerVideoType | null;
  displayTitle: string;
  description: string | null;
  thumbnailUrl: string;
  canonicalUrl: string;
};

type PartnerPrayerAudioType =
  | 'office_of_readings'
  | 'lauds'
  | 'midday_prayer'
  | 'vespers'
  | 'compline';

export type DiscoverPartnerPrayerAudio = {
  partnerName: string;
  partnerSlug: string;
  prayerType: PartnerPrayerAudioType | null;
  displayTitle: string;
  description: string | null;
  imageUrl: string | null;
  canonicalUrl: string;
};

type WorthAbbeyPrayerType =
  | 'office_of_readings'
  | 'lauds'
  | 'midday_prayer'
  | 'vespers'
  | 'compline';

export type DiscoverWorthAbbeyVideo = {
  prayerType: WorthAbbeyPrayerType | null;
  displayTitle: string;
  description: string | null;
  thumbnailUrl: string;
  canonicalUrl: string;
  liveStartAt: string | null;
  liveEndAt: string | null;
  scheduledStartAt: string | null;
  isLiveNow: boolean;
};

const PRAYER_TYPE_LABELS: Record<
  PartnerPrayerVideoType | WorthAbbeyPrayerType,
  string
> = {
  office_of_readings: 'Office of Readings',
  lauds: 'Lauds',
  midday_prayer: 'Daytime Prayer',
  vespers: 'Vespers',
  compline: 'Compline',
};

const WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES = 45;

const TEXT_SOURCES: StreamCard[] = [
  {
    meta: 'Text resource',
    title: 'Magnificat',
    description:
      'Compact monthly booklet with daily Mass, Morning Prayer, Evening Prayer, and meditations.',
    time: 'Monthly',
    image:
      'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1400&q=80', // open devotional on a wooden pew
    source: 'mock',
  },
  {
    meta: 'Text resource',
    title: 'Liturgy of the Hours · Four-Volume Set',
    description:
      'Official English edition organized according to the liturgical calendar.',
    time: 'Official Text',
    image:
      'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&w=1400&q=80', // richly bound old books
    source: 'mock',
  },
  {
    meta: 'Text resource',
    title: 'Christian Prayer',
    description:
      'One-volume edition with Morning Prayer, Evening Prayer, Night Prayer, and seasonal selections.',
    time: 'Popular Edition',
    image:
      'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&w=1400&q=80', // person reading beside a window
    source: 'mock',
  },
  {
    meta: 'Text resource',
    title: 'Shorter Christian Prayer',
    description:
      'Accessible introduction with core daily Hours for a beginning prayer routine.',
    time: 'Beginner',
    image:
      'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=1400&q=80', // small book with coffee and morning light
    source: 'mock',
  },
];

function worthAbbeyStreamCards(
  videos: DiscoverWorthAbbeyVideo[],
  mode: 'upcoming' | 'previous',
): StreamCard[] {
  return videos
    .filter((video) => {
      if (!video.prayerType) {
        return false;
      }

      const isUpcoming = isWorthAbbeyUpcomingOrCurrent(video);
      return mode === 'upcoming' ? isUpcoming : !isUpcoming;
    })
    .map((video) => ({
      meta: `Community Live · ${PRAYER_TYPE_LABELS[video.prayerType!]}`,
      title: `Worth Abbey · ${video.displayTitle}`,
      description:
        video.description ??
        `Join Worth Abbey for ${PRAYER_TYPE_LABELS[video.prayerType!]}.`,
      time: formatWorthAbbeyLiveTime(video) ?? 'Today',
      image: video.thumbnailUrl,
      href: video.canonicalUrl,
      communitySlug: 'worth-abbey' as PartnerCommunitySlug,
      source: 'partner' as const,
    }))
    .slice(0, 4);
}

function isWorthAbbeyUpcomingOrCurrent(video: DiscoverWorthAbbeyVideo) {
  if (video.isLiveNow) {
    return true;
  }

  const liveEndAt = video.liveEndAt ? Date.parse(video.liveEndAt) : NaN;

  if (!Number.isNaN(liveEndAt)) {
    return (
      Date.now() <
      liveEndAt + WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES * 60 * 1000
    );
  }

  const liveStartAt = video.liveStartAt
    ? Date.parse(video.liveStartAt)
    : video.scheduledStartAt
      ? Date.parse(video.scheduledStartAt)
      : NaN;

  if (Number.isNaN(liveStartAt)) {
    return false;
  }

  return (
    Date.now() <
    liveStartAt + WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES * 60 * 1000
  );
}

function formatWorthAbbeyLiveTime(video: DiscoverWorthAbbeyVideo) {
  const liveStartAt = video.liveStartAt ?? video.scheduledStartAt;

  if (!liveStartAt) {
    return undefined;
  }

  const time = Date.parse(liveStartAt);

  if (Number.isNaN(time)) {
    return undefined;
  }

  const localTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(time));
  const isPrevious =
    Date.now() >=
    time + WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES * 60 * 1000;

  return isPrevious
    ? `${relativeLocalDateLabel(new Date(time), true)}, ${localTime}`
    : `${relativeLocalDateLabel(new Date(time), false)}${localTime}`;
}

function relativeLocalDateLabel(date: Date, isPrevious: boolean) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (localDateKey(date) === localDateKey(today)) {
    return isPrevious ? 'Earlier today' : '';
  }

  if (localDateKey(date) === localDateKey(yesterday)) {
    return 'Yesterday';
  }

  if (localDateKey(date) === localDateKey(tomorrow)) {
    return 'Tomorrow, ';
  }

  return `${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date)}, `;
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function isDiscoverCommunity(community: PartnerCommunity) {
  return (
    community.relationshipStatus !== 'mock' &&
    Boolean(community.imageUrl)
  );
}

function isMultilingualCommunity(community: PartnerCommunity) {
  const searchableText = [
    community.location,
    community.accent,
    community.tagline,
    community.description,
  ]
    .join('\n')
    .toLowerCase();

  return searchableText.includes('spanish');
}

function discoverCardFromCommunity(
  community: PartnerCommunity,
  language?: string,
): MediaCard {
  return {
    meta: community.kind,
    title: community.name,
    description: community.tagline,
    image: community.imageUrl!,
    communitySlug: community.slug as PartnerCommunitySlug,
    source: 'partner',
    language,
    actionLabel: 'View profile',
  };
}

function MediaGrid({
  items,
  onOpenCommunity,
  partnerStatusOverrides,
}: {
  items: MediaCard[];
  onOpenCommunity?: (slug: string) => void;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
}) {
  return (
    <div className='community-grid discovery-card-grid'>
      {items.map((item) => {
        const badgeStatus = badgeStatusForItem(item, partnerStatusOverrides);

        return (
          <MediaCardShell
            key={item.title}
            item={item}
            onOpenCommunity={onOpenCommunity}
          >
            <span
              className={`community-card-image discovery-card-image${item.communitySlug ? ` community-${item.communitySlug}` : ''}`}
              style={{ backgroundImage: `url(${item.image})` }}
            />
            <span className='community-card-body discovery-card-body'>
              <span className='community-card-meta discovery-card-meta'>
                {item.language ? `${item.meta} · ${item.language}` : item.meta}
              </span>
              <span className='community-card-title-row'>
                <strong>{item.title}</strong>
                {badgeStatus ? <PartnerBadge status={badgeStatus} /> : null}
              </span>
              <span className='discovery-card-description'>
                {item.description}
              </span>
              <span className='discovery-card-action'>
                {item.actionLabel ??
                  (item.communitySlug ? 'View profile' : item.href ? 'Visit' : 'Learn more')}
              </span>
            </span>
          </MediaCardShell>
        );
      })}
    </div>
  );
}

function StreamGrid({
  items,
  onOpenCommunity,
  partnerStatusOverrides,
}: {
  items: StreamCard[];
  onOpenCommunity?: (slug: string) => void;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
}) {
  return (
    <div className='community-grid discovery-card-grid'>
      {items.map((item) => {
        const badgeStatus = badgeStatusForItem(item, partnerStatusOverrides);

        return (
          <MediaCardShell
            key={item.title}
            item={item}
            onOpenCommunity={onOpenCommunity}
          >
            <span
              className={`community-card-image discovery-card-image${item.communitySlug ? ` community-${item.communitySlug}` : ''}`}
              style={{ backgroundImage: `url(${item.image})` }}
            />
            <span className='community-card-body discovery-card-body'>
              <span className='community-card-meta discovery-card-meta'>
                {item.meta}
              </span>
              <span className='community-card-title-row'>
                <strong>{item.title}</strong>
                {badgeStatus ? <PartnerBadge status={badgeStatus} /> : null}
              </span>
              <span className='discovery-card-description'>
                {item.description}
              </span>
              <span className='discovery-card-footer'>
                <span className='stream-time'>{item.time}</span>
                <span className='discovery-card-action'>
                  {item.communitySlug ? 'View profile' : 'Learn more'}
                </span>
              </span>
            </span>
          </MediaCardShell>
        );
      })}
    </div>
  );
}

function badgeStatusForItem(
  item: MediaCard,
  partnerStatusOverrides?: PartnerCommunityStatusOverrides,
): PartnerBadgeStatus | null {
  const community = item.communitySlug
    ? getPartnerCommunity(item.communitySlug, partnerStatusOverrides)
    : null;

  if (community?.badgeEnabled) {
    if (community.relationshipStatus === 'curated') {
      return null;
    }

    return community.relationshipStatus;
  }

  if (item.source === 'mock') {
    return 'mock';
  }

  return null;
}

function MediaCardShell({
  children,
  item,
  onOpenCommunity,
}: {
  children: ReactNode;
  item: MediaCard;
  onOpenCommunity?: (slug: string) => void;
}) {
  const className = [
    'community-card',
    'discovery-card',
    item.href || item.communitySlug
      ? 'discovery-card-link'
      : 'discovery-card-static',
  ]
    .filter(Boolean)
    .join(' ');

  if (item.communitySlug) {
    return (
      <button
        type='button'
        className={className}
        onClick={() => {
          trackAnalyticsEvent('content_card_clicked', {
            pageContext: 'discover_community_card',
            communitySlug: item.communitySlug,
            contentId: item.communitySlug,
            contentType: 'community_card',
            metadata: {
              cardTitle: item.title,
              cardMeta: item.meta,
              source: item.source,
            },
          });
          onOpenCommunity?.(item.communitySlug as string);
        }}
      >
        {children}
      </button>
    );
  }

  if (item.href) {
    const href = item.href;

    return (
      <a
        className={className}
        href={href}
        rel='noreferrer'
        target='_blank'
        onClick={() =>
          trackAnalyticsEvent('community_outbound_clicked', {
            pageContext: 'discover_external_card',
            contentId: item.title,
            contentType: discoverOutboundType(href),
            sourceUrl: href,
            metadata: {
              cardTitle: item.title,
              cardMeta: item.meta,
              source: item.source,
            },
          })
        }
      >
        {children}
      </a>
    );
  }

  return (
    <article className={className}>
      {children}
    </article>
  );
}

function discoverOutboundType(href: string) {
  const value = href.toLowerCase();

  if (value.includes('youtube.com') || value.includes('youtu.be')) {
    return 'youtube';
  }
  if (value.includes('spotify.com')) {
    return 'spotify';
  }
  if (value.includes('podcasts.apple.com')) {
    return 'apple_podcast';
  }
  if (value.includes('rss')) {
    return 'rss';
  }
  return 'external_resource';
}

export function DiscoverPage({
  onNavigate,
  onOpenCommunity,
  partnerStatusOverrides,
  worthAbbeyVideos = [],
}: {
  onNavigate: ViewNavigator;
  onOpenCommunity?: (slug: string) => void;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
  partnerVideos?: DiscoverPartnerPrayerVideo[];
  partnerAudio?: DiscoverPartnerPrayerAudio[];
  worthAbbeyVideos?: DiscoverWorthAbbeyVideo[];
}) {
  const upcomingStreams = worthAbbeyStreamCards(worthAbbeyVideos, 'upcoming');
  const previousStreams = worthAbbeyStreamCards(worthAbbeyVideos, 'previous');
  const discoverCommunities = listPartnerCommunities(
    partnerStatusOverrides,
  ).filter(isDiscoverCommunity);
  const multilingualResources = discoverCommunities
    .filter(isMultilingualCommunity)
    .map((community) => discoverCardFromCommunity(community, 'Spanish'));
  const communityResources = discoverCommunities
    .filter((community) => !isMultilingualCommunity(community))
    .map((community) => discoverCardFromCommunity(community));

  return (
    <article className='page'>
      <header className='page-hero'>
        <div className='page-eyebrow'>Discover</div>
        <h1 className='page-hero-title'>Discover ways to pray the Hours</h1>
        <p className='page-lead'>
          Find audio, apps, live prayer, communities, and ministries helping
          Catholics pray the Liturgy of the Hours.
        </p>
      </header>

      <section className='page-section'>
        <h2 className='page-section-title'>Communities at prayer</h2>
        <MediaGrid
          items={communityResources}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Spanish and multilingual resources</h2>
        <MediaGrid
          items={multilingualResources}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      {upcomingStreams.length > 0 ? (
        <section className='page-section'>
          <h2 className='page-section-title'>Live now &amp; upcoming</h2>
          <p className='page-section-intro'>
            Don't pray alone. Join monasteries, parishes, ministries, and
            Catholics around the world who are already praying the Hours live.
          </p>
          <StreamGrid
            items={upcomingStreams}
            onOpenCommunity={onOpenCommunity}
            partnerStatusOverrides={partnerStatusOverrides}
          />
        </section>
      ) : null}

      {previousStreams.length > 0 ? (
        <section className='page-section'>
          <h2 className='page-section-title'>Recent streams</h2>
          <StreamGrid
            items={previousStreams}
            onOpenCommunity={onOpenCommunity}
            partnerStatusOverrides={partnerStatusOverrides}
          />
        </section>
      ) : null}

      <section className='page-section'>
        <h2 className='page-section-title'>Apps and text resources</h2>
        <p className='page-section-intro'>
          Commonly used books and reading resources for people who want to
          follow along outside Una Voce.
        </p>
        <p className='page-section-intro'>
          Una Voce is being developed with the intention of using the official
          approved liturgical texts for each region, subject to the proper
          permissions and licensing. As new editions are promulgated, Una Voce
          will follow the Church's approved texts and timelines.
        </p>
        <StreamGrid items={TEXT_SOURCES} />
      </section>

      <div className='page-cta'>
        <button
          type='button'
          className='page-cta-link'
          onClick={() => onNavigate('today')}
        >
          Pray along with today's hours
        </button>
      </div>
    </article>
  );
}
