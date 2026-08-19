export type DevotionReportOutcome =
  | 'prayed'
  | 'started_not_finished'
  | 'not_tonight';

export type DevotionTiming = {
  phase: 'inactive' | 'not_started' | 'active' | 'completed';
  pilotDay: number | null;
  prayerDate: string | null;
};

export type DevotionAttribution = {
  devotionId: string;
  devotionParticipantId: string;
  pilotDay: number | null;
  prayerDate: string | null;
};

export type DevotionParticipantState = {
  ok: true;
  participant: {
    id: string;
    safeId: string;
    label: string;
  };
  devotion: {
    id: string;
    slug: string;
    name: string;
    organizationLabel: string;
    hourKey: 'compline';
    startDate: string | null;
    durationDays: 7;
    timezone: string | null;
    status: 'inactive' | 'active' | 'completed';
    preSurveyUrl: string | null;
    postSurveyUrl: string | null;
  };
  timing: DevotionTiming;
  report: {
    outcome: DevotionReportOutcome;
    pilotDay: number;
    prayerDate: string;
    firstReportedAt: string;
    updatedAt: string;
  } | null;
  attribution: DevotionAttribution;
};

export async function resolveDevotionParticipant(
  token: string,
  signal?: AbortSignal,
) {
  return devotionRequest<DevotionParticipantState>(
    { action: 'resolve', token },
    signal,
  );
}

export async function submitDevotionReport(
  token: string,
  outcome: DevotionReportOutcome,
) {
  return devotionRequest<{
    ok: true;
    report: NonNullable<DevotionParticipantState['report']>;
    attribution: DevotionAttribution;
  }>({ action: 'report', token, outcome });
}

async function devotionRequest<T>(body: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch('/api/devotion', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok || !payload) {
    throw new DevotionApiError(
      response.status,
      payload?.error ?? 'Unable to load the devotion right now.',
    );
  }

  return payload as T;
}

export class DevotionApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
