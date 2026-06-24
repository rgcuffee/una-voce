import type { ViewNavigator } from '../navigation';

export function CommunityPage({ onNavigate }: { onNavigate: ViewNavigator }) {
  return (
    <article className='page'>
      <header className='page-hero'>
        <div className='page-eyebrow'>Community</div>
        <h1 className='page-hero-title'>Pray more, know more, together</h1>
        <p className='page-lead'>
          A gathering place for those who want to live the liturgical life more
          fully, alongside creators, ministers, and fellow faithful.
        </p>
      </header>

      <section className='page-section'>
        <h2 className='page-section-title'>What's here</h2>
        <ul className='feature-list'>
          <li>
            <span className='feature-name'>Discussions.</span> Questions and
            conversation around traditional Catholic prayer and the Divine
            Office.
          </li>
          <li>
            <span className='feature-name'>Creators.</span> Follow the voices
            who chant, recite, and teach the Hours.
          </li>
          <li>
            <span className='feature-name'>Communities.</span> Monasteries,
            parishes, and groups that pray and stream together.
          </li>
        </ul>
      </section>

      <section className='page-section'>
        <div className='community-empty'>
          <p>
            The community feed is taking shape. In the meantime, the surest way
            to begin is to pray.
          </p>
          <button
            type='button'
            className='page-cta-button'
            onClick={() => onNavigate('getting-started')}
          >
            Start with Getting Started
          </button>
        </div>
      </section>
    </article>
  );
}
