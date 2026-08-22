import { adminFetch } from './adminApi';

export type DevotionStatus =
  | 'inactive'
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';
export type DevotionParticipantStatus =
  | 'enrolled'
  | 'active'
  | 'completed'
  | 'withdrawn';
export type DevotionLinkStatus = 'active' | 'revoked';
export type DevotionReportOutcome =
  | 'prayed'
  | 'started_not_finished'
  | 'not_tonight';

export type DevotionCampaign = {
  id: string;
  slug: string;
  name: string;
  organizationLabel: string;
  description: string | null;
  startDate: string | null;
  durationDays: number;
  timezone: string | null;
  status: DevotionStatus;
  preSurveyUrl: string | null;
  postSurveyUrl: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  updatedAt: string | null;
};

export type DevotionCohort = {
  id: string;
  devotionId: string;
  slug: string;
  name: string;
  status: DevotionStatus;
  startDate: string | null;
  timezone: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DevotionNightResult = {
  pilotDay: number;
  prayerDate: string | null;
  opened: boolean;
  openCount: number;
  resourceEngaged: boolean;
  resourceCount: number;
  resources: Array<{
    resourceId: string;
    label: string;
    provider: string;
    mediaType: string;
    count: number;
    measuredMinutes: number;
  }>;
  measuredMediaMinutes: number;
  outcome: DevotionReportOutcome | null;
};

export type DevotionParticipantResult = {
  id: string;
  safeId: string;
  label: string;
  cohortId: string;
  status: DevotionParticipantStatus;
  linkStatus: DevotionLinkStatus;
  completedAt: string | null;
  createdAt: string;
  nights: DevotionNightResult[];
};

export type DevotionAnalyticsData = {
  ok: true;
  generatedAt: string;
  access: { role: 'owner' | 'editor' | 'viewer'; email: string | null };
  campaigns: DevotionCampaign[];
  cohorts: DevotionCohort[];
  operationalAlerts: Array<{
    severity: 'info' | 'warning';
    code: string;
    cohortId?: string;
    message: string;
  }>;
  sourceStatus: {
    status: 'exact' | 'sampled';
    cap: number;
    caps: Record<string, number | null>;
    truncatedSources: string[];
  } | null;
  participantDetail: {
    page: number;
    pageSize: number;
    shown: number;
    observedTotal: number;
    totalStatus: 'exact' | 'lower_bound';
    hasPrevious: boolean;
    hasNext: boolean;
  };
  auditHistory: Array<{
    id: string;
    actorEmail: string | null;
    actorRole: 'owner' | 'editor' | 'viewer';
    action: string;
    devotionId: string | null;
    cohortId: string | null;
    participantId: string | null;
    summary: Record<string, unknown>;
    createdAt: string;
  }>;
  portfolio: {
    status: 'exact' | 'sampled';
    cap: number;
    caps: Record<string, number | null>;
    truncatedSources: string[];
    campaigns: Array<{
      devotion: DevotionCampaign;
      participants: number;
      activeParticipants: number;
      completedParticipants: number;
      nightsOpened: number;
      reports: number;
      prayedReports: number;
      resourceEngagements: number;
      measuredMediaMinutes: number;
    }>;
  } | null;
  devotion: DevotionCampaign | null;
  metrics: {
    participantsEnrolled: number;
    participantsActive: number;
    participantsCompleted: number;
    participantsWithdrawn: number;
    nightsOpened: number;
    resourceEngagements: number;
    measuredMediaMinutes: number;
    reportedPrayed: number;
    reportedPartial: number;
    reportedNotTonight: number;
  } | null;
  nightRollup: Array<{
    night: number;
    opened: number;
    engaged: number;
    reported: number;
    measuredMediaMinutes: number;
  }>;
  participants: DevotionParticipantResult[];
};

export type DevotionCampaignDraft = {
  slug: string;
  name: string;
  organizationLabel: string;
  description?: string | null;
  startDate?: string | null;
  durationDays: number;
  timezone?: string | null;
  status?: DevotionStatus;
  preSurveyUrl?: string | null;
  postSurveyUrl?: string | null;
};

export type DevotionCohortDraft = {
  slug?: string;
  name?: string;
  startDate: string | null;
  timezone: string | null;
  status: DevotionStatus;
};

type AuditedMutation = { auditRecorded: boolean };

const devotionPath = (devotionId?: string, portfolio = false, participantPage = 1) => {
  const search = new URLSearchParams();
  if (devotionId) search.set('devotionId', devotionId);
  if (portfolio) search.set('portfolio', 'true');
  if (participantPage > 1) search.set('participantPage', String(participantPage));
  return `/api/admin/devotion${search.size ? `?${search}` : ''}`;
};

export function loadDevotionAnalytics(devotionId?: string, portfolio = false, participantPage = 1) {
  return adminFetch<DevotionAnalyticsData>(devotionPath(devotionId, portfolio, participantPage));
}

export function createDevotionCampaign(devotion: DevotionCampaignDraft) {
  return adminFetch<{ ok: true; devotion: DevotionCampaign; cohort: DevotionCohort } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'createDevotion', devotion }),
  });
}

export function createDevotionCohort(devotionId: string, cohort: DevotionCohortDraft & { slug: string; name: string }) {
  return adminFetch<{ ok: true; cohort: DevotionCohort } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'createCohort', devotionId, cohort }),
  });
}

export function updateDevotionCohort(devotionId: string, cohortId: string, cohort: DevotionCohortDraft) {
  return adminFetch<{ ok: true; cohort: DevotionCohort } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateCohort', devotionId, cohortId, cohort }),
  });
}

export function createDevotionParticipant(devotionId: string, cohortId: string, label: string) {
  return adminFetch<{
    ok: true;
    participant: Omit<DevotionParticipantResult, 'nights'>;
    generatedLink: string;
    linkChanged: boolean;
    auditRecorded: boolean;
  }>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'createParticipant', devotionId, cohortId, label }),
  });
}

export function showDevotionParticipantLink(devotionId: string, participantId: string) {
  return adminFetch<{
    ok: true;
    participant: Omit<DevotionParticipantResult, 'nights'>;
    generatedLink: string;
    linkChanged: boolean;
    auditRecorded: boolean;
  }>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'showParticipantLink', devotionId, participantId }),
  });
}

export function revokeDevotionParticipant(devotionId: string, participantId: string) {
  return adminFetch<{ ok: true; participant: Omit<DevotionParticipantResult, 'nights'> } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'revokeParticipant', devotionId, participantId }),
  });
}

export function restoreDevotionParticipant(devotionId: string, participantId: string) {
  return adminFetch<{ ok: true; participant: Omit<DevotionParticipantResult, 'nights'> } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'restoreParticipant', devotionId, participantId }),
  });
}

export function bulkRevokeDevotionParticipants(devotionId: string, participantIds: string[]) {
  return adminFetch<{ ok: true; participants: Array<Omit<DevotionParticipantResult, 'nights'>> } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'bulkRevokeParticipants', devotionId, participantIds }),
  });
}

export function updateDevotionParticipantStatus(devotionId: string, participantId: string, status: DevotionParticipantStatus) {
  return adminFetch<{ ok: true; participant: Omit<DevotionParticipantResult, 'nights'> } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateParticipantStatus', devotionId, participantId, status }),
  });
}

export function updateDevotionConfiguration(devotionId: string, devotion: Partial<DevotionCampaignDraft>) {
  return adminFetch<{ ok: true; devotion: DevotionCampaign } & AuditedMutation>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateDevotion', devotionId, devotion }),
  });
}
