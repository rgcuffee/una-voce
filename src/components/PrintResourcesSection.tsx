import { trackAnalyticsEvent } from '../lib/prayerAnalytics';

type PrintResource = {
  title: string;
  publisher: string;
  format: string;
  description: string;
  bestFor: string;
  image: string;
  imageAlt: string;
  imageSource: string;
  href: string;
  action: string;
  tone: 'warm' | 'plum' | 'rose' | 'leather' | 'dark';
};

const MONTHLY_COMPANIONS: PrintResource[] = [
  {
    title: 'Alto',
    publisher: 'Ascension',
    format: 'Monthly prayer companion',
    description:
      'A day-by-day booklet with the official texts of Morning and Night Prayer, daily Mass readings, Scripture and saint reflections, and a monthly Bible study.',
    bestFor: 'A simple, screen-free way to begin and end the day.',
    image: '/images/print-resources/alto.jpg',
    imageAlt: 'An issue of Alto on a wooden table beside a rosary',
    imageSource: 'https://ascensionpress.com/pages/content-hub/alto',
    href: 'https://ascensionpress.com/pages/content-hub/alto',
    action: 'Explore Alto',
    tone: 'plum',
  },
  {
    title: 'Magnificat',
    publisher: 'Magnificat',
    format: 'Monthly prayer companion',
    description:
      'A pocket-sized companion with daily Mass texts, morning and evening prayers inspired by the Hours, meditations, saints, and sacred art.',
    bestFor: 'Carrying the Church’s prayer into Mass and daily life.',
    image: '/images/print-resources/magnificat.png',
    imageAlt: 'A printed Magnificat issue featuring sacred art on its cover',
    imageSource: 'https://us.magnificat.net/discover/',
    href: 'https://us.magnificat.net/discover/',
    action: 'Explore Magnificat',
    tone: 'warm',
  },
  {
    title: 'Give Us This Day',
    publisher: 'Liturgical Press',
    format: 'Monthly prayer companion',
    description:
      'A Benedictine-rooted monthly with Mass readings, reflections, holy witnesses, and abbreviated morning, evening, and night prayer shaped by the Hours.',
    bestFor: 'A gentle daily rhythm with room for reflection.',
    image: '/images/print-resources/give-us-this-day.jpg',
    imageAlt: 'An open Give Us This Day booklet showing art and morning prayer',
    imageSource: 'https://giveusthisday.org/',
    href: 'https://giveusthisday.org/',
    action: 'Explore Give Us This Day',
    tone: 'rose',
  },
];

const SECOND_EDITION_BOOKS: PrintResource[] = [
  {
    title: 'The Liturgy of the Hours · Ascension',
    publisher: 'Ascension',
    format: 'Second Edition · four volumes',
    description:
      'An edition of the complete, approved English Liturgy of the Hours, with clear page design, durable binding, ribbons, and standard or large-print options. Volume II for Lent and Easter is the first to arrive in 2027.',
    bestFor: 'Praying the full Office from a lasting set of books.',
    image: '/images/print-resources/ascension-hours.jpg',
    imageAlt: 'Ascension Liturgy of the Hours volumes on a wooden table',
    imageSource: 'https://ascensionpress.com/pages/content-hub/liturgy-of-the-hours',
    href: 'https://ascensionpress.com/pages/content-hub/liturgy-of-the-hours',
    action: 'Explore Ascension’s edition',
    tone: 'leather',
  },
  {
    title: 'The Liturgy of the Hours · Word on Fire',
    publisher: 'Word on Fire',
    format: 'Second Edition · four volumes',
    description:
      'A complete new edition designed around readable pages, restored hymnody, sacred art, and richly crafted bindings. Word on Fire is taking preorders ahead of its 2027 volume releases.',
    bestFor: 'A full breviary with a strong emphasis on art and craft.',
    image: '/images/print-resources/word-on-fire-hours.webp',
    imageAlt: 'A black Word on Fire Liturgy of the Hours volume with gold lettering',
    imageSource: 'https://www.liturgyofthehours.com/',
    href: 'https://www.liturgyofthehours.com/',
    action: 'Explore Word on Fire’s edition',
    tone: 'dark',
  },
];

function ResourceCard({ resource }: { resource: PrintResource }) {
  return (
    <article className={`print-resource-card print-resource-card--${resource.tone}`}>
      <div className='print-resource-image'>
        <img src={resource.image} alt={resource.imageAlt} loading='lazy' decoding='async' />
        <span className='print-resource-format'>{resource.format}</span>
      </div>
      <div className='print-resource-content'>
        <p className='print-resource-publisher'>{resource.publisher}</p>
        <h4>{resource.title}</h4>
        <p className='print-resource-description'>{resource.description}</p>
        <p className='print-resource-best-for'><strong>Good for</strong> {resource.bestFor}</p>
        <a
          className='print-resource-action'
          href={resource.href}
          target='_blank'
          rel='noopener noreferrer'
          onClick={() =>
            trackAnalyticsEvent('community_outbound_clicked', {
              pageContext: 'discover_print_resource',
              contentId: resource.title,
              contentType: 'external_resource',
              sourceUrl: resource.href,
              metadata: { cardTitle: resource.title, cardMeta: resource.format, source: 'curated' },
            })
          }
        >
          {resource.action} <span aria-hidden='true'>↗</span>
        </a>
        <small className='print-resource-credit'>Photo: <a href={resource.imageSource} target='_blank' rel='noopener noreferrer'>{resource.publisher}</a></small>
      </div>
    </article>
  );
}

export function PrintResourcesSection() {
  return (
    <section className='page-section print-resources-section' id='print-prayer-resources' aria-labelledby='print-resources-title'>
      <div className='print-resources-intro'>
        <span className='print-resources-eyebrow'>For the prayer book in your hands</span>
        <h2 id='print-resources-title'>Make room for prayer on the page</h2>
        <p>Some people begin with a few quiet minutes. Others are ready for the complete daily Office. These printed companions offer different ways to pray with the Church, away from a screen.</p>
      </div>

      <div className='print-resource-group'>
        <div className='print-resource-group-heading'>
          <h3>Monthly companions</h3>
          <p>Arranged by date, ready to open and pray.</p>
        </div>
        <div className='print-resource-grid print-resource-grid--monthly'>
          {MONTHLY_COMPANIONS.map((resource) => <ResourceCard key={resource.title} resource={resource} />)}
        </div>
      </div>

      <div className='print-resource-group'>
        <div className='print-resource-group-heading'>
          <h3>The complete Hours, in a new edition</h3>
          <p>Two forthcoming four-volume editions of the approved Second Edition. Preorders are open; volumes begin releasing in 2027.</p>
        </div>
        <div className='print-resource-grid print-resource-grid--books'>
          {SECOND_EDITION_BOOKS.map((resource) => <ResourceCard key={resource.title} resource={resource} />)}
        </div>
      </div>

      <div className='print-resources-note'>
        <strong>Already praying with a breviary?</strong> The current four-volume set, <em>Christian Prayer</em>, and <em>Shorter Christian Prayer</em> remain familiar paths. <a href='https://catholicbookpublishing.com/collections/liturgy-of-the-hours' target='_blank' rel='noopener noreferrer'>Browse the current editions ↗</a>
      </div>
      <p className='print-resources-disclaimer'>Curated independently for discovery. Product links lead to their publishers; publication details and availability may change. Una Voce intends to use approved liturgical texts subject to the proper permissions and regional timelines as new editions are promulgated.</p>
    </section>
  );
}
