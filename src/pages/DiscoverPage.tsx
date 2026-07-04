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
    meta: 'Cathoholic Music',
    title: 'Cathoholic Lauds & Vespers',
    description:
      'Partner Morning Prayer and Evening Prayer videos matched to the prayer date.',
    image:
      'https://images.unsplash.com/photo-1731258941332-844ae3f8618d?q=80&w=1887&auto=format&fit=crop',
    communitySlug: 'cathoholic-music',
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
    return community.relationshipStatus;
  }

  if (item.source === 'mock') {
    return 'mock';
  }

  if (item.source === 'partner') {
    return 'curated';
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
}: {
  onNavigate: ViewNavigator;
  onOpenCommunity?: (slug: string) => void;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
}) {
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
      </header>

      <section className='page-section'>
        <h2 className='page-section-title'>Listen</h2>
        <MediaGrid
          items={AUDIO}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Watch</h2>
        <MediaGrid
          items={VIDEO}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Live now &amp; upcoming</h2>
        <p className='page-section-intro'>
          The Church prays as one body. Join real-time streams from communities
          around the world, or pray today's hours on your own.
        </p>
        <StreamGrid
          items={LIVE_UPCOMING}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Recent streams</h2>
        <StreamGrid
          items={LIVE_PREVIOUS}
          onOpenCommunity={onOpenCommunity}
          partnerStatusOverrides={partnerStatusOverrides}
        />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Trusted texts</h2>
        <p className='page-section-intro'>
          The Liturgy of the Hours is a rich tradition with many editions and
          formats. Here are some of the most trusted sources for the daily
          prayer of the Church.
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
