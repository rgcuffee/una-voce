import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  PRIMARY_NAV,
  pathForView,
  type ViewKey,
  viewForPath,
} from '../navigation';
import {
  communityForName,
  communityPath,
  getPartnerCommunity,
  type PartnerBadgeStatus,
  type PartnerCommunityStatusOverrides,
  type PartnerCommunitySlug,
} from '../data/partnerCommunities';
import { getLiturgicalDayWithHours } from '../lib/liturgicalCalendar';
import { supabase } from '../lib/supabase';
import { AboutPage } from '../pages/AboutPage';
import {
  CommunityPage,
  type CommunityPrayerCard,
} from '../pages/CommunityPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { GettingStartedPage } from '../pages/GettingStartedPage';
import { MorePage } from '../pages/MorePage';
import { NavIcon } from './NavIcon';
import { PartnerBadge } from './PartnerBadge';
import {
  PrayerPlayerPanel,
  type PrayerPlayerSession,
  type PrayerPlayerSourceType,
} from './PrayerPlayerPanel';
import { EveningPrayer } from './prayers/EveningPrayer';
import { MidafternoonPrayer } from './prayers/MidafternoonPrayer';
import { MiddayPrayer } from './prayers/MiddayPrayer';
import { MidmorningPrayer } from './prayers/MidmorningPrayer';
import { MorningPrayer } from './prayers/MorningPrayer';
import { NightPrayer } from './prayers/NightPrayer';
import { OfficeOfReadingsPrayer } from './prayers/OfficeOfReadingsPrayer';

const ONRAMP_DISMISS_KEY = 'una-voce-onramp-dismissed';

type FormatKey = 'text' | 'audio' | 'video' | 'live';

type LiturgyBlock = {
  variant: 'rubric' | 'speaker' | 'verse' | 'prayer' | 'reading';
  speaker?: string;
  citation?: string;
  lines: string[];
};

type LiturgySection = {
  label: string;
  title: string;
  citation?: string;
  blocks: LiturgyBlock[];
};

type OptionItem = {
  meta: string;
  title: string;
  description: string;
  time?: string;
  source?: 'mock' | 'partner';
  imageUrl?: string;
  videoId?: string;
  sourceUrl?: string;
  embedUrl?: string;
  provider?: 'youtube' | 'spotify';
  communitySlug?: PartnerCommunitySlug;
  liveStartAt?: string | null;
  liveEndAt?: string | null;
  isLiveNow?: boolean;
};

type PartnerPrayerVideoType =
  | 'lauds'
  | 'midday_prayer'
  | 'vespers'
  | 'compline';

type PartnerPrayerVideo = {
  partnerName: string;
  partnerSlug: string;
  prayerType: PartnerPrayerVideoType | null;
  prayerDate: string;
  title: string;
  displayTitle: string;
  description: string | null;
  youtubeVideoId: string;
  thumbnailUrl: string;
  canonicalUrl: string;
  embedUrl: string;
  publishedAt: string;
  scheduledStartAt: string | null;
};

type PartnerPrayerAudioType =
  | 'lauds'
  | 'midday_prayer'
  | 'vespers'
  | 'compline';

type PartnerPrayerAudio = {
  partnerName: string;
  partnerSlug: string;
  prayerType: PartnerPrayerAudioType | null;
  prayerDate: string;
  title: string;
  displayTitle: string;
  description: string | null;
  spotifyEpisodeId: string | null;
  imageUrl: string | null;
  canonicalUrl: string;
  embedUrl: string;
  publishedAt: string;
  durationSeconds: number | null;
};

type WorthAbbeyPrayerType =
  | 'office_of_readings'
  | 'lauds'
  | 'midday_prayer'
  | 'vespers'
  | 'compline';

type WorthAbbeyVideo = {
  partnerName: string;
  prayerType: WorthAbbeyPrayerType | null;
  prayerDate: string | null;
  title: string;
  displayTitle: string;
  description: string | null;
  youtubeVideoId: string;
  thumbnailUrl: string;
  canonicalUrl: string;
  embedUrl: string;
  publishedAt: string;
  scheduledStartAt: string | null;
  liveStartAt: string | null;
  liveEndAt: string | null;
  isLiveNow: boolean;
};

type Segment = {
  id: string;
  title: string;
  text: LiturgySection[];
  audio: OptionItem[];
  video: OptionItem[];
  live: {
    title: string;
    items: OptionItem[];
  }[];
};

type SidebarLeaf = {
  title: string;
  subtitle?: string;
  segmentId: string;
};

type SidebarGroup = {
  title: string;
  children: SidebarLeaf[];
};

type SidebarEntry = SidebarLeaf | SidebarGroup;

const SEGMENTS: Segment[] = [
  {
    id: 'segment-morning',
    title: 'Morning Prayer',
    text: [
      {
        label: 'Opening',
        title: 'Opening Sentence',
        citation: 'Psalm 122:1',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'I rose with gladness when the faithful called me toward the house of God.',
              'Let this day begin with a willing heart and a steady song of praise.',
            ],
          },
        ],
      },
      {
        label: 'Confession',
        title: 'Confession and Absolution',
        blocks: [
          {
            variant: 'rubric',
            lines: [
              'The people are invited to quiet their hearts and confess before beginning the office.',
            ],
          },
          {
            variant: 'prayer',
            lines: [
              'Merciful Father, we have wandered in thought, word, and deed; gather us again into your mercy.',
              'Cleanse what is disordered in us, strengthen what is weak, and set our feet again in the path of peace.',
            ],
          },
        ],
      },
      {
        label: 'Preces',
        title: 'Opening Versicles',
        blocks: [
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['O Lord, open our lips.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['And our mouth shall proclaim your praise.'],
          },
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['O God, make speed to save us.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['O Lord, make haste to help us.'],
          },
        ],
      },
      {
        label: 'Psalm',
        title: 'Psalm 118',
        citation: 'Appointed for today',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'Give thanks to the Lord, for his mercy does not fail and his steadfastness does not grow old.',
              'The stone once set aside is raised up in honor, and what God establishes becomes joy for his people.',
            ],
          },
          {
            variant: 'verse',
            lines: [
              'This is the day entrusted to us; we receive it with gratitude and ask for grace to walk it well.',
              'Open to us the gates of righteousness, that praise may shape both our prayers and our labor.',
            ],
          },
        ],
      },
      {
        label: 'Lessons',
        title: 'Readings and Canticles',
        citation: 'Judges 5 · I Thessalonians 1',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'Deborah’s song recalls the God who rides into history, overturns fear, and gives courage to the fainthearted.',
              'Paul gives thanks for a church marked by work born of faith, labor shaped by love, and endurance carried by hope.',
            ],
          },
          {
            variant: 'verse',
            lines: [
              'We praise you, O God; the morning itself becomes a witness to your faithfulness.',
              'Blessed be the Lord, the God of Israel, who visits his people and sets them free.',
            ],
          },
        ],
      },
      {
        label: 'Prayers',
        title: 'Collects and Dismissal',
        blocks: [
          {
            variant: 'prayer',
            lines: [
              'Lord of all power and might, graft in us the love of your Name and let the fruit of this day be charity, patience, and truth.',
              'Send us into the world with clear consciences, disciplined hearts, and compassion ready at hand.',
            ],
          },
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['Let us bless the Lord.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['Thanks be to God.'],
          },
        ],
      },
    ],
    audio: [
      {
        meta: 'Podcast',
        title: 'Una Voce Daily Office Audio',
        description:
          'Straight-through narrated Morning Prayer with psalm pauses for personal response.',
      },
      {
        meta: 'Guided Audio',
        title: 'Psalm and Laurel',
        description:
          'Guided Prayer with clear verse cues and responsive pauses for personal reflection.',
      },
    ],
    video: [
      {
        meta: 'Guided Video · Lauds',
        title: 'The Little Oratory',
        description:
          'Guided video office with verse overlays and clear transitions through each section.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Mock Community Live',
            title: 'Ridgehaven Priory - Morning Office',
            description:
              'Live chapel stream with shared responses and final blessing.',
            time: '6:00 AM',
          },
          {
            meta: 'Community Live · Lauds',
            title: 'The Little Oratory - Morning Prayer Together',
            description:
              'Interactive live session with opening hymn and guided pace.',
            time: '6:30 AM',
          },
        ],
      },
    ],
  },
  {
    id: 'segment-midmorning',
    title: 'Midmorning Prayer',
    text: [
      {
        label: 'Invitatory',
        title: 'Opening Versicles',
        blocks: [
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['O God, make speed to save us.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['O Lord, make haste to help us.'],
          },
          {
            variant: 'rubric',
            lines: [
              'The midmorning office steadies the day as work begins to gather.',
            ],
          },
        ],
      },
      {
        label: 'Psalm',
        title: 'Psalms Appointed',
        citation: 'Psalm 119:105-112 · 121 · 124 · 126',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'Your word remains a lantern in the morning hours; teach us to walk by its brightness.',
              'Our help comes from the Maker of heaven and earth, not from the noise and weight of the passing hour.',
            ],
          },
          {
            variant: 'verse',
            lines: [
              'Had the Lord not stood beside us, we would have been carried away; yet he breaks the snare and steadies our feet.',
              'Those who sow in tears shall return with songs, bearing a harvest they could not have imagined at the start.',
            ],
          },
        ],
      },
      {
        label: 'Reading',
        title: 'John 12:31-32',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'The Cross stands at the center of the day: judgment is exposed there, and mercy draws the world toward Christ.',
              'At the hour of labor and fatigue, the lifted Lord gathers what is scattered and recalls us to his love.',
            ],
          },
        ],
      },
      {
        label: 'Prayer',
        title: 'The Prayers',
        blocks: [
          {
            variant: 'prayer',
            lines: [
              'Lord, have mercy upon us. Christ, have mercy upon us. Lord, have mercy upon us.',
              'Blessed Savior, at this hour stretch your mercy over the nations, the weary, the distracted, and the wounded.',
              'Pour your grace into our hearts so that the remainder of this day may be obedient, clear, and fruitful.',
            ],
          },
        ],
      },
    ],
    audio: [
      {
        meta: 'Podcast',
        title: 'Midmorning Office Daily Audio',
        description:
          'Compact narrated Midmorning Prayer with one-tap continuous playback.',
      },
      {
        meta: 'Abbey Feed',
        title: 'Cedarwell Abbey Midmorning Office',
        description:
          'Abbey-recorded Midmorning prayer with concise psalm pacing.',
      },
    ],
    video: [
      {
        meta: 'Content Creator',
        title: 'The Little Oratory',
        description:
          'Short visual Midmorning office with subtitle prompts and segment markers.',
      },
      {
        meta: 'Content Creator',
        title: 'Psalm and Laurel',
        description:
          'Midmorning prayer video with psalm captions and guided cue cards.',
      },
      {
        meta: 'Mock Abbey',
        title: 'Sisters of Dawnfield Midmorning Video',
        description:
          'Convent-led Midmorning Prayer video archive with visible response pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Riverbend Abbey Midmorning Video Office',
        description:
          'Midmorning liturgical video from abbey choir stalls with clear psalm sequence.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Mock Community Live',
            title: 'Ridgehaven Priory - Midmorning Office',
            description:
              'Live Midmorning office stream for daytime pause and prayer.',
            time: '9:00 AM',
          },
          {
            meta: 'Creator Live',
            title: 'Psalm and Laurel - Midmorning Prayer Live',
            description:
              'Live guided Midmorning prayer with text prompts on screen.',
            time: '9:20 AM',
          },
        ],
      },
      {
        title: 'Previous Streams',
        items: [
          {
            meta: 'Archived Live',
            title: 'Cedarwell Abbey - Midmorning Replay',
            description:
              'Recorded replay of the full Midmorning liturgy stream.',
            time: 'Earlier today, 9:00 AM',
          },
        ],
      },
    ],
  },
  {
    id: 'segment-midday',
    title: 'Midday Prayer',
    text: [
      {
        label: 'Invitatory',
        title: 'Opening Versicles',
        blocks: [
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['O God, make speed to save us.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['O Lord, make haste to help us.'],
          },
          {
            variant: 'rubric',
            lines: [
              'The midday office pauses the day without breaking its momentum.',
            ],
          },
        ],
      },
      {
        label: 'Psalm',
        title: 'Psalms Appointed',
        citation: 'Psalm 119:105-112 · 121 · 124 · 126',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'Your word remains a lantern at noon as surely as it was at dawn; teach us to walk by its brightness.',
              'Our help comes from the Maker of heaven and earth, not from the noise and weight of the passing hour.',
            ],
          },
          {
            variant: 'verse',
            lines: [
              'Had the Lord not stood beside us, we would have been carried away; yet he breaks the snare and steadies our feet.',
              'Those who sow in tears shall return with songs, bearing a harvest they could not have imagined at the start.',
            ],
          },
        ],
      },
      {
        label: 'Reading',
        title: 'John 12:31-32',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'The Cross stands at the center of the day: judgment is exposed there, and mercy draws the world toward Christ.',
              'At the hour of labor and fatigue, the lifted Lord gathers what is scattered and recalls us to his love.',
            ],
          },
        ],
      },
      {
        label: 'Prayer',
        title: 'The Prayers',
        blocks: [
          {
            variant: 'prayer',
            lines: [
              'Lord, have mercy upon us. Christ, have mercy upon us. Lord, have mercy upon us.',
              'Blessed Savior, at this hour stretch your mercy over the nations, the weary, the distracted, and the wounded.',
              'Pour your grace into our hearts so that the remainder of this day may be obedient, clear, and fruitful.',
            ],
          },
        ],
      },
    ],
    audio: [
      {
        meta: 'Podcast',
        title: 'Midday Office Daily Audio',
        description:
          'Compact narrated Midday Prayer with one-tap continuous playback.',
      },
      {
        meta: 'Abbey Feed',
        title: 'Cedarwell Abbey Midday Office',
        description: 'Abbey-recorded Midday prayer with concise psalm pacing.',
      },
    ],
    video: [
      {
        meta: 'Content Creator',
        title: 'The Little Oratory',
        description:
          'Short visual Midday office with subtitle prompts and segment markers.',
      },
      {
        meta: 'Content Creator',
        title: 'Psalm and Laurel',
        description:
          'Midday prayer video with psalm captions and guided cue cards.',
      },
      {
        meta: 'Mock Abbey',
        title: 'Sisters of Dawnfield Midday Video',
        description:
          'Convent-led Midday Prayer video archive with visible response pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Riverbend Abbey Noonday Video Office',
        description:
          'Noonday liturgical video from abbey choir stalls with clear psalm sequence.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Mock Community Live',
            title: 'Ridgehaven Priory - Midday Office',
            description:
              'Live Midday office stream for daytime pause and prayer.',
            time: '12:00 PM',
          },
          {
            meta: 'Creator Live',
            title: 'Psalm and Laurel - Midday Prayer Live',
            description:
              'Live guided Midday prayer with text prompts on screen.',
            time: '12:20 PM',
          },
        ],
      },
      {
        title: 'Previous Streams',
        items: [
          {
            meta: 'Archived Live',
            title: 'Cedarwell Abbey - Midday Replay',
            description: 'Recorded replay of the full Midday liturgy stream.',
            time: 'Earlier today, 12:00 PM',
          },
        ],
      },
    ],
  },
  {
    id: 'segment-midafternoon',
    title: 'Midafternoon Prayer',
    text: [
      {
        label: 'Invitatory',
        title: 'Opening Versicles',
        blocks: [
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['O God, make speed to save us.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['O Lord, make haste to help us.'],
          },
          {
            variant: 'rubric',
            lines: [
              'The midafternoon office gathers the scattered hours and steadies what remains of the workday.',
            ],
          },
        ],
      },
      {
        label: 'Psalm',
        title: 'Psalms Appointed',
        citation: 'Psalm 119:105-112 · 121 · 124 · 126',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'Your word remains a lantern in the afternoon; teach us to walk by its brightness.',
              'Our help comes from the Maker of heaven and earth, not from the noise and weight of the passing hour.',
            ],
          },
          {
            variant: 'verse',
            lines: [
              'Had the Lord not stood beside us, we would have been carried away; yet he breaks the snare and steadies our feet.',
              'Those who sow in tears shall return with songs, bearing a harvest they could not have imagined at the start.',
            ],
          },
        ],
      },
      {
        label: 'Reading',
        title: 'John 12:31-32',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'The Cross stands at the center of the day: judgment is exposed there, and mercy draws the world toward Christ.',
              'At the hour of labor and fatigue, the lifted Lord gathers what is scattered and recalls us to his love.',
            ],
          },
        ],
      },
      {
        label: 'Prayer',
        title: 'The Prayers',
        blocks: [
          {
            variant: 'prayer',
            lines: [
              'Lord, have mercy upon us. Christ, have mercy upon us. Lord, have mercy upon us.',
              'Blessed Savior, at this hour stretch your mercy over the nations, the weary, the distracted, and the wounded.',
              'Pour your grace into our hearts so that the remainder of this day may be obedient, clear, and fruitful.',
            ],
          },
        ],
      },
    ],
    audio: [
      {
        meta: 'Podcast',
        title: 'Midafternoon Office Daily Audio',
        description:
          'Compact narrated Midafternoon Prayer with one-tap continuous playback.',
      },
      {
        meta: 'Abbey Feed',
        title: 'Cedarwell Abbey Midafternoon Office',
        description:
          'Abbey-recorded Midafternoon prayer with concise psalm pacing.',
      },
    ],
    video: [
      {
        meta: 'Content Creator',
        title: 'The Little Oratory',
        description:
          'Short visual Midafternoon office with subtitle prompts and segment markers.',
      },
      {
        meta: 'Content Creator',
        title: 'Psalm and Laurel',
        description:
          'Midafternoon prayer video with psalm captions and guided cue cards.',
      },
      {
        meta: 'Mock Abbey',
        title: 'Sisters of Dawnfield Midafternoon Video',
        description:
          'Convent-led Midafternoon Prayer video archive with visible response pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Riverbend Abbey Midafternoon Video Office',
        description:
          'Midafternoon liturgical video from abbey choir stalls with clear psalm sequence.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Mock Community Live',
            title: 'Ridgehaven Priory - Midafternoon Office',
            description:
              'Live Midafternoon office stream for daytime pause and prayer.',
            time: '3:00 PM',
          },
          {
            meta: 'Creator Live',
            title: 'Psalm and Laurel - Midafternoon Prayer Live',
            description:
              'Live guided Midafternoon prayer with text prompts on screen.',
            time: '3:20 PM',
          },
        ],
      },
      {
        title: 'Previous Streams',
        items: [
          {
            meta: 'Archived Live',
            title: 'Cedarwell Abbey - Midafternoon Replay',
            description:
              'Recorded replay of the full Midafternoon liturgy stream.',
            time: 'Earlier today, 3:00 PM',
          },
        ],
      },
    ],
  },
  {
    id: 'segment-evening',
    title: 'Evening Prayer',
    text: [
      {
        label: 'Opening',
        title: 'Opening Sentence',
        citation: 'John 8:12',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'As the light declines, Christ remains the lamp that does not fail.',
              'Whoever follows him will not be abandoned to the darkening day but will be led into life.',
            ],
          },
        ],
      },
      {
        label: 'Psalmody',
        title: 'The Psalms Appointed',
        citation: 'Psalms 120 and 121',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'In trouble we called, and the Lord answered; he teaches our restless tongues to seek peace instead of strife.',
              'We lift our eyes beyond the hills because our help comes from the Lord, who neither slumbers nor withdraws.',
            ],
          },
          {
            variant: 'verse',
            lines: [
              'He preserves our going out and our coming in, the work already finished and the burdens we still carry home.',
            ],
          },
        ],
      },
      {
        label: 'Lesson',
        title: 'The First Lesson',
        citation: 'Daniel 1',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'Daniel and his companions keep faith in a foreign court, refusing to let pressure define their worship.',
              'The evening lesson leaves the Church with a pattern of quiet resolve, discipline, and trust in the Lord’s favor.',
            ],
          },
        ],
      },
      {
        label: 'Canticle',
        title: 'Magnificat',
        citation: 'Luke 1:46-55',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'My soul magnifies the Lord, and my spirit rejoices in God my Savior.',
              'He fills the hungry with good things, remembers mercy, and lifts the lowly into song.',
            ],
          },
        ],
      },
      {
        label: 'Second Lesson',
        title: 'Acts 19:8-20',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'Paul’s witness in Ephesus shows the gospel pressing against fear, superstition, and hardened unbelief.',
              'The word of the Lord increases not by spectacle alone, but by steady proclamation and lives made new.',
            ],
          },
        ],
      },
      {
        label: 'Close',
        title: 'Nunc Dimittis and Dismissal',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'Lord, now let your servant depart in peace, for your salvation has been made known before all peoples.',
            ],
          },
          {
            variant: 'prayer',
            lines: [
              'Grant us a peaceful evening, a guarded night, and hearts prepared for whatever obedience tomorrow requires.',
            ],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['Thanks be to God.'],
          },
        ],
      },
    ],
    audio: [
      {
        meta: 'Podcast',
        title: 'Vespers Daily Audio Office',
        description:
          'Evening office audio with paced psalm responses and intercessions.',
      },
      {
        meta: 'Abbey Feed',
        title: 'Cedarwell Abbey Vespers Audio',
        description:
          'Monastic evening audio feed with complete Magnificat sequence.',
      },
    ],
    video: [
      {
        meta: 'Content Creator',
        title: 'The Little Oratory',
        description:
          'Evening video prayer with on-screen text and guided responses.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Abbey Live',
            title: 'Cedarwell Abbey - Vespers',
            description:
              'Live evening office with Magnificat and intercessions.',
            time: '6:00 PM',
          },
          {
            meta: 'Creator Live',
            title: 'The Little Oratory - Evening Prayer Live',
            description: 'Live guided Vespers stream with visible prayer text.',
            time: '6:25 PM',
          },
        ],
      },
    ],
  },
  {
    id: 'segment-night',
    title: 'Night Prayer',
    text: [
      {
        label: 'Opening',
        title: 'Opening Sentence',
        blocks: [
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: [
              'The Lord Almighty grant us a peaceful night and a perfect end.',
            ],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['Amen.'],
          },
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['Our help is in the Name of the Lord.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['The maker of heaven and earth.'],
          },
        ],
      },
      {
        label: 'Psalms',
        title: 'The Psalms',
        citation: 'Psalms 4 · 31:1-6 · 91 · 134',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'You have set a quieter gladness in the heart than any feast or increase could offer.',
              'Into your hands we commend our spirits, trusting the faithfulness that does not sleep.',
            ],
          },
          {
            variant: 'verse',
            lines: [
              'Under the shadow of the Most High, fear loosens its grip and the soul learns again to rest.',
              'All who stand by night in the house of the Lord answer the dark with blessing.',
            ],
          },
        ],
      },
      {
        label: 'Reading',
        title: 'The Reading',
        citation: 'Jeremiah 14:9',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'You are in the midst of your people, O Lord; do not leave us to our own devices in the night watches.',
            ],
          },
        ],
      },
      {
        label: 'Prayer',
        title: 'The Prayers',
        blocks: [
          {
            variant: 'prayer',
            lines: [
              'Be present, merciful God, with those who labor, those who keep vigil, and those whose grief keeps sleep away.',
              'Guard the sick, strengthen the tired, comfort the afraid, and let your peace settle gently over every room.',
            ],
          },
        ],
      },
      {
        label: 'Canticle',
        title: 'Nunc Dimittis',
        blocks: [
          {
            variant: 'rubric',
            lines: ['The Song of Simeon is said with the night antiphon.'],
          },
          {
            variant: 'verse',
            lines: [
              'Guide us waking, O Lord, and guard us sleeping, that awake we may watch with Christ and asleep we may rest in peace.',
              'Lord, now let your servant depart in peace according to your word.',
            ],
          },
        ],
      },
      {
        label: 'Dismissal',
        title: 'The Dismissal',
        blocks: [
          {
            variant: 'speaker',
            speaker: 'Officiant',
            lines: ['Let us bless the Lord.'],
          },
          {
            variant: 'speaker',
            speaker: 'People',
            lines: ['Thanks be to God.'],
          },
          {
            variant: 'prayer',
            lines: [
              'The almighty and merciful Lord, Father, Son, and Holy Spirit, bless us and keep us, this night and evermore.',
            ],
          },
        ],
      },
    ],
    audio: [
      {
        meta: 'Podcast',
        title: 'Compline Daily Audio',
        description:
          'Night prayer narration with soft pacing and complete concluding prayer.',
      },
      {
        meta: 'Abbey Feed',
        title: 'Cedarwell Abbey Compline Audio',
        description: 'Abbey night office audio with psalm and Marian antiphon.',
      },
    ],
    video: [
      {
        meta: 'Content Creator',
        title: 'The Little Oratory',
        description:
          'Night prayer video with gentle pacing and readable line-by-line text.',
      },
      {
        meta: 'Content Creator',
        title: 'Psalm and Laurel',
        description:
          'Compline video session with responsive captions and chapter timestamps.',
      },
      {
        meta: 'Mock Abbey',
        title: 'Sisters of Dawnfield Compline Video',
        description:
          'Convent chapel Compline video with closing Marian antiphon and silence.',
      },
      {
        meta: 'Abbey',
        title: 'Riverbend Abbey Night Office Video',
        description:
          'Night Office video archive with fixed camera and complete prayer structure.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Mock Community Live',
            title: 'Sisters of Dawnfield - Compline',
            description: 'Live night office stream with final Marian antiphon.',
            time: '9:00 PM',
          },
          {
            meta: 'Creator Live',
            title: 'Psalm and Laurel - Night Prayer Live',
            description: 'Live guided Compline with on-screen response lines.',
            time: '9:20 PM',
          },
        ],
      },
      {
        title: 'Previous Streams',
        items: [
          {
            meta: 'Archived Live',
            title: 'Riverbend Abbey - Compline Replay',
            description: "Archive replay of last night's full Compline stream.",
            time: 'Earlier today, 9:00 PM',
          },
        ],
      },
    ],
  },
  {
    id: 'segment-office',
    title: 'Office of Readings',
    text: [
      {
        label: 'Psalm',
        title: 'Psalm 118',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'This is the day that the Lord has made; the office of readings begins in thanksgiving before it begins in study.',
              'The rejected stone becomes the cornerstone, teaching the reader to expect grace where the world expects loss.',
            ],
          },
        ],
      },
      {
        label: 'First Lesson',
        title: 'Judges 5',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'The song of Deborah remembers a God who shakes mountains, summons courage, and brings deliverance through unlikely servants.',
              'Its final note is not noise but rest: the land is given peace after long fear.',
            ],
          },
        ],
      },
      {
        label: 'Second Lesson',
        title: 'I Thessalonians 1',
        blocks: [
          {
            variant: 'reading',
            lines: [
              'Paul commends a church whose faith has become visible in work, endurance, and joyful witness amid affliction.',
              'The lesson presses the reader toward conversion that is not private only, but audible and public.',
            ],
          },
        ],
      },
      {
        label: 'Canticle',
        title: 'Te Deum and Benedictus',
        blocks: [
          {
            variant: 'verse',
            lines: [
              'We praise you, O God; all creation is gathered into one long hymn around your throne.',
              'In the tender compassion of our God, the dawn from on high breaks upon the patient soul.',
            ],
          },
        ],
      },
      {
        label: 'Prayer',
        title: 'The Apostles’ Creed and Collects',
        blocks: [
          {
            variant: 'prayer',
            lines: [
              'I believe in God, the Father almighty, creator of heaven and earth; let that confession steady both thought and memory.',
              'Grant us, O Lord, to read with humility, to receive with faith, and to live what we have learned in peace.',
            ],
          },
        ],
      },
    ],
    audio: [
      {
        meta: 'Podcast',
        title: 'Office of Readings Audio Cycle',
        description:
          'Narrated scripture and patristic readings in continuous audio.',
      },
      {
        meta: 'Abbey Feed',
        title: 'Cedarwell Abbey Readings Audio',
        description: 'Abbey lector recording with clearly segmented readings.',
      },
    ],
    video: [
      {
        meta: 'Content Creator',
        title: 'The Little Oratory',
        description:
          'Video readings with scripture overlays and guided response markers.',
      },
      {
        meta: 'Content Creator',
        title: 'Psalm and Laurel',
        description:
          'Visual readings format with chapter markers and reflection pauses.',
      },
      {
        meta: 'Mock Abbey',
        title: 'Ridgehaven Priory Readings Video',
        description:
          'Monastic reading office video with responsory transitions and quiet pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Cedarwell Abbey Readings Broadcast',
        description:
          'Abbey video session for readings with clear section markers and scripture cues.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Abbey Live',
            title: 'Cedarwell Abbey - Office of Readings',
            description:
              'Live reading office stream with responsory transitions.',
            time: '5:30 AM',
          },
          {
            meta: 'Creator Live',
            title: 'Fr. Nathaniel Reads - Dawn Readings Live',
            description:
              'Live guided reading office with short reflection pauses.',
            time: '6:10 AM',
          },
        ],
      },
    ],
  },
];

const SEGMENT_SUBTITLES: Record<string, string> = {
  'segment-office': 'Matins',
  'segment-morning': 'Lauds',
  'segment-midmorning': 'Terce',
  'segment-midday': 'Terce | Sext | None',
  'segment-midafternoon': 'None',
  'segment-evening': 'Vespers',
  'segment-night': 'Compline',
};

const MOBILE_SEGMENT_ORDER = [
  'segment-office',
  'segment-morning',
  'segment-midday',
  'segment-evening',
  'segment-night',
];

const SIDEBAR_ITEMS: SidebarEntry[] = [
  {
    title: 'Office of Readings',
    subtitle: 'Matins',
    segmentId: 'segment-office',
  },
  {
    title: 'Morning Prayer',
    subtitle: 'Lauds',
    segmentId: 'segment-morning',
  },
  {
    title: 'Daytime Prayer',
    children: [
      {
        title: 'Midday',
        subtitle: 'Terce | Sext | None',
        segmentId: 'segment-midday',
      },
    ],
  },
  {
    title: 'Evening Prayer',
    subtitle: 'Vespers',
    segmentId: 'segment-evening',
  },
  {
    title: 'Night Prayer',
    subtitle: 'Compline',
    segmentId: 'segment-night',
  },
];

const FORMATS: {
  key: FormatKey;
  label: string;
  description: string;
  icon: string;
  className: string;
}[] = [
  {
    key: 'text',
    label: 'Text',
    description: 'Read the appointed psalms, readings, and prayers.',
    icon: 'Aa',
    className: 'text',
  },
  {
    key: 'audio',
    label: 'Audio',
    description: 'Listen and pray along wherever the day finds you.',
    icon: '♪',
    className: 'audio',
  },
  {
    key: 'video',
    label: 'Video',
    description: 'Follow sung and spoken offices from partner communities.',
    icon: '▶',
    className: 'video',
  },
  {
    key: 'live',
    label: 'Community',
    description: 'Join the Hours as they are prayed in real time.',
    icon: '✦',
    className: 'live',
  },
];

const OPTION_IMAGES: Record<'audio' | 'video' | 'live', string[]> = {
  audio: [
    'https://images.unsplash.com/photo-1524678714210-9917a6c619c2?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1516280030429-27679b3dc9cf?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1400&q=80',
  ],
  video: [
    'https://images.unsplash.com/photo-1731258941332-844ae3f8618d?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1597839977601-52b29c114af5?q=80&w=2054&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1731258940964-c0a2c18a0fb1?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  ],
  live: [
    'https://plus.unsplash.com/premium_photo-1679051422153-2ea3c8cfe9ed?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=1400&q=80',
  ],
};

const NAV_ITEMS = PRIMARY_NAV;

const MOCK_YOUTUBE_VIDEO_ID = 'M7lc1UVf-VE';
const DEFAULT_CALENDAR_ID = 'us';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function titleCase(format: FormatKey) {
  const labels: Record<FormatKey, string> = {
    text: 'Text',
    audio: 'Audio',
    video: 'Video',
    live: 'Community',
  };

  return labels[format];
}

function optionImageFor(format: 'audio' | 'video' | 'live', index: number) {
  const images = OPTION_IMAGES[format];
  return images[index % images.length];
}

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function selectedDateFromSearch(search: string) {
  const date = new URLSearchParams(search).get('date');

  return date && DATE_PATTERN.test(date) ? date : localDateString();
}

function formatCivilDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`));
}

function formatPendingDateLabel(date: string) {
  return formatCivilDate(date);
}

function formatLiturgicalDateLabel(
  day: Awaited<ReturnType<typeof getLiturgicalDayWithHours>>,
  date: string,
) {
  if (!day) {
    return formatPendingDateLabel(date);
  }

  return `${formatCivilDate(day.date)} · ${day.display_title}`;
}

function isTodayDate(date: string) {
  return date === localDateString();
}

function sourceNameFromTitle(title: string) {
  return title.split(' - ')[0].replace(/\s+(Video|Recording|Office)$/i, '');
}

type PartnerPrayerVideoRow = {
  title: string;
  description: string | null;
  youtube_video_id: string;
  thumbnail_url: string | null;
  canonical_url: string;
  embed_url: string;
  published_at: string;
  scheduled_start_at: string | null;
  prayer_date: string | null;
  prayer_type: PartnerPrayerVideoType | null;
  partners: { slug: string; name: string } | { slug: string; name: string }[];
};

function displayPartnerPrayerVideoTitle(title: string) {
  const pipeParts = title
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (pipeParts.length > 1) {
    return pipeParts[pipeParts.length - 1];
  }

  return title;
}

function normalizePartnerCommunitySlug(slug: string) {
  if (slug === 'cathoholic-music') {
    return 'cathaholic-music';
  }

  return slug;
}

function normalizePartnerPrayerVideo(row: PartnerPrayerVideoRow) {
  const partner = Array.isArray(row.partners) ? row.partners[0] : row.partners;

  return {
    partnerName: partner?.name ?? 'Partner',
    partnerSlug: normalizePartnerCommunitySlug(partner?.slug ?? ''),
    prayerType: row.prayer_type,
    prayerDate: row.prayer_date ?? '',
    title: row.title,
    displayTitle: displayPartnerPrayerVideoTitle(row.title),
    description: row.description,
    youtubeVideoId: row.youtube_video_id,
    thumbnailUrl:
      row.thumbnail_url ??
      `https://i.ytimg.com/vi/${row.youtube_video_id}/hqdefault.jpg`,
    canonicalUrl: row.canonical_url,
    embedUrl: row.embed_url,
    publishedAt: row.published_at,
    scheduledStartAt: row.scheduled_start_at,
  };
}

type PartnerPrayerAudioRow = {
  title: string;
  description: string | null;
  spotify_episode_id: string | null;
  image_url: string | null;
  canonical_url: string;
  embed_url: string;
  published_at: string;
  prayer_date: string | null;
  prayer_type: PartnerPrayerAudioType | null;
  duration_seconds: number | null;
  partners: { slug: string; name: string } | { slug: string; name: string }[];
};

function displayPartnerPrayerAudioTitle(title: string) {
  return title
    .replace(/\s*\|\s*Cantor del Camino.*$/i, '')
    .replace(/\s*-\s*Cantor del Camino.*$/i, '')
    .trim();
}

function normalizePartnerPrayerAudio(row: PartnerPrayerAudioRow): PartnerPrayerAudio {
  const partner = Array.isArray(row.partners) ? row.partners[0] : row.partners;

  return {
    partnerName: partner?.name ?? 'Partner',
    partnerSlug: normalizePartnerCommunitySlug(partner?.slug ?? ''),
    prayerType: row.prayer_type,
    prayerDate: row.prayer_date ?? '',
    title: row.title,
    displayTitle: displayPartnerPrayerAudioTitle(row.title),
    description: row.description,
    spotifyEpisodeId: row.spotify_episode_id,
    imageUrl: row.image_url,
    canonicalUrl: row.canonical_url,
    embedUrl: row.embed_url,
    publishedAt: row.published_at,
    durationSeconds: row.duration_seconds,
  };
}

const PARTNER_VIDEO_PRAYER_META: Record<
  PartnerPrayerVideoType,
  {
    label: string;
    description: (partnerName: string) => string;
  }
> = {
  lauds: {
    label: 'Lauds',
    description: (partnerName) =>
      `Pray today's Morning Prayer with ${partnerName}.`,
  },
  midday_prayer: {
    label: 'Daytime Prayer',
    description: (partnerName) =>
      `Pray today's daytime office with ${partnerName}.`,
  },
  vespers: {
    label: 'Vespers',
    description: (partnerName) =>
      `Pray today's Evening Prayer with ${partnerName}.`,
  },
  compline: {
    label: 'Compline',
    description: (partnerName) =>
      `Pray today's Night Prayer with ${partnerName}.`,
  },
};

const PARTNER_AUDIO_PRAYER_META: Record<
  PartnerPrayerAudioType,
  {
    label: string;
    description: (partnerName: string) => string;
  }
> = {
  lauds: {
    label: 'Lauds',
    description: (partnerName) =>
      `Listen to today's Morning Prayer with ${partnerName}.`,
  },
  midday_prayer: {
    label: 'Daytime Prayer',
    description: (partnerName) =>
      `Listen to today's daytime office with ${partnerName}.`,
  },
  vespers: {
    label: 'Vespers',
    description: (partnerName) =>
      `Listen to today's Evening Prayer with ${partnerName}.`,
  },
  compline: {
    label: 'Compline',
    description: (partnerName) =>
      `Listen to today's Night Prayer with ${partnerName}.`,
  },
};

function segmentIdForPartnerVideo(video: PartnerPrayerVideo) {
  if (video.prayerType === 'lauds') {
    return 'segment-morning';
  }

  if (video.prayerType === 'vespers') {
    return 'segment-evening';
  }

  if (video.prayerType === 'compline') {
    return 'segment-night';
  }

  if (video.prayerType === 'midday_prayer') {
    return 'segment-midday';
  }

  return null;
}

function partnerVideoOptionForSegment(
  segment: Segment,
  video: PartnerPrayerVideo,
): OptionItem | null {
  if (!video.prayerType || segmentIdForPartnerVideo(video) !== segment.id) {
    return null;
  }

  const meta = PARTNER_VIDEO_PRAYER_META[video.prayerType];

  return {
    meta: `Guided Video · ${meta.label}`,
    title: `${video.partnerName} - ${video.displayTitle}`,
    description: meta.description(video.partnerName),
    source: 'partner',
    imageUrl: video.thumbnailUrl,
    videoId: video.youtubeVideoId,
    sourceUrl: video.canonicalUrl,
    communitySlug: video.partnerSlug as PartnerCommunitySlug,
  };
}

function partnerVideoOptionsForSegment(
  segment: Segment,
  videos: PartnerPrayerVideo[],
) {
  return videos
    .map((video) => partnerVideoOptionForSegment(segment, video))
    .filter((item): item is OptionItem => Boolean(item));
}

function videoOptionsForSegment(
  segment: Segment,
  videos: PartnerPrayerVideo[],
) {
  const partnerVideos = partnerVideoOptionsForSegment(segment, videos);
  return partnerVideos.length > 0
    ? [...partnerVideos, ...segment.video]
    : segment.video;
}

function segmentIdForPartnerAudio(audio: PartnerPrayerAudio) {
  if (audio.prayerType === 'lauds') {
    return 'segment-morning';
  }

  if (audio.prayerType === 'vespers') {
    return 'segment-evening';
  }

  if (audio.prayerType === 'compline') {
    return 'segment-night';
  }

  if (audio.prayerType === 'midday_prayer') {
    return 'segment-midday';
  }

  return null;
}

function partnerAudioOptionForSegment(
  segment: Segment,
  audio: PartnerPrayerAudio,
): OptionItem | null {
  if (!audio.prayerType || segmentIdForPartnerAudio(audio) !== segment.id) {
    return null;
  }

  const meta = PARTNER_AUDIO_PRAYER_META[audio.prayerType];

  return {
    meta: `Spotify Audio · ${meta.label}`,
    title: `${audio.partnerName} - ${audio.displayTitle}`,
    description: meta.description(audio.partnerName),
    source: 'partner',
    imageUrl: audio.imageUrl ?? undefined,
    videoId: audio.spotifyEpisodeId ?? undefined,
    sourceUrl: audio.canonicalUrl,
    embedUrl: audio.embedUrl,
    provider: 'spotify',
    communitySlug: audio.partnerSlug as PartnerCommunitySlug,
  };
}

function audioOptionsForSegment(
  segment: Segment,
  audioItems: PartnerPrayerAudio[],
) {
  const partnerAudio = audioItems
    .map((audio) => partnerAudioOptionForSegment(segment, audio))
    .filter((item): item is OptionItem => Boolean(item));

  return partnerAudio.length > 0
    ? [...partnerAudio, ...segment.audio]
    : segment.audio;
}

const WORTH_ABBEY_PRAYER_META: Record<
  WorthAbbeyPrayerType,
  {
    segmentId: string;
    label: string;
    description: string;
  }
> = {
  office_of_readings: {
    segmentId: 'segment-office',
    label: 'Office of Readings',
    description: 'Join Worth Abbey for the day’s monastic office of readings.',
  },
  lauds: {
    segmentId: 'segment-morning',
    label: 'Lauds',
    description:
      'Join Worth Abbey for morning prayer from the monastery church.',
  },
  midday_prayer: {
    segmentId: 'segment-midday',
    label: 'Terce | Sext | None',
    description: 'Join Worth Abbey for daytime prayer.',
  },
  vespers: {
    segmentId: 'segment-evening',
    label: 'Vespers',
    description: 'Join Worth Abbey for evening prayer with the community.',
  },
  compline: {
    segmentId: 'segment-night',
    label: 'Compline',
    description: 'Join Worth Abbey for night prayer at the close of the day.',
  },
};

const WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES = 45;

function worthAbbeyLiveOptionsForSegment(
  segment: Segment,
  videos: WorthAbbeyVideo[],
) {
  const worthAbbeyItems = videos
    .filter((video) => {
      if (!video.prayerType) {
        return false;
      }

      return WORTH_ABBEY_PRAYER_META[video.prayerType].segmentId === segment.id;
    })
    .map((video): OptionItem => {
      const meta =
        WORTH_ABBEY_PRAYER_META[video.prayerType as WorthAbbeyPrayerType];

      return {
        meta: `Community Live · ${meta.label}`,
        title: video.displayTitle,
        description: meta.description,
        time: formatWorthAbbeyLiveTime(video),
        source: 'partner',
        imageUrl: video.thumbnailUrl,
        videoId: video.youtubeVideoId,
        sourceUrl: video.canonicalUrl,
        communitySlug: 'worth-abbey',
        liveStartAt: video.liveStartAt ?? video.scheduledStartAt,
        liveEndAt: video.liveEndAt,
        isLiveNow: video.isLiveNow,
      };
    });

  if (worthAbbeyItems.length === 0) {
    return segment.live;
  }

  const upcomingWorthAbbeyItems = worthAbbeyItems.filter((item) =>
    isWorthAbbeyUpcomingOrCurrent(item),
  );
  const previousWorthAbbeyItems = worthAbbeyItems.filter(
    (item) => !isWorthAbbeyUpcomingOrCurrent(item),
  );
  const groups = [...segment.live];

  if (upcomingWorthAbbeyItems.length > 0) {
    groups.unshift({
      title: 'Worth Abbey',
      items: upcomingWorthAbbeyItems,
    });
  }

  if (previousWorthAbbeyItems.length > 0) {
    const previousGroupIndex = groups.findIndex(
      (group) => group.title === 'Previous Streams',
    );

    if (previousGroupIndex >= 0) {
      groups[previousGroupIndex] = {
        ...groups[previousGroupIndex],
        items: [
          ...previousWorthAbbeyItems,
          ...groups[previousGroupIndex].items,
        ],
      };
    } else {
      groups.push({
        title: 'Previous Streams',
        items: previousWorthAbbeyItems,
      });
    }
  }

  return groups;
}

function isWorthAbbeyUpcomingOrCurrent(item: OptionItem) {
  if (item.isLiveNow) {
    return true;
  }

  const liveEndAt = item.liveEndAt ? Date.parse(item.liveEndAt) : NaN;

  if (!Number.isNaN(liveEndAt)) {
    const previousThreshold =
      liveEndAt + WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES * 60 * 1000;

    return Date.now() < previousThreshold;
  }

  const liveStartAt = item.liveStartAt ? Date.parse(item.liveStartAt) : NaN;

  if (Number.isNaN(liveStartAt)) {
    return false;
  }

  const previousThreshold =
    liveStartAt + WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES * 60 * 1000;

  return Date.now() < previousThreshold;
}

function formatWorthAbbeyLiveTime(video: WorthAbbeyVideo) {
  if (!video.liveStartAt) {
    return undefined;
  }

  const time = Date.parse(video.liveStartAt);

  if (Number.isNaN(time)) {
    return undefined;
  }

  const localTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(time));
  const previousThreshold =
    time + WORTH_ABBEY_PREVIOUS_STREAM_BUFFER_MINUTES * 60 * 1000;

  return Date.now() >= previousThreshold
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

function analyticsSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createPrayerPlayerSession({
  item,
  segment,
  sourceType,
  pageContext,
  partnerStatusOverrides,
}: {
  item: OptionItem;
  segment: Segment;
  sourceType: PrayerPlayerSourceType;
  pageContext: string;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
}): PrayerPlayerSession {
  const sourceName = sourceNameFromTitle(item.title);
  const hour = analyticsSlug(segment.title);
  const ministryId = analyticsSlug(sourceName);
  const community =
    (item.communitySlug
      ? getPartnerCommunity(item.communitySlug, partnerStatusOverrides)
      : null) ??
    communityForName(sourceName, partnerStatusOverrides) ??
    communityForName(item.meta.split('·')[0], partnerStatusOverrides);

  return {
    sourceName,
    sourceType,
    prayerType: segment.title,
    prayerId: `${hour}-${sourceType}`,
    ministryId,
    hour,
    locale: 'en-US',
    provider: item.provider ?? 'youtube',
    videoId: item.videoId ?? MOCK_YOUTUBE_VIDEO_ID,
    title:
      sourceType === 'live'
        ? item.title.replace(`${sourceName} - `, '')
        : segment.title,
    statusLabel:
      sourceType === 'live' ? liveStatusLabel(item) : 'Recorded prayer',
    devotionalLine: 'You are joining the Church at prayer.',
    communityName: community?.name,
    communityPageUrl: community ? communityPath(community.slug) : undefined,
    communityBadgeStatus: community?.badgeEnabled
      ? community.relationshipStatus
      : undefined,
    pageContext,
    sourceUrl:
      item.sourceUrl ??
      `https://www.youtube.com/watch?v=${item.videoId ?? MOCK_YOUTUBE_VIDEO_ID}`,
    embedUrl: item.embedUrl,
  };
}

function badgeStatusForOption(
  item: OptionItem,
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

function OptionPartnerBadge({
  item,
  partnerStatusOverrides,
}: {
  item: OptionItem;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
}) {
  const status = badgeStatusForOption(item, partnerStatusOverrides);
  return status ? <PartnerBadge status={status} /> : null;
}

function liveStatusLabel(item: OptionItem) {
  if (!item.time) {
    return 'Live now';
  }

  return isPastStreamLabel(item.time) ? item.time : `Live at ${item.time}`;
}

function isPastStreamLabel(label: string) {
  return (
    label.startsWith('Earlier today') ||
    label.startsWith('Yesterday') ||
    /^[A-Z][a-z]{2} \d{1,2}, /.test(label)
  );
}

const MOCK_COMMUNITY_PRAYER_MATCHES: Record<
  string,
  {
    segmentId: string;
    sourceType: PrayerPlayerSourceType;
    titleIncludes: string;
  }[]
> = {
  'cedarwell-abbey': [
    {
      segmentId: 'segment-evening',
      sourceType: 'live',
      titleIncludes: 'Cedarwell Abbey - Vespers',
    },
    {
      segmentId: 'segment-morning',
      sourceType: 'recorded',
      titleIncludes: 'Cedarwell Abbey Liturgical Video',
    },
  ],
  'ridgehaven-priory': [
    {
      segmentId: 'segment-morning',
      sourceType: 'live',
      titleIncludes: 'Ridgehaven Priory - Morning Office',
    },
    {
      segmentId: 'segment-evening',
      sourceType: 'recorded',
      titleIncludes: 'Ridgehaven Priory Vespers Video',
    },
  ],
  'sisters-of-dawnfield': [
    {
      segmentId: 'segment-night',
      sourceType: 'live',
      titleIncludes: 'Sisters of Dawnfield - Compline',
    },
    {
      segmentId: 'segment-morning',
      sourceType: 'recorded',
      titleIncludes: 'Sisters of Dawnfield',
    },
  ],
  'the-little-oratory': [
    {
      segmentId: 'segment-night',
      sourceType: 'live',
      titleIncludes: 'The Little Oratory - Compline Together',
    },
    {
      segmentId: 'segment-morning',
      sourceType: 'recorded',
      titleIncludes: 'The Little Oratory',
    },
  ],
  'psalm-and-laurel': [
    {
      segmentId: 'segment-midday',
      sourceType: 'live',
      titleIncludes: 'Psalm and Laurel - Midday Prayer Live',
    },
    {
      segmentId: 'segment-midmorning',
      sourceType: 'recorded',
      titleIncludes: 'Psalm and Laurel',
    },
  ],
};

function findSegment(segmentId: string) {
  return SEGMENTS.find((segment) => segment.id === segmentId) ?? null;
}

function findMockCommunityOption(
  segment: Segment,
  sourceType: PrayerPlayerSourceType,
  titleIncludes: string,
) {
  if (sourceType === 'live') {
    return (
      segment.live
        .flatMap((group) => group.items)
        .find((item) => item.title.includes(titleIncludes)) ?? null
    );
  }

  return (
    [...segment.video, ...segment.audio].find((item) =>
      item.title.includes(titleIncludes),
    ) ?? null
  );
}

function cardTitleFor(item: OptionItem, segment: Segment) {
  const sourceName = sourceNameFromTitle(item.title);
  const cleanedTitle = item.title.replace(`${sourceName} - `, '');

  return cleanedTitle === item.title ? segment.title : cleanedTitle;
}

function createCommunityPrayerCards({
  slug,
  partnerVideos,
  partnerAudio,
  worthAbbeyVideos,
  onOpenPrayerPlayer,
  partnerStatusOverrides,
}: {
  slug: string | null;
  partnerVideos: PartnerPrayerVideo[];
  partnerAudio: PartnerPrayerAudio[];
  worthAbbeyVideos: WorthAbbeyVideo[];
  onOpenPrayerPlayer: (session: PrayerPlayerSession) => void;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
}): CommunityPrayerCard[] {
  if (!slug) {
    return [];
  }

  if (slug === 'worth-abbey') {
    return SEGMENTS.flatMap((segment) =>
      worthAbbeyLiveOptionsForSegment(segment, worthAbbeyVideos)
        .flatMap((group) => group.items)
        .filter((item) => item.communitySlug === 'worth-abbey')
        .map((item) => {
          const isUpcomingOrCurrent = isWorthAbbeyUpcomingOrCurrent(item);

          return {
            id: `${slug}-${segment.id}-${item.videoId ?? item.title}`,
            label: item.meta,
            title: cardTitleFor(item, segment),
            description: item.description,
            time: liveStatusLabel(item),
            actionLabel: isUpcomingOrCurrent ? 'Join prayer' : 'Play replay',
            onSelect: () =>
              onOpenPrayerPlayer(
                createPrayerPlayerSession({
                  item,
                  segment,
                  sourceType: 'live',
                  pageContext: 'community_profile_today',
                  partnerStatusOverrides,
                }),
              ),
          };
        }),
    ).slice(0, 5);
  }

  const partnerPrayerCards = SEGMENTS.flatMap((segment) =>
    [
      ...partnerVideoOptionsForSegment(
        segment,
        partnerVideos.filter((video) => video.partnerSlug === slug),
      ),
      ...audioOptionsForSegment(
        segment,
        partnerAudio.filter((audio) => audio.partnerSlug === slug),
      ).filter((item) => item.source === 'partner'),
    ].map((item) => ({
      id: `${slug}-${segment.id}-${item.videoId ?? item.title}`,
      label: item.meta,
      title: cardTitleFor(item, segment),
      description: item.description,
      actionLabel: 'Begin prayer',
      onSelect: () =>
        onOpenPrayerPlayer(
          createPrayerPlayerSession({
            item,
            segment,
            sourceType: 'recorded',
            pageContext: 'community_profile_today',
            partnerStatusOverrides,
          }),
        ),
    })),
  );

  if (partnerPrayerCards.length > 0) {
    return partnerPrayerCards.slice(0, 5);
  }

  return (MOCK_COMMUNITY_PRAYER_MATCHES[slug] ?? [])
    .map((match): CommunityPrayerCard | null => {
      const segment = findSegment(match.segmentId);
      if (!segment) {
        return null;
      }

      const item = findMockCommunityOption(
        segment,
        match.sourceType,
        match.titleIncludes,
      );
      if (!item) {
        return null;
      }

      const playerItem: OptionItem = {
        ...item,
        communitySlug: slug as PartnerCommunitySlug,
      };
      const isLiveCardUpcomingOrCurrent =
        match.sourceType !== 'live' || isWorthAbbeyUpcomingOrCurrent(item);
      const card: CommunityPrayerCard = {
        id: `${slug}-${segment.id}-${match.titleIncludes}`,
        label: item.meta,
        title: cardTitleFor(item, segment),
        description: item.description,
        actionLabel:
          match.sourceType !== 'live'
            ? 'Begin prayer'
            : isLiveCardUpcomingOrCurrent
              ? 'Join prayer'
              : 'Play replay',
        onSelect: () =>
          onOpenPrayerPlayer(
            createPrayerPlayerSession({
              item: playerItem,
              segment,
              sourceType: match.sourceType,
              pageContext: 'community_profile_today',
              partnerStatusOverrides,
            }),
          ),
      };

      if (match.sourceType === 'live') {
        card.time = liveStatusLabel(item);
      }

      return card;
    })
    .filter((item): item is CommunityPrayerCard => Boolean(item));
}

function blockClassName(variant: LiturgyBlock['variant']) {
  return `liturgy-block liturgy-block-${variant}`;
}

function renderPrayerTemplate(segmentId: string) {
  switch (segmentId) {
    case 'segment-office':
      return <OfficeOfReadingsPrayer />;
    case 'segment-morning':
      return <MorningPrayer />;
    case 'segment-midmorning':
      return <MidmorningPrayer />;
    case 'segment-midday':
      return <MiddayPrayer />;
    case 'segment-midafternoon':
      return <MidafternoonPrayer />;
    case 'segment-evening':
      return <EveningPrayer />;
    case 'segment-night':
      return <NightPrayer />;
    default:
      return null;
  }
}

function renderPage(
  view: ViewKey,
  onNavigate: (view: ViewKey) => void,
  options: {
    selectedCommunitySlug?: string | null;
    onOpenCommunity?: (slug: string) => void;
    communityPrayerCards?: CommunityPrayerCard[];
    partnerStatusOverrides?: PartnerCommunityStatusOverrides;
  } = {},
) {
  switch (view) {
    case 'discover':
      return (
        <DiscoverPage
          onNavigate={onNavigate}
          onOpenCommunity={options.onOpenCommunity}
          partnerStatusOverrides={options.partnerStatusOverrides}
        />
      );
    case 'community':
      return (
        <CommunityPage
          onNavigate={onNavigate}
          selectedCommunitySlug={options.selectedCommunitySlug}
          onOpenCommunity={options.onOpenCommunity}
          prayerCards={options.communityPrayerCards}
          partnerStatusOverrides={options.partnerStatusOverrides}
        />
      );
    case 'more':
      return <MorePage onNavigate={onNavigate} />;
    case 'about':
      return <AboutPage onNavigate={onNavigate} />;
    case 'getting-started':
      return <GettingStartedPage onNavigate={onNavigate} />;
    default:
      return null;
  }
}

export function PrayerOfficeMockup() {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const selectedDate = selectedDateFromSearch(location.search);
  const dateControlRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const isDesktopRef = useRef<boolean>(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.innerWidth >= 900;
  });
  const [selectedFormats, setSelectedFormats] = useState<
    Record<string, FormatKey>
  >(
    () =>
      Object.fromEntries(
        SEGMENTS.map((segment) => [segment.id, 'text']),
      ) as Record<string, FormatKey>,
  );
  const [collapsedSegments, setCollapsedSegments] = useState<
    Record<string, boolean>
  >(
    () =>
      Object.fromEntries(
        SEGMENTS.map((segment, index) => [segment.id, index !== 0]),
      ) as Record<string, boolean>,
  );
  const [activeDesktopSegment, setActiveDesktopSegment] = useState(
    SEGMENTS[0].id,
  );
  const activeView = viewForPath(location.pathname);
  const selectedCommunitySlug =
    activeView === 'community'
      ? (location.pathname
          .toLowerCase()
          .replace(/\/+$/, '')
          .split('/community/')[1] ?? null)
      : null;
  const [onrampDismissed, setOnrampDismissed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(ONRAMP_DISMISS_KEY) === 'true';
  });
  const [prayerPlayerSession, setPrayerPlayerSession] =
    useState<PrayerPlayerSession | null>(null);
  const [dateLabel, setDateLabel] = useState(() =>
    formatPendingDateLabel(selectedDate),
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [partnerVideos, setPartnerVideos] = useState<PartnerPrayerVideo[]>([]);
  const [partnerAudio, setPartnerAudio] = useState<PartnerPrayerAudio[]>([]);
  const [worthAbbeyVideos, setWorthAbbeyVideos] = useState<WorthAbbeyVideo[]>(
    [],
  );
  const [partnerStatusOverrides, setPartnerStatusOverrides] =
    useState<PartnerCommunityStatusOverrides>({});

  const navigateTo = (view: ViewKey) => {
    const targetPath = pathForView(view);
    if (location.pathname !== targetPath) {
      routerNavigate(targetPath);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  };

  const openCommunity = (slug: string) => {
    const targetPath = slug ? communityPath(slug) : pathForView('community');
    if (location.pathname !== targetPath) {
      routerNavigate(targetPath);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  };

  const dismissOnramp = () => {
    setOnrampDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONRAMP_DISMISS_KEY, 'true');
    }
  };

  const changePrayerDate = (date: string) => {
    const params = new URLSearchParams(location.search);

    if (isTodayDate(date)) {
      params.delete('date');
    } else {
      params.set('date', date);
    }

    const search = params.toString();
    routerNavigate({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
    });
  };

  const returnToToday = () => {
    changePrayerDate(localDateString());
    setIsDatePickerOpen(false);
  };

  const applyDateInputValue = (date: string) => {
    if (!DATE_PATTERN.test(date)) {
      return;
    }

    changePrayerDate(date);
    setIsDatePickerOpen(false);
  };

  const closeDatePicker = () => {
    const date = dateInputRef.current?.value;

    if (date && DATE_PATTERN.test(date) && date !== selectedDate) {
      applyDateInputValue(date);
      return;
    }

    setIsDatePickerOpen(false);
  };

  useEffect(() => {
    const applyDesktopLayout = () => {
      isDesktopRef.current = true;
      setIsDesktopLayout(true);
      setCollapsedSegments(
        Object.fromEntries(
          SEGMENTS.map((segment) => [segment.id, false]),
        ) as Record<string, boolean>,
      );
      setActiveDesktopSegment((current) => current ?? SEGMENTS[0].id);
    };

    const applyMobileLayout = () => {
      isDesktopRef.current = false;
      setIsDesktopLayout(false);
      setCollapsedSegments(
        Object.fromEntries(
          SEGMENTS.map((segment, index) => [segment.id, index !== 0]),
        ) as Record<string, boolean>,
      );
    };

    const syncLayout = () => {
      const isDesktop = window.innerWidth >= 900;

      if (isDesktop) {
        applyDesktopLayout();
      } else {
        applyMobileLayout();
      }
    };

    const handleResize = () => {
      const isDesktop = window.innerWidth >= 900;

      // Mobile browsers emit resize while chrome bars hide/show.
      // Only reset collapse state when crossing the desktop breakpoint.
      if (isDesktop === isDesktopRef.current) {
        return;
      }

      if (isDesktop) {
        applyDesktopLayout();
      } else {
        applyMobileLayout();
      }
    };

    syncLayout();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDatePickerOpen) {
      return;
    }

    dateInputRef.current?.focus();

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        dateControlRef.current &&
        !dateControlRef.current.contains(event.target as Node)
      ) {
        closeDatePicker();
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isDatePickerOpen, selectedDate]);

  useEffect(() => {
    let isActive = true;

    setDateLabel(formatPendingDateLabel(selectedDate));

    getLiturgicalDayWithHours(DEFAULT_CALENDAR_ID, selectedDate)
      .then((day) => {
        if (!isActive) {
          return;
        }

        setDateLabel(formatLiturgicalDateLabel(day, selectedDate));
      })
      .catch((error) => {
        console.warn('Unable to load liturgical calendar date.', error);
        if (isActive) {
          setDateLabel(formatPendingDateLabel(selectedDate));
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const partnerClient = supabase;
    let isActive = true;

    async function loadPartnerStatuses() {
      const { data, error } = await partnerClient
        .from('partners')
        .select(
          'slug,relationship_status,badge_enabled,community_page_enabled,community_page_slug',
        )
        .eq('active', true)
        .eq('onboarding_status', 'active');

      if (!isActive) {
        return;
      }

      if (error) {
        console.warn('Unable to load partner badge statuses.', error);
        return;
      }

      setPartnerStatusOverrides(
        Object.fromEntries(
          (data ?? [])
            .filter(
              (partner) =>
                partner.relationship_status === 'curated' ||
                partner.relationship_status === 'verified' ||
                partner.relationship_status === 'partner',
            )
            .map((partner) => [
              partner.slug,
              {
                relationshipStatus: partner.relationship_status,
                badgeEnabled: partner.badge_enabled,
                communityPageEnabled: partner.community_page_enabled,
                communityPageSlug: partner.community_page_slug,
              },
            ]),
        ) as PartnerCommunityStatusOverrides,
      );
    }

    void loadPartnerStatuses();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPartnerVideos() {
      if (!supabase) {
        setPartnerVideos([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('youtube_videos')
          .select(
            [
              'title',
              'description',
              'youtube_video_id',
              'thumbnail_url',
              'canonical_url',
              'embed_url',
              'published_at',
              'scheduled_start_at',
              'prayer_date',
              'prayer_type',
              'partners!inner(slug,name)',
            ].join(','),
          )
          .eq('display_status', 'approved')
          .eq('prayer_date', selectedDate)
          .eq('video_kind', 'video')
          .in('prayer_type', ['lauds', 'midday_prayer', 'vespers', 'compline'])
          .order('published_at', { ascending: false })
          .abortSignal(controller.signal);

        if (error) {
          throw error;
        }

        setPartnerVideos(
          ((data ?? []) as unknown as PartnerPrayerVideoRow[]).map(
            normalizePartnerPrayerVideo,
          ),
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.warn('Unable to load partner videos.', error);
        setPartnerVideos([]);
      }
    }

    void loadPartnerVideos();

    return () => controller.abort();
  }, [selectedDate]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPartnerAudio() {
      if (!supabase) {
        setPartnerAudio([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('spotify_episodes')
          .select(
            [
              'title',
              'description',
              'spotify_episode_id',
              'image_url',
              'canonical_url',
              'embed_url',
              'published_at',
              'prayer_date',
              'prayer_type',
              'duration_seconds',
              'partners!inner(slug,name)',
            ].join(','),
          )
          .eq('display_status', 'approved')
          .eq('prayer_date', selectedDate)
          .in('prayer_type', ['lauds', 'midday_prayer', 'vespers', 'compline'])
          .order('published_at', { ascending: false })
          .abortSignal(controller.signal);

        if (error) {
          throw error;
        }

        setPartnerAudio(
          ((data ?? []) as unknown as PartnerPrayerAudioRow[]).map(
            normalizePartnerPrayerAudio,
          ),
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.warn('Unable to load partner audio.', error);
        setPartnerAudio([]);
      }
    }

    void loadPartnerAudio();

    return () => controller.abort();
  }, [selectedDate]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWorthAbbeyVideos() {
      try {
        const response = await fetch(
          `/.netlify/functions/worth-abbey-videos?date=${encodeURIComponent(selectedDate)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Worth Abbey videos returned ${response.status}`);
        }

        const body = (await response.json()) as {
          videos?: WorthAbbeyVideo[];
        };
        setWorthAbbeyVideos(body.videos ?? []);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.warn('Unable to load Worth Abbey videos.', error);
        setWorthAbbeyVideos([]);
      }
    }

    void loadWorthAbbeyVideos();

    return () => controller.abort();
  }, [selectedDate]);

  const setFormat = (segmentId: string, format: FormatKey) => {
    setSelectedFormats((current) => ({ ...current, [segmentId]: format }));
  };

  const toggleSegment = (segmentId: string) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 900) {
      return;
    }

    setCollapsedSegments(
      (current) =>
        Object.fromEntries(
          SEGMENTS.map((segment) => [
            segment.id,
            segment.id === segmentId ? !current[segmentId] : true,
          ]),
        ) as Record<string, boolean>,
    );
  };

  const openPrayerPlayer = (session: PrayerPlayerSession) => {
    setPrayerPlayerSession(session);
  };

  const communityPrayerCards = createCommunityPrayerCards({
    slug: selectedCommunitySlug,
    partnerVideos,
    partnerAudio,
    worthAbbeyVideos,
    onOpenPrayerPlayer: openPrayerPlayer,
    partnerStatusOverrides,
  });

  const segmentsToRender = isDesktopLayout
    ? SEGMENTS
    : MOBILE_SEGMENT_ORDER.map((segmentId) =>
        SEGMENTS.find((segment) => segment.id === segmentId),
      ).filter((segment): segment is Segment => Boolean(segment));

  return (
    <div className={`phone${activeView === 'today' ? '' : ' single-column'}`}>
      <header className="app-header">
        <div
          className="prototype-banner"
          role="status"
          aria-label="Preview mode: This site is a mockup for prototyping and review. The official site is coming soon."
        >
          <span className="prototype-banner-title">Preview mode:</span>
          <span className="prototype-banner-copy">
            This site is a mockup for prototyping and review. The official site
            is coming soon.
          </span>
        </div>
        <div className="header-top">
          <div
            className="logo"
            role="button"
            tabIndex={0}
            onClick={() => navigateTo('today')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigateTo('today');
              }
            }}
          >
            UNA <span>VOCE</span>
          </div>
          <nav className="header-nav" aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`header-nav-link${activeView === item.key ? ' active' : ''}`}
                onClick={() => navigateTo(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="header-icon">☩</div>
        </div>
        <div className="date-line">{dateLabel}</div>
      </header>

      {activeView === 'today' ? (
        <aside className="sidebar" aria-label="Prayer sections">
          <nav className="sidebar-nav">
            {SIDEBAR_ITEMS.map((item) =>
              'children' in item ? (
                <div key={item.title} className="sidebar-group">
                  <div className="sidebar-group-label"></div>
                  {item.children.map((child) => (
                    <button
                      key={`${item.title}-${child.title}`}
                      type="button"
                      className={`sidebar-item sidebar-subitem${activeDesktopSegment === child.segmentId ? ' active' : ''}`}
                      onClick={() => setActiveDesktopSegment(child.segmentId)}
                    >
                      <span className="sidebar-item-title">{child.title}</span>
                      {child.subtitle ? (
                        <span className="sidebar-item-subtitle">
                          {child.subtitle}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  key={item.title}
                  type="button"
                  className={`sidebar-item${activeDesktopSegment === item.segmentId ? ' active' : ''}`}
                  onClick={() => setActiveDesktopSegment(item.segmentId)}
                >
                  <span className="sidebar-item-title">{item.title}</span>
                  {item.subtitle ? (
                    <span className="sidebar-item-subtitle">
                      {item.subtitle}
                    </span>
                  ) : null}
                </button>
              ),
            )}
          </nav>
        </aside>
      ) : null}

      <main className="office-main">
        {activeView !== 'today' ? (
          renderPage(activeView, navigateTo, {
            selectedCommunitySlug,
            onOpenCommunity: openCommunity,
            communityPrayerCards,
            partnerStatusOverrides,
          })
        ) : (
          <>
            <section
              className="date-control"
              ref={dateControlRef}
              aria-label="Prayer date"
            >
              <div className="date-copy">
                <div className="date-label">
                  {isTodayDate(selectedDate) ? 'Today' : 'Selected date'}
                </div>
                <div className="date-value">
                  {formatCivilDate(selectedDate)}
                </div>
                {!isTodayDate(selectedDate) ? (
                  <button
                    type="button"
                    className="return-today-button"
                    onClick={returnToToday}
                  >
                    Return to today
                  </button>
                ) : null}
              </div>
              <div className="date-control-actions">
                <button
                  type="button"
                  className="date-change-button"
                  aria-expanded={isDatePickerOpen}
                  aria-controls="prayer-date-picker"
                  onClick={() => {
                    if (isDatePickerOpen) {
                      setIsDatePickerOpen(false);
                      return;
                    }

                    setIsDatePickerOpen(true);
                  }}
                >
                  Change date
                </button>
                {isDatePickerOpen ? (
                  <div className="date-picker-popover" id="prayer-date-picker">
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={selectedDate}
                      aria-label="Select prayer date"
                      onChange={(event) => {
                        applyDateInputValue(event.target.value);
                      }}
                      onInput={(event) => {
                        applyDateInputValue(event.currentTarget.value);
                      }}
                      onBlur={(event) => {
                        applyDateInputValue(event.currentTarget.value);
                      }}
                    />
                    <button
                      type="button"
                      className="date-picker-apply"
                      onClick={() => {
                        applyDateInputValue(
                          dateInputRef.current?.value ?? selectedDate,
                        );
                      }}
                    >
                      Set date
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
            {!onrampDismissed ? (
              <section className="onramp">
                <button
                  type="button"
                  className="onramp-close"
                  aria-label="Dismiss"
                  onClick={dismissOnramp}
                >
                  ×
                </button>
                <div className="onramp-eyebrow">New to the Hours?</div>
                <p className="onramp-text">
                  Most people begin with two: Morning Prayer to open the day,
                  Night Prayer to close it. You don't need a book, just press
                  play below.
                </p>
                <button
                  type="button"
                  className="onramp-action"
                  onClick={() => navigateTo('getting-started')}
                >
                  How to begin ›
                </button>
              </section>
            ) : null}
            {segmentsToRender.map((segment) => {
              const selectedFormat = selectedFormats[segment.id] ?? 'text';
              const isCollapsed = collapsedSegments[segment.id];
              const isActiveDesktop = activeDesktopSegment === segment.id;
              const segmentSubtitle = SEGMENT_SUBTITLES[segment.id];
              const videoOptions = videoOptionsForSegment(
                segment,
                partnerVideos,
              );
              const audioOptions = audioOptionsForSegment(
                segment,
                partnerAudio,
              );
              const liveGroups = worthAbbeyLiveOptionsForSegment(
                segment,
                worthAbbeyVideos,
              );

              return (
                <section
                  key={segment.id}
                  id={segment.id}
                  className={`segment${isCollapsed ? ' collapsed' : ''}${isActiveDesktop ? ' active-desktop' : ''}`}
                >
                  <button
                    type="button"
                    className="segment-header"
                    onClick={() => toggleSegment(segment.id)}
                    aria-expanded={!isCollapsed}
                    aria-controls={`${segment.id}-body`}
                  >
                    <div className="segment-title-area">
                      <div className="segment-toggle">⬇</div>
                      <div className="segment-title-stack">
                        <h2 className="segment-title">{segment.title}</h2>
                        {segmentSubtitle ? (
                          <span className="segment-subtitle">
                            {segmentSubtitle}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="segment-body" id={`${segment.id}-body`}>
                    <div className="active-format-pill">
                      <span className="active-format-dot" />
                      Viewing: {titleCase(selectedFormat)}
                    </div>

                    <div className="format-rail">
                      {FORMATS.map((format) => (
                        <button
                          key={format.key}
                          type="button"
                          className={`format-card ${format.className}${selectedFormat === format.key ? ' selected' : ''}`}
                          aria-pressed={selectedFormat === format.key}
                          onClick={() => setFormat(segment.id, format.key)}
                        >
                          <span className="format-card-icon" aria-hidden="true">
                            {format.icon}
                          </span>
                          <span className="format-card-copy">
                            <span className="format-card-title">
                              {format.label}
                            </span>
                            <span className="format-card-description">
                              {format.description}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>

                    <div
                      className={`prayer-panel format-output${selectedFormat === 'text' ? '' : ' hidden'}`}
                    >
                      {renderPrayerTemplate(segment.id) ??
                        segment.text.map((block, index) => (
                          <section
                            key={block.label}
                            className={`liturgy-card${index % 2 === 1 ? ' alt' : ''}`}
                          >
                            <div className="liturgy-card-kicker">
                              {block.label}
                            </div>
                            <h3 className="liturgy-card-title">
                              {block.title}
                            </h3>
                            {block.citation ? (
                              <div className="liturgy-card-citation">
                                {block.citation}
                              </div>
                            ) : null}
                            <div className="liturgy-lines">
                              {block.blocks.map((entry) => (
                                <div
                                  key={`${block.label}-${entry.variant}-${entry.lines[0]}`}
                                  className={blockClassName(entry.variant)}
                                >
                                  {entry.speaker ? (
                                    <div className="liturgy-speaker">
                                      {entry.speaker}
                                    </div>
                                  ) : null}
                                  {entry.lines.map((line) => (
                                    <p key={line} className="liturgy-line">
                                      {line}
                                    </p>
                                  ))}
                                  {entry.citation ? (
                                    <div className="liturgy-inline-citation">
                                      {entry.citation}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                    </div>

                    <div
                      className={`format-output${selectedFormat === 'audio' ? '' : ' hidden'}`}
                    >
                      <h4>Listen</h4>
                      <div className="format-options">
                        {audioOptions.map((item, index) => (
                          <button
                            key={item.title}
                            type="button"
                            className="format-option format-option-media"
                            style={{
                              backgroundImage: `linear-gradient(165deg, rgba(12, 11, 9, 0.2), rgba(12, 11, 9, 0.78)), url(${item.imageUrl ?? optionImageFor('audio', index)})`,
                            }}
                            onClick={() =>
                              openPrayerPlayer(
                                createPrayerPlayerSession({
                                  item,
                                  segment,
                                  sourceType: 'recorded',
                                  pageContext: 'today_listen_card',
                                  partnerStatusOverrides,
                                }),
                              )
                            }
                          >
                            <div className="option-meta">{item.meta}</div>
                            <OptionPartnerBadge
                              item={item}
                              partnerStatusOverrides={partnerStatusOverrides}
                            />
                            <div className="option-title">{item.title}</div>
                            <p className="option-desc">{item.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`format-output${selectedFormat === 'video' ? '' : ' hidden'}`}
                    >
                      <h4>Watch</h4>
                      <div className="format-options">
                        {videoOptions.map((item, index) => (
                          <button
                            key={item.title}
                            type="button"
                            className="format-option format-option-media"
                            style={{
                              backgroundImage: `linear-gradient(165deg, rgba(14, 12, 9, 0.18), rgba(14, 12, 9, 0.8)), url(${item.imageUrl ?? optionImageFor('video', index)})`,
                            }}
                            onClick={() =>
                              openPrayerPlayer(
                                createPrayerPlayerSession({
                                  item,
                                  segment,
                                  sourceType: 'recorded',
                                  pageContext: 'today_watch_card',
                                  partnerStatusOverrides,
                                }),
                              )
                            }
                          >
                            <div className="option-meta">{item.meta}</div>
                            <OptionPartnerBadge
                              item={item}
                              partnerStatusOverrides={partnerStatusOverrides}
                            />
                            <div className="option-title">{item.title}</div>
                            <p className="option-desc">{item.description}</p>
                            <div className="option-card-footer">
                              <span className="option-prayer-action">
                                Begin Prayer
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`format-output${selectedFormat === 'live' ? '' : ' hidden'}`}
                    >
                      <h4>Live</h4>
                      {liveGroups.map((group, groupIndex) => (
                        <div key={group.title} className="stream-group">
                          <div className="stream-group-title">
                            {group.title}
                          </div>
                          <div className="format-options">
                            {group.items.map((item, itemIndex) => (
                              <button
                                key={item.title}
                                type="button"
                                className="format-option format-option-media"
                                style={{
                                  backgroundImage: `linear-gradient(165deg, rgba(16, 13, 12, 0.26), rgba(16, 13, 12, 0.82)), url(${item.imageUrl ?? optionImageFor('live', groupIndex * 8 + itemIndex)})`,
                                }}
                                onClick={() =>
                                  openPrayerPlayer(
                                    createPrayerPlayerSession({
                                      item,
                                      segment,
                                      sourceType: 'live',
                                      pageContext: 'today_live_card',
                                      partnerStatusOverrides,
                                    }),
                                  )
                                }
                              >
                                <div className="option-meta">{item.meta}</div>
                                <OptionPartnerBadge
                                  item={item}
                                  partnerStatusOverrides={
                                    partnerStatusOverrides
                                  }
                                />
                                <div className="option-title">{item.title}</div>
                                <p className="option-desc">
                                  {item.description}
                                </p>
                                <div className="option-card-footer">
                                  {item.time ? (
                                    <span className="stream-time">
                                      {item.time}
                                    </span>
                                  ) : (
                                    <span />
                                  )}
                                  <span className="option-prayer-action">
                                    {group.title === 'Upcoming'
                                      ? 'Join Live'
                                      : 'Pray Now'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item${activeView === item.key ? ' active' : ''}`}
            onClick={() => navigateTo(item.key)}
          >
            <div className="nav-icon">
              <NavIcon name={item.icon} />
            </div>
            <div className="nav-label">{item.shortLabel ?? item.label}</div>
          </button>
        ))}
      </nav>
      <PrayerPlayerPanel
        session={prayerPlayerSession}
        onClose={() => setPrayerPlayerSession(null)}
      />
    </div>
  );
}
