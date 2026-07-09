import { useEffect, useMemo, useState } from 'react';
import {
  loadAdminDashboard,
  updateVideo,
  updateEpisode,
  upsertApplePodcastFeed,
  upsertFeed,
  upsertPartner,
  upsertRule,
  upsertSpotifyFeed,
  type AdminClassificationRule,
  type AdminApplePodcastFeed,
  type AdminDashboardData,
  type AdminPartner,
  type AdminPartnerFeed,
  type AdminAudioEpisode,
  type AdminSpotifyFeed,
  type AdminYoutubeVideo,
  type ApplePodcastFeedDraft,
  type FeedDraft,
  type PartnerDraft,
  type RuleDraft,
  type SpotifyFeedDraft,
} from './adminApi';
import { supabase } from '../lib/supabase';
import type {
  LiturgicalHour,
  LiturgicalSeason,
  PartnerOnboardingStatus,
  PartnerRelationshipStatus,
  PartnerYoutubeContentMode,
  PartnerYoutubeFeedType,
  YoutubeVideoDisplayStatus,
} from '../lib/database.types';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type AdminSection = 'overview' | 'partners' | 'videos' | 'audio' | 'feeds' | 'rules';

const HOUR_OPTIONS: { value: LiturgicalHour; label: string }[] = [
  { value: 'office_of_readings', label: 'Office of Readings' },
  { value: 'lauds', label: 'Lauds' },
  { value: 'midday_prayer', label: 'Midday Prayer' },
  { value: 'vespers', label: 'Vespers' },
  { value: 'compline', label: 'Compline' },
];

const STATUS_OPTIONS: YoutubeVideoDisplayStatus[] = ['pending', 'approved', 'hidden', 'expired'];
const PARTNER_STATUSES: PartnerOnboardingStatus[] = ['pending', 'active', 'archived'];
const RELATIONSHIP_STATUSES: { value: PartnerRelationshipStatus; label: string; note: string }[] = [
  { value: 'curated', label: 'Curated', note: 'Public resources with attribution' },
  { value: 'verified', label: 'Verified', note: 'Confirmed by the creator or organization' },
  { value: 'partner', label: 'Partner', note: 'Badge and community presence' },
];
const FEED_TYPES: PartnerYoutubeFeedType[] = ['channel', 'playlist'];
const CONTENT_MODES: PartnerYoutubeContentMode[] = ['live', 'scheduled_live', 'pre_recorded', 'mixed'];
const SEASON_OPTIONS: { value: LiturgicalSeason; label: string }[] = [
  { value: 'advent', label: 'Advent' },
  { value: 'christmas', label: 'Christmas' },
  { value: 'ordinary_time', label: 'Ordinary Time' },
  { value: 'lent', label: 'Lent' },
  { value: 'triduum', label: 'Triduum' },
  { value: 'easter', label: 'Easter' },
];
const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
const MIDDAY_TITLE_PATTERN = /\b(midmorning|midday|midafternoon)\b/i;

const emptyPartner: PartnerDraft = {
  slug: '',
  name: '',
  description: '',
  website: '',
  logo_url: '',
  country: '',
  timezone: 'UTC',
  active: true,
  onboarding_status: 'pending',
  relationship_status: 'curated',
  verified_at: '',
  partnered_at: '',
  consent_notes: '',
  consent_source: '',
  badge_enabled: true,
  community_page_enabled: false,
  community_page_slug: '',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function localDate(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

function keywords(value: string[] | undefined) {
  return (value ?? []).join(', ');
}

function parseKeywords(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function partnerDraft(partner?: AdminPartner | null): PartnerDraft {
  if (!partner) return emptyPartner;
  return {
    id: partner.id,
    slug: partner.slug,
    name: partner.name,
    description: partner.description ?? '',
    website: partner.website ?? '',
    logo_url: partner.logo_url ?? '',
    country: partner.country ?? '',
    timezone: partner.timezone,
    active: partner.active,
    onboarding_status: partner.onboarding_status,
    relationship_status: partner.relationship_status,
    verified_at: localDate(partner.verified_at),
    partnered_at: localDate(partner.partnered_at),
    consent_notes: partner.consent_notes ?? '',
    consent_source: partner.consent_source ?? '',
    badge_enabled: partner.badge_enabled,
    community_page_enabled: partner.community_page_enabled,
    community_page_slug: partner.community_page_slug ?? '',
  };
}

function feedDraft(partnerId: string, feed?: AdminPartnerFeed | null): FeedDraft {
  if (feed) {
    return {
      id: feed.id,
      partner_id: feed.partner_id,
      type: feed.type,
      youtube_channel_id: feed.youtube_channel_id ?? '',
      youtube_playlist_id: feed.youtube_playlist_id ?? '',
      rss_url: feed.rss_url,
      expected_content_mode: feed.expected_content_mode,
      polling_interval_minutes: feed.polling_interval_minutes,
      import_from_date: feed.import_from_date ?? '',
      poll_once: feed.poll_once,
      default_available_liturgical_seasons:
        feed.default_available_liturgical_seasons,
      active: feed.active,
    };
  }

  return {
    partner_id: partnerId,
    type: 'channel',
    youtube_channel_id: '',
    youtube_playlist_id: '',
    rss_url: '',
    expected_content_mode: 'mixed',
    polling_interval_minutes: 120,
    import_from_date: '',
    poll_once: false,
    default_available_liturgical_seasons: [],
    active: true,
  };
}

function spotifyFeedDraft(partnerId: string, feed?: AdminSpotifyFeed | null): SpotifyFeedDraft {
  if (feed) {
    return {
      id: feed.id,
      partner_id: feed.partner_id,
      spotify_show_id: feed.spotify_show_id,
      show_url: feed.show_url,
      embed_url: feed.embed_url,
      rss_url: feed.rss_url ?? '',
      polling_interval_minutes: feed.polling_interval_minutes,
      import_from_date: feed.import_from_date ?? '',
      active: feed.active,
    };
  }

  return {
    partner_id: partnerId,
    spotify_show_id: '',
    show_url: '',
    embed_url: '',
    rss_url: '',
    polling_interval_minutes: 120,
    import_from_date: '',
    active: true,
  };
}

function applePodcastFeedDraft(partnerId: string, feed?: AdminApplePodcastFeed | null): ApplePodcastFeedDraft {
  if (feed) {
    return {
      id: feed.id,
      partner_id: feed.partner_id,
      apple_podcast_id: feed.apple_podcast_id,
      show_url: feed.show_url,
      embed_url: feed.embed_url,
      rss_url: feed.rss_url ?? '',
      polling_interval_minutes: feed.polling_interval_minutes,
      import_from_date: feed.import_from_date ?? '',
      active: feed.active,
    };
  }

  return {
    partner_id: partnerId,
    apple_podcast_id: '',
    show_url: '',
    embed_url: '',
    rss_url: '',
    polling_interval_minutes: 120,
    import_from_date: '',
    active: true,
  };
}

function ruleDraft(partnerId: string, rule?: AdminClassificationRule | null): RuleDraft {
  if (rule) {
    return {
      id: rule.id,
      partner_id: rule.partner_id,
      name: rule.name,
      include_keywords: rule.include_keywords,
      exclude_keywords: rule.exclude_keywords,
      prayer_type: rule.prayer_type,
      preferred_language: rule.preferred_language ?? '',
      priority: rule.priority,
      default_display_status: rule.default_display_status,
      active: rule.active,
    };
  }

  return {
    partner_id: partnerId,
    name: '',
    include_keywords: [],
    exclude_keywords: [],
    prayer_type: null,
    preferred_language: 'en',
    priority: 100,
    default_display_status: 'approved',
    active: true,
  };
}

function statusClass(value: string | boolean) {
  if (value === true || value === 'active' || value === 'approved') return 'completed';
  if (value === 'partner' || value === 'verified') return 'completed';
  if (value === 'curated') return 'minor';
  if (value === 'pending') return 'running';
  if (value === false || value === 'hidden' || value === 'archived' || value === 'expired') return 'failed';
  return '';
}

function suggestedReviewHour(item: Pick<AdminAudioEpisode | AdminYoutubeVideo, 'display_status' | 'prayer_type' | 'title'>): LiturgicalHour | '' {
  if (item.display_status === 'pending' && MIDDAY_TITLE_PATTERN.test(item.title)) {
    return 'midday_prayer';
  }

  return item.prayer_type ?? '';
}

function seasonLabels(seasons: LiturgicalSeason[] | undefined) {
  if (!seasons?.length) {
    return 'All seasons';
  }

  return seasons
    .map((season) => SEASON_OPTIONS.find((option) => option.value === season)?.label ?? season)
    .join(', ');
}

function seasonValue(seasons: LiturgicalSeason[] | undefined) {
  return (seasons ?? []).join(', ');
}

function parseSeasons(value: string): LiturgicalSeason[] {
  const allowed = new Set(SEASON_OPTIONS.map((option) => option.value));
  return value
    .split(',')
    .map((item) => item.trim() as LiturgicalSeason)
    .filter((item) => allowed.has(item));
}

function weekdayLabels(weekdays: number[] | undefined) {
  if (!weekdays?.length) {
    return 'Every weekday';
  }

  return weekdays
    .map((weekday) => WEEKDAY_OPTIONS.find((option) => option.value === weekday)?.label ?? String(weekday))
    .join(', ');
}

function weekdayValue(weekdays: number[] | undefined) {
  return (weekdays ?? []).join(', ');
}

function parseWeekdays(value: string) {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
}

export function AdminDashboardPage() {
  const [authEmail, setAuthEmail] = useState('');
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [section, setSection] = useState<AdminSection>('overview');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [reviewPartnerId, setReviewPartnerId] = useState<string>('all');

  async function refresh() {
    setState('loading');
    setError(null);
    try {
      const nextData = await loadAdminDashboard();
      setData(nextData);
      setSelectedPartnerId((current) => current || nextData.partners[0]?.id || '');
      setState('ready');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load admin data.');
      setState('error');
    }
  }

  useEffect(() => {
    supabase?.auth.getSession().then(({ data: sessionData }) => {
      setAuthEmail(sessionData.session?.user.email ?? '');
      void refresh();
    });

    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange((_event, session) => {
      setAuthEmail(session?.user.email ?? '');
    }) ?? { data: { subscription: null } };

    return () => subscription?.unsubscribe();
  }, []);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  const selectedPartner = useMemo(
    () => data?.partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [data, selectedPartnerId],
  );

  const partnerFeeds = useMemo(
    () => data?.feeds.filter((feed) => feed.partner_id === selectedPartnerId) ?? [],
    [data, selectedPartnerId],
  );

  const partnerSpotifyFeeds = useMemo(
    () => data?.spotifyFeeds.filter((feed) => feed.partner_id === selectedPartnerId) ?? [],
    [data, selectedPartnerId],
  );

  const partnerApplePodcastFeeds = useMemo(
    () => data?.applePodcastFeeds.filter((feed) => feed.partner_id === selectedPartnerId) ?? [],
    [data, selectedPartnerId],
  );

  const partnerRules = useMemo(
    () => data?.rules.filter((rule) => rule.partner_id === selectedPartnerId) ?? [],
    [data, selectedPartnerId],
  );

  const partnerVideos = useMemo(
    () => data?.videos.filter((video) => reviewPartnerId === 'all' || video.partner_id === reviewPartnerId) ?? [],
    [data, reviewPartnerId],
  );

  const partnerEpisodes = useMemo(
    () => data?.episodes.filter((episode) => reviewPartnerId === 'all' || episode.partner_id === reviewPartnerId) ?? [],
    [data, reviewPartnerId],
  );

  return (
    <main className="engine-admin admin-dashboard">
      <aside className="engine-sidebar" aria-label="Admin sections">
        <div className="engine-brand">
          <span>Una Voce</span>
          <strong>Admin Hub</strong>
        </div>
        <nav>
          <button className={section === 'overview' ? 'active' : ''} type="button" onClick={() => setSection('overview')}>Overview</button>
          <button className={section === 'partners' ? 'active' : ''} type="button" onClick={() => setSection('partners')}>Partners</button>
          <button className={section === 'videos' ? 'active' : ''} type="button" onClick={() => setSection('videos')}>Video Review</button>
          <button className={section === 'audio' ? 'active' : ''} type="button" onClick={() => setSection('audio')}>Audio Review</button>
          <button className={section === 'feeds' ? 'active' : ''} type="button" onClick={() => setSection('feeds')}>Source Health</button>
          <button className={section === 'rules' ? 'active' : ''} type="button" onClick={() => setSection('rules')}>Rules</button>
          <a href="/admin/calendar-engine">Calendar Engine</a>
        </nav>
      </aside>

      <section className="engine-workspace">
        <header className="engine-topbar">
          <div>
            <p>Internal operations</p>
            <h1>Partner Dashboard</h1>
          </div>
          <div className="engine-controls admin-secret-controls">
            <span className="admin-user-email">{authEmail}</span>
            <button type="button" className="admin-button primary" onClick={() => void refresh()}>
              Refresh
            </button>
            <button type="button" className="admin-button" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </header>

        {state === 'loading' && <div className="engine-empty">Loading partner operations...</div>}
        {state === 'error' && <div className="engine-empty engine-error">{error}</div>}

        {data && state !== 'loading' ? (
          <>
            <section className="engine-metrics" aria-label="Partner operations summary">
              <Metric label="Partners" value={data.totals.partners} detail={`${data.totals.activePartners} active`} />
              <Metric label="Pending Videos" value={data.totals.pendingVideos} detail="Awaiting review" />
              <Metric label="Pending Audio" value={data.totals.pendingEpisodes} detail="Awaiting review" />
              <Metric label="Approved Today" value={data.totals.approvedToday} detail={data.today} />
              <Metric label="Stale Feeds" value={data.totals.staleFeeds} detail="Past polling interval" />
            </section>

            {section === 'overview' && <Overview data={data} onSelectPartner={setSelectedPartnerId} onOpenSection={setSection} />}
            {section === 'partners' && (
              <PartnersSection
                data={data}
                selectedPartnerId={selectedPartnerId}
                selectedPartner={selectedPartner}
                onSelectPartner={setSelectedPartnerId}
                onSaved={refresh}
              />
            )}
            {section === 'videos' && (
              <VideosSection
                data={data}
                videos={partnerVideos}
                selectedPartnerId={reviewPartnerId}
                onSelectPartner={setReviewPartnerId}
                onSaved={refresh}
              />
            )}
            {section === 'audio' && (
              <AudioSection
                data={data}
                episodes={partnerEpisodes}
                selectedPartnerId={reviewPartnerId}
                onSelectPartner={setReviewPartnerId}
                onSaved={refresh}
              />
            )}
            {section === 'feeds' && (
              <FeedsSection
                data={data}
                feeds={partnerFeeds}
                spotifyFeeds={partnerSpotifyFeeds}
                applePodcastFeeds={partnerApplePodcastFeeds}
                selectedPartnerId={selectedPartnerId}
                onSelectPartner={setSelectedPartnerId}
                onSaved={refresh}
              />
            )}
            {section === 'rules' && (
              <RulesSection
                data={data}
                rules={partnerRules}
                selectedPartnerId={selectedPartnerId}
                onSelectPartner={setSelectedPartnerId}
                onSaved={refresh}
              />
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="engine-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function PartnerPicker({
  data,
  value,
  onChange,
  includeAll = false,
}: {
  data: AdminDashboardData;
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
}) {
  return (
    <label>
      Partner
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {includeAll ? <option value="all">All partners</option> : null}
        {data.partners.map((partner) => (
          <option key={partner.id} value={partner.id}>{partner.name}</option>
        ))}
      </select>
    </label>
  );
}

function Overview({
  data,
  onSelectPartner,
  onOpenSection,
}: {
  data: AdminDashboardData;
  onSelectPartner: (id: string) => void;
  onOpenSection: (section: AdminSection) => void;
}) {
  return (
    <section className="engine-section">
      <div className="engine-section-heading">
        <div>
          <p>Health</p>
          <h2>Partner Inventory</h2>
        </div>
        <span>Generated {formatDateTime(data.generatedAt)}</span>
      </div>
      <div className="engine-table-wrap">
        <table className="engine-table">
          <thead>
            <tr>
              <th>Partner</th>
              <th>Public Tier</th>
              <th>Ops Status</th>
              <th>Sources</th>
              <th>Rules</th>
              <th>Videos</th>
              <th>Audio</th>
              <th>Pending</th>
              <th>Today</th>
              <th>Last Poll</th>
              <th>Coverage</th>
            </tr>
          </thead>
          <tbody>
            {data.partners.map((partner) => {
              const summary = data.summaries.find((item) => item.partnerId === partner.id);
              return (
                <tr key={partner.id}>
                  <td>
                    <button
                      type="button"
                      className="admin-link-button"
                      onClick={() => {
                        onSelectPartner(partner.id);
                        onOpenSection('partners');
                      }}
                    >
                      {partner.name}
                    </button>
                    <span>{partner.slug}</span>
                  </td>
                  <td><span className={`engine-badge ${statusClass(partner.relationship_status)}`}>{partner.relationship_status}</span></td>
                  <td><span className={`engine-badge ${statusClass(partner.onboarding_status)}`}>{partner.onboarding_status}</span></td>
                  <td>YT {summary?.activeFeedCount ?? 0}/{summary?.feedCount ?? 0} · SP {summary?.activeSpotifyFeedCount ?? 0}/{summary?.spotifyFeedCount ?? 0} · AP {summary?.activeApplePodcastFeedCount ?? 0}/{summary?.applePodcastFeedCount ?? 0}</td>
                  <td>{summary?.ruleCount ?? 0}</td>
                  <td>{summary?.videoCount ?? 0}</td>
                  <td>{summary?.episodeCount ?? 0}</td>
                  <td>{(summary?.pendingVideoCount ?? 0) + (summary?.pendingEpisodeCount ?? 0)}</td>
                  <td>{summary?.approvedTodayCount ?? 0}</td>
                  <td>{formatDateTime(summary?.lastPolledAt)}</td>
                  <td>{summary?.missingTodayHours.length ? summary.missingTodayHours.join(', ') : 'Covered'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PartnersSection({
  data,
  selectedPartnerId,
  selectedPartner,
  onSelectPartner,
  onSaved,
}: {
  data: AdminDashboardData;
  selectedPartnerId: string;
  selectedPartner: AdminPartner | null;
  onSelectPartner: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<PartnerDraft>(() => partnerDraft(selectedPartner));
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(partnerDraft(selectedPartner)), [selectedPartner]);

  async function save() {
    setSaving(true);
    try {
      await upsertPartner(draft);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="engine-section admin-editor-grid">
      <div>
        <div className="engine-section-heading compact">
          <div>
            <p>Records</p>
            <h2>Partners</h2>
          </div>
          <button type="button" className="admin-button" onClick={() => setDraft(emptyPartner)}>New</button>
        </div>
        <div className="admin-list">
          {data.partners.map((partner) => (
            <button
              type="button"
              key={partner.id}
              className={selectedPartnerId === partner.id ? 'active' : ''}
              onClick={() => onSelectPartner(partner.id)}
            >
              <strong>{partner.name}</strong>
              <span>{partner.slug} · {partner.relationship_status} · {partner.onboarding_status}</span>
            </button>
          ))}
        </div>
      </div>
      <PartnerForm draft={draft} saving={saving} onChange={setDraft} onSave={save} />
    </section>
  );
}

function PartnerForm({
  draft,
  saving,
  onChange,
  onSave,
}: {
  draft: PartnerDraft;
  saving: boolean;
  onChange: (draft: PartnerDraft) => void;
  onSave: () => void;
}) {
  return (
    <div className="admin-form">
      <div className="engine-section-heading compact">
        <div>
          <p>{draft.id ? 'Edit partner' : 'New partner'}</p>
          <h2>{draft.name || 'Partner details'}</h2>
        </div>
      </div>
      <div className="admin-form-body">
        <Field label="Name" value={draft.name} onChange={(name) => onChange({ ...draft, name })} />
        <Field label="Slug" value={draft.slug} onChange={(slug) => onChange({ ...draft, slug })} />
        <Field label="Website" value={draft.website ?? ''} onChange={(website) => onChange({ ...draft, website })} />
        <Field label="Logo URL" value={draft.logo_url ?? ''} onChange={(logo_url) => onChange({ ...draft, logo_url })} />
        <Field label="Country" value={draft.country ?? ''} onChange={(country) => onChange({ ...draft, country })} />
        <Field label="Timezone" value={draft.timezone} onChange={(timezone) => onChange({ ...draft, timezone })} />
        <label>
          Operations status
          <select value={draft.onboarding_status} onChange={(event) => onChange({ ...draft, onboarding_status: event.target.value as PartnerOnboardingStatus })}>
            {PARTNER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Public tier
          <select value={draft.relationship_status} onChange={(event) => onChange({ ...draft, relationship_status: event.target.value as PartnerRelationshipStatus })}>
            {RELATIONSHIP_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>
        <div className="admin-status-note admin-full">
          {RELATIONSHIP_STATUSES.find((status) => status.value === draft.relationship_status)?.note}
        </div>
        <Field label="Verified date" value={draft.verified_at ?? ''} onChange={(verified_at) => onChange({ ...draft, verified_at })} type="date" />
        <Field label="Partnered date" value={draft.partnered_at ?? ''} onChange={(partnered_at) => onChange({ ...draft, partnered_at })} type="date" />
        <Field label="Consent source" value={draft.consent_source ?? ''} onChange={(consent_source) => onChange({ ...draft, consent_source })} />
        <Field label="Community slug" value={draft.community_page_slug ?? ''} onChange={(community_page_slug) => onChange({ ...draft, community_page_slug })} />
        <label className="admin-check">
          <input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} />
          Active
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.badge_enabled} onChange={(event) => onChange({ ...draft, badge_enabled: event.target.checked })} />
          Badge
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.community_page_enabled} onChange={(event) => onChange({ ...draft, community_page_enabled: event.target.checked })} />
          Community Page
        </label>
        <label className="admin-full">
          Description
          <textarea value={draft.description ?? ''} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
        </label>
        <label className="admin-full">
          Consent notes
          <textarea value={draft.consent_notes ?? ''} onChange={(event) => onChange({ ...draft, consent_notes: event.target.value })} />
        </label>
        <button type="button" className="admin-button primary" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save Partner'}
        </button>
      </div>
    </div>
  );
}

function VideosSection({
  data,
  videos,
  selectedPartnerId,
  onSelectPartner,
  onSaved,
}: {
  data: AdminDashboardData;
  videos: AdminYoutubeVideo[];
  selectedPartnerId: string;
  onSelectPartner: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<YoutubeVideoDisplayStatus | 'all'>('pending');
  const shownVideos = videos.filter((video) => statusFilter === 'all' || video.display_status === statusFilter);

  return (
    <section className="engine-section">
      <div className="engine-section-heading">
        <div>
          <p>Review queue</p>
          <h2>Partner Videos</h2>
        </div>
        <div className="engine-controls">
          <PartnerPicker data={data} value={selectedPartnerId} onChange={onSelectPartner} includeAll />
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as YoutubeVideoDisplayStatus | 'all')}>
              <option value="all">All</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="admin-video-list">
        {shownVideos.length === 0 ? (
          <div className="engine-empty small">No videos match this view.</div>
        ) : (
          shownVideos.map((video) => (
            <VideoReviewCard key={video.id} video={video} onSaved={onSaved} />
          ))
        )}
      </div>
    </section>
  );
}

function VideoReviewCard({ video, onSaved }: { video: AdminYoutubeVideo; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState(video.display_status);
  const [hour, setHour] = useState<LiturgicalHour | ''>(() => suggestedReviewHour(video));
  const [date, setDate] = useState(video.prayer_date ?? '');
  const [seasons, setSeasons] = useState<LiturgicalSeason[]>(
    video.available_liturgical_seasons,
  );
  const [weekdays, setWeekdays] = useState<number[]>(video.available_weekdays);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(video.display_status);
    setHour(suggestedReviewHour(video));
    setDate(video.prayer_date ?? '');
    setSeasons(video.available_liturgical_seasons);
    setWeekdays(video.available_weekdays);
  }, [video]);

  async function save(nextStatus = status) {
    setSaving(true);
    try {
      await updateVideo({
        id: video.id,
        display_status: nextStatus,
        prayer_type: hour || null,
        prayer_date: date || null,
        available_liturgical_seasons: seasons,
        available_weekdays: weekdays,
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="admin-video-card">
      <a href={video.canonical_url} target="_blank" rel="noreferrer" className="admin-video-thumb">
        {video.thumbnail_url ? <img alt="" src={video.thumbnail_url} /> : <span>No image</span>}
      </a>
      <div className="admin-video-body">
        <span className={`engine-badge ${statusClass(video.display_status)}`}>{video.display_status}</span>
        <h3>{video.title}</h3>
        <p>{formatDateTime(video.published_at)} · {video.video_kind}</p>
        <p>{seasonLabels(video.available_liturgical_seasons)} · {weekdayLabels(video.available_weekdays)}</p>
        <div className="admin-inline-controls">
          <label>
            Prayer date
            <input type="date" value={localDate(date)} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Hour
            <select value={hour} onChange={(event) => setHour(event.target.value as LiturgicalHour | '')}>
              <option value="">Unclassified</option>
              {HOUR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as YoutubeVideoDisplayStatus)}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Seasons
            <input value={seasonValue(seasons)} onChange={(event) => setSeasons(parseSeasons(event.target.value))} placeholder="ordinary_time" />
          </label>
          <label>
            Weekdays
            <input value={weekdayValue(weekdays)} onChange={(event) => setWeekdays(parseWeekdays(event.target.value))} placeholder="0, 1, 2" />
          </label>
        </div>
        <div className="admin-action-row">
          <button type="button" className="admin-button primary" disabled={saving} onClick={() => save(status)}>Save</button>
          <button type="button" className="admin-button" disabled={saving} onClick={() => save('approved')}>Approve</button>
          <button type="button" className="admin-button" disabled={saving} onClick={() => save('hidden')}>Hide</button>
        </div>
      </div>
    </article>
  );
}

function AudioSection({
  data,
  episodes,
  selectedPartnerId,
  onSelectPartner,
  onSaved,
}: {
  data: AdminDashboardData;
  episodes: AdminAudioEpisode[];
  selectedPartnerId: string;
  onSelectPartner: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<YoutubeVideoDisplayStatus | 'all'>('pending');
  const shownEpisodes = episodes.filter((episode) => statusFilter === 'all' || episode.display_status === statusFilter);

  return (
    <section className="engine-section">
      <div className="engine-section-heading">
        <div>
          <p>Review queue</p>
          <h2>Partner Audio</h2>
        </div>
        <div className="engine-controls">
          <PartnerPicker data={data} value={selectedPartnerId} onChange={onSelectPartner} includeAll />
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as YoutubeVideoDisplayStatus | 'all')}>
              <option value="all">All</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="admin-video-list">
        {shownEpisodes.length === 0 ? (
          <div className="engine-empty small">No audio episodes match this view.</div>
        ) : (
          shownEpisodes.map((episode) => (
            <EpisodeReviewCard key={episode.id} episode={episode} onSaved={onSaved} />
          ))
        )}
      </div>
    </section>
  );
}

function EpisodeReviewCard({ episode, onSaved }: { episode: AdminAudioEpisode; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState(episode.display_status);
  const [hour, setHour] = useState<LiturgicalHour | ''>(() => suggestedReviewHour(episode));
  const [date, setDate] = useState(episode.prayer_date ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(episode.display_status);
    setHour(suggestedReviewHour(episode));
    setDate(episode.prayer_date ?? '');
  }, [episode]);

  async function save(nextStatus = status) {
    setSaving(true);
    try {
      await updateEpisode({
        id: episode.id,
        provider: episode.provider,
        display_status: nextStatus,
        prayer_type: hour || null,
        prayer_date: date || null,
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="admin-video-card">
      <a href={episode.canonical_url} target="_blank" rel="noreferrer" className="admin-video-thumb">
        {episode.image_url ? <img alt="" src={episode.image_url} /> : <span>No image</span>}
      </a>
      <div className="admin-video-body">
        <span className={`engine-badge ${statusClass(episode.display_status)}`}>{episode.display_status}</span>
        <h3>{episode.title}</h3>
        <p>{formatDateTime(episode.published_at)} · {episode.provider === 'apple-podcast' ? 'Apple Podcasts' : 'Spotify'} audio</p>
        <div className="admin-inline-controls">
          <label>
            Prayer date
            <input type="date" value={localDate(date)} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Hour
            <select value={hour} onChange={(event) => setHour(event.target.value as LiturgicalHour | '')}>
              <option value="">Unclassified</option>
              {HOUR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as YoutubeVideoDisplayStatus)}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <div className="admin-action-row">
          <button type="button" className="admin-button primary" disabled={saving} onClick={() => save(status)}>Save</button>
          <button type="button" className="admin-button" disabled={saving} onClick={() => save('approved')}>Approve</button>
          <button type="button" className="admin-button" disabled={saving} onClick={() => save('hidden')}>Hide</button>
        </div>
      </div>
    </article>
  );
}

function FeedsSection({
  data,
  feeds,
  spotifyFeeds,
  applePodcastFeeds,
  selectedPartnerId,
  onSelectPartner,
  onSaved,
}: {
  data: AdminDashboardData;
  feeds: AdminPartnerFeed[];
  spotifyFeeds: AdminSpotifyFeed[];
  applePodcastFeeds: AdminApplePodcastFeed[];
  selectedPartnerId: string;
  onSelectPartner: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<FeedDraft>(() => feedDraft(selectedPartnerId));
  const [spotifyDraft, setSpotifyDraft] = useState<SpotifyFeedDraft>(() => spotifyFeedDraft(selectedPartnerId));
  const [applePodcastDraft, setApplePodcastDraft] = useState<ApplePodcastFeedDraft>(() => applePodcastFeedDraft(selectedPartnerId));
  const [saving, setSaving] = useState(false);
  const [savingSpotify, setSavingSpotify] = useState(false);
  const [savingApplePodcast, setSavingApplePodcast] = useState(false);

  useEffect(() => {
    setDraft(feedDraft(selectedPartnerId));
    setSpotifyDraft(spotifyFeedDraft(selectedPartnerId));
    setApplePodcastDraft(applePodcastFeedDraft(selectedPartnerId));
  }, [selectedPartnerId]);

  async function save() {
    setSaving(true);
    try {
      await upsertFeed(draft);
      await onSaved();
      setDraft(feedDraft(selectedPartnerId));
    } finally {
      setSaving(false);
    }
  }

  async function saveSpotify() {
    setSavingSpotify(true);
    try {
      await upsertSpotifyFeed(spotifyDraft);
      await onSaved();
      setSpotifyDraft(spotifyFeedDraft(selectedPartnerId));
    } finally {
      setSavingSpotify(false);
    }
  }

  async function saveApplePodcast() {
    setSavingApplePodcast(true);
    try {
      await upsertApplePodcastFeed(applePodcastDraft);
      await onSaved();
      setApplePodcastDraft(applePodcastFeedDraft(selectedPartnerId));
    } finally {
      setSavingApplePodcast(false);
    }
  }

  return (
    <section className="engine-section admin-editor-grid">
      <div>
        <div className="engine-section-heading compact">
          <div>
            <p>Polling</p>
            <h2>Partner Sources</h2>
          </div>
          <div className="engine-controls">
            <PartnerPicker data={data} value={selectedPartnerId} onChange={onSelectPartner} />
          </div>
        </div>
        <div className="admin-list">
          <h3 className="admin-list-heading">YouTube</h3>
          {feeds.map((feed) => (
            <button key={feed.id} type="button" onClick={() => setDraft(feedDraft(selectedPartnerId, feed))}>
              <strong>{feed.type}: {feed.youtube_playlist_id ?? feed.youtube_channel_id}</strong>
              <span>{feed.active ? 'active' : 'inactive'} · {feed.poll_once ? 'one-time' : `${feed.polling_interval_minutes}m`} · {seasonLabels(feed.default_available_liturgical_seasons)} · last poll {formatDateTime(feed.last_polled_at)}</span>
            </button>
          ))}
          <h3 className="admin-list-heading">Spotify</h3>
          {spotifyFeeds.map((feed) => (
            <button key={feed.id} type="button" onClick={() => setSpotifyDraft(spotifyFeedDraft(selectedPartnerId, feed))}>
              <strong>show: {feed.spotify_show_id}</strong>
              <span>{feed.active ? 'active' : 'inactive'} · {feed.rss_url ? 'RSS configured' : 'missing RSS'} · last poll {formatDateTime(feed.last_polled_at)}</span>
            </button>
          ))}
          <h3 className="admin-list-heading">Apple Podcasts</h3>
          {applePodcastFeeds.map((feed) => (
            <button key={feed.id} type="button" onClick={() => setApplePodcastDraft(applePodcastFeedDraft(selectedPartnerId, feed))}>
              <strong>podcast: {feed.apple_podcast_id}</strong>
              <span>{feed.active ? 'active' : 'inactive'} · {feed.rss_url ? 'RSS configured' : 'missing RSS'} · last poll {formatDateTime(feed.last_polled_at)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="admin-stacked-forms">
        <FeedForm draft={draft} saving={saving} onChange={setDraft} onSave={save} />
        <SpotifyFeedForm draft={spotifyDraft} saving={savingSpotify} onChange={setSpotifyDraft} onSave={saveSpotify} />
        <ApplePodcastFeedForm draft={applePodcastDraft} saving={savingApplePodcast} onChange={setApplePodcastDraft} onSave={saveApplePodcast} />
      </div>
    </section>
  );
}

function FeedForm({ draft, saving, onChange, onSave }: { draft: FeedDraft; saving: boolean; onChange: (draft: FeedDraft) => void; onSave: () => void }) {
  return (
    <div className="admin-form">
      <div className="engine-section-heading compact">
        <div>
          <p>{draft.id ? 'Edit feed' : 'New feed'}</p>
          <h2>Feed details</h2>
        </div>
      </div>
      <div className="admin-form-body">
        <label>
          Type
          <select value={draft.type} onChange={(event) => onChange({ ...draft, type: event.target.value as PartnerYoutubeFeedType })}>
            {FEED_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>
          Content mode
          <select value={draft.expected_content_mode} onChange={(event) => onChange({ ...draft, expected_content_mode: event.target.value as PartnerYoutubeContentMode })}>
            {CONTENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </label>
        <Field label="Channel ID" value={draft.youtube_channel_id ?? ''} onChange={(youtube_channel_id) => onChange({ ...draft, youtube_channel_id })} />
        <Field label="Playlist ID" value={draft.youtube_playlist_id ?? ''} onChange={(youtube_playlist_id) => onChange({ ...draft, youtube_playlist_id })} />
        <Field label="RSS URL" value={draft.rss_url} onChange={(rss_url) => onChange({ ...draft, rss_url })} className="admin-full" />
        <Field label="Import from" value={draft.import_from_date ?? ''} onChange={(import_from_date) => onChange({ ...draft, import_from_date })} type="date" />
        <Field label="Polling minutes" value={String(draft.polling_interval_minutes)} onChange={(value) => onChange({ ...draft, polling_interval_minutes: Number(value) || 120 })} type="number" />
        <Field label="Default seasons" value={seasonValue(draft.default_available_liturgical_seasons)} onChange={(value) => onChange({ ...draft, default_available_liturgical_seasons: parseSeasons(value) })} placeholder="ordinary_time" />
        <label className="admin-check">
          <input type="checkbox" checked={draft.poll_once} onChange={(event) => onChange({ ...draft, poll_once: event.target.checked })} />
          Poll once
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} />
          Active
        </label>
        <button type="button" className="admin-button primary" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save Feed'}
        </button>
      </div>
    </div>
  );
}

function SpotifyFeedForm({ draft, saving, onChange, onSave }: { draft: SpotifyFeedDraft; saving: boolean; onChange: (draft: SpotifyFeedDraft) => void; onSave: () => void }) {
  return (
    <div className="admin-form">
      <div className="engine-section-heading compact">
        <div>
          <p>{draft.id ? 'Edit Spotify source' : 'New Spotify source'}</p>
          <h2>Spotify details</h2>
        </div>
      </div>
      <div className="admin-form-body">
        <Field label="Show ID" value={draft.spotify_show_id} onChange={(spotify_show_id) => onChange({ ...draft, spotify_show_id })} />
        <Field label="Show URL" value={draft.show_url} onChange={(show_url) => onChange({ ...draft, show_url })} className="admin-full" />
        <Field label="Embed URL" value={draft.embed_url} onChange={(embed_url) => onChange({ ...draft, embed_url })} className="admin-full" />
        <Field label="RSS URL" value={draft.rss_url ?? ''} onChange={(rss_url) => onChange({ ...draft, rss_url })} className="admin-full" />
        <Field label="Import from" value={draft.import_from_date ?? ''} onChange={(import_from_date) => onChange({ ...draft, import_from_date })} type="date" />
        <Field label="Polling minutes" value={String(draft.polling_interval_minutes)} onChange={(value) => onChange({ ...draft, polling_interval_minutes: Number(value) || 120 })} type="number" />
        <label className="admin-check">
          <input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} />
          Active
        </label>
        <button type="button" className="admin-button primary" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save Spotify Source'}
        </button>
      </div>
    </div>
  );
}

function ApplePodcastFeedForm({ draft, saving, onChange, onSave }: { draft: ApplePodcastFeedDraft; saving: boolean; onChange: (draft: ApplePodcastFeedDraft) => void; onSave: () => void }) {
  return (
    <div className="admin-form">
      <div className="engine-section-heading compact">
        <div>
          <p>{draft.id ? 'Edit Apple source' : 'New Apple source'}</p>
          <h2>Apple Podcasts details</h2>
        </div>
      </div>
      <div className="admin-form-body">
        <Field label="Podcast ID" value={draft.apple_podcast_id} onChange={(apple_podcast_id) => onChange({ ...draft, apple_podcast_id })} />
        <Field label="Show URL" value={draft.show_url} onChange={(show_url) => onChange({ ...draft, show_url })} className="admin-full" />
        <Field label="Embed URL" value={draft.embed_url} onChange={(embed_url) => onChange({ ...draft, embed_url })} className="admin-full" />
        <Field label="RSS URL" value={draft.rss_url ?? ''} onChange={(rss_url) => onChange({ ...draft, rss_url })} className="admin-full" />
        <Field label="Import from" value={draft.import_from_date ?? ''} onChange={(import_from_date) => onChange({ ...draft, import_from_date })} type="date" />
        <Field label="Polling minutes" value={String(draft.polling_interval_minutes)} onChange={(value) => onChange({ ...draft, polling_interval_minutes: Number(value) || 120 })} type="number" />
        <label className="admin-check">
          <input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} />
          Active
        </label>
        <button type="button" className="admin-button primary" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save Apple Source'}
        </button>
      </div>
    </div>
  );
}

function RulesSection({
  data,
  rules,
  selectedPartnerId,
  onSelectPartner,
  onSaved,
}: {
  data: AdminDashboardData;
  rules: AdminClassificationRule[];
  selectedPartnerId: string;
  onSelectPartner: (id: string) => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<RuleDraft>(() => ruleDraft(selectedPartnerId));
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(ruleDraft(selectedPartnerId)), [selectedPartnerId]);

  async function save() {
    setSaving(true);
    try {
      await upsertRule(draft);
      await onSaved();
      setDraft(ruleDraft(selectedPartnerId));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="engine-section admin-editor-grid">
      <div>
        <div className="engine-section-heading compact">
          <div>
            <p>Classification</p>
            <h2>Rules</h2>
          </div>
          <div className="engine-controls">
            <PartnerPicker data={data} value={selectedPartnerId} onChange={onSelectPartner} />
          </div>
        </div>
        <div className="admin-list">
          {rules.map((rule) => (
            <button key={rule.id} type="button" onClick={() => setDraft(ruleDraft(selectedPartnerId, rule))}>
              <strong>{rule.name}</strong>
              <span>{rule.prayer_type ?? 'no hour'} · {rule.default_display_status} · priority {rule.priority}</span>
            </button>
          ))}
        </div>
      </div>
      <RuleForm draft={draft} saving={saving} onChange={setDraft} onSave={save} />
    </section>
  );
}

function RuleForm({ draft, saving, onChange, onSave }: { draft: RuleDraft; saving: boolean; onChange: (draft: RuleDraft) => void; onSave: () => void }) {
  return (
    <div className="admin-form">
      <div className="engine-section-heading compact">
        <div>
          <p>{draft.id ? 'Edit rule' : 'New rule'}</p>
          <h2>Rule details</h2>
        </div>
      </div>
      <div className="admin-form-body">
        <Field label="Name" value={draft.name} onChange={(name) => onChange({ ...draft, name })} className="admin-full" />
        <Field label="Include keywords" value={keywords(draft.include_keywords)} onChange={(value) => onChange({ ...draft, include_keywords: parseKeywords(value) })} className="admin-full" />
        <Field label="Exclude keywords" value={keywords(draft.exclude_keywords)} onChange={(value) => onChange({ ...draft, exclude_keywords: parseKeywords(value) })} className="admin-full" />
        <label>
          Hour
          <select value={draft.prayer_type ?? ''} onChange={(event) => onChange({ ...draft, prayer_type: (event.target.value || null) as LiturgicalHour | null })}>
            <option value="">None</option>
            {HOUR_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label>
          Default status
          <select value={draft.default_display_status} onChange={(event) => onChange({ ...draft, default_display_status: event.target.value as YoutubeVideoDisplayStatus })}>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <Field label="Language" value={draft.preferred_language ?? ''} onChange={(preferred_language) => onChange({ ...draft, preferred_language })} />
        <Field label="Priority" value={String(draft.priority)} onChange={(value) => onChange({ ...draft, priority: Number(value) || 100 })} type="number" />
        <label className="admin-check">
          <input type="checkbox" checked={draft.active} onChange={(event) => onChange({ ...draft, active: event.target.checked })} />
          Active
        </label>
        <button type="button" className="admin-button primary" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save Rule'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className={className}>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
