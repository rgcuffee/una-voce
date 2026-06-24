import type { ViewKey, ViewNavigator } from '../navigation';

type Step = {
  number: number;
  title: string;
  body: React.ReactNode;
  action?: { label: string; view: ViewKey };
};

export function GettingStartedPage({
  onNavigate,
}: {
  onNavigate: ViewNavigator;
}) {
  const steps: Step[] = [
    {
      number: 1,
      title: 'Understand the shape of the day',
      body: (
        <>
          <p>
            The Hours unfold across the full day: the Office of Readings,
            Morning Prayer (Lauds), Mid-Morning Prayer (Terce), Midday Prayer
            (Sext), Afternoon Prayer (None), Evening Prayer (Vespers), and Night
            Prayer (Compline).
          </p>
          <p>
            You don't have to pray all seven. Most people begin with two:
            Morning Prayer to consecrate the day, and Night Prayer (Compline) to
            close it. Start there.
          </p>
        </>
      ),
    },
    {
      number: 2,
      title: "Pray today's hours right here",
      body: (
        <>
          <p>
            No book needed. No ribbons. No confusion about which week of the
            Psalter you're on.
          </p>
          <p>
            Open the Daily Hours and the texts are already set for today: the
            right psalm, the right antiphon, the right reading for this moment in
            the liturgical year. Read it. Pray it. That's it.
          </p>
        </>
      ),
      action: { label: "Open today's hours", view: 'today' },
    },
    {
      number: 3,
      title: 'Listen before you lead',
      body: (
        <>
          <p>
            More people are discovering the Liturgy of the Hours, and there are
            a variety of formats, in English and in Latin, to help them enter
            in.
          </p>
          <p>
            The Discover section is your gateway to audio and video content from
            creators who pray these Hours aloud, chanted, recited, and sung.
            Find a voice that draws you in, and let it carry you through the
            prayer until the rhythm becomes your own.
          </p>
        </>
      ),
      action: { label: 'Browse Discover', view: 'discover' },
    },
    {
      number: 4,
      title: 'Join a live stream',
      body: (
        <>
          <p>
            Prayer is never more powerful than when it is shared. The Live
            section surfaces real-time streams from communities around the world
            celebrating Vespers, Compline, and more. Pray with a Benedictine
            monastery at Vespers. Close your evening with Compline from a
            community across the globe.
          </p>
          <p className='prose-emphasis'>
            The Church prays as one body. Now you can feel it.
          </p>
        </>
      ),
      action: { label: "See what's live", view: 'live' },
    },
    {
      number: 5,
      title: 'Go deeper',
      body: (
        <>
          <p>
            Once the Hours become a daily rhythm, you'll want more. Explore:
          </p>
          <ul className='feature-list compact'>
            <li>The theology of sacred liturgy and why the Hours matter</li>
            <li>Gregorian chant, the Church's own musical voice</li>
            <li>
              The liturgical calendar, how the Church sanctifies every season of
              the year
            </li>
            <li>
              Creator communities and discussions around traditional Catholic
              prayer
            </li>
          </ul>
        </>
      ),
      action: { label: 'Visit the Community', view: 'community' },
    },
  ];

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
        <div className='page-eyebrow'>Getting Started</div>
        <h1 className='page-hero-title'>Welcome. You're in the right place.</h1>
        <p className='page-lead'>
          Whether you've been praying the Divine Office for years or you've
          never opened a Breviary in your life, this page will help you find
          your footing.
        </p>
        <div className='prose'>
          <p>
            The Liturgy of the Hours can look intimidating at first. Four
            volumes. Ribbons. Week numbers. Seasonal variations. But underneath
            all of that structure is something remarkably simple: stopping
            throughout the day to pray with the Church.
          </p>
          <p className='prose-emphasis'>Here's how to begin.</p>
        </div>
      </header>

      <ol className='step-list'>
        {steps.map((step) => (
          <li key={step.number} className='step'>
            <div className='step-number'>{step.number}</div>
            <div className='step-body'>
              <h2 className='step-title'>{step.title}</h2>
              <div className='prose'>{step.body}</div>
              {step.action ? (
                <button
                  type='button'
                  className='step-action'
                  onClick={() => onNavigate(step.action!.view)}
                >
                  {step.action.label} ›
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <section className='page-section encouragement'>
        <h2 className='page-section-title'>A word of encouragement</h2>
        <div className='prose'>
          <p>
            Una Voce exists to serve the faithful interested in living and
            nurturing traditional Catholic culture and the traditional liturgy
            that is its glory and foundation.
          </p>
          <p>
            The Hours are not a burden. They are a gift, an invitation to
            sanctify your morning commute, your lunch break, your sleepless
            night. The Church has been praying them for two millennia. She will
            be praying them long after we are gone.
          </p>
          <p className='prose-emphasis'>Come pray with her.</p>
        </div>
      </section>

      <div className='page-cta'>
        <button
          type='button'
          className='page-cta-button'
          onClick={() => onNavigate('today')}
        >
          Pray today's hours
        </button>
      </div>
    </article>
  );
}
