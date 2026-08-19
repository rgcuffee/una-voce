import { adminFetch } from './adminApi';

export type DevotionLinkStatus = 'active' | 'revoked';
export type DevotionReportOutcome =
  | 'prayed'
  | 'started_not_finished'
  | 'not_tonight';

export type DevotionNightResult = {
  pilotDay: number;
  prayerDate: string | null;
  opened: boolean;
  openCount: number;
  resourceEngaged: boolean;
  resourceCount: number;
  resources: Array<{
    resourceId: string;
    provider: string;
    mediaType: string;
    count: number;
  }>;
  measuredMediaMinutes: number;
  outcome: DevotionReportOutcome | null;
};

export type DevotionParticipantResult = {
  id: string;
  safeId: string;
  label: string;
  linkStatus: DevotionLinkStatus;
  createdAt: string;
  nights: DevotionNightResult[];
};

export type DevotionAnalyticsData = {
  ok: true;
  generatedAt: string;
  devotion: {
    id: string;
    slug: string;
    name: string;
    organizationLabel: string;
    startDate: string | null;
    durationDays: number;
    timezone: string | null;
    status: 'inactive' | 'active' | 'completed';
    preSurveyUrl: string | null;
    postSurveyUrl: string | null;
  };
  metrics: {
    participantsEnrolled: number;
    nightsOpened: number;
    resourceEngagements: number;
    measuredMediaMinutes: number;
    reportedPrayed: number;
    reportedPartial: number;
    reportedNotTonight: number;
  };
  participants: DevotionParticipantResult[];
};

export function loadDevotionAnalytics() {
  return adminFetch<DevotionAnalyticsData>('/api/admin/devotion');
}

export function createDevotionParticipant(label: string) {
  return adminFetch<{
    ok: true;
    participant: Omit<DevotionParticipantResult, 'nights'>;
    generatedLink: string;
  }>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'createParticipant', label }),
  });
}

export function reissueDevotionParticipant(participantId: string) {
  return adminFetch<{
    ok: true;
    participant: Omit<DevotionParticipantResult, 'nights'>;
    generatedLink: string;
  }>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'reissueParticipant', participantId }),
  });
}

export function revokeDevotionParticipant(participantId: string) {
  return adminFetch<{
    ok: true;
    participant: Omit<DevotionParticipantResult, 'nights'>;
  }>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'revokeParticipant', participantId }),
  });
}

export function updateDevotionConfiguration(devotion: {
  startDate: string | null;
  timezone: string | null;
  status: 'inactive' | 'active' | 'completed';
  preSurveyUrl: string | null;
  postSurveyUrl: string | null;
}) {
  return adminFetch<{ ok: true; devotion: unknown }>('/api/admin/devotion', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateDevotion', devotion }),
  });
}
