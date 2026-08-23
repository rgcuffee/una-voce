import type { ViewKey, ViewNavigator } from '../navigation';

type StarterCard = {
  title: string;
  tagline: string;
  body: string;
  action: string;
  view: ViewKey;
  segmentId: string;
};

const STARTER_CARDS: StarterCard[] = [
  {
    title: 'Night Prayer',
    tagline: 'A peaceful way to close the day.',
    body: 'Short, simple, and especially good for a first experience of the Hours.',
    action: 'Start with Night Prayer',
    view: 'today',
    segmentId: 'segment-night',
  },
  {
    title: 'Morning Prayer',
    tagline: 'Begin the day with the prayer of the Church.',
    body: 'Scripture, psalms, and prayer to help orient the day toward God.',
    action: 'Start with Morning Prayer',
    view: 'today',
    segmentId: 'segment-morning',
  },
];

const PRAYER_FORMATS = [
  'read it',
  'listen to it',
  'pray along with a video',
];

function SectionNumber({ children }: { children: string }) {
  return (
    <span className="start-section-number" aria-hidden="true">
      {children}
    </span>
  );
}

export function GettingStartedPage({
  onNavigate,
}: {
  onNavigate: ViewNavigator;
}) {
  return (
    <article className="page start-page">
      <header className="page-hero start-hero">
        <div className="page-eyebrow">Start Here</div>
        <h1 className="page-hero-title">Welcome. You're in the right place.</h1>
        <p className="page-lead">
          Whether you've been praying the Divine Office for years or you've
          never opened a Breviary in your life, this page will help you find
          your footing.
        </p>
      </header>

      <div className="start-sections">
        <section className="start-section" aria-labelledby="start-what-heading">
          <SectionNumber>01</SectionNumber>
          <div className="start-section-copy">
            <h2 id="start-what-heading">What is the Liturgy of the Hours?</h2>
            <p>
              The Liturgy of the Hours is the Church's daily prayer, rooted in
              Scripture, especially the Psalms, and offered at set times
              throughout the day.
            </p>
            <p className="start-short-lines">
              It is ancient. It is alive. <strong>And it belongs to you.</strong>
            </p>
          </div>
        </section>

        <section className="start-section" aria-labelledby="start-how-many-heading">
          <SectionNumber>02</SectionNumber>
          <div className="start-section-copy">
            <h2 id="start-how-many-heading">Do I need to pray all of them?</h2>
            <p><strong>No.</strong></p>
            <p>
              Most lay Catholics begin with just one. Morning Prayer and Night
              Prayer are especially accessible places to start.
            </p>
            <p>
              You can begin with one Hour and simply let the rhythm grow from
              there.
            </p>
          </div>
        </section>

        <section
          className="start-section start-practical"
          aria-labelledby="start-practical-heading"
        >
          <SectionNumber>03</SectionNumber>
          <div className="start-section-copy">
            <div className="start-practical-intro">
              <h2 id="start-practical-heading">
                What does praying an Hour actually look like?
              </h2>
              <p>
                Each Hour is a short sequence of psalms, Scripture, and prayer.
              </p>
              <p>You simply follow along from beginning to end.</p>
            </div>

            <div className="start-practical-details">
              <p className="start-practical-lead">You can</p>
              <div className="start-practical-grid" aria-label="Ways to pray an Hour">
                {PRAYER_FORMATS.map((format) => (
                  <div className="start-practical-item" key={format}>
                    <span className="start-practical-mark" aria-hidden="true" />
                    <strong>{format}</strong>
                  </div>
                ))}
                <div className="start-practical-item start-practical-duration">
                  <span className="start-practical-mark" aria-hidden="true" />
                  <strong>Most Hours take about 5–15 minutes.</strong>
                </div>
              </div>

              <p>
                You do not need a prayer book, know all the responses, or
                understand the structure before you begin.
              </p>
              <p className="start-guidance">
                <strong>Una Voce will help you find a way to pray it.</strong>
              </p>
            </div>
          </div>
        </section>

        <section
          className="start-section start-begin"
          aria-labelledby="start-begin-heading"
        >
          <SectionNumber>04</SectionNumber>
          <div className="start-section-copy">
            <h2 id="start-begin-heading">Where should I begin?</h2>
            <p className="start-section-intro">
              You don't need to make this complicated. Pick whichever fits
              naturally into your day.
            </p>

            <div className="begin-choice-list">
              {STARTER_CARDS.map((card) => (
                <article key={card.title} className="begin-choice">
                  <h3>{card.title}</h3>
                  <p className="begin-choice-tagline">{card.tagline}</p>
                  <p>{card.body}</p>
                  <button
                    type="button"
                    className="begin-card-action"
                    onClick={() =>
                      onNavigate(card.view, { segmentId: card.segmentId })
                    }
                  >
                    <span>
                      {card.action} <span aria-hidden="true">›</span>
                    </span>
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="page-section encouragement" aria-labelledby="encouragement-heading">
        <h2 id="encouragement-heading" className="page-section-title">
          A word of encouragement
        </h2>
        <p>
          The Liturgy of the Hours may feel unfamiliar at first, and that is
          okay.
        </p>
        <p>You do not need to understand everything before you begin.</p>
        <p><strong>The Church teaches us to pray by praying.</strong></p>
        <p>
          The Hours are not a burden. They are a gift: an invitation to
          sanctify your morning, your commute, your lunch break, your quiet
          evening, or your sleepless night.
        </p>
        <p>The Church has been praying this way for centuries.</p>
        <p>
          She is praying now, all over the world, in monasteries, parishes,
          homes, hospitals, and hidden rooms.
        </p>
        <p className="prose-emphasis">
          Start small. Choose one Hour. Come pray with her.
        </p>
      </section>
    </article>
  );
}
