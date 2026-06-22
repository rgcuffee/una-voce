import { useEffect, useState } from 'react';

type FormatKey = 'text' | 'audio' | 'video' | 'live';

type PrayerBlock = {
  label: string;
  latin?: string;
  english: string;
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
  time: string;
  text: PrayerBlock[];
  audio: OptionItem[];
  video: OptionItem[];
  live: {
    title: string;
    items: OptionItem[];
  }[];
};

const SEGMENTS: Segment[] = [
  {
    id: 'segment-morning',
    title: 'Morning Prayer',
    time: '6:00 AM',
    text: [
      {
        label: 'Invitatory Antiphon',
        latin: 'Domine, labia mea aperies.',
        english: 'Open my lips, O Lord, and my mouth will declare your praise.',
      },
      {
        label: 'Psalm 95',
        latin: 'Venite, exsultemus Domino; iubilemus Deo, salutari nostro...',
        english:
          'Come, let us sing joyfully to the Lord; cry out to the God of our salvation...',
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
    id: 'segment-midday',
    title: 'Midday Prayer',
    time: '12:00 PM',
    text: [
      {
        label: 'Opening',
        latin:
          'Deus, in adiutorium meum intende; Domine, ad adiuvandum me festina.',
        english: 'O God, come to my assistance; O Lord, make haste to help me.',
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
          'Convent-led Midday Prayer video stream archive with visible response pacing.',
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
    id: 'segment-evening',
    title: 'Evening Prayer',
    time: '6:00 PM',
    text: [
      {
        label: 'Magnificat',
        latin:
          'Magnificat anima mea Dominum; et exsultavit spiritus meus in Deo salutari meo...',
        english:
          'My soul proclaims the greatness of the Lord; my spirit rejoices in God my Savior...',
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
    time: '9:00 PM',
    text: [
      {
        label: 'Nunc Dimittis',
        latin:
          'Nunc dimittis servum tuum, Domine, secundum verbum tuum in pace...',
        english:
          'Now, Master, you may let your servant go in peace, according to your word...',
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
    time: 'Any time',
    text: [
      {
        label: 'First Reading',
        english:
          'From the Letter to the Romans: present your bodies as a living sacrifice, holy and acceptable to God...',
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
        {SEGMENTS.map((segment) => (
          <button
            key={segment.id}
            type='button'
            className={`sidebar-item${activeDesktopSegment === segment.id ? ' active' : ''}`}
            onClick={() => setActiveDesktopSegment(segment.id)}
          >
            {segment.title}
          </button>
        ))}
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
                <div className='segment-time'>{segment.time}</div>
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
                  {segment.text.map((block) => (
                    <div key={block.label} className='prayer-block'>
                      <span className='prayer-label'>{block.label}</span>
                      {block.latin ? (
                        <p className='prayer-content latin'>{block.latin}</p>
                      ) : null}
                      <p className='prayer-content'>{block.english}</p>
                    </div>
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
                            {item.time ? (
                              <div className='stream-time'>{item.time}</div>
                            ) : null}
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
