import { PartnerBadge } from '../components/PartnerBadge';
import {
  PARTNER_COMMUNITIES,
  type PartnerBadgeStatus,
  type PartnerCommunity,
  type PartnerCommunityStatusOverrides,
} from '../data/partnerCommunities';
import type { ViewNavigator } from '../navigation';

type FeaturedResource = {
  slug?: string;
  name: string;
  description: string;
  image: string;
  badge: PartnerBadgeStatus | null;
};

const PREFERRED_FEATURED_RESOURCE_SLUGS = [
  'padre-ruben-dario-garcia',
  'sing-the-hours',
  'divine-office',
];

const CURATED_FEATURED_RESOURCE_FALLBACKS: FeaturedResource[] = [
  {
    name: 'Cantor del Camino',
    description: 'Spanish sung offices for daily prayer.',
    image:
      'https://yt3.googleusercontent.com/4v52x8EmtPZMYbLgeZQP5fARpbZSC55GDjUG_WCI4vjifyMy7K71cZ3aKBpL9u31_2n_H0qILYE=s900-c-k-c0x00ffffff-no-rj',
    badge: 'curated',
  },
];

function featuredResourcesFor(
  partnerStatusOverrides?: PartnerCommunityStatusOverrides,
) {
  return partnerFeaturedResources(partnerStatusOverrides)
    .concat(CURATED_FEATURED_RESOURCE_FALLBACKS)
    .slice(0, 3);
}

function partnerFeaturedResources(
  partnerStatusOverrides?: PartnerCommunityStatusOverrides,
) {
  return [
    ...PREFERRED_FEATURED_RESOURCE_SLUGS.map((slug) =>
      PARTNER_COMMUNITIES.find((community) => community.slug === slug),
    ),
    ...PARTNER_COMMUNITIES.filter(
      (community) => !PREFERRED_FEATURED_RESOURCE_SLUGS.includes(community.slug),
    ),
  ]
    .map((community) =>
      featuredResourceFromCommunity(community, partnerStatusOverrides),
    )
    .filter((resource): resource is FeaturedResource => Boolean(resource));
}

function featuredResourceFromCommunity(
  community: PartnerCommunity | undefined,
  partnerStatusOverrides?: PartnerCommunityStatusOverrides,
): FeaturedResource | null {
  const statusOverride = community
    ? partnerStatusOverrides?.[community.slug]
    : undefined;
  const isPreferred = Boolean(
    community && PREFERRED_FEATURED_RESOURCE_SLUGS.includes(community.slug),
  );

  if (
    !community ||
    statusOverride?.active === false ||
    statusOverride?.onboardingStatus === 'archived' ||
    (!isPreferred &&
      (community.onboardingStatus === 'pending' ||
        !['curated', 'verified'].includes(community.relationshipStatus))) ||
    !community.imageUrl
  ) {
    return null;
  }

  return {
    slug: community.slug,
    name: community.name,
    description: community.tagline,
    image: community.imageUrl,
    badge:
      (statusOverride?.badgeEnabled ?? community.badgeEnabled)
        ? (statusOverride?.relationshipStatus ?? community.relationshipStatus)
        : null,
  };
}

export function HomePage({
  onNavigate,
  partnerStatusOverrides,
}: {
  onNavigate: ViewNavigator;
  partnerStatusOverrides?: PartnerCommunityStatusOverrides;
}) {
  const featuredResources = featuredResourcesFor(partnerStatusOverrides);

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
          {featuredResources.map((resource) => (
            <article key={resource.name} className="home-featured-card">
              <span
                className={`home-featured-image${resource.slug ? ` community-${resource.slug}` : ''}`}
                style={{ backgroundImage: `url(${resource.image})` }}
              />
              <span className="home-featured-body">
                <span className="home-featured-title-row">
                  <strong>{resource.name}</strong>
                  {resource.badge ? <PartnerBadge status={resource.badge} /> : null}
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
