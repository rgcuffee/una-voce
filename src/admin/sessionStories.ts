import type { AdminAnalyticsData } from './adminApi';
import type {
  DevotionActivitySession,
  DevotionAnalyticsData,
  DevotionParticipantResult,
  DevotionSurveyResult,
} from './devotionAdminApi';

export type ProductEventRow = NonNullable<AdminAnalyticsData['explorer']>['exportRows'][number];

export type ProductSessionStory = {
  id: string;
  events: ProductEventRow[];
  startedAt: string;
  endedAt: string;
  source: string | null;
  device: string | null;
};

export type ProductPersonStory = {
  id: string;
  lastSeen: string;
  sessionCount: number;
  actionCount: number;
  source: string | null;
  device: string | null;
  sessions: ProductSessionStory[];
};

export type DevotionParticipantStory = {
  participant: DevotionParticipantResult;
  sessions: DevotionActivitySession[];
  surveys: DevotionSurveyResult[];
  lastActivityAt: string;
  actionCount: number;
  nightsWithEvidence: number;
};

function validTimestamp(value: string | null | undefined) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function latestValue<T>(rows: T[], selector: (row: T) => string | null) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = selector(rows[index]);
    if (value) return value;
  }
  return null;
}

export function buildProductPeople(rows: ProductEventRow[]): ProductPersonStory[] {
  const people = new Map<string, ProductEventRow[]>();
  rows.forEach((row) => {
    const personId = row.anonymousId ?? 'unattributed';
    const current = people.get(personId) ?? [];
    current.push(row);
    people.set(personId, current);
  });

  return [...people.entries()].map(([id, personRows]) => {
    const ordered = [...personRows].sort((left, right) => validTimestamp(left.timestamp) - validTimestamp(right.timestamp));
    const sessions = new Map<string, ProductEventRow[]>();
    ordered.forEach((row, index) => {
      const sessionId = row.sessionId ?? `event-only-${index + 1}`;
      const current = sessions.get(sessionId) ?? [];
      current.push(row);
      sessions.set(sessionId, current);
    });

    const sessionStories = [...sessions.entries()].map(([sessionId, events]) => ({
      id: sessionId,
      events,
      startedAt: events[0]?.timestamp ?? '',
      endedAt: events[events.length - 1]?.timestamp ?? events[0]?.timestamp ?? '',
      source: latestValue(events, (event) => event.acquisition),
      device: latestValue(events, (event) => event.device),
    })).sort((left, right) => validTimestamp(right.endedAt) - validTimestamp(left.endedAt));

    return {
      id,
      lastSeen: ordered[ordered.length - 1]?.timestamp ?? '',
      sessionCount: sessionStories.length,
      actionCount: ordered.length,
      source: latestValue(ordered, (event) => event.acquisition),
      device: latestValue(ordered, (event) => event.device),
      sessions: sessionStories,
    };
  }).sort((left, right) => validTimestamp(right.lastSeen) - validTimestamp(left.lastSeen));
}

export function buildDevotionParticipantStories(data: DevotionAnalyticsData): DevotionParticipantStory[] {
  return data.participants.map((participant) => {
    const sessions = data.activity.sessions
      .filter((session) => session.participantSafeId === participant.safeId)
      .sort((left, right) => validTimestamp(right.startedAt) - validTimestamp(left.startedAt));
    const surveys = data.surveyResponses
      .filter((survey) => survey.participantSafeId === participant.safeId)
      .sort((left, right) => validTimestamp(right.updatedAt) - validTimestamp(left.updatedAt));
    const activityTimes = [
      participant.createdAt,
      participant.completedAt,
      ...sessions.flatMap((session) => [session.startedAt, session.endedAt, ...session.timeline.map((event) => event.timestamp)]),
      ...surveys.flatMap((survey) => [survey.startedAt, survey.submittedAt, survey.updatedAt]),
    ].filter((value): value is string => Boolean(value));
    const nightsWithEvidence = participant.nights.filter((night) =>
      night.opened || night.resourceEngaged || night.outcome !== null || night.measuredMediaMinutes !== null).length;

    return {
      participant,
      sessions,
      surveys,
      lastActivityAt: activityTimes.sort((left, right) => validTimestamp(right) - validTimestamp(left))[0] ?? participant.createdAt,
      actionCount: sessions.reduce((total, session) => total + session.eventCountDerived, 0)
        + participant.nights.filter((night) => night.outcome !== null).length
        + surveys.length,
      nightsWithEvidence,
    };
  }).sort((left, right) => validTimestamp(right.lastActivityAt) - validTimestamp(left.lastActivityAt));
}

export function devotionStoryNightNumbers(story: DevotionParticipantStory) {
  const numbers = new Set<number | null>([
    ...story.participant.nights
      .filter((night) => night.opened
        || night.resourceEngaged
        || night.outcome !== null
        || night.measuredMediaMinutes !== null)
      .map((night) => night.pilotDay),
    ...story.sessions.map((session) => session.pilotDay),
  ]);
  return [...numbers].sort((left, right) => (right ?? -1) - (left ?? -1));
}

export function analyticsEventLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ');
}

export function observedSpanSeconds(startedAt: string | null, endedAt: string | null) {
  const start = validTimestamp(startedAt);
  const end = validTimestamp(endedAt);
  return start && end && end >= start ? Math.round((end - start) / 1000) : null;
}
