export type ParishResourceCategory =
  | 'getting-started'
  | 'bulletin-social'
  | 'prayer-challenges'
  | 'small-groups'
  | 'ocia'
  | 'families'
  | 'parish-staff'
  | 'music-ministry'
  | 'website-widgets'
  | 'advent-lent';

export type ParishResourceType =
  | 'article'
  | 'download'
  | 'template'
  | 'challenge'
  | 'widget'
  | 'guide';

export type ParishResource = {
  slug: string;
  title: string;
  summary: string;
  category: ParishResourceCategory;
  resourceType: ParishResourceType;
  audience: string[];
  estimatedTime?: string;
  featured?: boolean;
  status: 'available' | 'coming-soon';
  href?: string;
  downloadHref?: string;
  tags?: string[];
};

export type ChallengeChecklistSection = {
  label: string;
  items: string[];
};

export type ParishChallenge = {
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  durationDays: number;
  primaryHour: 'morning' | 'evening' | 'night' | 'mixed';
  audience: string[];
  estimatedDailyMinutes: number;
  leaderChecklist: ChallengeChecklistSection[];
  participantSteps: string[];
  dailyReminders: {
    day: number;
    title?: string;
    copy: string;
  }[];
  bulletinCopy: string[];
  emailCopy?: string;
  socialCopy: string[];
  surveyQuestions: string[];
  status: 'available' | 'coming-soon';
};

export type CopyTemplate = {
  slug: string;
  title: string;
  description?: string;
  body: string;
  placeholders?: string[];
};

export type ParishResourceGuide = {
  slug: string;
  title: string;
  eyebrow: string;
  intro: string;
  estimatedTime?: string;
  sections: {
    title: string;
    body?: string;
    items?: string[];
  }[];
};

export const PARISH_CATEGORY_LABELS: Record<ParishResourceCategory, string> = {
  'getting-started': 'Getting Started',
  'bulletin-social': 'Bulletin and Social',
  'prayer-challenges': 'Prayer Challenges',
  'small-groups': 'Small Groups',
  ocia: 'OCIA',
  families: 'Families',
  'parish-staff': 'Parish Staff',
  'music-ministry': 'Music Ministry',
  'website-widgets': 'Website Widgets',
  'advent-lent': 'Advent and Lent',
};

export const RESOURCE_TYPE_LABELS: Record<ParishResourceType, string> = {
  article: 'Article',
  download: 'Download',
  template: 'Template',
  challenge: 'Challenge',
  widget: 'Widget',
  guide: 'Guide',
};

export const PARISH_FILTERS = [
  { value: 'all', label: 'All' },
  ...Object.entries(PARISH_CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
] as const;

export const PARISH_RESOURCES: ParishResource[] = [
  {
    slug: 'what-is-the-liturgy-of-the-hours',
    title: 'What is the Liturgy of the Hours?',
    category: 'getting-started',
    resourceType: 'article',
    summary:
      'A plain-language introduction parish leaders can share with parishioners who are encountering the daily prayer of the Church for the first time.',
    audience: ['All parishioners', 'OCIA', 'small groups'],
    estimatedTime: '5 min read',
    status: 'available',
    href: '/start',
    tags: ['beginner', 'introduction', 'daily prayer'],
  },
  {
    slug: 'why-begin-with-morning-and-night-prayer',
    title: 'Why begin with Morning and Night Prayer?',
    category: 'getting-started',
    resourceType: 'article',
    summary:
      'A simple explanation of why new participants do not need to begin by praying all seven Hours.',
    audience: ['Beginners', 'challenge participants'],
    estimatedTime: '4 min read',
    status: 'available',
    href: '/start',
    tags: ['morning prayer', 'night prayer', 'beginner'],
  },
  {
    slug: 'five-bulletin-announcements',
    title: 'Five bulletin announcements introducing the Hours',
    category: 'bulletin-social',
    resourceType: 'template',
    summary:
      'Ready-to-use bulletin copy ranging from a short invitation to a full parish challenge announcement.',
    audience: ['Parish staff', 'communications teams'],
    estimatedTime: 'Ready to copy',
    featured: true,
    status: 'available',
    href: '/parishes?search=bulletin',
    tags: ['bulletin', 'copy', 'announcement'],
  },
  {
    slug: 'parish-pulpit-announcement',
    title: 'Parish pulpit announcement',
    category: 'bulletin-social',
    resourceType: 'template',
    summary:
      'A brief spoken invitation a pastor, deacon, or ministry leader can use at Mass.',
    audience: ['Pastors', 'deacons', 'parish leaders'],
    estimatedTime: '1 min read aloud',
    status: 'available',
    href: '/parishes?search=pulpit',
    tags: ['pulpit', 'announcement', 'Mass'],
  },
  {
    slug: 'night-prayer-7-days',
    title: 'Seven Days of Night Prayer',
    category: 'prayer-challenges',
    resourceType: 'challenge',
    summary:
      'A complete beginner-friendly parish challenge centered on the Churchs prayer before sleep.',
    audience: ['Whole parish', 'families', 'OCIA', 'small groups'],
    estimatedTime: '10 min daily',
    featured: true,
    status: 'available',
    href: '/parishes/challenges/night-prayer-7-days',
    tags: ['night prayer', 'compline', 'challenge'],
  },
  {
    slug: 'morning-prayer-14-days',
    title: 'Fourteen Days of Morning Prayer',
    category: 'prayer-challenges',
    resourceType: 'challenge',
    summary:
      'A two-week campaign helping participants begin the day with psalms, Scripture, intercessions, and the Canticle of Zechariah.',
    audience: ['Whole parish', 'adults', 'small groups'],
    estimatedTime: '15-20 min daily',
    status: 'coming-soon',
    href: '/parishes/challenges/morning-prayer-14-days',
    tags: ['morning prayer', 'lauds', 'challenge'],
  },
  {
    slug: 'start-a-prayer-community',
    title: 'How to start a weekly Vespers group',
    category: 'small-groups',
    resourceType: 'guide',
    summary:
      'A practical guide to scheduling, leading, welcoming newcomers, and choosing a trusted prayer source.',
    audience: ['Lay leaders', 'deacons', 'music ministers'],
    estimatedTime: '8 min read',
    status: 'available',
    href: '/parishes/resources/start-a-prayer-community',
    tags: ['vespers', 'small group', 'leader guide'],
  },
  {
    slug: 'online-parish-prayer',
    title: 'How to organize online parish prayer',
    category: 'small-groups',
    resourceType: 'guide',
    summary:
      'Suggestions for using Zoom or another meeting platform for recurring Morning Prayer, Evening Prayer, or Night Prayer.',
    audience: ['Parish leaders', 'volunteers'],
    estimatedTime: '6 min read',
    status: 'available',
    href: '/parishes/resources/start-a-prayer-community',
    tags: ['online', 'Zoom', 'volunteers'],
  },
  {
    slug: 'night-prayer-for-ocia',
    title: 'Night Prayer for OCIA',
    category: 'ocia',
    resourceType: 'guide',
    summary:
      'A short OCIA session plan that introduces the Hours and concludes with Night Prayer together.',
    audience: ['OCIA leaders and sponsors'],
    estimatedTime: '30-45 min session',
    featured: true,
    status: 'available',
    href: '/parishes/resources/night-prayer-for-ocia',
    tags: ['OCIA', 'session plan', 'night prayer'],
  },
  {
    slug: 'introducing-the-hours-to-families',
    title: 'Introducing the Hours to families',
    category: 'families',
    resourceType: 'guide',
    summary:
      'Simple ways households can begin with Night Prayer, a psalm, or one Gospel canticle without creating an unrealistic routine.',
    audience: ['Parents', 'grandparents', 'family ministry'],
    estimatedTime: '6 min read',
    status: 'available',
    href: '/parishes/resources/introducing-the-hours-to-families',
    tags: ['families', 'children', 'night prayer'],
  },
  {
    slug: 'prayer-before-parish-meetings',
    title: 'Begin parish meetings with the prayer of the Church',
    category: 'parish-staff',
    resourceType: 'guide',
    summary:
      'Suggestions for using Midday Prayer, Evening Prayer, or a brief portion of an Hour at staff meetings and ministry gatherings.',
    audience: ['Parish staff', 'councils', 'ministry leaders'],
    estimatedTime: '5 min read',
    status: 'available',
    href: '/parishes/resources/prayer-before-parish-meetings',
    tags: ['meetings', 'staff', 'ministry'],
  },
  {
    slug: 'starting-sung-vespers',
    title: 'Starting sung Vespers at your parish',
    category: 'music-ministry',
    resourceType: 'guide',
    summary:
      'An introductory guide for parishes interested in occasional or recurring sung Evening Prayer.',
    audience: ['Music directors', 'clergy', 'liturgy committees'],
    estimatedTime: 'Coming soon',
    status: 'coming-soon',
    tags: ['music', 'vespers', 'cantor'],
  },
  {
    slug: 'pray-today-widget',
    title: 'Pray Today website widget',
    category: 'website-widgets',
    resourceType: 'widget',
    summary:
      'Embed a simple daily prayer entry point on a parish website using trusted sources curated by Una Voce.',
    audience: ['Parish communications staff', 'web administrators'],
    estimatedTime: 'Preview available',
    status: 'available',
    href: '/parishes/widgets',
    tags: ['widget', 'embed', 'website'],
  },
  {
    slug: 'advent-parish-prayer-challenge',
    title: 'Advent parish prayer challenge',
    category: 'advent-lent',
    resourceType: 'challenge',
    summary:
      'A seasonal campaign inviting parishioners to keep watch with Morning Prayer, Evening Prayer, or Night Prayer during Advent.',
    audience: ['Whole parish'],
    estimatedTime: 'Coming soon',
    status: 'coming-soon',
    tags: ['Advent', 'seasonal', 'challenge'],
  },
  {
    slug: 'lent-with-the-psalms',
    title: 'Lent with the Psalms',
    category: 'advent-lent',
    resourceType: 'challenge',
    summary:
      'A Lenten invitation to enter the prayer of Christ and the Church through a consistent daily Hour.',
    audience: ['Whole parish', 'small groups', 'OCIA'],
    estimatedTime: 'Coming soon',
    status: 'coming-soon',
    tags: ['Lent', 'psalms', 'challenge'],
  },
];

export const PARISH_COPY_TEMPLATES: CopyTemplate[] = [
  {
    slug: 'bulletin-short',
    title: 'Bulletin Announcement 1 - Short',
    body: `Discover the Liturgy of the Hours

The Liturgy of the Hours is the daily prayer of the Church, prayed throughout the world by clergy, religious, and lay Catholics. You do not need to begin by praying every Hour. Many people start with Morning Prayer or Night Prayer. Visit Una Voce to find trusted audio, video, and live prayer resources and learn how to begin.`,
  },
  {
    slug: 'bulletin-night-prayer-challenge',
    title: 'Bulletin Announcement 2 - Night Prayer Challenge',
    body: `Join Our Seven Days of Night Prayer Challenge

Our parish is inviting everyone to end the day with Night Prayer for one week. Night Prayer is a short and peaceful part of the Liturgy of the Hours, the daily prayer of the Church. No previous experience is needed, and simple audio and video options will be provided through Una Voce.

The challenge begins [DATE]. Visit [PARISH LINK] or scan the QR code to participate.`,
    placeholders: ['[DATE]', '[PARISH LINK]'],
  },
  {
    slug: 'bulletin-morning-prayer-challenge',
    title: 'Bulletin Announcement 3 - Morning Prayer Challenge',
    body: `Begin the Day with the Prayer of the Church

Join our parish for fourteen days of Morning Prayer. Each day, Catholics throughout the world begin with psalms, Scripture, intercessions, and the Canticle of Zechariah. Participants may pray individually, use an audio guide, or join a parish gathering.

The challenge begins [DATE]. Learn more at [PARISH LINK].`,
    placeholders: ['[DATE]', '[PARISH LINK]'],
  },
  {
    slug: 'bulletin-general-invitation',
    title: 'Bulletin Announcement 4 - General Invitation',
    body: `You Are Invited to Pray the Liturgy of the Hours

The Liturgy of the Hours belongs to the prayer life of the whole Church. Whether you are completely new to it or already pray regularly, Una Voce can help you discover trusted ways to pray through audio, video, and live communities.

Start simply. You do not have to pray all seven Hours. Most beginners begin with Morning Prayer and Night Prayer.`,
  },
  {
    slug: 'bulletin-small-group',
    title: 'Bulletin Announcement 5 - Small Group',
    body: `Interested in a Parish Prayer Group?

We are exploring a recurring parish gathering for Morning Prayer, Evening Prayer, or Night Prayer. The group would be open to beginners and experienced participants alike. No special knowledge is required.

To express interest, contact [NAME] at [EMAIL] or visit [PARISH LINK].`,
    placeholders: ['[NAME]', '[EMAIL]', '[PARISH LINK]'],
  },
  {
    slug: 'pulpit-announcement',
    title: 'Pulpit Announcement',
    body: `Our parish is beginning a simple invitation to discover the Liturgy of the Hours, the daily prayer of the Church. Priests, deacons, religious, and lay Catholics throughout the world join in this prayer each day.

You do not need to begin by praying every Hour or learning everything at once. We are starting with [Night Prayer / Morning Prayer] for [seven / fourteen] days. Instructions and trusted prayer resources are available at [PARISH LINK]. We hope you will join us.`,
    placeholders: [
      '[Night Prayer / Morning Prayer]',
      '[seven / fourteen]',
      '[PARISH LINK]',
    ],
  },
  {
    slug: 'parish-email-invitation',
    title: 'Parish Email Invitation',
    body: `Subject: Join our parish prayer challenge

Dear Parishioners,

We invite you to join our parish for [Seven Days of Night Prayer / Fourteen Days of Morning Prayer].

The Liturgy of the Hours is the daily prayer of the Church, prayed throughout the world in psalms, Scripture, intercessions, silence, and praise. This challenge is designed for beginners, and no previous experience is needed.

You may participate individually, use one of the trusted audio or video prayer options provided through Una Voce, or join our parish gathering at [TIME AND LOCATION].

The challenge begins [DATE].

Learn more and participate:
[PARISH LINK]

We learn to pray by praying. We hope this simple invitation helps our parish enter more deeply into the prayer of the Church.`,
    placeholders: [
      '[Seven Days of Night Prayer / Fourteen Days of Morning Prayer]',
      '[TIME AND LOCATION]',
      '[DATE]',
      '[PARISH LINK]',
    ],
  },
  {
    slug: 'social-caption-1',
    title: 'Social Caption 1',
    body: `Join our parish for Seven Days of Night Prayer.

Night Prayer is a short and peaceful way to end the day with the prayer of the Church. No previous experience is needed.

Beginning [DATE].

Learn more: [LINK]`,
    placeholders: ['[DATE]', '[LINK]'],
  },
  {
    slug: 'social-caption-2',
    title: 'Social Caption 2',
    body: `You do not have to pray all seven Hours to begin.

Join our parish for [Morning Prayer / Night Prayer] and discover the daily prayer of the Church one step at a time.

[DATE]
[LINK]`,
    placeholders: ['[Morning Prayer / Night Prayer]', '[DATE]', '[LINK]'],
  },
  {
    slug: 'social-caption-3',
    title: 'Social Caption 3',
    body: `The Church is praying throughout the day.

This week, our parish is joining that prayer through [Night Prayer / Morning Prayer / Evening Prayer].

Start here: [LINK]`,
    placeholders: ['[Night Prayer / Morning Prayer / Evening Prayer]', '[LINK]'],
  },
];

export const NIGHT_PRAYER_CHALLENGE: ParishChallenge = {
  slug: 'night-prayer-7-days',
  title: 'Seven Days of Night Prayer',
  shortTitle: 'Night Prayer',
  summary:
    'A simple parish challenge for ending each day with the prayer of the Church.',
  durationDays: 7,
  primaryHour: 'night',
  audience: ['Whole parish', 'families', 'OCIA', 'small groups'],
  estimatedDailyMinutes: 10,
  status: 'available',
  participantSteps: [
    'Choose a consistent time each evening.',
    'Open the parish challenge page or Una Voce prayer page.',
    'Select one trusted Night Prayer source.',
    'Pray for seven consecutive days.',
    'Do not worry about mastering every part immediately.',
    'At the end of the week, decide whether Night Prayer could remain part of your routine.',
  ],
  leaderChecklist: [
    {
      label: 'Three to four weeks before',
      items: [
        'Confirm the challenge dates.',
        'Choose whether participation will be individual, in person, online, or hybrid.',
        'Create the parish challenge page.',
        'Assign one staff member or volunteer as the contact.',
        'Select the prayer sources that will be recommended.',
      ],
    },
    {
      label: 'Two weeks before',
      items: [
        'Add the bulletin announcement.',
        'Share the challenge through parish email and social media.',
        'Print QR cards.',
        'Invite ministry leaders and OCIA participants directly.',
      ],
    },
    {
      label: 'Launch weekend',
      items: [
        'Make the pulpit announcement.',
        'Place QR cards at church exits.',
        'Share the direct challenge link.',
        'Explain that no prior experience is required.',
      ],
    },
    {
      label: 'During the challenge',
      items: [
        'Send one brief daily reminder.',
        'Offer optional live prayer at least once.',
        'Respond to participant questions.',
        'Encourage participants who miss a day simply to continue.',
      ],
    },
    {
      label: 'After the challenge',
      items: [
        'Send the end-of-challenge survey.',
        'Invite participants to continue Night Prayer.',
        'Consider starting a weekly parish gathering.',
      ],
    },
  ],
  dailyReminders: [
    {
      day: 1,
      copy: 'Tonight we begin Seven Days of Night Prayer. Choose a quiet time, open the prayer link, and simply follow along. You do not need to understand every part before you begin.',
    },
    {
      day: 2,
      copy: 'Return to Night Prayer this evening, even if yesterday felt unfamiliar. The structure becomes more natural through repetition.',
    },
    {
      day: 3,
      copy: 'Night Prayer gives us words for gratitude, repentance, trust, and rest. Bring the whole day before God tonight.',
    },
    {
      day: 4,
      copy: 'Halfway through the challenge, notice one part of Night Prayer that is beginning to feel familiar: a psalm, the reading, the Canticle of Simeon, or the final blessing.',
    },
    {
      day: 5,
      copy: 'The Liturgy of the Hours is not only private devotion. When you pray tonight, you join the prayer of the Church throughout the world.',
    },
    {
      day: 6,
      copy: 'Missing a day does not mean the challenge has failed. Return tonight and continue. The goal is not perfection, but a faithful beginning.',
    },
    {
      day: 7,
      copy: 'Tonight completes the challenge. After praying, consider whether Night Prayer could become a regular part of your week or daily routine.',
    },
  ],
  bulletinCopy: PARISH_COPY_TEMPLATES.filter((template) =>
    template.slug.startsWith('bulletin'),
  ).map((template) => template.body),
  emailCopy: PARISH_COPY_TEMPLATES.find(
    (template) => template.slug === 'parish-email-invitation',
  )?.body,
  socialCopy: PARISH_COPY_TEMPLATES.filter((template) =>
    template.slug.startsWith('social'),
  ).map((template) => template.body),
  surveyQuestions: [
    'Did Night Prayer become easier to follow during the week?',
    'Which prayer format did you use most often?',
    'What time of day worked best?',
    'Would you continue Night Prayer after the challenge?',
    'Would you join a recurring parish prayer group?',
    'What made participation difficult?',
  ],
};

export const MORNING_PRAYER_CHALLENGE: ParishChallenge = {
  slug: 'morning-prayer-14-days',
  title: 'Fourteen Days of Morning Prayer',
  shortTitle: 'Morning Prayer',
  summary:
    'Begin the day with the prayer of the Church for two weeks. Morning Prayer, traditionally called Lauds, brings together psalms, Scripture, intercessions, the Lords Prayer, and the Canticle of Zechariah.',
  durationDays: 14,
  primaryHour: 'morning',
  audience: ['Whole parish', 'adults', 'small groups'],
  estimatedDailyMinutes: 18,
  status: 'coming-soon',
  participantSteps: [],
  leaderChecklist: [],
  dailyReminders: [],
  bulletinCopy: [],
  socialCopy: [],
  surveyQuestions: [],
};

export const PARISH_RESOURCE_GUIDES: ParishResourceGuide[] = [
  {
    slug: 'start-a-prayer-community',
    eyebrow: 'Small Groups',
    title: 'Start a parish Liturgy of the Hours community',
    intro:
      'A parish prayer community can begin with a small group. It does not need to launch with a full schedule of daily Hours, trained cantors, or a large ministry structure.',
    sections: [
      {
        title: 'Weekly Evening Prayer',
        body: 'Meet once per week for Vespers. This works well before an evening parish event, on Sunday evenings, or as a standalone gathering.',
      },
      {
        title: 'Daily Online Prayer',
        body: 'Offer Morning Prayer or Night Prayer through Zoom or another meeting platform. Different volunteers can host on different days.',
      },
      {
        title: 'Monthly Sung Vespers',
        body: 'Begin with one solemn celebration each month and expand only if there is consistent interest and adequate leadership.',
      },
      {
        title: 'Seasonal Prayer Group',
        body: 'Gather during Advent or Lent for a defined period. A seasonal group can later become ongoing.',
      },
      {
        title: 'Suggested volunteer roles',
        items: [
          'Coordinator: Manages schedule, communication, and parish coordination.',
          'Prayer leader: Opens the gathering, selects the source, and helps participants follow the structure.',
          'Hospitality volunteer: Welcomes newcomers and answers practical questions.',
          'Technical host: Manages Zoom, audio, screens, or parish website links.',
          'Music leader: Optional role for sung prayer.',
        ],
      },
      {
        title: 'Sample meeting format',
        items: [
          '5 minutes: Welcome and brief orientation for newcomers.',
          '10 to 20 minutes: Pray the selected Hour.',
          '5 minutes: Silence, announcements, or a brief reflection.',
          'Optional: Fellowship after the prayer.',
        ],
      },
      {
        title: 'Sample ministry description',
        body: 'The [PARISH NAME] Liturgy of the Hours community helps parishioners enter more deeply into the daily prayer of the Church. We gather for [Morning Prayer / Evening Prayer / Night Prayer] and welcome both beginners and those who already pray regularly. No previous experience is required.',
      },
    ],
  },
  {
    slug: 'night-prayer-for-ocia',
    eyebrow: 'OCIA',
    title: 'Night Prayer for OCIA',
    intro:
      'A 30 to 45 minute session plan that introduces the Liturgy of the Hours and concludes by praying Night Prayer together.',
    estimatedTime: '30 to 45 minutes',
    sections: [
      {
        title: 'Objectives',
        items: [
          'Understand that the Liturgy of the Hours is the prayer of the whole Church.',
          'Recognize that lay Catholics are invited to participate.',
          'Experience one complete Hour together.',
          'Learn that beginners can start with one Hour rather than the full daily cycle.',
        ],
      },
      {
        title: 'Session outline',
        items: [
          '5 minutes: Ask participants what rhythms of daily prayer they already know.',
          '10 minutes: Introduce prayer offered throughout the day, rooted in psalms and Scripture, prayed by clergy, religious, and lay Catholics.',
          '5 minutes: Explain the basic shape of Night Prayer.',
          '10 to 15 minutes: Pray Night Prayer together using one trusted source.',
          '5 minutes: Invite reflection on what felt familiar, what felt new, and whether this could fit into daily life.',
        ],
      },
      {
        title: 'Leader note',
        body: 'Avoid spending most of the session explaining rubrics or editions. The goal is to help participants experience the prayer. We learn to pray by praying.',
      },
    ],
  },
  {
    slug: 'introducing-the-hours-to-families',
    eyebrow: 'Families',
    title: 'Introducing the Liturgy of the Hours to families',
    intro:
      'Help households begin with a short, repeatable rhythm instead of an unrealistic daily plan.',
    sections: [
      {
        title: 'Core principles',
        items: [
          'Begin with a short and repeatable rhythm.',
          'Night Prayer is often the easiest family starting point.',
          'Young children do not need to remain still or understand every word.',
          'A family may begin with one psalm, the Gospel canticle, and a closing prayer.',
          'Consistency is more important than length.',
          'Use audio when it helps the household participate.',
        ],
      },
      {
        title: 'Suggested family formats',
        items: [
          'Full Night Prayer for older children or families comfortable with ten minutes of structured prayer.',
          'One psalm and the Canticle of Simeon as a shorter introduction for younger children.',
          'Sunday Evening Prayer as a weekly family rhythm before attempting daily prayer.',
          'Audio prayer at bedtime so children can listen or join in refrains.',
        ],
      },
    ],
  },
  {
    slug: 'prayer-before-parish-meetings',
    eyebrow: 'Parish Staff',
    title: 'Begin parish meetings with the prayer of the Church',
    intro:
      'Parish staff, councils, and ministry teams can begin meetings with the prayer of the Church rather than relying only on an improvised opening prayer.',
    sections: [
      {
        title: 'Use a realistic format',
        body: 'Depending on the time of day, a group may pray Midday Prayer, Evening Prayer, or a selected portion of an Hour. Keep the practice realistic for the meeting length and provide a clear link or printed guide in advance.',
      },
      {
        title: 'Options',
        items: [
          'Full Hour: Use when the prayer is central to the gathering.',
          'Psalm and reading: Use when the meeting schedule is limited.',
          'Gospel canticle and intercessions: Use when introducing the structure gradually.',
          'Seasonal practice: Use the full Hour during Advent, Lent, retreats, or planning days.',
        ],
      },
    ],
  },
];
