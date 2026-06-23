import { useEffect, useState } from 'react';
import { EveningPrayer } from './prayers/EveningPrayer';
import { MidafternoonPrayer } from './prayers/MidafternoonPrayer';
import { MiddayPrayer } from './prayers/MiddayPrayer';
import { MidmorningPrayer } from './prayers/MidmorningPrayer';
import { MorningPrayer } from './prayers/MorningPrayer';
import { NightPrayer } from './prayers/NightPrayer';
import { OfficeOfReadingsPrayer } from './prayers/OfficeOfReadingsPrayer';

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
        meta: 'Abbey Feed',
        title: 'Saint Benedict Abbey Audio Office',
        description:
          'Monastic-style spoken audio with chapel ambience and structured intercessions.',
      },
    ],
    video: [
      {
        meta: 'Content Creator',
        title: 'The Little Oratory',
        description:
          'Guided video office with verse overlays and clear transitions through each section.',
      },
      {
        meta: 'Content Creator',
        title: 'Psalm and Laurel',
        description:
          'Recorded visual prayer session with psalm text subtitles and response prompts.',
      },
      {
        meta: 'Monastery',
        title: 'Clear Creek Monastery Video Office',
        description:
          'Chapel-captured Morning Prayer video with natural acoustics and full liturgical flow.',
      },
      {
        meta: 'Abbey',
        title: 'Saint Benedict Abbey Liturgical Video',
        description:
          'Abbey-hosted prayer video with fixed camera, chant responses, and text callouts.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Monastery Live',
            title: 'Clear Creek Monastery - Morning Office',
            description:
              'Live chapel stream with shared responses and final blessing.',
            time: '6:00 AM',
          },
          {
            meta: 'Creator Live',
            title: 'The Little Oratory - Morning Prayer Together',
            description:
              'Interactive live session with opening hymn and guided pace.',
            time: '6:30 AM',
          },
        ],
      },
      {
        title: 'Previous Streams',
        items: [
          {
            meta: 'Archived Live',
            title: 'Benedictine Sisters - Lauds Replay',
            description:
              'Replay of full live stream with psalm responses and intercessions.',
            time: 'Earlier today, 6:00 AM',
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
        title: 'Saint Benedict Abbey Midmorning Office',
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
        meta: 'Monastery',
        title: 'Benedictine Sisters Midmorning Video',
        description:
          'Convent-led Midmorning Prayer video archive with visible response pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Genesee Abbey Midmorning Video Office',
        description:
          'Midmorning liturgical video from abbey choir stalls with clear psalm sequence.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Monastery Live',
            title: 'Clear Creek Monastery - Midmorning Office',
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
            title: 'Saint Benedict Abbey - Midmorning Replay',
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
        title: 'Saint Benedict Abbey Midday Office',
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
        meta: 'Monastery',
        title: 'Benedictine Sisters Midday Video',
        description:
          'Convent-led Midday Prayer video archive with visible response pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Genesee Abbey Noonday Video Office',
        description:
          'Noonday liturgical video from abbey choir stalls with clear psalm sequence.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Monastery Live',
            title: 'Clear Creek Monastery - Midday Office',
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
            title: 'Saint Benedict Abbey - Midday Replay',
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
        title: 'Saint Benedict Abbey Midafternoon Office',
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
        meta: 'Monastery',
        title: 'Benedictine Sisters Midafternoon Video',
        description:
          'Convent-led Midafternoon Prayer video archive with visible response pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Genesee Abbey Midafternoon Video Office',
        description:
          'Midafternoon liturgical video from abbey choir stalls with clear psalm sequence.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Monastery Live',
            title: 'Clear Creek Monastery - Midafternoon Office',
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
            title: 'Saint Benedict Abbey - Midafternoon Replay',
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
        title: 'Saint Benedict Abbey Vespers Audio',
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
      {
        meta: 'Content Creator',
        title: 'Psalm and Laurel',
        description:
          'Vespers video session with chapter markers and psalm subtitles.',
      },
      {
        meta: 'Monastery',
        title: 'Clear Creek Monastery Vespers Video',
        description:
          'Evening Office video capture with full psalm cycle and Magnificat sequence.',
      },
      {
        meta: 'Abbey',
        title: 'Solesmes Abbey Vespers Recording',
        description:
          'Traditional abbey Vespers video with antiphon cues and reverent pacing.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Abbey Live',
            title: 'Saint Benedict Abbey - Vespers',
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
      {
        title: 'Previous Streams',
        items: [
          {
            meta: 'Archived Live',
            title: 'Clear Creek Monastery - Vespers Replay',
            description: 'Replay archive of the full evening stream liturgy.',
            time: 'Earlier today, 6:00 PM',
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
        title: 'Saint Benedict Abbey Compline Audio',
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
        meta: 'Monastery',
        title: 'Benedictine Sisters Compline Video',
        description:
          'Convent chapel Compline video with closing Marian antiphon and silence.',
      },
      {
        meta: 'Abbey',
        title: 'Genesee Abbey Night Office Video',
        description:
          'Night Office video archive with fixed camera and complete prayer structure.',
      },
    ],
    live: [
      {
        title: 'Upcoming',
        items: [
          {
            meta: 'Monastery Live',
            title: 'Benedictine Sisters - Compline',
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
            title: 'Genesee Abbey - Compline Replay',
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
        title: 'Saint Benedict Abbey Readings Audio',
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
        meta: 'Monastery',
        title: 'Clear Creek Monastery Readings Video',
        description:
          'Monastic reading office video with responsory transitions and quiet pacing.',
      },
      {
        meta: 'Abbey',
        title: 'Saint Benedict Abbey Readings Broadcast',
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
            title: 'Saint Benedict Abbey - Office of Readings',
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
      {
        title: 'Previous Streams',
        items: [
          {
            meta: 'Archived Live',
            title: 'Clear Creek Monastery - Readings Replay',
            description:
              'Replay archive of the complete Office of Readings livestream.',
            time: 'Earlier today, 5:30 AM',
          },
        ],
      },
    ],
  },
];

const SIDEBAR_ITEMS: SidebarEntry[] = [
  {
    title: 'Office of Readings',
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
        title: 'Midmorning',
        subtitle: 'Terce',
        segmentId: 'segment-midmorning',
      },
      {
        title: 'Midday',
        subtitle: 'Sext',
        segmentId: 'segment-midday',
      },
      {
        title: 'Midafternoon',
        subtitle: 'None',
        segmentId: 'segment-midafternoon',
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

const FORMATS: { key: FormatKey; label: string; className: string }[] = [
  { key: 'text', label: 'Text', className: 'text' },
  { key: 'audio', label: 'Audio', className: 'audio' },
  { key: 'video', label: 'Video', className: 'video' },
  { key: 'live', label: 'Live', className: 'live' },
];

const NAV_ITEMS = [
  { icon: '📖', label: 'Today' },
  { icon: '👥', label: 'Communities' },
  { icon: '⋯', label: 'More' },
];

const DATE_LABEL = 'Monday, June 22 · Twelfth Week in Ordinary Time';

function titleCase(format: FormatKey) {
  return format.charAt(0).toUpperCase() + format.slice(1);
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

export function PrayerOfficeMockup() {
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

  useEffect(() => {
    const syncLayout = () => {
      if (window.innerWidth >= 900) {
        setCollapsedSegments(
          Object.fromEntries(
            SEGMENTS.map((segment) => [segment.id, false]),
          ) as Record<string, boolean>,
        );
        setActiveDesktopSegment((current) => current ?? SEGMENTS[0].id);
        return;
      }

      setCollapsedSegments(
        Object.fromEntries(
          SEGMENTS.map((segment, index) => [segment.id, index !== 0]),
        ) as Record<string, boolean>,
      );
    };

    syncLayout();
    window.addEventListener('resize', syncLayout);
    return () => window.removeEventListener('resize', syncLayout);
  }, []);

  const setFormat = (segmentId: string, format: FormatKey) => {
    setSelectedFormats((current) => ({ ...current, [segmentId]: format }));
  };

  const toggleSegment = (segmentId: string) => {
    if (window.innerWidth >= 900) {
      return;
    }

    setCollapsedSegments((current) => ({
      ...current,
      [segmentId]: !current[segmentId],
    }));
  };

  return (
    <div className='phone'>
      <header className='app-header'>
        <div className='header-top'>
          <div className='logo'>
            UNA <span>VOCE</span>
          </div>
          <div className='header-icon'>☩</div>
        </div>
        <div className='date-line'>{DATE_LABEL}</div>
      </header>

      <aside className='sidebar' aria-label='Prayer sections'>
        <nav className='sidebar-nav'>
          {SIDEBAR_ITEMS.map((item) =>
            'children' in item ? (
              <div key={item.title} className='sidebar-group'>
                <div className='sidebar-group-label'></div>
                {item.children.map((child) => (
                  <button
                    key={`${item.title}-${child.title}`}
                    type='button'
                    className={`sidebar-item sidebar-subitem${activeDesktopSegment === child.segmentId ? ' active' : ''}`}
                    onClick={() => setActiveDesktopSegment(child.segmentId)}
                  >
                    <span className='sidebar-item-title'>{child.title}</span>
                    {child.subtitle ? (
                      <span className='sidebar-item-subtitle'>
                        {child.subtitle}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <button
                key={item.title}
                type='button'
                className={`sidebar-item${activeDesktopSegment === item.segmentId ? ' active' : ''}`}
                onClick={() => setActiveDesktopSegment(item.segmentId)}
              >
                <span className='sidebar-item-title'>{item.title}</span>
                {item.subtitle ? (
                  <span className='sidebar-item-subtitle'>{item.subtitle}</span>
                ) : null}
              </button>
            ),
          )}
        </nav>
      </aside>

      <main className='office-main'>
        {SEGMENTS.map((segment) => {
          const selectedFormat = selectedFormats[segment.id] ?? 'text';
          const isCollapsed = collapsedSegments[segment.id];
          const isActiveDesktop = activeDesktopSegment === segment.id;

          return (
            <section
              key={segment.id}
              id={segment.id}
              className={`segment${isCollapsed ? ' collapsed' : ''}${isActiveDesktop ? ' active-desktop' : ''}`}
            >
              <button
                type='button'
                className='segment-header'
                onClick={() => toggleSegment(segment.id)}
                aria-expanded={!isCollapsed}
                aria-controls={`${segment.id}-body`}
              >
                <div className='segment-title-area'>
                  <div className='segment-toggle'>⬇</div>
                  <h2 className='segment-title'>{segment.title}</h2>
                </div>
              </button>

              <div className='segment-body' id={`${segment.id}-body`}>
                <div className='active-format-pill'>
                  <span className='active-format-dot' />
                  Viewing: {titleCase(selectedFormat)}
                </div>

                <div className='format-rail'>
                  {FORMATS.map((format) => (
                    <button
                      key={format.key}
                      type='button'
                      className={`format-card ${format.className}${selectedFormat === format.key ? ' selected' : ''}`}
                      onClick={() => setFormat(segment.id, format.key)}
                    >
                      <span>{format.label}</span>
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
                        <div className='liturgy-card-kicker'>{block.label}</div>
                        <h3 className='liturgy-card-title'>{block.title}</h3>
                        {block.citation ? (
                          <div className='liturgy-card-citation'>
                            {block.citation}
                          </div>
                        ) : null}
                        <div className='liturgy-lines'>
                          {block.blocks.map((entry) => (
                            <div
                              key={`${block.label}-${entry.variant}-${entry.lines[0]}`}
                              className={blockClassName(entry.variant)}
                            >
                              {entry.speaker ? (
                                <div className='liturgy-speaker'>
                                  {entry.speaker}
                                </div>
                              ) : null}
                              {entry.lines.map((line) => (
                                <p key={line} className='liturgy-line'>
                                  {line}
                                </p>
                              ))}
                              {entry.citation ? (
                                <div className='liturgy-inline-citation'>
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
                  <h4>Audio</h4>
                  <div className='format-options'>
                    {segment.audio.map((item) => (
                      <article key={item.title} className='format-option'>
                        <div className='option-meta'>{item.meta}</div>
                        <div className='option-title'>{item.title}</div>
                        <p className='option-desc'>{item.description}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div
                  className={`format-output${selectedFormat === 'video' ? '' : ' hidden'}`}
                >
                  <h4>Video</h4>
                  <div className='format-options'>
                    {segment.video.map((item) => (
                      <article key={item.title} className='format-option'>
                        <div className='option-meta'>{item.meta}</div>
                        <div className='option-title'>{item.title}</div>
                        <p className='option-desc'>{item.description}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div
                  className={`format-output${selectedFormat === 'live' ? '' : ' hidden'}`}
                >
                  <h4>Live</h4>
                  {segment.live.map((group) => (
                    <div key={group.title} className='stream-group'>
                      <div className='stream-group-title'>{group.title}</div>
                      <div className='format-options'>
                        {group.items.map((item) => (
                          <article key={item.title} className='format-option'>
                            <div className='option-meta'>{item.meta}</div>
                            <div className='option-title'>{item.title}</div>
                            <p className='option-desc'>{item.description}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </main>

      <nav className='bottom-nav' aria-label='Primary'>
        {NAV_ITEMS.map((item, index) => (
          <div
            key={item.label}
            className={`nav-item${index === 0 ? ' active' : ''}`}
          >
            <div className='nav-icon'>{item.icon}</div>
            <div className='nav-label'>{item.label}</div>
          </div>
        ))}
      </nav>
    </div>
  );
}
