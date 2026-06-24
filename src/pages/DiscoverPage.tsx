import type { ViewNavigator } from '../navigation';

type MediaCard = {
  meta: string;
  title: string;
  description: string;
  image: string;
};

const AUDIO: MediaCard[] = [
  {
    meta: 'Podcast',
    title: 'Una Voce Daily Office Audio',
    description:
      'Straight-through narrated Morning Prayer with psalm pauses for personal response.',
    image:
      'https://images.unsplash.com/photo-1524678714210-9917a6c619c2?auto=format&fit=crop&w=1400&q=80',
  },
  {
    meta: 'Abbey Feed',
    title: 'Saint Benedict Abbey Audio Office',
    description:
      'Monastic-style spoken audio with chapel ambience and structured intercessions.',
    image:
      'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1400&q=80',
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
  },
  {
    meta: 'Monastery',
    title: 'Clear Creek Monastery Video Office',
    description:
      'Chapel-captured Morning Prayer video with natural acoustics and full liturgical flow.',
    image:
      'https://images.unsplash.com/photo-1597839977601-52b29c114af5?q=80&w=2054&auto=format&fit=crop',
  },
];

function MediaGrid({ items }: { items: MediaCard[] }) {
  return (
    <div className='format-options'>
      {items.map((item) => (
        <article
          key={item.title}
          className='format-option format-option-media'
          style={{
            backgroundImage: `linear-gradient(165deg, rgba(12, 11, 9, 0.2), rgba(12, 11, 9, 0.78)), url(${item.image})`,
          }}
        >
          <div className='option-meta'>{item.meta}</div>
          <div className='option-title'>{item.title}</div>
          <p className='option-desc'>{item.description}</p>
        </article>
      ))}
    </div>
  );
}

export function DiscoverPage({ onNavigate }: { onNavigate: ViewNavigator }) {
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
        <h2 className='page-section-title'>Audio</h2>
        <MediaGrid items={AUDIO} />
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Video</h2>
        <MediaGrid items={VIDEO} />
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
