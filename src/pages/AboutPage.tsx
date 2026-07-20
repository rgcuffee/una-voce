import type { ViewNavigator } from '../navigation';

export function AboutPage({ onNavigate }: { onNavigate: ViewNavigator }) {
  return (
    <article className="page about-page">
      <header className="page-hero">
        <div className="page-eyebrow">About</div>
        <h1 className="page-hero-title">About Una Voce</h1>
        <p className="page-lead">
          Una Voce exists to help Catholics join the Church's daily prayer —{' '}
          <em>one voice</em>, lifted throughout the world.
        </p>
      </header>

      <section className="page-section about-opening">
        <div className="prose about-prose">
          <p>
            The Liturgy of the Hours is the prayer of the universal Church,
            prayed seven times a day, from the Office of Readings at dawn to
            Compline at nightfall. It is the ancient rhythm of praise that has
            ordered the days of monks, martyrs, mystics, and ordinary faithful
            for two thousand years.
          </p>

          <p>
            Each day is distinct. The Hours move through the Psalms in a
            four-week rhythm while the prayers, readings, antiphons, feasts,
            and seasons change throughout the year. By praying them, Catholics
            enter more deeply into the life of the Church, allowing Advent,
            Christmas, Lent, Easter, ordinary days, and the witness of the
            saints to shape the rhythm of daily life.
          </p>

          <p>
            Una Voce helps Catholics discover the Liturgy of the Hours, begin
            praying it, and connect with communities already praying throughout
            the world. It is not trying to replace breviary apps; it is built
            for discovery, habit formation, and praying with others.
          </p>
        </div>
      </section>

      <section className="page-section about-section">
        <h2 className="page-section-title">What we are building</h2>
        <div className="prose about-prose">
          <p>
            Una Voce is beginning as a discovery platform for the daily prayer
            of the Church.
          </p>
          <p>
            We help Catholics find trusted audio and video resources for praying
            the Liturgy of the Hours, including guided prayer, sung forms, and
            livestreams in English and Spanish.
          </p>
          <p>
            Some resources make it easier to begin and follow along. Others
            allow you to pray with monasteries, ministries, musicians, and
            communities already sharing the Hours with the faithful.
          </p>
          <p>
            Our hope is simple: that more Catholics would not only learn about
            the Liturgy of the Hours, but begin praying it.
          </p>
        </div>
      </section>

      <section className="page-section about-section about-closing">
        <h2 className="page-section-title">Our larger hope</h2>
        <div className="prose about-prose">
          <p>
            Over time, Una Voce hopes to collaborate with ministries, religious
            communities, parishes, and Catholic creators to make the Church's
            daily prayer more accessible in many languages and many forms.
          </p>
          <p>
            The Church has been praying this way for centuries. She is praying
            now, all over the world, in cathedrals, monasteries, chapels, homes,
            hospitals, workplaces, and hidden rooms.
          </p>
          <p>She will be praying long after we are gone.</p>
          <p className="prose-emphasis">Come pray with her.</p>
        </div>
      </section>

      <section className="page-section about-section about-note">
        <h2 className="page-section-title">Prototype status</h2>
        <div className="prose about-prose">
          <p>
            Una Voce is currently a prototype for review and early feedback.
            Some listings are live partner resources, while others are prototype
            examples used to test design, navigation, and curation patterns.
          </p>
        </div>
      </section>

      <div className="page-cta about-cta">
        <button
          type="button"
          className="page-cta-button"
          onClick={() => onNavigate('getting-started')}
        >
          Start the beginner path
        </button>
        <button
          type="button"
          className="page-cta-link"
          onClick={() => onNavigate('contact')}
        >
          Partner with us or suggest a ministry
        </button>
      </div>
    </article>
  );
}
