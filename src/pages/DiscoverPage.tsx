import { type ReactNode } from 'react';
import {
  getPartnerCommunity,
  type PartnerBadgeStatus,
  type PartnerCommunityStatusOverrides,
  type PartnerCommunitySlug,
} from '../data/partnerCommunities';
import type { ViewNavigator } from '../navigation';
import { PartnerBadge } from '../components/PartnerBadge';

type MediaCard = {
  meta: string;
  title: string;
  description: string;
  image: string;
  href?: string;
  communitySlug?: PartnerCommunitySlug;
  source: 'mock' | 'partner';
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

const AUDIO: MediaCard[] = [
  {
    meta: 'Podcast',
    title: 'Una Voce Daily Office Audio',
    description:
      'Straight-through narrated Morning Prayer with psalm pauses for personal response.',
    image:
      'https://images.unsplash.com/photo-1524678714210-9917a6c619c2?auto=format&fit=crop&w=1400&q=80',
    source: 'mock',
  },
  {
    meta: 'Abbey Feed',
    title: 'Cedarwell Abbey Audio Office',
    description:
      'Monastic-style spoken audio with chapel ambience and structured intercessions.',
    image:
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1400&q=80',
    communitySlug: 'cedarwell-abbey',
    source: 'mock',
  },
];

const VIDEO: MediaCard[] = [
  {
    meta: 'Cathaholic Music',
    title: 'Cathaholic Lauds & Vespers',
    description:
      'Partner Morning Prayer and Evening Prayer videos matched to the prayer date.',
    image:
      'https://images.unsplash.com/photo-1731258941332-844ae3f8618d?q=80&w=1887&auto=format&fit=crop',
    communitySlug: 'cathaholic-music',
    source: 'partner',
  },
  {
    meta: 'Content Creator',
    title: 'The Little Oratory',
    description:
      'Guided video office with verse overlays and clear transitions through each section.',
    image:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80',
    communitySlug: 'the-little-oratory',
    source: 'mock',
  },
  {
    meta: 'Mock Abbey',
    title: 'Ridgehaven Priory Video Office',
    description:
      'Chapel-captured Morning Prayer video with natural acoustics and full liturgical flow.',
    image:
      'https://images.unsplash.com/photo-1597839977601-52b29c114af5?q=80&w=2054&auto=format&fit=crop',
    communitySlug: 'ridgehaven-priory',
    source: 'mock',
  },
];

const LIVE_UPCOMING: StreamCard[] = [
  {
    meta: 'Mock Community Live',
    title: 'Ridgehaven Priory · Vespers',
    description:
      'Live chapel stream of Evening Prayer with shared responses and final blessing.',
    time: 'Today, 5:00 PM',
    image:
      'https://plus.unsplash.com/premium_photo-1679051422153-2ea3c8cfe9ed?q=80&w=2070&auto=format&fit=crop',
    communitySlug: 'ridgehaven-priory',
    source: 'mock',
  },
  {
    meta: 'Creator Live',
    title: 'The Little Oratory · Compline Together',
    description:
      'Close the day with a guided Night Prayer and an opening hymn.',
    time: 'Today, 9:00 PM',
    image:
      'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1400&q=80',
    communitySlug: 'the-little-oratory',
    source: 'mock',
  },
];

const LIVE_PREVIOUS: StreamCard[] = [
  {
    meta: 'Archived Live',
    title: 'Sisters of Dawnfield · Lauds Replay',
    description:
      'Replay of a full live stream with psalm responses and intercessions.',
    time: 'Earlier today, 6:00 AM',
    image:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1400&q=80',
    communitySlug: 'sisters-of-dawnfield',
    source: 'mock',
  },
];

const TEXT_SOURCES: StreamCard[] = [
  {
    meta: 'Monthly Magazine',
    title: 'Magnificat',
    description:
      'Compact monthly booklet containing the daily Mass, Morning Prayer, Evening Prayer, meditations, and reflections.',
    time: 'Monthly',
    image:
      'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1400&q=80', // open devotional on a wooden pew
    source: 'mock',
  },
  {
    meta: 'Liturgical Books',
    title: 'Liturgy of the Hours · Four-Volume Set',
    description:
      'The official English edition used throughout much of the year, organized according to the liturgical calendar.',
    time: 'Official Text',
    image:
      'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?auto=format&fit=crop&w=1400&q=80', // richly bound old books
    source: 'mock',
  },
  {
    meta: 'Single Volume',
    title: 'Christian Prayer',
    description:
      'A simplified one-volume edition featuring Morning Prayer, Evening Prayer, Night Prayer, and selections for the seasons.',
    time: 'Popular Edition',
    image:
      'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&w=1400&q=80', // person reading beside a window
    source: 'mock',
  },
  {
    meta: 'Pocket Edition',
    title: 'Shorter Christian Prayer',
    description:
      'An accessible introduction with the core daily Hours for those beginning a regular prayer routine.',
    time: 'Beginner',
    image:
      'https://images.unsplash.com/photo-1510936111840-65e151ad71bb?auto=format&fit=crop&w=1400&q=80', // small book with coffee and morning light
    source: 'mock',
  },
];

function partnerAudioCards(
  audioItems: DiscoverPartnerPrayerAudio[],
): MediaCard[] {
  return audioItems
    .filter((item) => item.prayerType)
    .map((item) => ({
      meta: `Spotify Audio · ${PRAYER_TYPE_LABELS[item.prayerType!]}`,
      title: `${item.partnerName} · ${item.displayTitle}`,
      description:
        item.description ??
        `Pray ${PRAYER_TYPE_LABELS[item.prayerType!]} with ${item.partnerName}.`,
      image:
        item.imageUrl ??
        'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1400&q=80',
      href: item.canonicalUrl,
      communitySlug: item.partnerSlug as PartnerCommunitySlug,
      source: 'partner' as const,
    }))
    .slice(0, 4);
}

function partnerVideoCards(
  videos: DiscoverPartnerPrayerVideo[],
): MediaCard[] {
  return videos
    .filter((item) => item.prayerType)
    .map((item) => ({
      meta: `Guided Video · ${PRAYER_TYPE_LABELS[item.prayerType!]}`,
      title: `${item.partnerName} · ${item.displayTitle}`,
      description:
        item.description ??
        `Pray ${PRAYER_TYPE_LABELS[item.prayerType!]} with ${item.partnerName}.`,
      image: item.thumbnailUrl,
      href: item.canonicalUrl,
      communitySlug: item.partnerSlug as PartnerCommunitySlug,
      source: 'partner' as const,
    }))
    .slice(0, 4);
}

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

function partnerFirst<T extends MediaCard>(
  partnerItems: T[],
  fallbackItems: T[],
): T[] {
  return partnerItems.length > 0
    ? [...partnerItems, ...fallbackItems]
    : fallbackItems;
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
    <div className='format-options'>
      {items.map((item) => {
        const badgeStatus = badgeStatusForItem(item, partnerStatusOverrides);

        return (
          <MediaCardShell
            key={item.title}
            item={item}
            onOpenCommunity={onOpenCommunity}
            gradient='linear-gradient(165deg, rgba(12, 11, 9, 0.2), rgba(12, 11, 9, 0.78))'
          >
            <div className='option-meta'>{item.meta}</div>
            {badgeStatus ? <PartnerBadge status={badgeStatus} /> : null}
            <div className='option-title'>{item.title}</div>
            <p className='option-desc'>{item.description}</p>
            {item.communitySlug ? (
              <div className='option-card-footer'>
                <span />
                <span className='option-prayer-action'>View Community</span>
              </div>
            ) : null}
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
    <div className='format-options'>
      {items.map((item) => {
        const badgeStatus = badgeStatusForItem(item, partnerStatusOverrides);

        return (
          <MediaCardShell
            key={item.title}
            item={item}
            onOpenCommunity={onOpenCommunity}
            gradient='linear-gradient(165deg, rgba(16, 13, 12, 0.26), rgba(16, 13, 12, 0.82))'
          >
            <div className='option-meta'>{item.meta}</div>
            {badgeStatus ? <PartnerBadge status={badgeStatus} /> : null}
            <div className='option-title'>{item.title}</div>
            <p className='option-desc'>{item.description}</p>
            <div className='option-card-footer'>
              <span className='stream-time'>{item.time}</span>
              {item.communitySlug ? (
                <span className='option-prayer-action'>View Community</span>
              ) : (
                <span />
              )}
            </div>
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
  gradient,
  item,
  onOpenCommunity,
}: {
  children: ReactNode;
  gradient: string;
  item: MediaCard;
  onOpenCommunity?: (slug: string) => void;
}) {
  const className = [
    'format-option',
    'format-option-media',
    item.href ? 'format-option-link' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const style = {
    backgroundImage: `${gradient}, url(${item.image})`,
  };

  if (item.communitySlug) {
    return (
      <button
        type='button'
        className={className}
        style={style}
        onClick={() => onOpenCommunity?.(item.communitySlug as string)}
      >
        {children}
      </button>
    );
  }

  if (item.href) {
    return (
      <a
        className={className}
        href={item.href}
        rel='noreferrer'
        target='_blank'
        style={style}
      >
        {children}
      </a>
    );
  }

  return (
    <article className={className} style={style}>
      {children}
    </article>
  );
}

export function DiscoverPage({
  onNavigate,
  onOpenCommunity,
  partnerStatusOverrides,
  partnerVideos = [],
  partnerAudio = [],
  worthAbbeyVideos = [],
}: {
  onNavigate: ViewNavigator;
  onOpenCommunity?: (slug: string) => void;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
  partnerVideos?: DiscoverPartnerPrayerVideo[];
  partnerAudio?: DiscoverPartnerPrayerAudio[];
  worthAbbeyVideos?: DiscoverWorthAbbeyVideo[];
}) {
  const audioItems = partnerFirst(partnerAudioCards(partnerAudio), AUDIO);
  const videoItems = partnerFirst(partnerVideoCards(partnerVideos), VIDEO);
  const upcomingStreams = partnerFirst(
    worthAbbeyStreamCards(worthAbbeyVideos, 'upcoming'),
    LIVE_UPCOMING,
  );
  const previousStreams = partnerFirst(
    worthAbbeyStreamCards(worthAbbeyVideos, 'previous'),
    LIVE_PREVIOUS,
  );

  return (
    <article className='page'>
      <header className='page-hero'>
        <div className='page-eyebrow'>Discover</div>
        <h1 className='page-hero-title'>Pray with the Church, your way</h1>
        <p className='page-lead'>
          Explore audio, video, live prayer, and trusted resources from creators
          and communities around the world. Whether you prefer chant, spoken
          prayer, or quiet reading, find a rhythm that helps you return
          tomorrow.
        </p>
        <div className='prose'>
          <p>
            Una Voce helps Catholics discover the Liturgy of the Hours, begin
            praying it, and connect with communities already praying throughout
            the world.
          </p>
        </div>
      </header>

      <section className='page-section'>
        <h2 className='page-section-title'>Listen</h2>
        <MediaGrid
          items={audioItems}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Watch</h2>
        <MediaGrid
          items={videoItems}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

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

      <section className='page-section'>
        <h2 className='page-section-title'>Recent streams</h2>
        <StreamGrid
          items={previousStreams}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Trusted texts</h2>
        <p className='page-section-intro'>
          The Liturgy of the Hours is a rich tradition with many editions and
          formats. Here are some of the most trusted sources for the daily
          prayer of the Church. Una Voce is not trying to replace breviary apps
          like Universalis, iBreviary, or Divine Office.
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
