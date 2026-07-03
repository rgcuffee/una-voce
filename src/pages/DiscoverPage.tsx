import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ViewNavigator } from '../navigation';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { LiturgicalHour, PrayerVideoKind } from '../lib/database.types';

type MediaCard = {
  meta: string;
  title: string;
  description: string;
  image: string;
  href?: string;
  source: 'mock' | 'live';
};

type StreamCard = MediaCard & { time: string };

type CathaholicVideoRow = {
  id: string;
  title: string;
  description: string | null;
  published_at: string;
  prayer_date: string | null;
  scheduled_start_at: string | null;
  thumbnail_url: string | null;
  canonical_url: string;
  prayer_type: LiturgicalHour | null;
  video_kind: PrayerVideoKind;
  partners: {
    name: string;
    slug: string;
  } | null;
};

const CATHAHOLIC_PARTNER_SLUG = 'cathaholic-music';
const FALLBACK_VIDEO_IMAGE =
  'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80';

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
    title: 'Saint Benedict Abbey Audio Office',
    description:
      'Monastic-style spoken audio with chapel ambience and structured intercessions.',
    image:
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1400&q=80',
    source: 'mock',
  },
];

const VIDEO: MediaCard[] = [
  {
    meta: 'Content Creator',
    title: 'The Little Oratory',
    description:
      'Guided video office with verse overlays and clear transitions through each section.',
    image:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80',
    source: 'mock',
  },
  {
    meta: 'Monastery',
    title: 'Clear Creek Monastery Video Office',
    description:
      'Chapel-captured Morning Prayer video with natural acoustics and full liturgical flow.',
    image:
      'https://images.unsplash.com/photo-1597839977601-52b29c114af5?q=80&w=2054&auto=format&fit=crop',
    source: 'mock',
  },
];

const LIVE_UPCOMING: StreamCard[] = [
  {
    meta: 'Monastery Live',
    title: 'Clear Creek Monastery · Vespers',
    description:
      'Live chapel stream of Evening Prayer with shared responses and final blessing.',
    time: 'Today, 5:00 PM',
    image:
      'https://plus.unsplash.com/premium_photo-1679051422153-2ea3c8cfe9ed?q=80&w=2070&auto=format&fit=crop',
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
    source: 'mock',
  },
];

const LIVE_PREVIOUS: StreamCard[] = [
  {
    meta: 'Archived Live',
    title: 'Benedictine Sisters · Lauds Replay',
    description:
      'Replay of a full live stream with psalm responses and intercessions.',
    time: 'Earlier today, 6:00 AM',
    image:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1400&q=80',
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

function MediaGrid({ items }: { items: MediaCard[] }) {
  return (
    <div className='format-options'>
      {items.map((item) => (
        <MediaCardShell
          key={item.title}
          item={item}
          gradient='linear-gradient(165deg, rgba(12, 11, 9, 0.2), rgba(12, 11, 9, 0.78))'
        >
          <div className='option-meta'>{item.meta}</div>
          {item.source === 'live' && (
            <div className='option-source'>Live partner</div>
          )}
          <div className='option-title'>{item.title}</div>
          <p className='option-desc'>{item.description}</p>
        </MediaCardShell>
      ))}
    </div>
  );
}

function StreamGrid({ items }: { items: StreamCard[] }) {
  return (
    <div className='format-options'>
      {items.map((item) => (
        <MediaCardShell
          key={item.title}
          item={item}
          gradient='linear-gradient(165deg, rgba(16, 13, 12, 0.26), rgba(16, 13, 12, 0.82))'
        >
          <div className='option-meta'>{item.meta}</div>
          {item.source === 'live' && (
            <div className='option-source'>Live partner</div>
          )}
          <div className='option-title'>{item.title}</div>
          <p className='option-desc'>{item.description}</p>
          <div className='stream-time'>{item.time}</div>
        </MediaCardShell>
      ))}
    </div>
  );
}

function MediaCardShell({
  children,
  gradient,
  item,
}: {
  children: ReactNode;
  gradient: string;
  item: MediaCard;
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

function useCathaholicVideos() {
  const [videos, setVideos] = useState<CathaholicVideoRow[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const client = supabase;
    let isMounted = true;

    async function loadVideos() {
      const { data, error } = await client
        .from('youtube_videos')
        .select(
          [
            'id',
            'title',
            'description',
            'published_at',
            'prayer_date',
            'scheduled_start_at',
            'thumbnail_url',
            'canonical_url',
            'prayer_type',
            'video_kind',
            'partners!inner(name,slug)',
          ].join(','),
        )
        .eq('display_status', 'approved')
        .eq('partners.slug', CATHAHOLIC_PARTNER_SLUG)
        .in('prayer_type', ['lauds', 'vespers'])
        .order('prayer_date', { ascending: false, nullsFirst: false })
        .order('published_at', { ascending: false })
        .limit(6);

      if (!isMounted || error) {
        return;
      }

      setVideos((data ?? []) as unknown as CathaholicVideoRow[]);
    }

    void loadVideos();

    return () => {
      isMounted = false;
    };
  }, []);

  return videos;
}

function toCathaholicCards(videos: CathaholicVideoRow[]): StreamCard[] {
  return videos.map((video) => {
    const partnerName = video.partners?.name ?? 'Cathaholic Music';
    const prayerLabel = formatPrayerType(video.prayer_type);

    return {
      meta: `${partnerName} · ${video.video_kind === 'scheduled_live' ? 'Scheduled' : 'Video'}`,
      title: video.title,
      description:
        summarizeDescription(video.description) ??
        `${prayerLabel} from ${partnerName}.`,
      image: video.thumbnail_url ?? FALLBACK_VIDEO_IMAGE,
      href: video.canonical_url,
      time: formatVideoDate(video.prayer_date ?? video.published_at),
      source: 'live',
    };
  });
}

function formatPrayerType(prayerType: LiturgicalHour | null) {
  switch (prayerType) {
    case 'office_of_readings':
      return 'Office of Readings';
    case 'lauds':
      return 'Morning Prayer';
    case 'midday_prayer':
      return 'Midday Prayer';
    case 'vespers':
      return 'Evening Prayer';
    case 'compline':
      return 'Night Prayer';
    default:
      return 'Prayer video';
  }
}

function formatVideoDate(value: string) {
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date pending';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function summarizeDescription(description: string | null) {
  const normalized = description?.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }

  return normalized.length > 130
    ? `${normalized.slice(0, 127).trim()}...`
    : normalized;
}

export function DiscoverPage({ onNavigate }: { onNavigate: ViewNavigator }) {
  const cathaholicVideos = useCathaholicVideos();
  const cathaholicCards = useMemo(
    () => toCathaholicCards(cathaholicVideos),
    [cathaholicVideos],
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
      </header>

      <section className='page-section'>
        <h2 className='page-section-title'>Listen</h2>
        <MediaGrid items={AUDIO} />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Watch</h2>
        <MediaGrid items={VIDEO} />
      </section>

      {cathaholicCards.length > 0 && (
        <section className='page-section'>
          <h2 className='page-section-title'>Cathaholic Lauds &amp; Vespers</h2>
          <p className='page-section-intro'>
            Real partner Morning Prayer and Evening Prayer videos from
            Cathaholic Music, organized by prayer date.
          </p>
          <StreamGrid items={cathaholicCards} />
        </section>
      )}

      <section className='page-section'>
        <h2 className='page-section-title'>Live now &amp; upcoming</h2>
        <p className='page-section-intro'>
          The Church prays as one body. Join real-time streams from communities
          around the world, or pray today's hours on your own.
        </p>
        <StreamGrid items={LIVE_UPCOMING} />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Recent streams</h2>
        <StreamGrid items={LIVE_PREVIOUS} />
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
