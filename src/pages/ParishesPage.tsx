import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  MORNING_PRAYER_CHALLENGE,
  NIGHT_PRAYER_CHALLENGE,
  PARISH_CATEGORY_LABELS,
  PARISH_COPY_TEMPLATES,
  PARISH_FILTERS,
  PARISH_RESOURCE_GUIDES,
  PARISH_RESOURCES,
  RESOURCE_TYPE_LABELS,
  type CopyTemplate,
  type ParishChallenge,
  type ParishResource,
  type ParishResourceCategory,
  type ParishResourceType,
} from '../content/parishes';
import { trackAnalyticsEvent } from '../lib/prayerAnalytics';
import type { ViewNavigator } from '../navigation';

const BEGIN_PATHS = [
  {
    title: 'Introduce the Hours',
    description:
      'Help parishioners understand what the Liturgy of the Hours is, why the Church prays it, and how a layperson can begin without feeling overwhelmed.',
    actions: ['View introduction resources', 'Download bulletin materials'],
    detail:
      'Bulletin copy, short explainers, pulpit announcements, email invitations, social captions, QR prompts, and beginner questions.',
    href: '/parishes?category=getting-started',
  },
  {
    title: 'Run a prayer challenge',
    description:
      'Invite parishioners to pray one Hour for a defined period, with simple instructions, reminders, and a shared parish goal.',
    actions: ['Explore challenge kits', 'Start with Night Prayer'],
    detail:
      'Seven Days of Night Prayer, Morning Prayer campaigns, Advent and Lent challenges, and parish Vespers weeks.',
    href: '/parishes/challenges/night-prayer-7-days',
  },
  {
    title: 'Start a prayer community',
    description:
      'Build an ongoing rhythm of prayer through a weekly gathering, online prayer room, parish ministry, or small group.',
    actions: ['View leader guides', 'See sample formats'],
    detail:
      'Weekly Vespers group guide, Zoom prayer guide, volunteer roles, meeting formats, newcomer welcome notes, and calendar ideas.',
    href: '/parishes/resources/start-a-prayer-community',
  },
  {
    title: 'Add prayer to your website',
    description:
      'Give parishioners a trusted place to begin praying without requiring parish staff to produce or maintain daily prayer content.',
    actions: ['Preview widgets', 'View embed options'],
    detail:
      'Pray Today, Morning Prayer, Evening Prayer, Night Prayer, live prayer, featured ministry, and parish challenge embeds.',
    href: '/parishes/widgets',
  },
];

const WIDGETS = [
  {
    title: 'Pray Today',
    body: 'Current date, liturgical day label when available, and clear actions for Morning Prayer, Evening Prayer, and Night Prayer.',
  },
  {
    title: 'Featured Prayer Source',
    body: 'Ministry attribution, status label, prayer format, and a direct play or visit action.',
  },
  {
    title: 'Live Prayer Today',
    body: 'Upcoming livestreams, localized times, ministry attribution, and a join action.',
  },
  {
    title: 'Parish Challenge',
    body: 'Challenge title, dates, current day, primary prayer action, parish branding, and participation link.',
  },
];

const EMBED_CODE = `<iframe
  src="https://unavoce.net/widgets/pray-today"
  title="Pray the Liturgy of the Hours"
  loading="lazy"
  width="100%"
  height="420"
  style="border:0;border-radius:16px;"
></iframe>`;

type ParishesPageProps = {
  onNavigate: ViewNavigator;
};

export function ParishesPage({ onNavigate }: ParishesPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedPath =
    location.pathname.toLowerCase().replace(/\/+$/, '') || '/parishes';

  useEffect(() => {
    if (normalizedPath === '/for-parishes') {
      navigate(`/parishes${location.search}`, { replace: true });
    }
  }, [location.search, navigate, normalizedPath]);

  if (normalizedPath === '/parishes/challenges/night-prayer-7-days') {
    return (
      <ChallengePage
        challenge={NIGHT_PRAYER_CHALLENGE}
        onNavigate={onNavigate}
      />
    );
  }

  if (normalizedPath === '/parishes/challenges/morning-prayer-14-days') {
    return (
      <ChallengePage
        challenge={MORNING_PRAYER_CHALLENGE}
        onNavigate={onNavigate}
      />
    );
  }

  if (normalizedPath === '/parishes/widgets') {
    return <WidgetPage />;
  }

  const resourceMatch = normalizedPath.match(/^\/parishes\/resources\/([^/]+)$/);
  const guide = resourceMatch
    ? PARISH_RESOURCE_GUIDES.find((item) => item.slug === resourceMatch[1])
    : null;

  if (guide) {
    return <ResourceGuidePage guide={guide} />;
  }

  return <ParishHubPage />;
}

function ParishHubPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const selectedCategory = params.get('category') ?? 'all';
  const selectedType = params.get('type') ?? 'all';
  const searchTerm = params.get('search') ?? '';

  const filteredResources = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return PARISH_RESOURCES.filter((resource) => {
      const categoryMatches =
        selectedCategory === 'all' || resource.category === selectedCategory;
      const typeMatches =
        selectedType === 'all' || resource.resourceType === selectedType;
      const textMatches =
        normalizedSearch.length === 0 ||
        [
          resource.title,
          resource.summary,
          resource.category,
          resource.resourceType,
          ...resource.audience,
          ...(resource.tags ?? []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      return categoryMatches && typeMatches && textMatches;
    });
  }, [searchTerm, selectedCategory, selectedType]);

  const setFilter = (key: 'category' | 'search' | 'type', value: string) => {
    const next = new URLSearchParams(location.search);

    if (value === '' || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    trackAnalyticsEvent('filter_changed', {
      pageContext: 'parish_resources',
      contentType: key,
      contentId: value,
      metadata: { category: selectedCategory, search: searchTerm },
    });

    navigate({ pathname: '/parishes', search: next.toString() });
  };

  return (
    <article className="page parish-page">
      <header className="page-hero parish-hero">
        <div className="parish-hero-copy">
          <div className="page-eyebrow">For Parishes</div>
          <h1 className="page-hero-title">
            Help your parish pray with the Church
          </h1>
          <p className="page-lead">
            Use Una Voce resources to introduce the Liturgy of the Hours,
            organize a parish prayer challenge, support a recurring prayer
            group, or add trusted prayer opportunities to your parish website.
          </p>
          <div className="page-cta">
            <button
              type="button"
              className="page-cta-button"
              onClick={() => scrollToId('parish-resources')}
            >
              Explore parish resources
            </button>
            <button
              type="button"
              className="page-cta-link"
              onClick={() => navigate('/parishes/challenges/night-prayer-7-days')}
            >
              Start a parish challenge
            </button>
            <button
              type="button"
              className="page-cta-link quiet"
              onClick={() => {
                trackAnalyticsEvent('content_card_clicked', {
                  pageContext: 'parish_resources',
                  contentId: 'parish-pilot',
                  contentType: 'cta',
                });
                navigate('/contact?topic=parish-pilot');
              }}
            >
              Ask about a parish pilot
            </button>
          </div>
        </div>
        <ParishHeroVisual />
      </header>

      <section className="page-section">
        <h2 className="page-section-title">Choose how you want to begin</h2>
        <p className="page-section-intro">
          A parish does not need to launch a large new ministry all at once.
          Begin with one clear invitation, one prayer hour, or one short
          campaign.
        </p>
        <div className="parish-path-grid">
          {BEGIN_PATHS.map((path) => (
            <article className="parish-path-card" key={path.title}>
              <span>{path.title}</span>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              <ul>
                {path.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              <p className="parish-path-detail">{path.detail}</p>
              <button type="button" onClick={() => navigate(path.href)}>
                Open resources
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section parish-feature">
        <div>
          <div className="page-eyebrow">A simple first parish challenge</div>
          <h2 className="page-section-title">Seven Days of Night Prayer</h2>
          <p>
            Invite your parish to end each day with the prayer of the Church.
            This short challenge gives participants one clear starting point and
            helps them build a realistic daily rhythm.
          </p>
          <ul className="parish-feature-list">
            <li>Parish leader checklist</li>
            <li>Seven-day participant guide</li>
            <li>Bulletin, pulpit, email, and social copy</li>
            <li>Daily reminders and end-of-challenge questions</li>
          </ul>
        </div>
        <div className="parish-feature-actions">
          <button
            type="button"
            className="page-cta-button"
            onClick={() => navigate('/parishes/challenges/night-prayer-7-days')}
          >
            Preview the challenge
          </button>
          <button
            type="button"
            className="page-cta-link inverse"
            onClick={() => navigate('/parishes/challenges/night-prayer-7-days')}
          >
            Download the starter kit
          </button>
        </div>
      </section>

      <section className="page-section" id="parish-resources">
        <h2 className="page-section-title">Parish resource library</h2>
        <p className="page-section-intro">
          Browse practical materials for parish communication, group leadership,
          seasonal campaigns, OCIA, families, and parish websites.
        </p>
        <div className="resource-toolbar">
          <label className="resource-search">
            <span>Search resources</span>
            <input
              type="search"
              value={searchTerm}
              placeholder="Night prayer, OCIA, widgets..."
              onChange={(event) => setFilter('search', event.target.value)}
            />
          </label>
          <label className="resource-type-filter">
            <span>Type</span>
            <select
              value={selectedType}
              onChange={(event) => setFilter('type', event.target.value)}
            >
              <option value="all">All types</option>
              {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="resource-filter-row" aria-label="Resource categories">
          {PARISH_FILTERS.map((filter) => (
            <button
              type="button"
              key={filter.value}
              className={
                selectedCategory === filter.value ? 'selected' : undefined
              }
              onClick={() => setFilter('category', filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="resource-card-grid">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.slug}
              resource={resource}
              onOpen={() => navigateResource(navigate, resource)}
            />
          ))}
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Ready-to-use starter copy</h2>
        <p className="page-section-intro">
          Copy parish announcements, email invitations, and social captions
          directly into your bulletin, parish email, or scheduling tool.
        </p>
        <div className="copy-template-grid">
          {PARISH_COPY_TEMPLATES.map((template) => (
            <CopyableTemplateCard key={template.slug} template={template} />
          ))}
        </div>
      </section>

      <section className="page-section widget-preview-section">
        <div>
          <h2 className="page-section-title">Website widgets</h2>
          <p className="page-section-intro">
            Una Voce can give parishioners a trusted place to begin praying
            without asking parish staff to maintain daily prayer content.
          </p>
        </div>
        <button
          type="button"
          className="page-cta-button"
          onClick={() => navigate('/parishes/widgets')}
        >
          Preview widgets
        </button>
      </section>

      <section className="page-section parish-pilot">
        <div>
          <div className="page-eyebrow">Pilot parishes</div>
          <h2 className="page-section-title">Become a pilot parish</h2>
          <p>
            Una Voce is preparing a small number of parish pilots to test prayer
            challenges, parish resource kits, website widgets, and recurring
            community prayer formats.
          </p>
        </div>
        <ul>
          <li>Customized parish challenge page</li>
          <li>Help choosing trusted prayer sources</li>
          <li>Bulletin, email, and social materials</li>
          <li>Participation tracking and survey support</li>
          <li>Early access to parish website tools</li>
        </ul>
        <button
          type="button"
          className="page-cta-button"
          onClick={() => navigate('/contact?topic=parish-pilot')}
        >
          Ask about a parish pilot
        </button>
      </section>
    </article>
  );
}

function ChallengePage({
  challenge,
  onNavigate,
}: {
  challenge: ParishChallenge;
  onNavigate: ViewNavigator;
}) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === 'undefined') {
        return {};
      }

      const stored = window.localStorage.getItem(
        `parish-challenge-checklist:${challenge.slug}`,
      );
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    },
  );

  const updateCheckedItem = (key: string, checked: boolean) => {
    const next = { ...checkedItems, [key]: checked };
    setCheckedItems(next);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `parish-challenge-checklist:${challenge.slug}`,
        JSON.stringify(next),
      );
    }
  };

  useEffect(() => {
    trackAnalyticsEvent('content_card_clicked', {
      pageContext: 'parish_challenge',
      contentId: challenge.slug,
      contentType: 'challenge',
      metadata: { status: challenge.status },
    });
  }, [challenge.slug, challenge.status]);

  if (challenge.status === 'coming-soon') {
    return (
      <article className="page parish-page">
        <button
          type="button"
          className="page-back"
          onClick={() => onNavigate('parishes')}
        >
          Back to parish resources
        </button>
        <header className="page-hero">
          <div className="page-eyebrow">Coming Soon</div>
          <h1 className="page-hero-title">{challenge.title}</h1>
          <p className="page-lead">{challenge.summary}</p>
        </header>
        <section className="page-section quiet-panel">
          <h2 className="page-section-title">Planned commitment</h2>
          <p>
            Approximately {challenge.estimatedDailyMinutes} minutes each
            morning for {challenge.durationDays} days.
          </p>
        </section>
      </article>
    );
  }

  return (
    <article className="page parish-page">
      <button
        type="button"
        className="page-back"
        onClick={() => onNavigate('parishes')}
      >
        Back to parish resources
      </button>
      <header className="page-hero challenge-hero">
        <div>
          <div className="page-eyebrow">Parish Challenge</div>
          <h1 className="page-hero-title">{challenge.title}</h1>
          <p className="page-lead">{challenge.summary}</p>
          <div className="challenge-meta-row">
            <span>{challenge.durationDays} days</span>
            <span>About {challenge.estimatedDailyMinutes} minutes daily</span>
            <span>{challenge.audience.join(', ')}</span>
          </div>
        </div>
        <button
          type="button"
          className="page-cta-button"
          onClick={() => onNavigate('today', { segmentId: 'segment-night' })}
        >
          Begin with Night Prayer
        </button>
      </header>

      <section className="page-section">
        <h2 className="page-section-title">How the challenge works</h2>
        <div className="prose">
          <p>
            Night Prayer, traditionally called Compline, is the final prayer of
            the Liturgy of the Hours. It includes an examination of conscience,
            psalms, a short reading, prayer for protection through the night,
            and the Canticle of Simeon.
          </p>
          <p>
            This challenge is designed for beginners. Participants may use a
            trusted audio, video, or written source and should expect the prayer
            to take approximately ten minutes.
          </p>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Participant instructions</h2>
        <ol className="challenge-step-list">
          {challenge.participantSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Parish leader checklist</h2>
        <div className="challenge-checklist">
          {challenge.leaderChecklist.map((section) => (
            <details key={section.label} open>
              <summary>{section.label}</summary>
              <div className="challenge-checklist-items">
                {section.items.map((item) => {
                  const key = `${section.label}:${item}`;
                  return (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={checkedItems[key] ?? false}
                        onChange={(event) =>
                          updateCheckedItem(key, event.target.checked)
                        }
                      />
                      <span>{item}</span>
                    </label>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Daily reminder copy</h2>
        <div className="daily-reminder-list">
          {challenge.dailyReminders.map((reminder) => (
            <article key={reminder.day}>
              <span>Day {reminder.day}</span>
              <p>{reminder.copy}</p>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    `day-${reminder.day}`,
                    reminder.copy,
                    'daily-reminder',
                  )
                }
              >
                Copy reminder
              </button>
            </article>
          ))}
        </div>
        <button
          type="button"
          className="page-cta-link"
          onClick={() =>
            downloadTextFile(
              `${challenge.slug}-daily-reminders.txt`,
              challenge.dailyReminders
                .map((reminder) => `Day ${reminder.day}\n${reminder.copy}`)
                .join('\n\n'),
            )
          }
        >
          Export all reminders
        </button>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">End-of-challenge reflection</h2>
        <ul className="feature-list compact">
          {challenge.surveyQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
      </section>

      <section className="page-section quiet-panel">
        <h2 className="page-section-title">Content and attribution note</h2>
        <p>
          Una Voce helps users discover trusted prayer sources. Prayer content
          remains attributed to and provided by the original ministry or
          publisher.
        </p>
      </section>
    </article>
  );
}

function ResourceGuidePage({
  guide,
}: {
  guide: (typeof PARISH_RESOURCE_GUIDES)[number];
}) {
  const navigate = useNavigate();

  return (
    <article className="page parish-page">
      <button
        type="button"
        className="page-back"
        onClick={() => navigate('/parishes')}
      >
        Back to parish resources
      </button>
      <header className="page-hero">
        <div className="page-eyebrow">{guide.eyebrow}</div>
        <h1 className="page-hero-title">{guide.title}</h1>
        <p className="page-lead">{guide.intro}</p>
        {guide.estimatedTime ? (
          <div className="challenge-meta-row">
            <span>{guide.estimatedTime}</span>
          </div>
        ) : null}
      </header>
      <div className="resource-guide-list">
        {guide.sections.map((section) => (
          <section className="page-section quiet-panel" key={section.title}>
            <h2 className="page-section-title">{section.title}</h2>
            {section.body ? <p>{section.body}</p> : null}
            {section.items ? (
              <ul className="feature-list compact">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  );
}

function WidgetPage() {
  const navigate = useNavigate();

  return (
    <article className="page parish-page">
      <button
        type="button"
        className="page-back"
        onClick={() => navigate('/parishes')}
      >
        Back to parish resources
      </button>
      <header className="page-hero">
        <div className="page-eyebrow">Website Widgets</div>
        <h1 className="page-hero-title">Add prayer to your parish website</h1>
        <p className="page-lead">
          Start with iframe embeds that point parishioners to current prayer
          opportunities while preserving attribution to original ministries and
          publishers.
        </p>
      </header>
      <section className="page-section">
        <h2 className="page-section-title">Initial widget concepts</h2>
        <div className="resource-card-grid">
          {WIDGETS.map((widget) => (
            <article className="resource-card" key={widget.title}>
              <span>Widget</span>
              <h3>{widget.title}</h3>
              <p>{widget.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="page-section quiet-panel">
        <h2 className="page-section-title">Iframe embed</h2>
        <pre className="embed-code">{EMBED_CODE}</pre>
        <button
          type="button"
          className="page-cta-button"
          onClick={() => copyText('pray-today-widget', EMBED_CODE, 'widget')}
        >
          Copy embed code
        </button>
      </section>
      <section className="page-section quiet-panel">
        <h2 className="page-section-title">Attribution</h2>
        <p>
          Una Voce helps users discover trusted prayer sources. Prayer content
          remains attributed to and provided by the original ministry or
          publisher.
        </p>
      </section>
    </article>
  );
}

function ParishHeroVisual() {
  return (
    <aside className="parish-hero-visual" aria-label="Parish resource preview">
      <div className="parish-hero-visual-header">
        <span>Parish kit</span>
        <b>Night Prayer Week</b>
      </div>
      <div className="parish-hero-calendar">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index}>Day {index + 1}</span>
        ))}
      </div>
      <div className="parish-widget-mini">
        <span>Pray Today</span>
        <button type="button">Morning</button>
        <button type="button">Evening</button>
        <button type="button">Night</button>
      </div>
    </aside>
  );
}

function ResourceCard({
  resource,
  onOpen,
}: {
  resource: ParishResource;
  onOpen: () => void;
}) {
  const categoryLabel =
    PARISH_CATEGORY_LABELS[resource.category as ParishResourceCategory];
  const typeLabel =
    RESOURCE_TYPE_LABELS[resource.resourceType as ParishResourceType];

  return (
    <article className="resource-card">
      <div className="resource-card-topline">
        <span>{typeLabel}</span>
        <span className={`resource-status ${resource.status}`}>
          {resource.status === 'available' ? 'Available' : 'Coming soon'}
        </span>
      </div>
      <h3>{resource.title}</h3>
      <p>{resource.summary}</p>
      <div className="resource-card-meta">
        <span>{categoryLabel}</span>
        {resource.estimatedTime ? <span>{resource.estimatedTime}</span> : null}
      </div>
      <div className="resource-audience">
        {resource.audience.map((audience) => (
          <span key={audience}>{audience}</span>
        ))}
      </div>
      <button
        type="button"
        disabled={resource.status === 'coming-soon'}
        onClick={onOpen}
      >
        {resource.status === 'available' ? 'Open resource' : 'Coming soon'}
      </button>
    </article>
  );
}

function CopyableTemplateCard({ template }: { template: CopyTemplate }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(template.slug, template.body, 'copy-template');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <article className="copy-template-card">
      <div>
        <h3>{template.title}</h3>
        {template.description ? <p>{template.description}</p> : null}
      </div>
      <pre>{template.body}</pre>
      {template.placeholders?.length ? (
        <div className="placeholder-row">
          {template.placeholders.map((placeholder) => (
            <span key={placeholder}>{placeholder}</span>
          ))}
        </div>
      ) : null}
      <div className="copy-template-actions">
        <button type="button" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={() => downloadTextFile(`${template.slug}.txt`, template.body)}
        >
          Download .txt
        </button>
      </div>
    </article>
  );
}

function navigateResource(
  navigate: ReturnType<typeof useNavigate>,
  resource: ParishResource,
) {
  if (!resource.href || resource.status === 'coming-soon') {
    return;
  }

  trackAnalyticsEvent('content_card_clicked', {
    pageContext: 'parish_resources',
    contentId: resource.slug,
    contentType: resource.resourceType,
    metadata: {
      category: resource.category,
      status: resource.status,
    },
  });

  navigate(resource.href);
}

async function copyText(id: string, text: string, contentType: string) {
  trackAnalyticsEvent('share_clicked', {
    pageContext: 'parish_resources',
    contentId: id,
    contentType,
  });

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({
    block: 'start',
    behavior: 'smooth',
  });
}
