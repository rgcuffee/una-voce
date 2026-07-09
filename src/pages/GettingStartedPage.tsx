import type { ViewKey, ViewNavigator } from '../navigation';

type StarterCard = {
  title: string;
  body: string;
  action: string;
  view: ViewKey;
  segmentId: string;
};

const STARTER_CARDS: StarterCard[] = [
  {
    title: 'Night Prayer',
    body: "Short, peaceful, and perfect for closing the day in God's presence.",
    action: 'Start with Night Prayer',
    view: 'today',
    segmentId: 'segment-night',
  },
  {
    title: 'Morning Prayer',
    body: 'Set the tone for your day with Scripture and the prayer of the whole Church.',
    action: 'Start with Morning Prayer',
    view: 'today',
    segmentId: 'segment-morning',
  },
];

export function GettingStartedPage({
  onNavigate,
}: {
  onNavigate: ViewNavigator;
}) {
  return (
    <article className="page start-page">
      <header className="page-hero">
        <div className="page-eyebrow">Start Here</div>
        <h1 className="page-hero-title">Welcome. You're in the right place.</h1>
        <p className="page-lead">
          Whether you've been praying the Divine Office for years or you've
          never opened a Breviary in your life, this page will help you find
          your footing.
        </p>
      </header>

      <section className="start-summary">
        <article>
          <span>1</span>
          <h2>What are the Liturgy of the Hours?</h2>
          <p>
            The Liturgy of the Hours is the Church's daily prayer, rooted in
            Scripture, especially the Psalms, and offered at set times
            throughout the day. It is ancient. It is alive. And it belongs to
            you.
          </p>
        </article>
        <article>
          <span>2</span>
          <h2>Do I need to pray all of them?</h2>
          <p>
            No. Most lay Catholics begin with just one. Morning Prayer and
            Night Prayer are the most accessible starting points.
          </p>
        </article>
        <article className="start-begin">
          <span>3</span>
          <h2>Where should I begin?</h2>
          <div className="begin-choice-list">
            {STARTER_CARDS.map((card) => (
              <div key={card.title} className="begin-choice">
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <button
                  type="button"
                  className="begin-card-action"
                  onClick={() =>
                    onNavigate(card.view, { segmentId: card.segmentId })
                  }
                >
                  {card.action} ›
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="page-section encouragement">
        <h2 className="page-section-title">A word of encouragement</h2>
        <p>
          The Liturgy of the Hours may feel unfamiliar at first, and that is
          okay. You do not need to understand everything before you begin. The
          Church teaches us to pray by praying.
        </p>
        <p>
          The Hours are not a burden. They are a gift: an invitation to
          sanctify your morning, your commute, your lunch break, your quiet
          evening, or your sleepless night.
        </p>
        <p>
          The Church has been praying this way for centuries. She is praying
          now, all over the world, in monasteries, parishes, homes, hospitals,
          and hidden rooms.
        </p>
        <p className="prose-emphasis">
          Start small. Choose one Hour. Come pray with her.
        </p>
      </section>
    </article>
  );
}
