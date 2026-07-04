import type { ViewNavigator } from '../navigation';
import {
  PARTNER_COMMUNITIES,
  communityPath,
  getPartnerCommunity,
  type PartnerCommunity,
} from '../data/partnerCommunities';

type CommunityPageProps = {
  onNavigate: ViewNavigator;
  selectedCommunitySlug?: string | null;
  onOpenCommunity?: (slug: string) => void;
  prayerCards?: CommunityPrayerCard[];
};

export type CommunityPrayerCard = {
  id: string;
  label: string;
  title: string;
  description: string;
  time?: string;
  actionLabel: string;
  onSelect: () => void;
};

export function CommunityPage({
  onNavigate,
  selectedCommunitySlug,
  onOpenCommunity,
  prayerCards = [],
}: CommunityPageProps) {
  const selectedCommunity = getPartnerCommunity(selectedCommunitySlug);

  if (selectedCommunity) {
    return (
      <CommunityDetail
        community={selectedCommunity}
        prayerCards={prayerCards}
        onPrayToday={() => onNavigate('today')}
        onBack={() => onOpenCommunity?.('')}
      />
    );
  }

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
        <div className='community-grid'>
          {PARTNER_COMMUNITIES.map((community) => (
            <button
              key={community.slug}
              type='button'
              className='community-card'
              onClick={() => onOpenCommunity?.(community.slug)}
            >
              <span
                className='community-card-image'
                style={{ backgroundImage: `url(${community.imageUrl})` }}
              />
              <span className='community-card-body'>
                <span className='community-card-meta'>
                  {community.kind} · {community.location}
                </span>
                <strong>{community.name}</strong>
                <span>{community.tagline}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className='page-cta'>
        <button
          type='button'
          className='page-cta-button'
          onClick={() => onNavigate('getting-started')}
        >
          Start with Getting Started
        </button>
      </div>
    </article>
  );
}

function CommunityDetail({
  community,
  prayerCards,
  onPrayToday,
  onBack,
}: {
  community: PartnerCommunity;
  prayerCards: CommunityPrayerCard[];
  onPrayToday: () => void;
  onBack: () => void;
}) {
  return (
    <article className='page community-detail-page'>
      <button type='button' className='page-back' onClick={onBack}>
        Back to Community
      </button>

      <header
        className='community-profile-hero'
        style={{ backgroundImage: `url(${community.imageUrl})` }}
      >
        <div className='community-profile-overlay'>
          <div className='page-eyebrow'>{community.kind}</div>
          <h1 className='community-profile-title'>{community.name}</h1>
          <p>{community.tagline}</p>
        </div>
      </header>

      <section className='page-section community-profile-summary'>
        <div>
          <h2 className='page-section-title'>About</h2>
          <p>{community.description}</p>
        </div>
        <div className='community-facts'>
          <div>
            <span>Location</span>
            <strong>{community.location}</strong>
          </div>
          <div>
            <span>Rhythm</span>
            <strong>{community.accent}</strong>
          </div>
        </div>
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Prayer rhythm</h2>
        <div className='community-pill-row'>
          {community.prayerRhythm.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>
          {prayerCards.length > 0
            ? 'Pray with this community today'
            : 'Ways to pray with this community'}
        </h2>
        {prayerCards.length > 0 ? (
          <div className='community-feature-grid'>
            {prayerCards.map((item) => (
              <button
                key={item.id}
                type='button'
                className='community-feature-card community-prayer-card'
                onClick={item.onSelect}
              >
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                {item.time ? (
                  <em className='community-prayer-time'>{item.time}</em>
                ) : null}
                <b>{item.actionLabel}</b>
              </button>
            ))}
            {community.featured.slice(0, 1).map((item) => (
              <article key={item.title} className='community-feature-card'>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <div>
            <div className='community-feature-grid'>
              {community.featured.map((item) => (
                <article key={item.title} className='community-feature-card'>
                  <span>{item.label}</span>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
            <div className='community-empty compact'>
              <p>
                No current prayer video is available from this community for the
                selected day.
              </p>
              <button
                type='button'
                className='page-cta-button'
                onClick={onPrayToday}
              >
                Open today's prayers
              </button>
            </div>
          </div>
        )}
      </section>

      <section className='page-section'>
        <h2 className='page-section-title'>Links</h2>
        <div className='community-link-list'>
          {community.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target='_blank'
              rel='noreferrer'
            >
              {link.label}
            </a>
          ))}
          <a href={communityPath(community.slug)}>Local profile link</a>
        </div>
      </section>
    </article>
  );
}
