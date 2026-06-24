import type { ViewNavigator } from '../navigation';

type StreamCard = {
  meta: string;
  title: string;
  description: string;
  time: string;
  image: string;
};

const UPCOMING: StreamCard[] = [
  {
    meta: 'Monastery Live',
    title: 'Clear Creek Monastery · Vespers',
    description:
      'Live chapel stream of Evening Prayer with shared responses and final blessing.',
    time: 'Today, 5:00 PM',
    image:
      'https://plus.unsplash.com/premium_photo-1679051422153-2ea3c8cfe9ed?q=80&w=2070&auto=format&fit=crop',
  },
  {
    meta: 'Creator Live',
    title: 'The Little Oratory · Compline Together',
    description:
      'Close the day with a guided Night Prayer and an opening hymn.',
    time: 'Today, 9:00 PM',
    image:
      'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1400&q=80',
  },
];

const PREVIOUS: StreamCard[] = [
  {
    meta: 'Archived Live',
    title: 'Benedictine Sisters · Lauds Replay',
    description:
      'Replay of a full live stream with psalm responses and intercessions.',
    time: 'Earlier today, 6:00 AM',
    image:
      'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1400&q=80',
  },
];

function StreamGrid({ items }: { items: StreamCard[] }) {
  return (
    <div className='format-options'>
      {items.map((item) => (
        <article
          key={item.title}
          className='format-option format-option-media'
          style={{
            backgroundImage: `linear-gradient(165deg, rgba(16, 13, 12, 0.26), rgba(16, 13, 12, 0.82)), url(${item.image})`,
          }}
        >
          <div className='option-meta'>{item.meta}</div>
          <div className='option-title'>{item.title}</div>
          <p className='option-desc'>{item.description}</p>
          <div className='stream-time'>{item.time}</div>
        </article>
      ))}
    </div>
  );
}

export function LivePage({ onNavigate }: { onNavigate: ViewNavigator }) {
  return (
    <article className='page'>
      <header className='page-hero'>
        <div className='page-eyebrow'>Live</div>
        <h1 className='page-hero-title'>The Church prays as one body</h1>
        <p className='page-lead'>
          Real-time streams from communities around the world celebrating
          Vespers, Compline, and more. Pray with a monastery at Evening Prayer,
          or close your night with a community across the globe.
        </p>
      </header>

      <section className='page-section'>
        <h2 className='page-section-title'>Upcoming</h2>
        <StreamGrid items={UPCOMING} />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Previous streams</h2>
        <StreamGrid items={PREVIOUS} />
      </section>

      <div className='page-cta'>
        <button
          type='button'
          className='page-cta-link'
          onClick={() => onNavigate('today')}
        >
          Pray today's hours on your own
        </button>
      </div>
    </article>
  );
}
