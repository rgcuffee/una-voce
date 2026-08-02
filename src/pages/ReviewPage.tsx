import { useEffect } from 'react';

import type { ViewNavigator } from '../navigation';

const REVIEW_ITEMS = [
  {
    number: '01',
    title: 'Beginner experience',
    copy: 'See how Una Voce introduces the Hours without reproducing the official liturgical text.',
    action: 'Open Start Here',
    view: 'getting-started' as const,
  },
  {
    number: '02',
    title: 'Daily discovery',
    copy: 'See how the prototype organizes publisher-hosted prayer resources for the current day.',
    action: 'Open Pray Today',
    view: 'today' as const,
  },
  {
    number: '03',
    title: 'Sources and communities',
    copy: 'Review how audio, video, sung prayer, and livestream sources are presented for discovery.',
    action: 'Open Discover',
    view: 'discover' as const,
  },
];

export function ReviewPage({ onNavigate }: { onNavigate: ViewNavigator }) {
  useEffect(() => {
    const originalTitle = document.title;
    const existingRobots = document.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    const originalRobotsContent = existingRobots?.content;
    const robots = existingRobots ?? document.createElement('meta');

    document.title = 'Reviewer Brief | Una Voce';
    robots.name = 'robots';
    robots.content = 'noindex, follow';

    if (!existingRobots) {
      document.head.appendChild(robots);
    }

    return () => {
      document.title = originalTitle;

      if (existingRobots && originalRobotsContent !== undefined) {
        existingRobots.content = originalRobotsContent;
      } else {
        robots.remove();
      }
    };
  }, []);

  return (
    <article className='page review-page'>
      <header className='page-hero review-hero'>
        <div className='page-eyebrow'>Reviewer brief · August 2026</div>
        <h1 className='page-hero-title'>Review Una Voce</h1>
        <p className='page-lead'>
          Una Voce is a free, independent discovery platform helping Catholics
          find publisher-hosted audio, video, sung prayer, and livestreams for
          the Liturgy of the Hours.
        </p>
        <p className='review-intro'>
          This page summarizes the current prototype, its boundaries, and the
          guidance being requested from liturgical and ecclesial reviewers.
        </p>
      </header>

      <section className='review-status-grid' aria-label='Prototype status'>
        <div className='review-status-card'>
          <span>Current form</span>
          <strong>Discovery platform</strong>
          <p>Organizes access to resources hosted by their original publishers.</p>
        </div>
        <div className='review-status-card'>
          <span>Liturgical text</span>
          <strong>Not reproduced</strong>
          <p>Prototype prayer screens use clearly identified placeholder text.</p>
        </div>
        <div className='review-status-card'>
          <span>Ecclesial status</span>
          <strong>Independent initiative</strong>
          <p>No affiliation with or endorsement by the USCCB is claimed.</p>
        </div>
      </section>

      <section className='page-section review-section'>
        <div className='review-section-heading'>
          <div className='page-eyebrow'>Purpose</div>
          <h2 className='page-section-title'>What Una Voce is building</h2>
        </div>
        <div className='review-two-column'>
          <div className='prose review-prose'>
            <p>
              Una Voce helps Catholics discover the Church&apos;s daily prayer,
              understand its rhythm, and find communities and ministries already
              sharing it through audio, video, music, and livestreams.
            </p>
            <p>
              The prototype organizes these resources by prayer hour, date,
              language, and source. Its intended audience is national, with
              English and Spanish pathways for beginners and returning users.
            </p>
          </div>
          <aside className='review-callout'>
            <div className='review-callout-mark' aria-hidden='true'>UV</div>
            <p>
              The goal is not to replace a breviary. It is to help more people
              discover the Hours, begin praying, and return to the Church&apos;s
              daily rhythm of prayer.
            </p>
          </aside>
        </div>
      </section>

      <section className='page-section review-section review-boundaries'>
        <div className='review-section-heading'>
          <div className='page-eyebrow'>Boundaries</div>
          <h2 className='page-section-title'>What the prototype does not claim</h2>
        </div>
        <ul className='review-boundary-list'>
          <li>
            <strong>No official liturgical text.</strong>
            <span>
              Text would be added only after the appropriate licenses and
              publication review are secured for the forthcoming English
              translation.
            </span>
          </li>
          <li>
            <strong>No ownership of third-party media.</strong>
            <span>
              Media remains hosted by its original publisher. Una Voce is a
              discovery guide and provides a process to update or remove a
              listing.
            </span>
          </li>
          <li>
            <strong>No automatic partnership.</strong>
            <span>
              Listing a publicly available source does not represent a formal
              partnership, authorization, or endorsement unless separately
              stated.
            </span>
          </li>
          <li>
            <strong>No claim of Church endorsement.</strong>
            <span>
              Una Voce is not affiliated with or endorsed by the USCCB or the
              Archdiocese of Las Vegas. A listing does not itself imply
              endorsement by its source.
            </span>
          </li>
        </ul>
      </section>

      <section className='page-section review-section'>
        <div className='review-section-heading'>
          <div className='page-eyebrow'>Guidance requested</div>
          <h2 className='page-section-title'>Questions for reviewers</h2>
        </div>
        <ol className='review-question-list'>
          <li>
            Does the platform in its current discovery-only form require any
            formal liturgical review or approval?
          </li>
          <li>
            Are there liturgical, pastoral, or presentational concerns that
            should be addressed before public launch?
          </li>
          <li>
            What review and permissions process should Una Voce follow if
            licensed liturgical text is included in the future?
          </li>
        </ol>
      </section>

      <section className='page-section review-section'>
        <div className='review-section-heading'>
          <div className='page-eyebrow'>Guided prototype</div>
          <h2 className='page-section-title'>Three places to review</h2>
        </div>
        <div className='review-path-grid'>
          {REVIEW_ITEMS.map((item) => (
            <article className='review-path-card' key={item.number}>
              <span className='review-path-number'>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <button
                type='button'
                className='review-path-link'
                onClick={() => onNavigate(item.view)}
              >
                {item.action} <span aria-hidden='true'>→</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className='review-closing' aria-labelledby='review-closing-title'>
        <div>
          <div className='page-eyebrow'>Thank you</div>
          <h2 id='review-closing-title'>Help us identify concerns early.</h2>
          <p>
            Una Voce welcomes correction, referral to the appropriate Church
            office, and guidance on a responsible path toward launch.
          </p>
        </div>
        <button
          type='button'
          className='page-cta-button'
          onClick={() => onNavigate('contact')}
        >
          Contact Una Voce
        </button>
      </section>
    </article>
  );
}
