import type { ViewNavigator } from '../navigation';

export function ParishesPage({ onNavigate }: { onNavigate: ViewNavigator }) {
  return (
    <article className="page parish-page">
      <header className="page-hero">
        <div className="page-eyebrow">For Parishes</div>
        <h1 className="page-hero-title">
          Help your parish begin praying the Hours
        </h1>
        <p className="page-lead">
          Una Voce gives parishioners, OCIA groups, and ministries a simple
          doorway into the daily prayer of the Church.
        </p>
      </header>

      <section className="page-section parish-feature">
        <div>
          <div className="page-eyebrow">First invitation</div>
          <h2 className="page-section-title">
            Start with a 7-day Night Prayer invitation
          </h2>
          <p>
            Invite your parishioners to pray Night Prayer for seven days. It is
            short, peaceful, and easy to connect to an existing bedtime routine.
          </p>
        </div>
        <button
          type="button"
          className="page-cta-button"
          onClick={() => onNavigate('today', { segmentId: 'segment-night' })}
        >
          Get the 7-day invitation
        </button>
      </section>

      <section className="page-section parish-grid">
        <article className="parish-card">
          <span>OCIA</span>
          <h2>Use Una Voce in OCIA or adult formation</h2>
          <p>
            Many Catholics and catechumens have never heard of the Liturgy of
            the Hours. Una Voce helps them try it without needing to navigate
            books, ribbons, calendars, or unfamiliar terms on day one.
          </p>
          <button type="button" onClick={() => onNavigate('getting-started')}>
            View starter resources
          </button>
        </article>

        <article className="parish-card">
          <span>Bulletin</span>
          <h2>Share a bulletin blurb or QR code</h2>
          <p className="parish-blurb">
            New to the Liturgy of the Hours? Una Voce helps Catholics begin
            with one simple Hour of prayer. Start with Night Prayer this week
            and join the daily prayer of the Church.
          </p>
        </article>

        <article className="parish-card">
          <span>Ministries</span>
          <h2>Introduce Morning Prayer to ministry groups</h2>
          <p>
            Men's groups, women's groups, young adult groups, and Bible studies
            can begin a gathering with Morning Prayer or use Una Voce as a
            follow-up resource for daily prayer at home.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('today', { segmentId: 'segment-morning' })}
          >
            Open Morning Prayer
          </button>
        </article>

        <article className="parish-card">
          <span>Listings</span>
          <h2>Feature your parish or ministry</h2>
          <p>
            If your parish, abbey, monastery, or ministry offers public prayer
            of the Hours, Una Voce would love to learn more and consider
            featuring it.
          </p>
          <button type="button" onClick={() => onNavigate('contact')}>
            Contact Una Voce
          </button>
        </article>
      </section>
    </article>
  );
}
