export type PartnerCommunitySlug =
  | 'cathoholic-music'
  | 'worth-abbey'
  | 'ridgehaven-priory'
  | 'the-little-oratory'
  | 'psalm-and-laurel'
  | 'cedarwell-abbey'
  | 'sisters-of-dawnfield';

export type PartnerCommunity = {
  slug: PartnerCommunitySlug;
  name: string;
  kind: string;
  location: string;
  tagline: string;
  description: string;
  imageUrl: string;
  accent: string;
  prayerRhythm: string[];
  links: {
    label: string;
    href: string;
  }[];
  featured: {
    label: string;
    title: string;
    description: string;
  }[];
};

export const PARTNER_COMMUNITIES: PartnerCommunity[] = [
  {
    slug: 'worth-abbey',
    name: 'Worth Abbey',
    kind: 'Benedictine monastery',
    location: 'West Sussex, England',
    tagline: 'Monastic prayer from the abbey church.',
    description:
      'Worth Abbey shares livestreamed offices and liturgies from a Benedictine community whose daily rhythm is shaped by prayer, work, hospitality, and study.',
    imageUrl:
      'https://source.unsplash.com/S3bJyQwaB8Q/1400x900',
    accent: 'Chanted offices, chapel livestreams, Benedictine rhythm',
    prayerRhythm: [
      'Office of Readings',
      'Lauds',
      'Midday Prayer',
      'Vespers',
      'Compline',
    ],
    links: [
      { label: 'Abbey website', href: 'https://worthabbey.net/' },
      { label: 'YouTube channel', href: 'https://www.youtube.com/@WorthAbbey' },
    ],
    featured: [
      {
        label: 'Live today',
        title: 'Vespers from Worth Abbey',
        description:
          'Evening prayer from the abbey church, surfaced when the livestream is scheduled or recently completed.',
      },
      {
        label: 'Archive',
        title: 'Compline replays',
        description:
          'Night Prayer recordings stay available so people can close the day with the community.',
      },
    ],
  },
  {
    slug: 'cathoholic-music',
    name: 'Cathoholic Music',
    kind: 'Creator ministry',
    location: 'Online',
    tagline: 'Sung Lauds and Vespers with visual prayer guides.',
    description:
      'Cathoholic Music creates chant-forward prayer videos that pair the daily office with clear on-screen structure for people praying at home.',
    imageUrl:
      'https://images.unsplash.com/photo-1731258941332-844ae3f8618d?q=80&w=1887&auto=format&fit=crop',
    accent: 'Sung prayer, daily video, accessible chant',
    prayerRhythm: ['Lauds', 'Vespers'],
    links: [
      {
        label: 'YouTube channel',
        href: 'https://www.youtube.com/@CathoholicMusic',
      },
    ],
    featured: [
      {
        label: 'Today',
        title: 'Morning Prayer video',
        description:
          'Matched to the selected prayer date when a Lauds video is available.',
      },
      {
        label: 'Today',
        title: 'Evening Prayer video',
        description:
          'A Vespers option appears in the Watch tab for the evening office.',
      },
    ],
  },
  {
    slug: 'ridgehaven-priory',
    name: 'Ridgehaven Priory',
    kind: 'Mock prayer community',
    location: 'Fictional',
    tagline: 'Chapel prayer and monastic offices.',
    description:
      'A prototype partner page for a monastery-style community with live chapel prayer, archived offices, and a steady daily rule.',
    imageUrl:
      'https://images.unsplash.com/photo-1597839977601-52b29c114af5?q=80&w=2054&auto=format&fit=crop',
    accent: 'Monastic chant, live chapel, quiet pacing',
    prayerRhythm: ['Morning Prayer', 'Midday Prayer', 'Vespers'],
    links: [{ label: 'Mock community website', href: 'https://example.com/ridgehaven-priory' }],
    featured: [
      {
        label: 'Upcoming',
        title: 'Morning Office',
        description:
          'A sample livestream card for testing partner discovery and player links.',
      },
    ],
  },
  {
    slug: 'the-little-oratory',
    name: 'The Little Oratory',
    kind: 'Mock lay prayer community',
    location: 'Prototype',
    tagline: 'Guided prayer for people learning the Hours.',
    description:
      'A creator/community placeholder focused on gentle pacing, captions, and approachable live prayer gatherings.',
    imageUrl:
      'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80',
    accent: 'Guided pace, captions, beginner-friendly',
    prayerRhythm: ['Morning Prayer', 'Compline'],
    links: [{ label: 'Mock community home', href: 'https://example.com/little-oratory' }],
    featured: [
      {
        label: 'Live',
        title: 'Compline Together',
        description:
          'A simple evening gathering with a hymn, psalms, reading, and blessing.',
      },
    ],
  },
  {
    slug: 'psalm-and-laurel',
    name: 'Psalm and Laurel',
    kind: 'Mock audio and video creator',
    location: 'Prototype',
    tagline: 'Responsive psalm prayer with clear cues.',
    description:
      'A prototype creator page for spoken and sung offices with pauses, callouts, and short daytime prayer formats.',
    imageUrl:
      'https://images.unsplash.com/photo-1516280030429-27679b3dc9cf?auto=format&fit=crop&w=1400&q=80',
    accent: 'Psalm cues, responsive pauses, daytime offices',
    prayerRhythm: ['Midmorning Prayer', 'Midday Prayer', 'Midafternoon Prayer'],
    links: [{ label: 'Mock creator site', href: 'https://example.com/psalm-and-laurel' }],
    featured: [
      {
        label: 'Daytime',
        title: 'Midday Prayer',
        description:
          'A compact format for people praying during a workday pause.',
      },
    ],
  },
  {
    slug: 'cedarwell-abbey',
    name: 'Cedarwell Abbey',
    kind: 'Mock abbey archive',
    location: 'Fictional',
    tagline: 'Recorded offices from an abbey setting.',
    description:
      'A sample abbey community page for replay cards and recorded offices in the local prototype.',
    imageUrl:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1400&q=80',
    accent: 'Recorded offices, abbey ambience, replay library',
    prayerRhythm: ['Midmorning Prayer', 'Midday Prayer', 'Midafternoon Prayer'],
    links: [{ label: 'Mock abbey site', href: 'https://example.com/cedarwell-abbey' }],
    featured: [
      {
        label: 'Replay',
        title: 'Daytime office archive',
        description:
          'Previous-stream cards can lead back to this profile from the player.',
      },
    ],
  },
  {
    slug: 'sisters-of-dawnfield',
    name: 'Sisters of Dawnfield',
    kind: 'Mock religious community',
    location: 'Fictional',
    tagline: 'Convent-led prayer and office replays.',
    description:
      'A sample community profile for convent-led prayer videos and recent livestream replays.',
    imageUrl:
      'https://plus.unsplash.com/premium_photo-1679051422153-2ea3c8cfe9ed?q=80&w=2070&auto=format&fit=crop',
    accent: 'Convent prayer, replays, shared responses',
    prayerRhythm: ['Lauds', 'Midday Prayer', 'Vespers'],
    links: [{ label: 'Mock community site', href: 'https://example.com/sisters-of-dawnfield' }],
    featured: [
      {
        label: 'Recent',
        title: 'Lauds replay',
        description:
          'A recent-stream example for the Discover and Community surfaces.',
      },
    ],
  },
];

const COMMUNITY_BY_SLUG = new Map(
  PARTNER_COMMUNITIES.map((community) => [community.slug, community]),
);

const COMMUNITY_ALIASES: Record<string, PartnerCommunitySlug> = {
  'cathoholic music': 'cathoholic-music',
  'worth abbey': 'worth-abbey',
  'worth abbey (uk)': 'worth-abbey',
  'ridgehaven priory': 'ridgehaven-priory',
  'mock little oratory': 'the-little-oratory',
  'the little oratory': 'the-little-oratory',
  'mock psalm and laurel': 'psalm-and-laurel',
  'psalm and laurel': 'psalm-and-laurel',
  'cedarwell abbey': 'cedarwell-abbey',
  'sisters of dawnfield': 'sisters-of-dawnfield',
};

export function communityPath(slug: PartnerCommunitySlug | string) {
  return `/community/${slug}`;
}

export function getPartnerCommunity(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return COMMUNITY_BY_SLUG.get(slug as PartnerCommunitySlug) ?? null;
}

export function communityForName(name: string) {
  return COMMUNITY_BY_SLUG.get(
    COMMUNITY_ALIASES[name.trim().toLowerCase()],
  ) ?? null;
}
