export type PartnerCommunitySlug =
  | 'cathaholic-music'
  | 'cantor-del-camino'
  | 'divine-office'
  | 'padre-didier'
  | 'sing-the-hours'
  | 'worth-abbey'
  | 'ridgehaven-priory'
  | 'the-little-oratory'
  | 'psalm-and-laurel'
  | 'cedarwell-abbey'
  | 'sisters-of-dawnfield';

export type PartnerBadgeStatus = 'curated' | 'verified' | 'partner' | 'mock';
export type PartnerCommunityOnboardingStatus = 'active' | 'pending';

export type PartnerCommunity = {
  slug: PartnerCommunitySlug | string;
  name: string;
  kind: string;
  location: string;
  onboardingStatus?: PartnerCommunityOnboardingStatus;
  relationshipStatus: PartnerBadgeStatus;
  badgeEnabled: boolean;
  tagline: string;
  description: string;
  imageUrl?: string | null;
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

const showPendingPartnerCommunities =
  import.meta.env.VITE_SHOW_PENDING_PARTNER_CONTENT === 'true' ||
  (import.meta.env.DEV &&
    import.meta.env.VITE_SHOW_PENDING_PARTNER_CONTENT !== 'false');

export type PartnerCommunityStatusOverride = {
  relationshipStatus: Exclude<PartnerBadgeStatus, 'mock'>;
  badgeEnabled: boolean;
  communityPageEnabled: boolean;
  communityPageSlug: string | null;
};

export type PartnerCommunityStatusOverrides = Record<
  string,
  PartnerCommunityStatusOverride
>;

export const PARTNER_COMMUNITIES: PartnerCommunity[] = [
  {
    slug: 'divine-office',
    name: 'Divine Office',
    kind: 'Audio prayer ministry',
    location: 'United States / online',
    onboardingStatus: 'pending',
    relationshipStatus: 'partner',
    badgeEnabled: false,
    tagline: 'Daily audio Liturgy of the Hours from DivineOffice.org.',
    description:
      'Divine Office shares audio recordings of the Liturgy of the Hours for people praying the daily office at home, in small groups, or wherever common celebration is not possible.',
    imageUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/72/53/82/72538286-44dc-7e42-b9c0-0c5f06a87534/mza_3045095348242737945.jpg/1200x1200bf-60.jpg',
    accent: 'Daily audio, complete office, guided communal responses',
    prayerRhythm: [
      'Office of Readings',
      'Lauds',
      'Midmorning Prayer',
      'Midday Prayer',
      'Midafternoon Prayer',
      'Vespers',
      'Compline',
    ],
    links: [
      { label: 'Website', href: 'https://divineoffice.org/' },
      {
        label: 'Apple Podcasts',
        href: 'https://podcasts.apple.com/us/podcast/divine-office-liturgy-of-the-hours-of-the/id1615786349',
      },
    ],
    featured: [
      {
        label: 'Today',
        title: 'Daily office audio',
        description:
          'Episodes can be matched to each prayer date and routed into the Listen tab for the relevant hour.',
      },
      {
        label: 'Daytime',
        title: 'Midmorning, Midday, and Midafternoon',
        description:
          'All daytime offices are grouped into the existing Midday Prayer experience for review.',
      },
    ],
  },
  {
    slug: 'worth-abbey',
    name: 'Worth Abbey',
    kind: 'Benedictine monastery',
    location: 'West Sussex, England',
    relationshipStatus: 'verified',
    badgeEnabled: true,
    tagline: 'Monastic prayer from the abbey church.',
    description:
      'Worth Abbey shares livestreamed offices and liturgies from a Benedictine community whose daily rhythm is shaped by prayer, work, hospitality, and study.',
    imageUrl:
      'https://yt3.googleusercontent.com/ytc/AIdro_nDVgAvWHZwb_ynblsEyXIEEU1-No0mhPCHLvkD2ZunFA=s900-c-k-c0x00ffffff-no-rj',
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
    slug: 'cathaholic-music',
    name: 'Cathaholic Music',
    kind: 'Creator ministry',
    location: 'Online',
    relationshipStatus: 'verified',
    badgeEnabled: true,
    tagline: 'Sung Lauds and Vespers with visual prayer guides.',
    description:
      'Cathaholic Music creates chant-forward prayer videos that pair the daily office with clear on-screen structure for people praying at home.',
    imageUrl:
      'https://yt3.googleusercontent.com/gnRvpLHI4h1DWvbRsssdE14PIKIUMy6afiLpMxqJRK8gBo3CD-YS925FAFwywN_62bB5ARtnL3U=s900-c-k-c0x00ffffff-no-rj',
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
    slug: 'sing-the-hours',
    name: 'Sing the Hours',
    kind: 'Creator ministry',
    location: 'United States / online',
    onboardingStatus: 'pending',
    relationshipStatus: 'curated',
    badgeEnabled: true,
    tagline: 'Daily chanted Lauds and Vespers for praying with the Church.',
    description:
      'Sing the Hours shares chant-led Liturgy of the Hours videos, helping people join the daily rhythm of Morning and Evening Prayer with clear, singable structure.',
    imageUrl:
      'https://yt3.googleusercontent.com/MovqVdp8AFW-7L83SwoxAGf50Y_F9OTSdSyitDCZ-pEvBBMfy-uV27X3o6eKlnszI5weOkxO4Q=s900-c-k-c0x00ffffff-no-rj',
    accent: 'Chanted office, English and Latin, daily Lauds and Vespers',
    prayerRhythm: ['Lauds', 'Vespers'],
    links: [
      { label: 'Website', href: 'https://singthehours.org/' },
      {
        label: 'YouTube channel',
        href: 'https://www.youtube.com/@SingtheHours/videos',
      },
    ],
    featured: [
      {
        label: 'Today',
        title: 'Lauds',
        description:
          'Morning Prayer videos can be matched from the channel feed by Lauds and Morning Prayer titles.',
      },
      {
        label: 'Today',
        title: 'Vespers',
        description:
          'Evening Prayer videos can be reviewed for the Watch tab when Vespers is available.',
      },
    ],
  },
  {
    slug: 'cantor-del-camino',
    name: 'Cantor del Camino',
    kind: 'Creator ministry',
    location: 'Spain / online',
    relationshipStatus: 'partner',
    badgeEnabled: true,
    tagline: 'Spanish sung offices for daily prayer.',
    description:
      'Cantor del Camino shares Spanish-language Liturgy of the Hours videos, with titles that identify Lauds, Nona, and Vespers for daily discovery.',
    imageUrl:
      'https://yt3.googleusercontent.com/4v52x8EmtPZMYbLgeZQP5fARpbZSC55GDjUG_WCI4vjifyMy7K71cZ3aKBpL9u31_2n_H0qILYE=s900-c-k-c0x00ffffff-no-rj',
    accent: 'Spanish prayer, daily Lauds, Nona, Vespers',
    prayerRhythm: ['Lauds', 'Nona', 'Vespers'],
    links: [
      { label: 'Website', href: 'https://cantordelcamino.com/' },
      {
        label: 'YouTube channel',
        href: 'https://www.youtube.com/@CantorDelCamino',
      },
    ],
    featured: [
      {
        label: 'Today',
        title: 'Laudes de hoy',
        description:
          'Daily Lauds videos can be matched from the channel feed by title.',
      },
      {
        label: 'Daytime',
        title: 'Nona',
        description:
          'Nona videos are approved into the existing daytime prayer bucket until a distinct None/Nona video type exists.',
      },
    ],
  },
  {
    slug: 'padre-didier',
    name: 'Virtual Padre Didier',
    kind: 'Creator ministry',
    location: 'Spanish-language / online',
    relationshipStatus: 'partner',
    badgeEnabled: true,
    tagline: 'Spanish daily offices with Lauds, Vespers, and Compline.',
    description:
      'Virtual Padre Didier shares Spanish-language Liturgy of the Hours videos, with daily Lauds, Vespers, and Compline titled for discovery.',
    imageUrl:
      'https://yt3.googleusercontent.com/ytc/AIdro_m_4yAvVJF4QXa6umERwMDjJ31oCbQJBfAGue3bEidwEXc=s900-c-k-c0x00ffffff-no-rj',
    accent: 'Spanish prayer, daily Lauds, Vespers, Compline',
    prayerRhythm: ['Lauds', 'Vespers', 'Compline'],
    links: [
      {
        label: 'YouTube channel',
        href: 'https://www.youtube.com/@padreDidier',
      },
    ],
    featured: [
      {
        label: 'Today',
        title: 'Laudes de hoy',
        description:
          'Daily Lauds videos can be matched from the channel feed by Spanish office titles.',
      },
      {
        label: 'Night',
        title: 'Completas de hoy',
        description:
          'Compline videos are approved into the Night Prayer watch experience.',
      },
    ],
  },
  {
    slug: 'ridgehaven-priory',
    name: 'Ridgehaven Priory',
    kind: 'Mock prayer community',
    location: 'Fictional',
    relationshipStatus: 'mock',
    badgeEnabled: true,
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
    relationshipStatus: 'mock',
    badgeEnabled: true,
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
    relationshipStatus: 'mock',
    badgeEnabled: true,
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
    relationshipStatus: 'mock',
    badgeEnabled: true,
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
    relationshipStatus: 'mock',
    badgeEnabled: true,
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

function isManagedPartnerCommunity(community: PartnerCommunity) {
  return community.relationshipStatus !== 'mock';
}

function isPartnerCommunityPublished(
  community: PartnerCommunity,
  overrides?: PartnerCommunityStatusOverrides,
) {
  if (!isManagedPartnerCommunity(community)) {
    return true;
  }

  if (!overrides) {
    return community.onboardingStatus === 'pending'
      ? showPendingPartnerCommunities
      : true;
  }

  return (
    overrides[community.slug]?.communityPageEnabled === true ||
    (community.onboardingStatus === 'pending' && showPendingPartnerCommunities)
  );
}

const COMMUNITY_ALIASES: Record<string, PartnerCommunitySlug> = {
  'cantor del camino': 'cantor-del-camino',
  'cathaholic music': 'cathaholic-music',
  'cathoholic music': 'cathaholic-music',
  'divine office': 'divine-office',
  'divine office (divineoffice.org)': 'divine-office',
  'padre didier': 'padre-didier',
  'sing the hours': 'sing-the-hours',
  'virtual padre didier': 'padre-didier',
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

const BADGE_META: Record<
  PartnerBadgeStatus,
  { label: string; description: string }
> = {
  curated: {
    label: 'Curated',
    description: 'Curated — We independently recommend this ministry.',
  },
  verified: {
    label: 'Verified',
    description: 'Verified — The ministry has reviewed or claimed its page.',
  },
  partner: {
    label: 'Partner',
    description: "Partner — We're actively collaborating.",
  },
  mock: {
    label: 'Mock',
    description: 'Mock — Prototype listing for design and testing.',
  },
};

export function communityPath(slug: PartnerCommunitySlug | string) {
  return `/community/${slug}`;
}

function applyPartnerCommunityOverride(
  community: PartnerCommunity,
  overrides?: PartnerCommunityStatusOverrides,
) {
  const override = overrides?.[community.slug];

  if (!override) {
    return community;
  }

  return {
    ...community,
    relationshipStatus: override.relationshipStatus,
    badgeEnabled: override.badgeEnabled,
  };
}

export function listPartnerCommunities(
  overrides?: PartnerCommunityStatusOverrides,
) {
  return PARTNER_COMMUNITIES
    .filter((community) => isPartnerCommunityPublished(community, overrides))
    .map((community) => applyPartnerCommunityOverride(community, overrides));
}

export function getPartnerCommunity(
  slug: string | null | undefined,
  overrides?: PartnerCommunityStatusOverrides,
) {
  if (!slug) {
    return null;
  }

  const community = COMMUNITY_BY_SLUG.get(slug as PartnerCommunitySlug);
  return community && isPartnerCommunityPublished(community, overrides)
    ? applyPartnerCommunityOverride(community, overrides)
    : null;
}

export function communityForName(
  name: string,
  overrides?: PartnerCommunityStatusOverrides,
) {
  const community = COMMUNITY_BY_SLUG.get(
    COMMUNITY_ALIASES[name.trim().toLowerCase()],
  );
  return community && isPartnerCommunityPublished(community, overrides)
    ? applyPartnerCommunityOverride(community, overrides)
    : null;
}

export function getPartnerBadgeMeta(status: PartnerBadgeStatus) {
  return BADGE_META[status];
}
