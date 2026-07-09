import { PartnerBadge } from '../components/PartnerBadge';
import type { ViewNavigator } from '../navigation';

const FEATURED_RESOURCES = [
  {
    name: 'Worth Abbey',
    description: 'Monastic livestreams and replays from a Benedictine abbey.',
    image:
      'https://yt3.googleusercontent.com/ytc/AIdro_nDVgAvWHZwb_ynblsEyXIEEU1-No0mhPCHLvkD2ZunFA=s900-c-k-c0x00ffffff-no-rj',
    badge: 'verified' as const,
  },
  {
    name: 'Cathaholic Music',
    description: 'Sung Lauds and Vespers with visual prayer guides.',
    image:
      'https://yt3.googleusercontent.com/gnRvpLHI4h1DWvbRsssdE14PIKIUMy6afiLpMxqJRK8gBo3CD-YS925FAFwywN_62bB5ARtnL3U=s900-c-k-c0x00ffffff-no-rj',
    badge: 'verified' as const,
  },
  {
    name: 'Sing the Hours',
    description: 'Chant-led Morning and Evening Prayer for praying along.',
    image:
      'https://yt3.googleusercontent.com/MovqVdp8AFW-7L83SwoxAGf50Y_F9OTSdSyitDCZ-pEvBBMfy-uV27X3o6eKlnszI5weOkxO4Q=s900-c-k-c0x00ffffff-no-rj',
    badge: 'curated' as const,
  },
];

export function HomePage({ onNavigate }: { onNavigate: ViewNavigator }) {
  return (
    <article className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div>
          <div className="page-eyebrow">Una Voce</div>
          <h1 id="home-hero-title">
            Begin praying the Liturgy of the Hours today.
          </h1>
          <p>
            Choose one Hour, pray along, and discover faithful communities
            already praying.
          </p>
          <div className="home-hero-actions">
            <button
              type="button"
              className="page-cta-button"
              onClick={() => onNavigate('today', { segmentId: 'segment-night' })}
            >
              Pray Night Prayer
            </button>
            <button
              type="button"
              className="page-cta-link"
              onClick={() => onNavigate('getting-started')}
            >
              I'm new to the Hours
            </button>
          </div>
          <p className="home-reassurance">
            Start with one Hour. You do not need to pray all seven.
          </p>
        </div>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2>Choose one place to begin</h2>
        </div>
        <div className="begin-card-grid">
          <article className="begin-card">
            <h3>Night Prayer</h3>
            <p>Best before bed. Short, simple, and peaceful.</p>
            <button
              type="button"
              className="begin-card-action"
              onClick={() => onNavigate('today', { segmentId: 'segment-night' })}
            >
              Pray Night Prayer
            </button>
          </article>
          <article className="begin-card">
            <h3>Morning Prayer</h3>
            <p>Begin the day with Scripture and the prayer of the Church.</p>
            <button
              type="button"
              className="begin-card-action"
              onClick={() =>
                onNavigate('today', { segmentId: 'segment-morning' })
              }
            >
              Pray Morning Prayer
            </button>
          </article>
          <article className="begin-card">
            <h3>Pray with a community</h3>
            <p>
              Listen or follow along with trusted ministries already praying the
              Hours.
            </p>
            <button
              type="button"
              className="begin-card-action"
              onClick={() => onNavigate('discover')}
            >
              Discover prayer resources
            </button>
          </article>
        </div>
      </section>

      <section className="home-section home-intro">
        <div>
          <div className="page-eyebrow">New to the Hours?</div>
          <h2>The daily prayer of the Church</h2>
          <p>
            The Liturgy of the Hours is prayed throughout the day with psalms,
            Scripture, hymns, and intercessions. Priests and religious pray it
            daily, and lay Catholics are invited to join as much as they are
            able.
          </p>
        </div>
        <button
          type="button"
          className="page-cta-button"
          onClick={() => onNavigate('getting-started')}
        >
          Start the beginner path
        </button>
      </section>

      <section className="home-section">
        <div className="home-section-header">
          <h2>Featured ministries and resources</h2>
          <button type="button" onClick={() => onNavigate('discover')}>
            View Discover
          </button>
        </div>
        <div className="home-featured-grid">
          {FEATURED_RESOURCES.map((resource) => (
            <article key={resource.name} className="home-featured-card">
              <span
                className="home-featured-image"
                style={{ backgroundImage: `url(${resource.image})` }}
              />
              <span className="home-featured-body">
                <span className="home-featured-title-row">
                  <strong>{resource.name}</strong>
                  <PartnerBadge status={resource.badge} />
                </span>
                <span>{resource.description}</span>
                <button type="button" onClick={() => onNavigate('discover')}>
                  Learn more
                </button>
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-parish">
        <div>
          <div className="page-eyebrow">For parishes, OCIA, and ministries</div>
          <h2>Help people encounter the prayer of the Church</h2>
          <p>
            Una Voce offers a simple doorway for parishioners, catechumens,
            families, and ministry groups without overwhelming them.
          </p>
        </div>
        <button
          type="button"
          className="page-cta-button"
          onClick={() => onNavigate('parishes')}
        >
          Use Una Voce at your parish
        </button>
      </section>
    </article>
  );
}
