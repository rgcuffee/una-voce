import type { ViewNavigator } from '../navigation';

export function AboutPage({ onNavigate }: { onNavigate: ViewNavigator }) {
  return (
    <article className='page'>
      <button
        type='button'
        className='page-back'
        onClick={() => onNavigate('more')}
      >
        ‹ More
      </button>

      <header className='page-hero'>
        <div className='page-eyebrow'>About</div>
        <h1 className='page-hero-title'>One voice, lifted together</h1>
        <p className='page-lead'>
          Una Voce, “one voice,” is a platform built for Catholics who believe
          that prayer is not merely a private devotion, but the beating heart of
          the Church's life in the world.
        </p>
      </header>

      <section className='page-section'>
        <h2 className='page-section-title'>What is Una Voce?</h2>
        <div className='prose'>
          <p>
            The Liturgy of the Hours is the prayer of the universal Church,
            prayed seven times a day, from the Office of Readings at dawn to
            Compline at nightfall. It is the ancient rhythm of praise that has
            ordered the days of monks, martyrs, mystics, and ordinary faithful
            for two thousand years.
          </p>
          <p>
            This platform exists to make that prayer accessible, in English, on
            any device, at any hour, and to gather around it a community of
            creators, ministers, and souls who are hungry for something deeper
            than noise.
          </p>
        </div>
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Why this exists</h2>
        <div className='prose'>
          <p>
            The Church has always prayed with one voice. From the Benedictine
            monasteries of the early Middle Ages to the Franciscan friars in the
            streets of medieval cities, the Divine Office, the Breviary, has
            been the daily prayer of the Church, rooted primarily in the Psalms
            and woven through with Scripture, canticle, hymn, and intercession.
          </p>
          <p className='prose-emphasis'>That tradition is not a relic. It is alive.</p>
          <p>
            Una Voce promotes the sacred liturgical tradition of the Roman Rite,
            along with Latin, the official language of the Church, and Gregorian
            chant, the Church's official music. This platform brings that
            tradition into the digital age, not to modernize it, but to remove
            every obstacle between the faithful and their inheritance.
          </p>
        </div>
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>What you'll find here</h2>
        <ul className='feature-list'>
          <li>
            <span className='feature-name'>The Daily Hours.</span> The full
            Liturgy of the Hours in English, updated daily, structured for the
            current liturgical day.
          </li>
          <li>
            <span className='feature-name'>Audio &amp; Video.</span> Discover
            creators praying, chanting, and teaching the Hours. Gregorian chant,
            traditional hymnody, lectio divina, all in one place.
          </li>
          <li>
            <span className='feature-name'>Live Streams.</span> Join live
            celebrations of Vespers, Compline, Benediction, and more from
            communities around the world.
          </li>
          <li>
            <span className='feature-name'>Community.</span> A gathering place
            for those who want to pray more, know more, and live the liturgical
            life more fully.
          </li>
        </ul>
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Built on something ancient</h2>
        <div className='prose'>
          <p>
            As traditional Catholics, we believe the future of the Church rests
            with the past. The Hours are not a program or a productivity hack.
            They are a participation in the eternal prayer of Christ Himself, the
            High Priest who ever lives to make intercession (Hebrews 7:25). When
            the Church prays the Hours, she prays in Him, through Him, and with
            Him.
          </p>
          <p>
            Una Voce is an invitation to join that prayer, wherever you are,
            whatever your day looks like.
          </p>
        </div>
      </section>

      <div className='page-cta'>
        <button
          type='button'
          className='page-cta-button'
          onClick={() => onNavigate('getting-started')}
        >
          New here? Start with Getting Started
        </button>
        <button
          type='button'
          className='page-cta-link'
          onClick={() => onNavigate('today')}
        >
          Pray today's hours
        </button>
      </div>
    </article>
  );
}
